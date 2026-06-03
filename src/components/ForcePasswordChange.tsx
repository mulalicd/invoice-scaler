import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { validatePassword, PASSWORD_RULES_TEXT } from "@/lib/passwordPolicy";

export default function ForcePasswordChange() {
  const { profile, refresh, signOut } = useAuth();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validatePassword(pwd, pwd2);
    if (!check.ok) return toast.error(check.error!);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) { setBusy(false); return toast.error(error.message); }
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ must_change_password: false } as any)
      .eq("id", profile!.id);
    setBusy(false);
    if (pErr) return toast.error(pErr.message);
    toast.success("Lozinka uspješno postavljena");
    await refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(213,60%,18%)] to-[hsl(220,40%,8%)]">
      <Card className="w-full max-w-md shadow-elegant border-white/10 bg-card/95 backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl">Obavezna promjena lozinke</CardTitle>
          <CardDescription>
            Prijavljeni ste s privremenom lozinkom. Iz sigurnosnih razloga morate postaviti novu lozinku prije nastavka.
          </CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nova lozinka</Label>
              <Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder={PASSWORD_RULES_TEXT} required />
              <p className="text-xs text-muted-foreground">{PASSWORD_RULES_TEXT}</p>
            </div>
            <div className="space-y-2">
              <Label>Potvrdi lozinku</Label>
              <Input type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} required />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={busy} className="flex-1">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Postavi novu lozinku
              </Button>
              <Button type="button" variant="ghost" onClick={signOut}>Odjava</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
