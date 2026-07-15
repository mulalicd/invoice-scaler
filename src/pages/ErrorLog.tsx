import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bug, Download, RefreshCw, Search, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { redactString, redactValue, maskEmail } from "@/lib/redact";

interface Row {
  id: string;
  created_at: string;
  user_email: string | null;
  user_id: string | null;
  message: string;
  source: string | null;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  context: Record<string, unknown> | null;
  organization_id: string | null;
}

const parseUrl = (raw: string | null) => {
  if (!raw) return { route: null as string | null, query: {} as Record<string, string> };
  try {
    const u = new URL(raw);
    const q: Record<string, string> = {};
    u.searchParams.forEach((v, k) => { q[k] = v; });
    return { route: u.pathname, query: q };
  } catch { return { route: raw, query: {} }; }
};

export default function ErrorLog() {
  const { isAdmin, isSuperadmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("error_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as unknown as Row[]);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const filtered = useMemo(() => rows.filter(r => {
    if (src && !(r.source ?? "").toLowerCase().includes(src.toLowerCase())) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      (r.message ?? "").toLowerCase().includes(needle) ||
      (r.user_email ?? "").toLowerCase().includes(needle) ||
      (r.url ?? "").toLowerCase().includes(needle) ||
      JSON.stringify(r.context ?? {}).toLowerCase().includes(needle)
    );
  }), [rows, q, src]);

  const display = (s: string | null) => showRaw ? (s ?? "") : redactString(s);
  const displayEmail = (s: string | null) => showRaw ? (s ?? "") : (s ? maskEmail(s) : "");
  const displayCtx = (c: unknown): Record<string, unknown> => {
    const ctx = (showRaw ? c : redactValue(c)) as Record<string, unknown> | null | undefined;
    return ctx ?? {};
  };

  const exportCsv = () => {
    const header = ["created_at","user_email","source","route","query","organization_id","roles","message","url","request_id","stack"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    const csv = [header.join(",")].concat(
      filtered.map(r => {
        const c = displayCtx(r.context) ?? {};
        const { route, query } = parseUrl(r.url);
        const rid = c?.request_id ?? c?.requestId ?? c?.code ?? "";
        const roles = Array.isArray(c?.roles) ? c.roles.join("|") : (c?.role ?? "");
        return [
          r.created_at, displayEmail(r.user_email), r.source,
          c?.route ?? route, JSON.stringify(query), c?.organization_id ?? r.organization_id ?? "",
          roles, display(r.message), display(r.url), rid, display(r.stack),
        ].map(escape).join(",");
      })
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `error-log-${showRaw ? "raw" : "redacted"}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <Card className="max-w-xl mx-auto mt-12 border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle>Pristup odbijen</CardTitle>
          <CardDescription>Dnevnik grešaka dostupan je samo administratorima i superadminu.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Bug className="w-6 h-6 text-destructive"/>Dnevnik grešaka</h1>
          <p className="text-muted-foreground text-sm">Posljednjih 500 zapisa {isSuperadmin && "(svih organizacija)"}. Osjetljivi podaci su {showRaw ? "vidljivi" : "maskirani"}.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowRaw(s => !s)}>
            {showRaw ? <EyeOff className="w-4 h-4 mr-2"/> : <Eye className="w-4 h-4 mr-2"/>}
            {showRaw ? "Maskiraj" : "Otkrij (oprezno)"}
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4 mr-2"/>Osvježi</Button>
          <Button onClick={exportCsv} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2"/>Izvoz CSV ({filtered.length})</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input className="pl-10" placeholder="Pretraži po poruci, korisniku, URL-u, kontekstu..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Input placeholder="Filter po izvoru (npr. AuthContext)" value={src} onChange={e => setSrc(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/>Učitavanje...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Nema zapisanih grešaka.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(r => {
                const isOpen = expanded === r.id;
                const ctx = displayCtx(r.context) ?? {};
                const rid = ctx?.request_id ?? ctx?.requestId ?? ctx?.code;
                const { route, query } = parseUrl(r.url);
                const orgId = ctx?.organization_id ?? r.organization_id;
                const roles = Array.isArray(ctx?.roles) ? ctx.roles : (ctx?.role ? [ctx.role] : []);
                return (
                  <div key={r.id} className="p-4 hover:bg-accent/20 transition-smooth">
                    <button className="w-full text-left" onClick={() => setExpanded(isOpen ? null : r.id)}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">{r.source ?? "—"}</Badge>
                          {rid && <Badge variant="secondary" className="font-mono text-xs">req: {String(rid)}</Badge>}
                          {(ctx?.route ?? route) && <Badge variant="outline" className="text-xs">route: {ctx?.route ?? route}</Badge>}
                          {orgId && <Badge variant="outline" className="text-xs">org: {String(orgId).slice(0, 8)}…</Badge>}
                          {roles.map((rl: string, i: number) => <Badge key={i} variant="outline" className="text-xs">role: {rl}</Badge>)}
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("bs-BA")}</span>
                          <span className="text-xs text-muted-foreground">· {displayEmail(r.user_email) || "anon"}</span>
                        </div>
                        <div className="text-sm font-medium break-words">{display(r.message)}</div>
                        {r.url && <div className="text-xs text-muted-foreground truncate mt-1">{display(r.url)}</div>}
                        {Object.keys(query).length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">query: {Object.entries(query).map(([k,v]) => `${k}=${showRaw ? v : redactString(v)}`).join(" · ")}</div>
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="mt-3 space-y-2 text-xs">
                        {r.stack && (
                          <div>
                            <div className="font-semibold mb-1">Stack trace</div>
                            <pre className="bg-muted p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap">{display(r.stack)}</pre>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold mb-1">Kontekst</div>
                          <pre className="bg-muted p-3 rounded overflow-auto max-h-48">{JSON.stringify(ctx, null, 2)}</pre>
                        </div>
                        {r.user_agent && <div className="text-muted-foreground">UA: {r.user_agent}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
