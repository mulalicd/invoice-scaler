import { createRoot } from "react-dom/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import InvoicePrintable from "@/components/InvoicePrintable";

async function loadInvoiceData(invoiceId: string) {
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("*, clients(*), organizations(*)")
    .eq("id", invoiceId)
    .maybeSingle();
  if (error || !inv) throw new Error(error?.message || "Faktura nije pronađena");
  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("position");
  return { invoice: inv, client: (inv as any).clients, organization: (inv as any).organizations, items: items ?? [] };
}

async function renderInvoiceToCanvas(invoiceId: string): Promise<{ canvas: HTMLCanvasElement; invoiceNumber: string }> {
  const { invoice, client, organization, items } = await loadInvoiceData(invoiceId);
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.background = "#fff";
  document.body.appendChild(container);
  const root = createRoot(container);
  await new Promise<void>(resolve => {
    root.render(<InvoicePrintable invoice={invoice} items={items} client={client} organization={organization} />);
    setTimeout(resolve, 250);
  });
  const target = container.firstElementChild as HTMLElement;
  const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  root.unmount();
  container.remove();
  return { canvas, invoiceNumber: invoice.invoice_number };
}

export async function downloadInvoicePdf(invoiceId: string) {
  const { canvas, invoiceNumber } = await renderInvoiceToCanvas(invoiceId);
  const pdf = new jsPDF({ format: "a4", unit: "mm", orientation: "portrait" });
  const w = pdf.internal.pageSize.getWidth();
  const h = (canvas.height * w) / canvas.width;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
  pdf.save(`Faktura-${invoiceNumber.replace(/\//g, "-")}.pdf`);
}

export async function printInvoice(invoiceId: string) {
  const { canvas } = await renderInvoiceToCanvas(invoiceId);
  const dataUrl = canvas.toDataURL("image/png");
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  w.document.write(`<html><head><title>Print</title><style>@page{size:A4;margin:0}body{margin:0}img{width:100%;display:block}</style></head><body><img src="${dataUrl}" onload="setTimeout(()=>{window.print();window.close();},200)"/></body></html>`);
  w.document.close();
}
