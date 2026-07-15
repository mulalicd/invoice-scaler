import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil, Trash2, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Client {
  id: string; name: string; jib: string | null; jmbg: string | null;
  address: string | null; city: string | null; email: string | null; phone: string | null;
  contact_person: string | null; notes: string | null;
}

const schema = z.object({
  name: z.string().trim().min(1, "Naziv je obavezan").max(200),
  jib: z.string().trim().max(20).optional().or(z.literal("")),
  jmbg: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Neispravan email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  contact_person: z.string().trim().max(150).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export default function Clients() {
  const { organization, isAdmin, canWrite } = useAuth();
  const [list, setList] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<Partial<Client>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!organization) return;
    const { data } = await supabase.from("clients").select("*").eq("organization_id", organization.id).order("name");
    setList((data ?? []) as Client[]);
  };

  useEffect(() => { load(); }, [organization]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", jib: "", jmbg: "", address: "", city: "", email: "", phone: "", contact_person: "", notes: "" });
    setOpen(true);
  };

  const openEdit = (c: Client) => { setEditing(c); setForm(c); setOpen(true); };

  const save = async () => {
    if (!organization) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setLoading(true);

    const payload: Record<string, unknown> = {
      ...parsed.data,
      organization_id: organization.id,
    };
    // strip empty strings → null
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });

    const { error } = editing
      ? await supabase.from("clients").update(payload).eq("id", editing.id)
      : await supabase.from("clients").insert(payload as Parameters<typeof supabase.from<"clients">>[0] extends never ? never : { name: string; organization_id: string });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Klijent ažuriran" : "Klijent dodan");
    setOpen(false); load();
  };

  const remove = async (c: Client) => {
    if (!confirm(`Obrisati klijenta "${c.name}"?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) return toast.error("Nije moguće obrisati (možda postoje fakture)");
    toast.success("Obrisano"); load();
  };

  const filtered = list.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.jib?.includes(search) || c.jmbg?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Klijenti</h1>
          <p className="text-muted-foreground text-sm">Ukupno {list.length} {list.length === 1 ? "klijent" : "klijenata"}</p>
        </div>
        {canWrite && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novi klijent</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Uredi klijenta" : "Novi klijent"}</DialogTitle>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label>Naziv / Ime i prezime *</Label>
                <Input value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>JIB</Label>
                <Input value={form.jib ?? ""} onChange={e => setForm({ ...form, jib: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>JMBG</Label>
                <Input value={form.jmbg ?? ""} onChange={e => setForm({ ...form, jmbg: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Adresa</Label>
                <Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Grad</Label>
                <Input value={form.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Kontakt osoba</Label>
                <Input value={form.contact_person ?? ""} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Napomena</Label>
                <Textarea rows={2} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Odustani</Button>
              <Button onClick={save} disabled={loading}>{loading ? "Spremanje..." : "Spremi"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Pretraži po nazivu, JIB-u, emailu..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
              {list.length === 0 ? "Nema klijenata. Dodajte prvog!" : "Nema rezultata pretrage."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-smooth gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[c.jib && `JIB: ${c.jib}`, c.jmbg && `JMBG: ${c.jmbg}`, c.city, c.email].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canWrite && <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>}
                    {isAdmin && <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
