import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Users, TrendingUp, Plus, ArrowUpRight, Receipt } from "lucide-react";
import { formatKM, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const { organization } = useAuth();
  const [stats, setStats] = useState({ total: 0, issued: 0, paid: 0, draft: 0, monthTotal: 0, clientCount: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

      const [{ data: invs }, { count: clientCount }] = await Promise.all([
        supabase.from("invoices").select("id, invoice_number, total, status, issue_date, client_id, clients(name)").order("created_at", { ascending: false }),
        supabase.from("clients").select("*", { count: "exact", head: true }),
      ]);

      const list = invs ?? [];
      const monthTotal = list
        .filter((i: any) => i.issue_date >= monthStart && (i.status === "issued" || i.status === "paid"))
        .reduce((s: number, i: any) => s + Number(i.total), 0);

      setStats({
        total: list.length,
        issued: list.filter((i: any) => i.status === "issued").length,
        paid: list.filter((i: any) => i.status === "paid").length,
        draft: list.filter((i: any) => i.status === "draft").length,
        monthTotal,
        clientCount: clientCount ?? 0,
      });
      setRecent(list.slice(0, 5));
      setLoading(false);
    })();
  }, [organization]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Dobrodošli u</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">{organization?.full_name}</h1>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link to="/invoices/new"><Plus className="w-4 h-4 mr-2" />Nova faktura</Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Receipt} label="Ukupno faktura" value={stats.total} accent="primary" />
        <StatCard icon={TrendingUp} label="Izdano ovaj mjesec" value={formatKM(stats.monthTotal)} accent="success" small />
        <StatCard icon={FileText} label="Izdane / Plaćene" value={`${stats.issued} / ${stats.paid}`} />
        <StatCard icon={Users} label="Klijenti" value={stats.clientCount} />
      </div>

      {/* Recent */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display">Nedavne fakture</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/invoices">Sve fakture <ArrowUpRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-6">Učitavanje...</div>
          ) : recent.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              Još nema faktura. <Link to="/invoices/new" className="text-primary font-medium hover:underline">Kreirajte prvu →</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((inv: any) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between py-3 group hover:bg-accent/30 -mx-2 px-2 rounded-md transition-smooth">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium font-mono text-sm">{inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground truncate">{inv.clients?.name ?? "—"} · {formatDate(inv.issue_date)}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-sm font-medium tabular-nums">{formatKM(Number(inv.total))}</div>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, small }: any) {
  return (
    <Card className="border-border/60 hover:shadow-md transition-smooth">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            accent === "primary" ? "bg-primary/10 text-primary" :
            accent === "success" ? "bg-success/15 text-success" :
            "bg-muted text-muted-foreground"
          }`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className={`font-display font-bold tracking-tight ${small ? "text-xl" : "text-2xl"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
