import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { challengeAndVerify, listTotpFactors } from "@/lib/mfa";

export default function MfaChallenge() {
  const { signOut, refresh } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const factors = await listTotpFactors();
        const verified = factors.find((f) => f.status === "verified");
        if (!verified) {
          // No verified factor — should not happen; force logout to clear stale state
          await signOut();
          return;
        }
        setFactorId(verified.id);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [signOut]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    if (code.length !== 6) return toast.error("Unesite 6-cifreni kod");
    setBusy(true);
    setError(null);
    try {
      await challengeAndVerify(factorId, code);
      toast.success("Dvofaktorska provjera uspješna");
      await refresh();
      // Force a session refresh so AAL is re-evaluated
      window.location.reload();
    } catch (e) {
      const msg = (e as Error).message || "Kod nije ispravan";
      setError(msg);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-elegant border-border/60">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Dvofaktorska provjera</CardTitle>
          <CardDescription>
            Unesite 6-cifreni kod iz vaše authenticator aplikacije
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !factorId || code.length !== 6}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Potvrdi
            </Button>
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" /> Odjavi se
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
