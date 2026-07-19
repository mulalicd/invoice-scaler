import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, ShieldCheck, ShieldOff, Smartphone, LogOut, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  enrollTotp, verifyTotpEnrollment, listTotpFactors, unenrollFactor, signOutAllDevices,
  type TotpFactorSummary, type EnrollResult,
} from "@/lib/mfa";

export default function SecuritySettings() {
  const [factors, setFactors] = useState<TotpFactorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<EnrollResult | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { setFactors(await listTotpFactors()); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Cleanup any stale unverified factor first (Supabase rejects duplicates)
      const stale = factors.find((f) => f.status === "unverified");
      if (stale) { try { await unenrollFactor(stale.id); } catch { /* ignore */ } }
      const result = await enrollTotp(`Authenticator ${new Date().toISOString().slice(0, 10)}`);
      setEnrolling(result);
      setCode("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const finishEnroll = async () => {
    if (!enrolling) return;
    if (code.length !== 6) return toast.error("Unesite 6-cifreni kod");
    setBusy(true);
    try {
      await verifyTotpEnrollment(enrolling.factorId, code);
      toast.success("2FA aktivirano");
      setEnrolling(null);
      setCode("");
      await reload();
    } catch (e) {
      toast.error((e as Error).message || "Kod nije ispravan");
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (enrolling) { try { await unenrollFactor(enrolling.factorId); } catch { /* ignore */ } }
    setEnrolling(null);
    setCode("");
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await unenrollFactor(id);
      toast.success("2FA uklonjeno");
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const doSignOutAll = async () => {
    setSignOutBusy(true);
    try {
      await signOutAllDevices();
      toast.success("Odjavljeni ste sa svih uređaja");
      window.location.href = "/auth";
    } catch (e) { toast.error((e as Error).message); }
    finally { setSignOutBusy(false); }
  };

  const verified = factors.filter((f) => f.status === "verified");

  const copySecret = () => {
    if (!enrolling) return;
    navigator.clipboard.writeText(enrolling.secret).then(() => toast.success("Tajni ključ kopiran"));
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Dvofaktorska provjera (2FA)
          </CardTitle>
          <CardDescription>
            Zaštitite račun jednokratnim kodovima iz aplikacije (Google Authenticator, 1Password, Authy).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Učitavanje…
            </div>
          ) : verified.length === 0 ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm text-muted-foreground">
                <Badge variant="outline" className="mr-2">Isključeno</Badge>
                Preporučeno za sve financijske aplikacije.
              </div>
              <Button onClick={startEnroll} disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Smartphone className="w-4 h-4 mr-2" /> Aktiviraj 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {verified.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
                  <div className="min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Badge className="bg-primary/15 text-primary border-primary/30">Aktivno</Badge>
                      {f.friendlyName ?? "TOTP faktor"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Dodano: {f.createdAt ? new Date(f.createdAt).toLocaleDateString("bs-BA") : "—"}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={busy}>
                        <ShieldOff className="w-4 h-4 mr-2" /> Ukloni
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ukloniti 2FA?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Račun će biti zaštićen samo lozinkom. Preporučujemo da odmah aktivirate novi faktor.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Odustani</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(f.id)}>Ukloni</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Aktivne sesije
          </CardTitle>
          <CardDescription>
            Odjavite račun sa svih uređaja (browsera, telefona, tableta). Ova radnja poništava sve tokene.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={signOutBusy}>
                {signOutBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <LogOut className="w-4 h-4 mr-2" /> Odjavi sa svih uređaja
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Odjaviti sve sesije?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bit ćete odjavljeni i sa ovog uređaja. Morat ćete se ponovo prijaviti.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Odustani</AlertDialogCancel>
                <AlertDialogAction onClick={doSignOutAll}>Odjavi sve</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Dialog open={!!enrolling} onOpenChange={(o) => { if (!o) cancelEnroll(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aktivacija 2FA</DialogTitle>
            <DialogDescription>
              1) Skenirajte QR kod aplikacijom · 2) Unesite 6-cifreni kod ispod
            </DialogDescription>
          </DialogHeader>
          {enrolling && (
            <div className="space-y-4">
              <div className="flex justify-center bg-white p-4 rounded-lg border border-border/60">
                {/* Supabase vraća data:image/svg+xml QR — sigurno za img */}
                <img src={enrolling.qrCodeSvg} alt="QR kod za 2FA" className="w-48 h-48" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ne možete skenirati? Unesite ručno:</Label>
                <div className="flex gap-2">
                  <Input readOnly value={enrolling.secret} className="font-mono text-xs" />
                  <Button type="button" size="icon" variant="outline" onClick={copySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Kod iz aplikacije</Label>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="text-center text-xl tracking-[0.4em] font-mono"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={cancelEnroll} disabled={busy}>Odustani</Button>
            <Button onClick={finishEnroll} disabled={busy || code.length !== 6}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Potvrdi i aktiviraj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
