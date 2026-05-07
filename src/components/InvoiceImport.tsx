import { useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Download, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";

const REQUIRED = ["invoice_number", "client_name", "issue_date", "description", "unit_price"] as const;
const ALLOWED_STATUS = new Set(["draft", "issued", "paid", "cancelled"]);
const SHEET_NAME = "Fakture";

type RowError = { row: number; column?: string; value?: any; reason: string };

function parseDate(v: any): { value: string | null; ok: boolean; reason?: string } {
  if (v === null || v === undefined || v === "") return { value: null, ok: true };
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return { value: null, ok: false, reason: "Nevažeći Excel datum" };
    return { value: `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`, ok: true };
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\.?$/);
  if (m) {
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return { value: `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`, ok: true };
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return { value: d.toISOString().slice(0, 10), ok: true };
  return { value: null, ok: false, reason: `Nepoznat format datuma: "${s}" (očekivano DD.MM.YYYY)` };
}

function parseNum(v: any): { value: number; ok: boolean; reason?: string } {
  if (v === null || v === undefined || v === "") return { value: 0, ok: true };
  if (typeof v === "number") return { value: v, ok: true };
  const cleaned = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!isFinite(n)) return { value: 0, ok: false, reason: `Nije broj: "${v}"` };
  return { value: n, ok: true };
}

