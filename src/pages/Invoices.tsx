import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Download, Printer, Loader2 } from "lucide-react";
import { formatKM, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { downloadInvoicePdf, printInvoice } from "@/lib/invoicePdf";
import { toast } from "sonner";

export default function Invoices() {
  const { organization } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handlePdf = async (id: string) => {
    setBusyId(id);
    try { await downloadInvoicePdf(id); toast.success("PDF preuzet"); }
    catch (e: any) { toast.error(e.message || "Greška PDF"); }
    finally { setBusyId(null); }
  };
  const handlePrint = async (id: string) => {
    setBusyId(id);
    try { await printInvoice(id); }
    catch (e: any) { toast.error(e.message || "Greška print"); }
    finally { setBusyId(null); }
  };

  useEffect(() => {
    if (!organization) return;
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, status, issue_date, due_date, period_text, clients(name)")
        .order("issue_date", { ascending: false })
        .order("invoice_seq", { ascending: false });
      setList(data ?? []);
    })();
  }, [organization]);

  const filtered = list.filter(i => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return i.invoice_number.toLowerCase().includes(q) || i.clients?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Fakture</h1>
          <p className="text-muted-foreground text-sm">{list.length} ukupno</p>
        </div>
        <Button asChild><Link to="/invoices/new"><Plus className="w-4 h-4 mr-2" />Nova faktura</Link></Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Pretraži po broju ili klijentu..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi statusi</SelectItem>
            <SelectItem value="draft">Nacrt</SelectItem>
            <SelectItem value="issued">Izdana</SelectItem>
            <SelectItem value="paid">Plaćena</SelectItem>
            <SelectItem value="cancelled">Otkazana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              {list.length === 0 ? "Još nema faktura. Kreirajte prvu!" : "Nema rezultata."}
            </div>
          ) : (
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Broj</th>
                    <th className="text-left font-medium px-5 py-3">Klijent</th>
                    <th className="text-left font-medium px-5 py-3">Datum izdavanja</th>
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
