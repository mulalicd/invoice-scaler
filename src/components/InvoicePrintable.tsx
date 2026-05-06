import { formatNumber } from "@/lib/format";
import logoIDSS from "@/assets/logo-idss.png";
import logoIMH from "@/assets/logo-imh.png";

interface Props {
  invoice: any;
  items: any[];
  client: any;
  organization: any;
}

const fmt = (n: number) => formatNumber(Number(n || 0), 2);
const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${dt.getFullYear()}`;
};

// Code 39 barcode generator (returns SVG width pattern for given text)
function code39Bars(text: string): { value: string; width: number }[] {
  const map: Record<string, string> = {
    "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw",
    "5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
    "*":"nwnnwnwnn",
  };
  const t = `*${text}*`;
  const out: { value: string; width: number }[] = [];
  for (let i = 0; i < t.length; i++) {
    const code = map[t[i]] || map["0"];
    for (let j = 0; j < 9; j++) {
      const w = code[j] === "w" ? 2.5 : 1;
      out.push({ value: j % 2 === 0 ? "bar" : "space", width: w });
    }
    out.push({ value: "space", width: 1 });
  }
  return out;
}

function Barcode({ text }: { text: string }) {
  const bars = code39Bars(text);
  const total = bars.reduce((s, b) => s + b.width, 0);
  let x = 0;
  return (
    <svg viewBox={`0 0 ${total} 40`} preserveAspectRatio="none" style={{ width: "100%", height: 40 }}>
      {bars.map((b, i) => {
        const w = b.width;
        const el = b.value === "bar" ? <rect key={i} x={x} y={0} width={w} height={40} fill="#000" /> : null;
        x += w;
        return el;
      })}
    </svg>
  );
}

export default function InvoicePrintable({ invoice, items, client, organization }: Props) {
  const isIDSS = organization?.code === "IDSS";
  const logo = isIDSS ? logoIDSS : organization?.code === "IMH" ? logoIMH : organization?.logo_url;

  // Pad to at least 3 visible item rows for stylistic match
  const rows = [...items];
  while (rows.length < 3) rows.push({ id: `empty-${rows.length}`, description: "", unit: "srv", quantity: 1, unit_price: 0, total: 0, _empty: true });

  const subtotal = Number(invoice.subtotal || 0);
  const total = Number(invoice.total || 0);
  const discount = subtotal - total > 0 ? subtotal - total : 0;

  const parent = client?.contact_person || client?.name || "";
  const child = (client as any)?.notes || "";
  const address = client?.address || "";

  return (
    <div className="bg-white text-black px-10 pt-8 pb-10" style={{ width: "210mm", minHeight: "297mm", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 11, color: "#000" }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "flex-start" }}>
        <div>
          {logo && <img src={logo} alt={organization?.name} style={{ height: 70, objectFit: "contain" }} crossOrigin="anonymous" />}
        </div>
        <div style={{ fontSize: 9.5, lineHeight: 1.35 }}>
          <div style={{ textAlign: "right", marginBottom: 4 }}>
            {organization?.email && <div>{organization.email}</div>}
            {organization?.phone && <div>www.{(organization.email?.split("@")[1] || "")}</div>}
            {organization?.phone && <div>{organization.phone}</div>}
          </div>
          <div style={{ borderTop: "1px solid #000", paddingTop: 4, textAlign: "center", fontWeight: 700 }}>
            {organization?.full_name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
            <div>Reg. br.: {organization?.code === "IDSS" ? "580342" : "6501016512"}</div>
            <div style={{ textAlign: "right" }}>{[organization?.address, [organization?.postal_code, organization?.city].filter(Boolean).join(" ")].filter(Boolean).join(" - ")} - {organization?.country || "Bosna i Hercegovina"}</div>
            <div>ID {organization?.jib}</div>
            <div style={{ textAlign: "right" }}>{organization?.bank_name} -&gt; {organization?.bank_account}</div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "right", fontStyle: "italic", fontSize: 10, marginTop: 6, color: "#444" }}>obrazac:001</div>

      {/* Title + barcode */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", marginTop: 30, marginBottom: 18 }}>
        <div style={{ textAlign: "center", fontSize: 26, fontWeight: 700 }}>
          RAČUN <span style={{ color: "#e11d48", marginLeft: 14 }}>{invoice.invoice_number}</span>
        </div>
        <div style={{ paddingLeft: 24 }}>
          <Barcode text={`*${(organization?.jib || "").replace(/\D/g, "")}*`} />
        </div>
      </div>

      {/* Meta + roditelj */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 18 }}>
        <table style={{ width: "100%", fontSize: 11 }}>
          <tbody>
            <tr><td style={{ textAlign: "right", fontWeight: 700, paddingRight: 10, color: "#000", verticalAlign: "top" }}>OBRAČUNSKI PERIOD</td>
              <td style={{ color: "#e11d48" }}>
                <div style={{ fontSize: 8, color: "#888" }}>od:</div>
                <div style={{ display: "inline-block", marginRight: 18 }}>{invoice.period_from ? fmtDate(invoice.period_from) : ""}</div>
                <span>{invoice.period_to ? fmtDate(invoice.period_to) + "." : invoice.period_text || ""}</span>
              </td></tr>
            <tr><td style={{ textAlign: "right", fontWeight: 700, paddingRight: 10 }}>datum računa:</td><td style={{ color: "#e11d48" }}>{fmtDate(invoice.issue_date)}</td></tr>
            <tr><td style={{ textAlign: "right", fontWeight: 700, paddingRight: 10 }}>rok plaćanja:</td><td style={{ color: "#e11d48" }}>{fmtDate(invoice.due_date)}.</td></tr>
            <tr><td style={{ textAlign: "right", fontWeight: 700, paddingRight: 10 }}>mjesto izdavanja računa:</td><td>{invoice.place || "Sarajevo"}</td></tr>
            <tr><td style={{ textAlign: "right", fontWeight: 700, paddingRight: 10 }}>način plaćanja:</td><td>Virman</td></tr>
            <tr><td style={{ textAlign: "right", fontWeight: 700, paddingRight: 10 }}>datum isporuke:</td><td style={{ color: "#e11d48" }}>{fmtDate(invoice.delivery_date)}</td></tr>
          </tbody>
        </table>
        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
          <div><span>roditelj/staratelj:</span> <span style={{ color: "#e11d48", fontWeight: 600, marginLeft: 8 }}>{parent}</span></div>
          {client?.name && client?.name !== parent && <div style={{ textAlign: "right" }}>{client.name}</div>}
          {child && <div style={{ textAlign: "right" }}>dijete: {child}</div>}
          {address && <div style={{ textAlign: "right" }}>adresa: {address}</div>}
        </div>
      </div>

      {/* Items */}
      <table style={{ width: "100%", marginTop: 28, borderCollapse: "collapse", fontSize: 10.5 }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th colSpan={4} style={{ border: "1px solid #999", padding: 4 }}>ARTIKAL</th>
            <th colSpan={2} style={{ border: "1px solid #999", padding: 4 }}>CIJENA</th>
            <th style={{ border: "1px solid #999", padding: 4 }}>RABAT</th>
            <th colSpan={2} style={{ border: "1px solid #999", padding: 4 }}>PDV</th>
            <th style={{ border: "1px solid #999", padding: 4 }}>IZNOS</th>
          </tr>
          <tr style={{ background: "#fafafa", fontWeight: 700 }}>
            <th style={{ border: "1px solid #999", padding: 4, width: 36 }}>R.br.</th>
            <th style={{ border: "1px solid #999", padding: 4, textAlign: "left" }}>Naziv</th>
            <th style={{ border: "1px solid #999", padding: 4, width: 50 }}>JM</th>
            <th style={{ border: "1px solid #999", padding: 4, width: 60 }}>Količina</th>
            <th style={{ border: "1px solid #999", padding: 4, width: 70 }}>Cijena</th>
            <th style={{ border: "1px solid #999", padding: 4, width: 70 }}>s rabatom</th>
            <th style={{ border: "1px solid #999", padding: 4, width: 50 }}>%</th>
            <th style={{ border: "1px solid #999", padding: 4, width: 40 }}>%</th>
            <th style={{ border: "1px solid #999", padding: 4, width: 60 }}>Iznos</th>
            <th style={{ border: "1px solid #999", padding: 4, width: 80 }}>bez PDV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it, idx) => (
            <tr key={it.id}>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>{idx + 1}</td>
              <td style={{ border: "1px solid #999", padding: 4 }}>{it.description}</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>{it.unit || "srv"}</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>{it._empty ? "1" : Number(it.quantity)}</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>{fmt(Number(it.unit_price))}</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>{fmt(Number(it.unit_price))}</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>0,00%</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>0%</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>0,00</td>
              <td style={{ border: "1px solid #999", padding: 4, textAlign: "right" }}>{fmt(Number(it.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 0 }}>
        <div style={{ border: "1px solid #999", borderTop: "none", padding: 8, fontSize: 10.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Napomena:</div>
          <div style={{ fontStyle: "italic" }}>PPU nije obveznik PDV-a, u skladu sa Članom 24. stav 1. tačka 4. Zakona o PDV.</div>
          <div style={{ fontStyle: "italic", marginTop: 6 }}>Dokument je izrađen na računaru, i punovažan je bez potpisa i pečata.</div>
          <div style={{ fontStyle: "italic", marginTop: 6 }}>Uplatu izvršiti na TRN:<br/>{organization?.bank_name} -&gt; {organization?.bank_account}</div>
        </div>
        <table style={{ borderCollapse: "collapse", fontSize: 10.5 }}>
          <tbody>
            <tr><td style={{ border: "1px solid #999", padding: 4, fontWeight: 700, textAlign: "right" }}>PRODAJNA VRIJEDNOST:</td><td style={{ border: "1px solid #999", padding: 4, textAlign: "right", fontWeight: 700, width: 90 }}>{fmt(subtotal)}</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: 4, fontWeight: 700, textAlign: "right" }}>VRIJEDNOST ODOBRENOG RABATA:</td><td style={{ border: "1px solid #999", padding: 4, textAlign: "right", fontWeight: 700 }}>{fmt(discount)}</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: 4, fontWeight: 700, textAlign: "right" }}>VRIJEDNOST BEZ PDV:</td><td style={{ border: "1px solid #999", padding: 4, textAlign: "right", fontWeight: 700 }}>{fmt(total)}</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: 4, fontWeight: 700, textAlign: "right" }}>VRIJEDNOST PDV (0%):</td><td style={{ border: "1px solid #999", padding: 4, textAlign: "right", fontWeight: 700 }}>0,00</td></tr>
            <tr><td style={{ border: "1px solid #999", padding: 4, fontWeight: 700, textAlign: "right" }}>UKUPNO ZA UPLATU - VRIJEDNOST S PDV KM:</td><td style={{ border: "1px solid #999", padding: 4, textAlign: "right", fontWeight: 700 }}>{fmt(total)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Payment slip */}
      <div style={{ marginTop: 36, border: "1px solid #999", padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 10 }}>
        <div>
          <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 2 }}>Uplatio je (ime, adresa i telefon)</div>
          <div style={{ background: "#dbeafe", padding: 4, marginTop: 4, minHeight: 30 }}>
            {parent}{child && ` — dijete: ${child}`}<br/>{address && `adresa: ${address}`}
          </div>
          <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 2, marginTop: 8 }}>Svrha doznake:</div>
          <div style={{ background: "#dbeafe", padding: 4, marginTop: 4, minHeight: 24 }}>{items[0]?.description || ""}</div>
          <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 2, marginTop: 8 }}>Primalac/Primatelj:</div>
          <div style={{ background: "#dbeafe", padding: 4, marginTop: 4, minHeight: 24 }}>{organization?.full_name}</div>
          <div style={{ marginTop: 14 }}>Mjesto i datum uplate:</div>
          <div style={{ marginTop: 22 }}>Potpis i pečat nalogodavca</div>
        </div>
        <div>
          <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 2 }}>Račun primaoca/primatelja</div>
          <div style={{ background: "#dbeafe", padding: 6, marginTop: 4, fontSize: 14, fontWeight: 700, textAlign: "center" }}>{organization?.bank_account}</div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span>KM</span><div style={{ flex: 1, background: "#dbeafe", padding: 4, fontWeight: 700 }}>= {fmt(total)}</div>
            <div style={{ border: "1px solid #999", padding: "2px 6px", fontSize: 9 }}>HITNO</div>
          </div>
          <div style={{ marginTop: 18, fontStyle: "italic", textAlign: "center" }}>samo za uplate javnih prihoda</div>
          <div style={{ marginTop: 12 }}>Poziv na broj: {invoice.invoice_number}</div>
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginTop: 32, fontSize: 10 }}>
        <div>Fakturisao:<div style={{ borderTop: "1px solid #000", marginTop: 32 }}/></div>
        <div>M.P.<div style={{ borderTop: "1px solid #000", marginTop: 32 }}/></div>
        <div>Ovlašteno lice:<div style={{ borderTop: "1px solid #000", marginTop: 32 }}/></div>
        <div>Komitent:<div style={{ borderTop: "1px solid #000", marginTop: 32 }}/></div>
      </div>

      <div style={{ textAlign: "right", fontSize: 8, color: "#666", marginTop: 16 }}>
        Printano: {new Date().toLocaleDateString("bs-BA")}; {new Date().toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