export default function InvoiceImport() {
  const { organization } = useAuth();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<RowError[]>([]);

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
    setBusy(true); setReport(null); setValidationErrors([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[SHEET_NAME] || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

      // Validate header columns
      const firstRow = rows[0] ?? {};
      const missingHeaders = REQUIRED.filter(c => !(c in firstRow));
      if (missingHeaders.length > 0) {
        toast.error(`Nedostaju obavezne kolone: ${missingHeaders.join(", ")}`);
        setBusy(false); return;
      }

      const errors: RowError[] = [];
      const byNumber = new Map<string, { header: any; items: any[]; firstRow: number }>();

      rows.forEach((r, idx) => {
        const excelRow = idx + 2; // header is row 1
        const number = String(r.invoice_number || "").trim();
        if (!number) {
          errors.push({ row: excelRow, column: "invoice_number", reason: "Obavezno polje je prazno" });
          return;
        }
        if (!String(r.client_name || "").trim()) {
          errors.push({ row: excelRow, column: "client_name", reason: "Obavezno polje je prazno" });
          return;
        }
        const issue = parseDate(r.issue_date);
        if (!issue.ok) { errors.push({ row: excelRow, column: "issue_date", value: r.issue_date, reason: issue.reason! }); return; }
        const delivery = parseDate(r.delivery_date);
        if (!delivery.ok) { errors.push({ row: excelRow, column: "delivery_date", value: r.delivery_date, reason: delivery.reason! }); return; }
        const due = parseDate(r.due_date);
        if (!due.ok) { errors.push({ row: excelRow, column: "due_date", value: r.due_date, reason: due.reason! }); return; }
        const qty = parseNum(r.quantity || 1);
        if (!qty.ok) { errors.push({ row: excelRow, column: "quantity", value: r.quantity, reason: qty.reason! }); return; }
        const price = parseNum(r.unit_price);
        if (!price.ok) { errors.push({ row: excelRow, column: "unit_price", value: r.unit_price, reason: price.reason! }); return; }
        const status = String(r.status || "issued").trim().toLowerCase();
        if (!ALLOWED_STATUS.has(status)) {
          errors.push({ row: excelRow, column: "status", value: r.status, reason: `Status mora biti jedan od: ${[...ALLOWED_STATUS].join(", ")}` });
          return;
        }
        const desc = String(r.description || "").trim();
        if (!desc) {
          errors.push({ row: excelRow, column: "description", reason: "Opis stavke je obavezan" });
          return;
        }

        if (!byNumber.has(number)) byNumber.set(number, { header: { ...r, _issue: issue.value, _delivery: delivery.value, _due: due.value, _status: status }, items: [], firstRow: excelRow });
        const entry = byNumber.get(number)!;
        entry.items.push({
          description: desc,
          unit: String(r.unit || "srv"),
          quantity: qty.value,
          unit_price: price.value,
          total: qty.value * price.value,
        });
      });

      const payload: any[] = [];
      for (const [number, { header, items, firstRow }] of byNumber) {
        const issue = header._issue;
        const year = Number(header.invoice_year) || (issue ? new Date(issue).getFullYear() : new Date().getFullYear());
        const m = number.match(/(\d+)\s*\//);
        const seq = Number(header.invoice_seq) || (m ? Number(m[1]) : 0);
        payload.push({
          _row: String(firstRow),
          invoice_number: number,
          invoice_year: year,
          invoice_seq: seq,
          issue_date: issue,
          delivery_date: header._delivery || issue,
          due_date: header._due || issue,
          period_text: String(header.period_text || "") || null,
          client_name: String(header.client_name || "").trim(),
          contact_person: String(header.client_name || "").trim(),
          address: String(header.address || "") || null,
          child_name: String(header.child_name || "") || null,
          status: header._status,
          note: String(header.note || "") || null,
          items,
        });
      }

      setValidationErrors(errors);

      if (payload.length === 0) {
        toast.error("Nijedan red nije validan za uvoz");
        setReport({ totalRows: rows.length, invoices: 0, inserted: 0, skipped: 0, missing_clients: 0, errors: errors.length, error_details: [], skipped_details: [] });
        setBusy(false); return;
      }

      const { data, error } = await supabase.rpc("bulk_import_invoices_detailed" as any, {
        _org_id: organization.id, _invoices: payload as any,
      });
      if (error) throw error;
      const r: any = data || {};
      setReport({
        totalRows: rows.length,
        invoices: payload.length,
        inserted: r.inserted ?? 0,
        skipped: r.skipped ?? 0,
        missing_clients: r.missing_clients ?? 0,
        errors: (r.errors ?? 0) + errors.length,
        error_details: r.error_details ?? [],
        skipped_details: r.skipped_details ?? [],
      });
      toast.success(`Importovano ${r.inserted ?? 0}, preskočeno ${r.skipped ?? 0}, grešaka ${(r.errors ?? 0) + errors.length}`);
    } catch (err: any) {
      toast.error(err.message || "Greška pri obradi fajla");
    } finally {
      setBusy(false);
      (e.target as HTMLInputElement).value = "";
    }
  };

  const downloadErrorReport = () => {
    if (!report) return;
    const rows = [
      ["Tip", "Red u Excelu", "Kolona", "Vrijednost", "Broj fakture", "Razlog"],
      ...validationErrors.map(e => ["Validacija", e.row, e.column ?? "", String(e.value ?? ""), "", e.reason]),
      ...(report.error_details || []).map((e: any) => ["DB greška", e.row ?? "", "", "", e.invoice_number ?? "", e.reason]),
      ...(report.skipped_details || []).map((e: any) => ["Preskočeno", e.row ?? "", "", "", e.invoice_number ?? "", e.reason]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Greske");
    XLSX.writeFile(wb, "import-greske.xlsx");
  };

  const totalIssues = validationErrors.length + (report?.error_details?.length ?? 0) + (report?.skipped_details?.length ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5"/>Bulk import faktura iz Excel</CardTitle>
        <CardDescription>
          Učitajte .xlsx ili .xlsm fajl. Jedan red = jedna stavka, grupiše se po koloni <code>invoice_number</code>.
          Obavezne kolone: {REQUIRED.join(", ")}. Datumi: <code>DD.MM.YYYY</code>. Brojevi: zarez ili tačka kao decimalni separator.
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
          {report && totalIssues > 0 && (
            <Button variant="outline" onClick={downloadErrorReport}>
              <Download className="w-4 h-4 mr-2"/>Preuzmi izvještaj grešaka
            </Button>
          )}
        </div>

        {report && (
          <div className="text-sm bg-muted p-3 rounded space-y-1">
            <div>Redova u fajlu: <strong>{report.totalRows}</strong></div>
            <div>Faktura prepoznato: <strong>{report.invoices}</strong></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600"/>Importovano: <strong className="text-primary">{report.inserted}</strong></div>
            <div>Preskočeno (idempotentno): <strong>{report.skipped}</strong></div>
            <div>Auto-kreirani klijenti: <strong>{report.missing_clients}</strong></div>
            {report.errors > 0 && (
              <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4"/>Grešaka: <strong>{report.errors}</strong></div>
            )}
          </div>
        )}

        {totalIssues > 0 && (
          <div className="border border-destructive/30 rounded">
            <div className="px-3 py-2 bg-destructive/10 text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive"/>Detaljan izvještaj ({totalIssues})
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1">Tip</th>
                    <th className="text-left px-2 py-1">Red</th>
                    <th className="text-left px-2 py-1">Kolona</th>
                    <th className="text-left px-2 py-1">Faktura</th>
                    <th className="text-left px-2 py-1">Razlog</th>
                  </tr>
                </thead>
                <tbody>
                  {validationErrors.map((e, i) => (
                    <tr key={`v${i}`} className="border-t">
                      <td className="px-2 py-1 text-destructive">Validacija</td>
                      <td className="px-2 py-1 font-mono">{e.row}</td>
                      <td className="px-2 py-1 font-mono">{e.column}</td>
                      <td className="px-2 py-1">—</td>
                      <td className="px-2 py-1">{e.reason}</td>
                    </tr>
                  ))}
                  {(report?.error_details ?? []).map((e: any, i: number) => (
                    <tr key={`d${i}`} className="border-t">
                      <td className="px-2 py-1 text-destructive">DB</td>
                      <td className="px-2 py-1 font-mono">{e.row}</td>
                      <td className="px-2 py-1">—</td>
                      <td className="px-2 py-1 font-mono">{e.invoice_number}</td>
                      <td className="px-2 py-1">{e.reason}</td>
                    </tr>
                  ))}
                  {(report?.skipped_details ?? []).map((e: any, i: number) => (
                    <tr key={`s${i}`} className="border-t">
                      <td className="px-2 py-1 text-amber-600">Preskočeno</td>
                      <td className="px-2 py-1 font-mono">{e.row}</td>
                      <td className="px-2 py-1">—</td>
                      <td className="px-2 py-1 font-mono">{e.invoice_number}</td>
                      <td className="px-2 py-1">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
