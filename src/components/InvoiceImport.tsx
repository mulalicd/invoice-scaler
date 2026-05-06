import { useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Download, Loader2, FileSpreadsheet } from "lucide-react";

function parseDate(v: any): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // Try DD.MM.YYYY
  const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\.?$/);
  if (m) {
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function num(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  return Number(String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".")) || 0;
}

const SHEET_NAME = "Fakture";

export default function InvoiceImport() {
  const { organization } = useAuth();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["invoice_number", "invoice_year", "invoice_seq", "issue_date", "delivery_date", "due_date", "period_text", "client_name", "child_name", "address", "description", "unit", "quantity", "unit_price", "status", "note"],
      ["IDSS 001/26", 2026, 1, "01.04.2026", "01.04.2026", "15.04.2026", "April 2026", "Tarik Jašarević", "Dalija Jašarević", "Skenderpašina 20", "Školarina za april - školska 2026/2027", "srv", 1, 919.16, "issued", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
    XLSX.writeFile(wb, "template-fakture.xlsx");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;
    setBusy(true); setReport(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[SHEET_NAME] || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

      // Group rows by invoice_number → many items per invoice
      const byNumber = new Map<string, { header: any; items: any[] }>();
      for (const r of rows) {
        const number = String(r.invoice_number || "").trim();
        if (!number) continue;
        if (!byNumber.has(number)) byNumber.set(number, { header: r, items: [] });
        const entry = byNumber.get(number)!;
        const qty = num(r.quantity || 1);
        const price = num(r.unit_price);
        entry.items.push({
          description: String(r.description || "").trim() || "Stavka",
          unit: String(r.unit || "srv"),
          quantity: qty,
          unit_price: price,
          total: qty * price,
        });
      }

      const payload: any[] = [];
      for (const [number, { header, items }] of byNumber) {
        const issue = parseDate(header.issue_date);
        const year = Number(header.invoice_year) || (issue ? new Date(issue).getFullYear() : new Date().getFullYear());
        const seq = Number(header.invoice_seq) || (() => { const m = number.match(/(\d+)\s*\//); return m ? Number(m[1]) : 0; })();
        payload.push({
          invoice_number: number,
          invoice_year: year,
          invoice_seq: seq,
          issue_date: issue,
          delivery_date: parseDate(header.delivery_date) || issue,
          due_date: parseDate(header.due_date) || issue,
          period_text: String(header.period_text || "") || null,
          client_name: String(header.client_name || "Nepoznat klijent").trim(),
          status: String(header.status || "issued"),
          note: String(header.note || "") || null,
          items,
        });
      }

      if (payload.length === 0) { toast.error("Nije pronađen nijedan red u listu"); setBusy(false); return; }

      const { data, error } = await supabase.rpc("bulk_import_invoices" as any, {
        _org_id: organization.id, _invoices: payload as any,
      });
      if (error) throw error;
      const r = (data as any)?.[0] || data;
      setReport({ ...r, totalRows: rows.length, invoices: payload.length });
      toast.success(`Importovano ${r?.inserted ?? 0}, preskočeno ${r?.skipped ?? 0}`);
    } catch (err: any) {
      toast.error(err.message || "Greška pri obradi fajla");
    } finally {
      setBusy(false);
      (e.target as HTMLInputElement).value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5"/>Bulk import faktura iz Excel</CardTitle>
        <CardDescription>
          Učitajte .xlsx ili .xlsm fajl. Podržava više stavki po fakturi (jedan red = jedna stavka, grupiše se po koloni <code>invoice_number</code>).
          Ciljna ustanova: <strong>{organization?.code}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2"/>Preuzmi template</Button>
          <Button asChild disabled={busy}>
            <label className="cursor-pointer">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Upload className="w-4 h-4 mr-2"/>}
              Učitaj Excel
              <input type="file" accept=".xlsx,.xlsm,.xls" hidden onChange={handleFile} disabled={busy}/>
            </label>
          </Button>
        </div>
        {report && (
          <div className="text-sm bg-muted p-3 rounded space-y-1">
            <div>Redova u fajlu: <strong>{report.totalRows}</strong></div>
            <div>Faktura prepoznato: <strong>{report.invoices}</strong></div>
            <div>Importovano: <strong className="text-primary">{report.inserted}</strong></div>
            <div>Preskočeno (već postoji): <strong>{report.skipped}</strong></div>
            <div>Auto-kreirani klijenti: <strong>{report.missing_clients}</strong></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
