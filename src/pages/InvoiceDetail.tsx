import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Trash2, Mail, CheckCircle2, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatKM, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InvoicePrintable from "@/components/InvoicePrintable";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { canvasToA4Pdf } from "@/lib/invoicePdf";
import { errorMessage } from "@/lib/errorMessage";
import type { InvoiceRow, InvoiceItemRow, ClientRow, InvoiceStatus } from "@/lib/domain";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization, isAdmin, canWrite } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!id) return;
    const { data: inv } = await supabase.from("invoices").select("*, clients(*)").eq("id", id).maybeSingle();
    if (!inv) { setLoading(false); return; }
    const { clients: joinedClient, ...invoiceOnly } = inv as InvoiceRow & { clients: ClientRow | null };
    setInvoice(invoiceOnly as InvoiceRow);
    setClient(joinedClient);
    const { data: its } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position");
    setItems((its ?? []) as InvoiceItemRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status: string) => {
    if (!canWrite) return toast.error("Nemate ovlaštenje za izmjenu statusa");
    const { error } = await supabase.from("invoices").update({ status: status as InvoiceStatus }).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Status ažuriran"); load();
  };

  const remove = async () => {
    if (!canWrite) return toast.error("Nemate ovlaštenje za brisanje");
    if (!confirm(`Obrisati fakturu ${invoice?.invoice_number}?`)) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Obrisano"); navigate("/invoices");
  };

  const generatePdfBlob = async (): Promise<{ blob: Blob; filename: string } | null> => {
    if (!printRef.current || !invoice) return null;
    const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const pdf = canvasToA4Pdf(canvas);
    const filename = `Faktura-${invoice.invoice_number.replace(/\//g, "-")}.pdf`;
    return { blob: pdf.output("blob"), filename };
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const result = await generatePdfBlob();
      if (!result) return;
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF preuzet");
    } finally { setPdfBusy(false); }
  };

  const sendEmail = async () => {
    if (!canWrite) return toast.error("Nemate ovlaštenje za slanje");
    if (!client?.email) return toast.error("Klijent nema email adresu");
    if (!invoice) return;
    if (!confirm(`Poslati fakturu na ${client.email}?`)) return;
    setEmailBusy(true);
    try {
      const result = await generatePdfBlob();
      if (!result) throw new Error("PDF ne može biti generiran");
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject; reader.readAsDataURL(result.blob);
      });
      const base64 = dataUrl.split(",")[1];

      const { error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoiceId: invoice.id,
          recipientEmail: client.email,
          recipientName: client.name,
          invoiceNumber: invoice.invoice_number,
          totalAmount: Number(invoice.total),
          dueDate: invoice.due_date,
          pdfBase64: base64,
          pdfFilename: result.filename,
        },
      });
      if (error) throw error;
      toast.success(`Faktura poslana na ${client.email}`);
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Greška slanja"));
    } finally { setEmailBusy(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!invoice) return <div className="text-center py-20 text-muted-foreground">Faktura nije pronađena.</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/invoices"><ArrowLeft className="w-4 h-4" /></Link></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-bold font-mono">{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-muted-foreground text-sm">{client?.name} · {formatDate(invoice.issue_date)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={invoice.status} onValueChange={updateStatus} disabled={!canWrite}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Nacrt</SelectItem>
              <SelectItem value="issued">Izdana</SelectItem>
              <SelectItem value="paid">Plaćena</SelectItem>
              <SelectItem value="cancelled">Otkazana</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</Button>
          <Button variant="outline" size="sm" onClick={downloadPdf} disabled={pdfBusy}>
            {pdfBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}PDF
          </Button>
          {canWrite && (
            <Button size="sm" onClick={sendEmail} disabled={emailBusy || !client?.email}>
              {emailBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}Pošalji email
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          )}
        </div>
      </div>

      {invoice.status === "draft" && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-warning" />
          Ova faktura je nacrt — prebacite na "Izdana" kada je spremna za slanje.
        </div>
      )}

      <Card className="shadow-card border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto print:overflow-visible">
            <div ref={printRef} className="mx-auto" style={{ width: "210mm" }}>
              <InvoicePrintable
                invoice={invoice} items={items} client={client} organization={organization!}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
