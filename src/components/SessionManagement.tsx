import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Monitor, Smartphone, Tablet, RefreshCw, LogOut, ShieldCheck, ShieldAlert, Clock, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { getCurrentSessionInfo, signOutOtherDevices, type CurrentSessionInfo } from "@/lib/sessionInfo";
import { signOutAllDevices } from "@/lib/mfa";

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeLeft(d: Date | null): string {
  if (!d) return "—";
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "Isteklo";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}min` : `${m}min`;
}

export default function SessionManagement() {
  const [info, setInfo] = useState<CurrentSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"others" | "all" | null>(null);
  const [tick, setTick] = useState(0);

  const reload = async () => {
    setLoading(true);
    try { setInfo(await getCurrentSessionInfo()); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const doSignOutOthers = async () => {
    setBusy("others");
    try {
      await signOutOtherDevices();
      toast.success("Odjavljene su sve ostale sesije. Ova sesija ostaje aktivna.");
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const doSignOutAll = async () => {
    setBusy("all");
    try {
      await signOutAllDevices();
      toast.success("Odjavljeni ste sa svih uređaja");
      window.location.href = "/auth";
    } catch (e) { toast.error((e as Error).message); setBusy(null); }
  };

  const DeviceIcon = info?.device.device === "Mobitel" ? Smartphone : info?.device.device === "Tablet" ? Tablet : Monitor;
  // Tick zeros out warnings without re-fetching
  void tick;

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-primary" /> Upravljanje sesijama
          </CardTitle>
          <CardDescription>Detalji trenutne sesije i kontrola pristupa sa drugih uređaja.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} disabled={loading} title="Osvježi">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !info ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Učitavanje…
          </div>
        ) : !info?.session ? (
          <p className="text-sm text-muted-foreground">Nema aktivne sesije.</p>
        ) : (
          <>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <DeviceIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-sm">
                      {info.device.browser} · {info.device.os}
                    </div>
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Ova sesija</Badge>
                    {info.aal === "aal2" ? (
                      <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-3 h-3 mr-1" /> 2FA (AAL2)
                      </Badge>
                    ) : info.nextAal === "aal2" ? (
                      <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                        <ShieldAlert className="w-3 h-3 mr-1" /> Potrebna 2FA
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Samo lozinka</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 capitalize">
                    {info.device.device} · Provajder: {info.provider}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                    <Row label="Zadnja prijava" value={fmt(info.lastSignInAt)} />
                    <Row label="Sesija izdata" value={fmt(info.issuedAt)} />
                    <Row label="Ističe" value={fmt(info.expiresAt)} />
                    <Row
                      label="Preostalo"
                      value={timeLeft(info.expiresAt)}
                      icon={<Clock className="w-3 h-3" />}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              Iz sigurnosnih razloga popis drugih aktivnih uređaja nije javno dostupan. Ako sumnjate na neovlašten pristup, odmah odjavite ostale uređaje.
            </div>

            <div className="flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={busy !== null}>
                    {busy === "others" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <LogOut className="w-4 h-4 mr-2" /> Odjavi ostale uređaje
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Odjaviti ostale sesije?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Svi drugi uređaji bit će odjavljeni. Ova sesija ostaje aktivna.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Odustani</AlertDialogCancel>
                    <AlertDialogAction onClick={doSignOutOthers}>Odjavi ostale</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={busy !== null}>
                    {busy === "all" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <LogOut className="w-4 h-4 mr-2" /> Odjavi sve (uključujući ovaj)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Odjaviti sve sesije?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bit ćete odjavljeni sa svih uređaja, uključujući ovaj. Morat ćete se ponovo prijaviti.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Odustani</AlertDialogCancel>
                    <AlertDialogAction onClick={doSignOutAll}>Odjavi sve</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium flex items-center gap-1">{icon}{value}</span>
    </div>
  );
}
