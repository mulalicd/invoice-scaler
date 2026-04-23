import { formatKM, formatDate } from "@/lib/format";
import logoIDSS from "@/assets/logo-idss.png";
import logoIMH from "@/assets/logo-imh.png";

interface Props {
  invoice: any;
  items: any[];
  client: any;
  organization: any;
}

export default function InvoicePrintable({ invoice, items, client, organization }: Props) {
  const logo = organization.code === "IDSS" ? logoIDSS : organization.code === "IMH" ? logoIMH : organization.logo_url;
  const accent = organization.brand_color || "#1f4e8c";

  return (
    <div className="bg-white text-[#1a1a1a] p-10 font-sans" style={{ minHeight: "297mm", width: "100%" }}>
      {/* Header */}
      <div className="flex justify-between items-start gap-6 pb-6 border-b-2" style={{ borderColor: accent }}>
        <div className="flex-1">
          {logo && <img src={logo} alt={organization.name} className="h-16 max-w-[260px] object-contain mb-3" crossOrigin="anonymous" />}
          <div className="text-xs space-y-0.5 text-gray-700">
            <div className="font-semibold text-sm text-gray-900">{organization.full_name}</div>
            {organization.address && <div>{organization.address}</div>}
            <div>{[organization.postal_code, organization.city].filter(Boolean).join(" ")} {organization.country && `, ${organization.country}`}</div>
            {organization.jib && <div>JIB: {organization.jib}{organization.vat_number && ` · PDV: ${organization.vat_number}`}</div>}
            {(organization.phone || organization.email) && (
              <div>{[organization.phone, organization.email].filter(Boolean).join(" · ")}</div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Faktura</div>
          <div className="text-3xl font-bold font-mono" style={{ color: accent }}>{invoice.invoice_number}</div>
          <div className="text-xs text-gray-600 mt-3 space-y-0.5">
            <div><span className="text-gray-500">Datum izdavanja:</span> <span className="font-medium">{formatDate(invoice.issue_date)}</span></div>
            <div><span className="text-gray-500">Datum prometa:</span> <span className="font-medium">{formatDate(invoice.delivery_date)}</span></div>
            <div><span className="text-gray-500">Datum dospijeća:</span> <span className="font-medium">{formatDate(invoice.due_date)}</span></div>
            {invoice.place && <div><span className="text-gray-500">Mjesto:</span> <span className="font-medium">{invoice.place}</span></div>}
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Kupac</div>
          <div className="space-y-0.5 text-sm">
            <div className="font-semibold text-base">{client?.name}</div>
            {client?.address && <div className="text-gray-700">{client.address}</div>}
            <div className="text-gray-700">{[client?.postal_code, client?.city].filter(Boolean).join(" ")}</div>
            {client?.jib && <div className="text-gray-700">JIB: {client.jib}</div>}
            {client?.jmbg && <div className="text-gray-700">JMBG: {client.jmbg}</div>}
            {client?.email && <div className="text-gray-700">{client.email}</div>}
          </div>
        </div>
        {invoice.period_text && (
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Period</div>
            <div className="text-sm font-medium">{invoice.period_text}</div>
          </div>
        )}
      </div>

      {/* Items table */}
      <table className="w-full mt-8 text-sm">
        <thead>
          <tr style={{ backgroundColor: accent, color: "white" }} className="text-xs uppercase tracking-wide">
            <th className="text-left px-3 py-2.5 w-10">#</th>
            <th className="text-left px-3 py-2.5">Opis</th>
            <th className="text-right px-3 py-2.5 w-20">Količina</th>
            <th className="text-left px-3 py-2.5 w-16">JM</th>
            <th className="text-right px-3 py-2.5 w-28">Cijena</th>
            <th className="text-right px-3 py-2.5 w-32">Ukupno</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id} className="border-b border-gray-200">
              <td className="px-3 py-2.5 text-gray-500">{idx + 1}.</td>
              <td className="px-3 py-2.5">{it.description}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{Number(it.quantity).toLocaleString("bs-BA", { maximumFractionDigits: 2 })}</td>
              <td className="px-3 py-2.5 text-gray-600">{it.unit}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatKM(Number(it.unit_price))}</td>
              <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatKM(Number(it.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mt-6">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm py-2 border-t border-gray-300">
            <span className="text-gray-600">Osnovica</span>
            <span className="tabular-nums">{formatKM(Number(invoice.subtotal))}</span>
          </div>
          <div className="flex justify-between py-3 border-t-2" style={{ borderColor: accent }}>
            <span className="font-semibold text-base">UKUPNO ZA UPLATU</span>
            <span className="font-bold text-base tabular-nums" style={{ color: accent }}>{formatKM(Number(invoice.total))}</span>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      {invoice.amount_in_words && (
        <div className="mt-4 text-xs italic text-gray-700">
          <span className="text-gray-500">Slovima:</span> {invoice.amount_in_words}
        </div>
      )}

      {/* Note */}
      {invoice.note && (
        <div className="mt-8 p-4 rounded bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
          {invoice.note}
        </div>
      )}

      {/* Bank info */}
      {(organization.bank_name || organization.bank_account) && (
        <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-2 gap-6 text-xs text-gray-700">
          <div>
            <div className="text-gray-500 uppercase tracking-wider mb-1">Plaćanje na račun</div>
            {organization.bank_name && <div className="font-medium">{organization.bank_name}</div>}
            {organization.bank_account && <div className="font-mono">{organization.bank_account}</div>}
            <div className="mt-1 text-gray-500">Poziv na broj: {invoice.invoice_number}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 uppercase tracking-wider mb-1">Iznos</div>
            <div className="font-bold text-lg tabular-nums" style={{ color: accent }}>{formatKM(Number(invoice.total))}</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-[10px] text-gray-500 flex justify-between">
        <div>{organization.full_name}</div>
        <div>Faktura {invoice.invoice_number}</div>
      </div>
    </div>
  );
}
