import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Users, TrendingUp, Plus, ArrowUpRight, Receipt, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatKM, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--muted-foreground))",
  issued: "hsl(var(--primary))",
  paid: "hsl(var(--success))",
  cancelled: "hsl(var(--destructive))",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Nacrt", issued: "Izdana", paid: "Plaćena", cancelled: "Otkazana",
};
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

export default function Dashboard() {
  const { organization, canWrite, isViewer } = useAuth();
  const [invs, setInvs] = useState<any[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    setLoading(true);
    (async () => {
      const [{ data: rows }, { count }] = await Promise.all([
        supabase.from("invoices")
          .select("id, invoice_number, total, status, issue_date, client_id, clients(name)")
          .order("issue_date", { ascending: false }),
        supabase.from("clients").select("*", { count: "exact", head: true }),
      ]);
      setInvs(rows ?? []);
      setClientCount(count ?? 0);
      setLoading(false);
    })();
  }, [organization]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const yearStart = `${now.getFullYear()}-01-01`;
    const billable = (i: any) => i.status === "issued" || i.status === "paid";
    const monthTotal = invs.filter(i => i.issue_date >= monthStart && billable(i)).reduce((s, i) => s + Number(i.total), 0);
    const yearTotal = invs.filter(i => i.issue_date >= yearStart && billable(i)).reduce((s, i) => s + Number(i.total), 0);
    const paidTotal = invs.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
    const outstandingTotal = invs.filter(i => i.status === "issued").reduce((s, i) => s + Number(i.total), 0);
    return {
      total: invs.length,
      issued: invs.filter(i => i.status === "issued").length,
      paid: invs.filter(i => i.status === "paid").length,
      draft: invs.filter(i => i.status === "draft").length,
      cancelled: invs.filter(i => i.status === "cancelled").length,
      monthTotal, yearTotal, paidTotal, outstandingTotal,
    };
  }, [invs]);

  // Revenue last 12 months
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; total: number; paid: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      buckets.push({ key, label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, total: 0, paid: 0 });
    }
    invs.forEach(i => {
      if (!i.issue_date) return;
      const key = i.issue_date.slice(0, 7);
      const b = buckets.find(x => x.key === key);
      if (!b) return;
      if (i.status === "issued" || i.status === "paid") b.total += Number(i.total);
      if (i.status === "paid") b.paid += Number(i.total);
    });
    return buckets;
  }, [invs]);

  // Status distribution
  const statusData = useMemo(() => (
    Object.keys(STATUS_LABELS).map(s => ({
      name: STATUS_LABELS[s],
      key: s,
      value: invs.filter(i => i.status === s).length,
    })).filter(d => d.value > 0)
  ), [invs]);

  // Top 5 clients by revenue
  const topClients = useMemo(() => {
    const m = new Map<string, { name: string; total: number; count: number }>();
    invs.forEach(i => {
      if (i.status !== "issued" && i.status !== "paid") return;
      const name = i.clients?.name ?? "—";
      const cur = m.get(name) ?? { name, total: 0, count: 0 };
      cur.total += Number(i.total); cur.count += 1;
      m.set(name, cur);
    });
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [invs]);

  const recent = invs.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Dobrodošli u</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">{organization?.full_name}</h1>
          {isViewer && <p className="text-xs text-muted-foreground mt-1">Pristupate u režimu pregleda (User).</p>}
        </div>
        {canWrite && (
          <Button asChild size="lg" className="shadow-md">
            <Link to="/invoices/new"><Plus className="w-4 h-4 mr-2" />Nova faktura</Link>
          </Button>
        )}
      </div>

      {/* KPI cards with subtle 3D tilt + gradient glow */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} label="Ovaj mjesec" value={formatKM(stats.monthTotal)} accent="primary" sub={`Godina: ${formatKM(stats.yearTotal)}`} />
        <KpiCard icon={CheckCircle2} label="Plaćeno (ukupno)" value={formatKM(stats.paidTotal)} accent="success" sub={`${stats.paid} faktura`} />
        <KpiCard icon={Clock} label="Otvoreno (izdano)" value={formatKM(stats.outstandingTotal)} accent="warning" sub={`${stats.issued} faktura`} />
        <KpiCard icon={Users} label="Klijenti" value={String(clientCount)} sub={`${stats.total} faktura ukupno`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary"/>Prihodi po mjesecu (12 mjeseci)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIssued" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.45}/>
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11}/>
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => formatKM(Number(v))}
                />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gIssued)" name="Izdano" />
                <Area type="monotone" dataKey="paid" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#gPaid)" name="Plaćeno" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary"/>Raspodjela statusa
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Nema podataka</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {statusData.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top clients + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-lg font-display">Top 5 klijenata po prihodu</CardTitle></CardHeader>
          <CardContent className="h-72">
            {topClients.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Nema podataka</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false}/>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={130}/>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, _n: any, p: any) => [formatKM(Number(v)), `Prihod (${p.payload.count} faktura)`]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
                Još nema faktura. {canWrite && <Link to="/invoices/new" className="text-primary font-medium hover:underline">Kreirajte prvu →</Link>}
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
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent, sub }: any) {
  const accentBg =
    accent === "primary" ? "from-primary/15 to-primary/0 ring-primary/20" :
    accent === "success" ? "from-success/20 to-success/0 ring-success/20" :
    accent === "warning" ? "from-amber-500/20 to-amber-500/0 ring-amber-500/20" :
    "from-muted to-transparent ring-border";
  const iconBg =
    accent === "primary" ? "bg-primary/15 text-primary" :
    accent === "success" ? "bg-success/20 text-success" :
    accent === "warning" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" :
    "bg-muted text-muted-foreground";
  return (
    <Card className={`border-border/60 hover:shadow-elegant hover:-translate-y-0.5 transition-all duration-300 bg-gradient-to-br ${accentBg} ring-1`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="font-display font-bold tracking-tight text-xl">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
