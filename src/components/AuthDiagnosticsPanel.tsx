import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { maskEmail } from "@/lib/redact";

interface DiagState {
  hasCookie: boolean;
  cookieNames: string[];
  sessionUserId: string | null;
  sessionEmail: string | null;
  expiresAt: number | null;
  refreshTokenPresent: boolean;
  accessTokenPresent: boolean;
}

const readCookies = (): string[] => {
  if (typeof document === "undefined") return [];
  return document.cookie.split(";").map(c => c.trim().split("=")[0]).filter(Boolean);
};

export default function AuthDiagnosticsPanel() {
  const { user, profile, organization, organizations, roleEntries, authError, refresh } = useAuth();
  const [diag, setDiag] = useState<DiagState | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const cookies = readCookies();
    setDiag({
      hasCookie: cookies.some(n => n.startsWith("sb-") || n.includes("supabase")),
      cookieNames: cookies,
      sessionUserId: data.session?.user?.id ?? null,
      sessionEmail: data.session?.user?.email ?? null,
      expiresAt: data.session?.expires_at ?? null,
      refreshTokenPresent: Boolean(data.session?.refresh_token),
      accessTokenPresent: Boolean(data.session?.access_token),
    });
    setLoading(false);
  };

  useEffect(() => { run(); }, []);

  const expiresIn = diag?.expiresAt ? Math.round(diag.expiresAt - Date.now() / 1000) : null;
  const expiresSoon = expiresIn !== null && expiresIn < 300;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5"/>Dijagnostika autentikacije</CardTitle>
            <CardDescription>Provjeri zašto se prijava ili dohvat podataka ne uspije.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={run} disabled={loading}><RefreshCw className="w-4 h-4 mr-2"/>Osvježi</Button>
            <Button size="sm" variant="secondary" onClick={refresh}>Reload profila</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid sm:grid-cols-2 gap-3">
          <Row label="Korisnik (auth.uid)" value={user?.id ?? "—"} mono />
          <Row label="E-mail sesije" value={diag?.sessionEmail ? maskEmail(diag.sessionEmail) : "—"} />
          <Row label="Session aktivna" value={diag?.sessionUserId ? "DA" : "NE"} ok={!!diag?.sessionUserId} />
          <Row label="Cookie postavljen" value={diag?.hasCookie ? "DA" : "NE"} ok={!!diag?.hasCookie} />
          <Row label="Access token" value={diag?.accessTokenPresent ? "prisutan" : "—"} ok={!!diag?.accessTokenPresent} />
          <Row label="Refresh token" value={diag?.refreshTokenPresent ? "prisutan" : "—"} ok={!!diag?.refreshTokenPresent} />
          <Row label="Ističe za (s)" value={expiresIn !== null ? String(expiresIn) : "—"} warn={expiresSoon} />
          <Row label="Aktivna organizacija" value={organization ? `${organization.code} — ${organization.name}` : "—"} />
        </div>

        <div>
          <div className="text-xs uppercase text-muted-foreground mb-1">Uloge ({roleEntries.length})</div>
          <div className="flex flex-wrap gap-2">
            {roleEntries.length === 0 && <span className="text-muted-foreground">— bez uloga —</span>}
            {roleEntries.map((r, i) => (
              <Badge key={i} variant="outline" className="font-mono text-xs">
                {r.role}{r.organization_id ? ` @ ${r.organization_id.slice(0,8)}…` : " (global)"}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase text-muted-foreground mb-1">Organizacije ({organizations.length})</div>
          <div className="flex flex-wrap gap-2">
            {organizations.map(o => (
              <Badge key={o.id} variant={o.id === organization?.id ? "default" : "secondary"} className="text-xs">
                {o.code}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase text-muted-foreground mb-1">Profil</div>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
{JSON.stringify({
  id: profile?.id ?? null,
  email: profile?.email ? maskEmail(profile.email) : null,
  organization_id: profile?.organization_id ?? null,
  active_organization_id: (profile as any)?.active_organization_id ?? null,
  must_change_password: profile?.must_change_password ?? null,
}, null, 2)}
          </pre>
        </div>

        {authError ? (
          <div className="flex items-start gap-2 p-3 rounded border border-destructive/40 bg-destructive/5">
            <ShieldAlert className="w-4 h-4 text-destructive mt-0.5"/>
            <div className="text-xs"><div className="font-semibold">Auth/RLS greška</div><pre className="whitespace-pre-wrap">{authError}</pre></div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-600"><ShieldCheck className="w-4 h-4"/>Nema aktivnih grešaka.</div>
        )}

        {diag?.cookieNames.length ? (
          <div className="text-xs text-muted-foreground">Cookies: {diag.cookieNames.join(", ")}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, mono, ok, warn }: { label: string; value: string; mono?: boolean; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-muted/40">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={[mono ? "font-mono text-xs" : "text-sm", ok === true ? "text-emerald-600" : "", ok === false ? "text-destructive" : "", warn ? "text-amber-600" : ""].join(" ")}>
        {value}
      </span>
    </div>
  );
}
