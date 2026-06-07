import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { formatKM } from "@/lib/format";
import { numberToBosnianWords } from "@/lib/numberToWords";

interface ItemRow {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

const newRow = (): ItemRow => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: "1",
  unit: "kom",
  unit_price: "0",
});

export default function NewInvoice() {
  const navigate = useNavigate();
  const { organization, canWrite } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const today = new Date().toISOString().slice(0, 10);
  const [issueDate, setIssueDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [periodText, setPeriodText] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);

  const dueDays = organization?.default_payment_days ?? 15;
  // TZ-safe: parsiramo YYYY-MM-DD u UTC podne i dodajemo dane, izbjegavamo DST shift.
  const dueDate = (() => {
    const [y, m, d] = issueDate.split("-").map(Number);
    const base = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12));
    base.setUTCDate(base.getUTCDate() + dueDays);
    return base.toISOString().slice(0, 10);
  })();

  useEffect(() => {
    if (!canWrite || !organization) return;
    (async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("organization_id", organization.id).order("name");
      setClients(data ?? []);
    })();
    if (organization?.default_note && !note) setNote(organization.default_note);
  }, [organization, canWrite]);

  if (!canWrite) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-400">Nemate ovlaštenje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Vaša uloga (pregled / viewer) ne dozvoljava kreiranje faktura. Sve operacije pisanja blokirane su i na serveru (RLS).</p>
            <Button asChild variant="secondary"><Link to="/invoices"><ArrowLeft className="w-4 h-4 mr-2"/>Nazad na fakture</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parseNum = (s: string) => {
    if (s === null || s === undefined) return 0;
    const cleaned = String(s).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const subtotal = items.reduce((s, r) => s + parseNum(r.quantity) * parseNum(r.unit_price), 0);

  const updateRow = (id: string, patch: Partial<ItemRow>) =>
    setItems(items.map(r => r.id === id ? { ...r, ...patch } : r));
  const addRow = () => setItems([...items, newRow()]);
  const removeRow = (id: string) => setItems(items.length > 1 ? items.filter(r => r.id !== id) : items);

  const save = async (status: "draft" | "issued") => {
    if (!organization) return;
    if (!clientId) return toast.error("Odaberite klijenta");
    if (items.some(r => !r.description.trim())) return toast.error("Sve stavke moraju imati opis");
    if (items.some(r => parseNum(r.quantity) <= 0)) return toast.error("Količina mora biti veća od nule");
    if (items.some(r => parseNum(r.unit_price) < 0)) return toast.error("Cijena ne smije biti negativna");
    if (subtotal <= 0) return toast.error("Iznos mora biti veći od nule");

    setSaving(true);

    // 1) Get next invoice number
    const year = new Date(issueDate).getFullYear();
    const { data: numData, error: numErr } = await supabase.rpc("next_invoice_number", {
      _org_id: organization.id, _year: year,
    });
    if (numErr || !numData || !numData[0]) { setSaving(false); return toast.error("Greška generiranja broja"); }
    const { invoice_number, invoice_seq, invoice_year } = numData[0];

    // 2) Insert invoice
    const { data: inv, error: invErr } = await supabase.from("invoices").insert({
      organization_id: organization.id,
      client_id: clientId,
      invoice_number, invoice_seq, invoice_year,
      issue_date: issueDate, delivery_date: deliveryDate, due_date: dueDate,
      period_text: periodText || null, note: note || null,
      subtotal, total: subtotal,
      amount_in_words: numberToBosnianWords(subtotal),
      status,
    } as any).select().single();
    if (invErr) { setSaving(false); return toast.error(invErr.message); }

    // 3) Insert items
    const { error: itErr } = await supabase.from("invoice_items").insert(
      items.map((r, idx) => ({
        invoice_id: inv.id,
        position: idx + 1,
        description: r.description.trim(),
        quantity: parseNum(r.quantity),
        unit: r.unit || "kom",
        unit_price: parseNum(r.unit_price),
        total: parseNum(r.quantity) * parseNum(r.unit_price),
      })) as any
    );
    if (itErr) { setSaving(false); return toast.error(itErr.message); }

    setSaving(false);
    toast.success(`Faktura ${invoice_number} kreirana`);
    navigate(`/invoices/${inv.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/invoices"><ArrowLeft className="w-4 h-4" /></Link></Button>
        <div>
          <h1 className="text-3xl font-display font-bold">Nova faktura</h1>
          <p className="text-muted-foreground text-sm">Kreirajte novu fakturu za klijenta</p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Osnovni podaci</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label>Klijent *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Odaberite klijenta..." /></SelectTrigger>
              <SelectContent>
                {clients.length === 0 && <div className="p-3 text-sm text-muted-foreground">Najprije dodajte klijenta</div>}
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Datum izdavanja</Label>
            <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Datum prometa</Label>
            <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Datum dospijeća</Label>
            <Input type="date" value={dueDate} disabled />
            <p className="text-xs text-muted-foreground">{dueDays} dana od datuma izdavanja</p>
          </div>
          <div className="space-y-2">
            <Label>Period (npr. mjesec)</Label>
            <Input placeholder="npr. Septembar 2024" value={periodText} onChange={e => setPeriodText(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Stavke</CardTitle>
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="w-4 h-4 mr-1" />Dodaj stavku</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((r, idx) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-5 space-y-1">
                {idx === 0 && <Label className="text-xs">Opis</Label>}
                <Input value={r.description} onChange={e => updateRow(r.id, { description: e.target.value })} placeholder="Naziv usluge / artikla" />
              </div>
              <div className="col-span-3 sm:col-span-2 space-y-1">
                {idx === 0 && <Label className="text-xs">Količina</Label>}
                <Input type="number" min="0" step="0.01" value={r.quantity} onChange={e => updateRow(r.id, { quantity: e.target.value })} />
              </div>
              <div className="col-span-3 sm:col-span-1 space-y-1">
                {idx === 0 && <Label className="text-xs">JM</Label>}
                <Input value={r.unit} onChange={e => updateRow(r.id, { unit: e.target.value })} />
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                {idx === 0 && <Label className="text-xs">Cijena</Label>}
                <Input type="number" min="0" step="0.01" value={r.unit_price} onChange={e => updateRow(r.id, { unit_price: e.target.value })} />
              </div>
              <div className="col-span-2 sm:col-span-1 text-right text-sm font-medium tabular-nums">
                {formatKM(parseNum(r.quantity) * parseNum(r.unit_price))}
              </div>
              <div className="col-span-12 sm:col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)} disabled={items.length === 1}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}

          <div className="border-t pt-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground italic">{numberToBosnianWords(subtotal)}</div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">UKUPNO</div>
              <div className="text-2xl font-display font-bold tabular-nums">{formatKM(subtotal)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Napomena</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Tekst koji će se prikazati na fakturi" />
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Spremi kao nacrt
        </Button>
        <Button onClick={() => save("issued")} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Izdaj fakturu
        </Button>
      </div>
    </div>
  );
}
