import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Download, Printer, Loader2, X, FileDown } from "lucide-react";
import { formatKM, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { downloadInvoicePdf, printInvoice } from "@/lib/invoicePdf";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errorMessage";
import type { InvoiceListRow } from "@/lib/domain";

export default function Invoices() {
  const { organization, canWrite } = useAuth();
  const [list, setList] = useState<InvoiceListRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handlePdf = async (id: string) => {
    setBusyId(id);
    try { await downloadInvoicePdf(id); toast.success("PDF preuzet"); }
    catch (e: unknown) { toast.error(errorMessage(e, "Greška PDF")); }
    finally { setBusyId(null); }
  };
  const handlePrint = async (id: string) => {
    setBusyId(id);
    try { await printInvoice(id); }
    catch (e: unknown) { toast.error(errorMessage(e, "Greška print")); }
    finally { setBusyId(null); }
  };

  useEffect(() => {
    if (!organization) return;
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, status, issue_date, due_date, period_text, clients(name, jib, jmbg)")
        .eq("organization_id", organization.id)
        .order("issue_date", { ascending: false })
        .order("invoice_seq", { ascending: false });
      setList((data ?? []) as unknown as InvoiceListRow[]);
    })();
  }, [organization]);

  const filtered = useMemo(() => list.filter(i => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (from && i.issue_date < from) return false;
    if (to && i.issue_date > to) return false;
    if (!search) return true;
    const q = search.toLowerCase().trim();
    return (
      (i.invoice_number ?? "").toLowerCase().includes(q) ||
      (i.clients?.name ?? "").toLowerCase().includes(q) ||
      (i.clients?.jib ?? "").includes(q) ||
      (i.clients?.jmbg ?? "").includes(q) ||
      (i.period_text ?? "").toLowerCase().includes(q)
    );
  }), [list, search, statusFilter, from, to]);

  const totals = useMemo(() => {
    const sum = filtered.reduce((s, i) => s + Number(i.total), 0);
    const paid = filtered.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
    return { sum, paid, count: filtered.length };
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Broj","Klijent","JIB","Datum","Period","Iznos","Status"];
    const rows = filtered.map(i => [
      i.invoice_number, i.clients?.name ?? "", i.clients?.jib ?? "",
      i.issue_date, i.period_text ?? "", String(i.total).replace(".", ","), i.status,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).split('"').join('""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fakture-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Izvezeno ${filtered.length} faktura`);
  };

  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setFrom(""); setTo(""); };
  const hasActiveFilter = !!(search || from || to || statusFilter !== "all");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Fakture</h1>
          <p className="text-muted-foreground text-sm">
            {totals.count} {totals.count === 1 ? "faktura" : "faktura"} · {formatKM(totals.sum)} ukupno · {formatKM(totals.paid)} plaćeno
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <FileDown className="w-4 h-4 mr-2"/>Izvoz CSV
          </Button>
          {canWrite && (
            <Button asChild><Link to="/invoices/new"><Plus className="w-4 h-4 mr-2" />Nova faktura</Link></Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="relative flex-1 min-w-[220px]">
            <label className="text-xs text-muted-foreground mb-1 block">Pretraga (broj, klijent, JIB, period)</label>
            <Search className="absolute left-3 top-[34px] w-4 h-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="2024-001, Acme, 4200..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="draft">Nacrt</SelectItem>
                <SelectItem value="issued">Izdana</SelectItem>
                <SelectItem value="paid">Plaćena</SelectItem>
                <SelectItem value="cancelled">Otkazana</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Datum od</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full lg:w-40"/>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Datum do</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full lg:w-40"/>
          </div>
          {hasActiveFilter && (
            <Button variant="ghost" onClick={clearFilters} title="Poništi filtere">
              <X className="w-4 h-4 mr-1"/>Reset
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              {list.length === 0 ? "Još nema faktura." : "Nema rezultata za zadane filtere."}
            </div>
          ) : (
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Broj</th>
                    <th className="text-left font-medium px-5 py-3">Klijent</th>
                    <th className="text-left font-medium px-5 py-3">JIB</th>
                    <th className="text-left font-medium px-5 py-3">Datum</th>
                    <th className="text-left font-medium px-5 py-3">Period</th>
                    <th className="text-right font-medium px-5 py-3">Iznos</th>
                    <th className="text-left font-medium px-5 py-3">Status</th>
                    <th className="text-right font-medium px-5 py-3">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(i => (
                    <tr key={i.id} className="hover:bg-accent/30 transition-smooth">
                      <td className="px-5 py-3 font-mono font-medium">
                        <Link to={`/invoices/${i.id}`}>{i.invoice_number}</Link>
                      </td>
                      <td className="px-5 py-3"><Link to={`/invoices/${i.id}`}>{i.clients?.name}</Link></td>
                      <td className="px-5 py-3 text-muted-foreground text-xs font-mono">{i.clients?.jib ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground"><Link to={`/invoices/${i.id}`}>{formatDate(i.issue_date)}</Link></td>
                      <td className="px-5 py-3 text-muted-foreground"><Link to={`/invoices/${i.id}`}>{i.period_text || "—"}</Link></td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums"><Link to={`/invoices/${i.id}`}>{formatKM(Number(i.total))}</Link></td>
                      <td className="px-5 py-3"><Link to={`/invoices/${i.id}`}><StatusBadge status={i.status} /></Link></td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" title="PDF" disabled={busyId === i.id} onClick={() => handlePdf(i.id)}>
                          {busyId === i.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                        </Button>
                        <Button variant="ghost" size="icon" title="Štampa" disabled={busyId === i.id} onClick={() => handlePrint(i.id)}>
                          <Printer className="w-4 h-4"/>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {filtered.map(i => (
              <Link key={i.id} to={`/invoices/${i.id}`} className="block p-4 hover:bg-accent/30">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-mono font-medium">{i.invoice_number}</div>
                  <StatusBadge status={i.status} />
                </div>
                <div className="text-sm">{i.clients?.name}</div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{formatDate(i.issue_date)}</span>
                  <span className="font-medium tabular-nums text-foreground">{formatKM(Number(i.total))}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
