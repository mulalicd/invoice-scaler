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

/** Paginate a tall canvas into multiple A4 pages without cutting content. */
export function canvasToA4Pdf(canvas: HTMLCanvasElement): jsPDF {
  const pdf = new jsPDF({ format: "a4", unit: "mm", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const pxPerMm = canvas.width / pageW;
  const pageHpx = Math.floor(pageH * pxPerMm);

  if (canvas.height <= pageHpx) {
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageW, (canvas.height * pageW) / canvas.width);
    return pdf;
  }

  let y = 0;
  let first = true;
  while (y < canvas.height) {
    const sliceH = Math.min(pageHpx, canvas.height - y);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceH;
    const ctx = slice.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    if (!first) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageW, (sliceH * pageW) / canvas.width);
    first = false;
    y += sliceH;
  }
  return pdf;
}

export async function downloadInvoicePdf(invoiceId: string) {
  const { canvas, invoiceNumber } = await renderInvoiceToCanvas(invoiceId);
  const pdf = canvasToA4Pdf(canvas);
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
