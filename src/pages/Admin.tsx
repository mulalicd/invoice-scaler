import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Shield, AlertTriangle } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function Admin() {
  const { isAdmin, isSuperadmin, organization, refresh } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<{ clients: number; invoices: number } | null>(null);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    if (!organization) return;
    (async () => {
      const [{ count: c }, { count: i }, { data: a }] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", organization.id),
        supabase.from("invoices").select("*", { count: "exact", head: true }).eq("organization_id", organization.id),
        supabase.from("audit_log").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setStats({ clients: c ?? 0, invoices: i ?? 0 });
      setAudit(a ?? []);
    })();
  }, [organization, busy]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleWipe = async () => {
    if (!organization) return;
    if (confirm !== "OBRISI SVE PODATKE") { toast.error("Pogrešna potvrda"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("wipe_org_data" as any, { _org_id: organization.id, _confirm: confirm });
    setBusy(false); setConfirm("");
    if (error) { toast.error(error.message); return; }
    toast.success(`Obrisano: ${(data as any)?.invoices_deleted} faktura, ${(data as any)?.clients_deleted} klijenata`);
    refresh();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Administracija</h1>
        <p className="text-muted-foreground">Aktivna organizacija: <strong>{organization?.code}</strong> {isSuperadmin && <span className="text-primary">• Superadmin</span>}</p>
      </div>

      {stats && (
        <Card>
          <CardHeader><CardTitle>Pregled</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><div className="text-3xl font-bold">{stats.clients}</div><div className="text-sm text-muted-foreground">Klijenti</div></div>
            <div><div className="text-3xl font-bold">{stats.invoices}</div><div className="text-sm text-muted-foreground">Fakture</div></div>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5"/>Opasna zona — Brisanje svih podataka</CardTitle>
          <CardDescription>Trajno briše SVE klijente, fakture i stavke aktivne organizacije ({organization?.code}). Audit log ostaje. Ova akcija se ne može poništiti.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">Za potvrdu upišite: <code className="bg-muted px-2 py-0.5 rounded">OBRISI SVE PODATKE</code></p>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Upišite potvrdu" />
          <Button variant="destructive" disabled={busy || confirm !== "OBRISI SVE PODATKE"} onClick={handleWipe}>
            <Trash2 className="w-4 h-4 mr-2"/> Obriši sve podatke ({organization?.code})
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5"/>Dnevnik aktivnosti</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {audit.length === 0 && <p className="text-muted-foreground">Nema zapisa.</p>}
            {audit.map((a) => (
              <div key={a.id} className="flex justify-between border-b pb-1">
                <div><strong>{a.action}</strong> <span className="text-muted-foreground">{a.entity_type}</span></div>
                <div className="text-muted-foreground text-xs">{a.user_email} · {new Date(a.created_at).toLocaleString("bs-BA")}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
