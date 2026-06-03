import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users as UsersIcon, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { validatePassword, PASSWORD_RULES_TEXT } from "@/lib/passwordPolicy";

export default function Settings() {
  const { organization, isAdmin, isSuperadmin, refresh, profile } = useAuth();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const changePassword = async () => {
    const check = validatePassword(pwd, pwd2);
    if (!check.ok) return toast.error(check.error!);
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdSaving(false);
    if (error) return toast.error(error.message);
    setPwd(""); setPwd2("");
    toast.success("Lozinka uspješno promijenjena");
  };

  useEffect(() => { if (organization) setForm(organization); }, [organization]);

  const reloadMembers = async () => {
    if (!organization) return;
    const { data: profs } = await supabase.from("profiles")
      .select("id, email, first_name, last_name, organization_id")
      .eq("organization_id", organization.id);
    const { data: roles } = await supabase.from("user_roles")
      .select("user_id, role, organization_id")
      .or(`organization_id.eq.${organization.id},organization_id.is.null`);
    const merged = (profs ?? []).map((p: any) => ({
      ...p,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
    }));
    setMembers(merged);
  };

  useEffect(() => { reloadMembers(); /* eslint-disable-next-line */ }, [organization]);

  const save = async () => {
    if (!organization || !isAdmin) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update({
      full_name: form.full_name, jib: form.jib, vat_number: form.vat_number,
      address: form.address, city: form.city, postal_code: form.postal_code,
      phone: form.phone, email: form.email,
      bank_name: form.bank_name, bank_account: form.bank_account,
      brand_color: form.brand_color, default_payment_days: Number(form.default_payment_days) || 15,
      default_note: form.default_note,
    }).eq("id", organization.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Postavke spremljene");
    await refresh();
  };

  const setRole = async (userId: string, role: "admin" | "viewer" | "superadmin", grant: boolean) => {
    if (!organization) return;
    const { error } = await supabase.rpc("admin_set_user_role" as any, {
      _user_id: userId, _org_id: organization.id, _role: role, _grant: grant,
    });
    if (error) return toast.error(error.message);
    toast.success(grant ? `Dodijeljena uloga: ${role}` : `Uklonjena uloga: ${role}`);
    await reloadMembers();
  };

  const forcePwdReset = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ must_change_password: true } as any).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Korisnik mora promijeniti lozinku pri sljedećoj prijavi");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Postavke</h1>
        <p className="text-muted-foreground text-sm">Upravljanje organizacijom i korisnicima</p>
      </div>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org"><Building2 className="w-4 h-4 mr-2" />Organizacija</TabsTrigger>
          <TabsTrigger value="users"><UsersIcon className="w-4 h-4 mr-2" />Korisnici</TabsTrigger>
          <TabsTrigger value="account"><KeyRound className="w-4 h-4 mr-2" />Moj račun</TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="space-y-4 mt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Podaci o organizaciji</CardTitle>
              <CardDescription>Ovi podaci se prikazuju na svakoj fakturi</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <Field label="Puni naziv" v={form.full_name} on={(v) => setForm({ ...form, full_name: v })} disabled={!isAdmin} />
              <Field label="Kratko ime" v={form.name} on={() => {}} disabled />
              <Field label="JIB" v={form.jib} on={(v) => setForm({ ...form, jib: v })} disabled={!isAdmin} />
              <Field label="PDV broj" v={form.vat_number} on={(v) => setForm({ ...form, vat_number: v })} disabled={!isAdmin} />
              <Field label="Adresa" v={form.address} on={(v) => setForm({ ...form, address: v })} disabled={!isAdmin} className="sm:col-span-2" />
              <Field label="Grad" v={form.city} on={(v) => setForm({ ...form, city: v })} disabled={!isAdmin} />
              <Field label="Poštanski broj" v={form.postal_code} on={(v) => setForm({ ...form, postal_code: v })} disabled={!isAdmin} />
              <Field label="Telefon" v={form.phone} on={(v) => setForm({ ...form, phone: v })} disabled={!isAdmin} />
              <Field label="Email" v={form.email} on={(v) => setForm({ ...form, email: v })} disabled={!isAdmin} />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Bankovni podaci</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <Field label="Naziv banke" v={form.bank_name} on={(v) => setForm({ ...form, bank_name: v })} disabled={!isAdmin} />
              <Field label="Žiro račun" v={form.bank_account} on={(v) => setForm({ ...form, bank_account: v })} disabled={!isAdmin} />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Postavke fakture</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <Field label="Brand boja (HEX)" v={form.brand_color} on={(v) => setForm({ ...form, brand_color: v })} disabled={!isAdmin} placeholder="#1f4e8c" />
              <Field label="Rok plaćanja (dana)" type="number" v={form.default_payment_days} on={(v) => setForm({ ...form, default_payment_days: v })} disabled={!isAdmin} />
              <div className="sm:col-span-2 space-y-2">
                <Label>Standardna napomena</Label>
                <Textarea rows={3} value={form.default_note ?? ""} disabled={!isAdmin} onChange={e => setForm({ ...form, default_note: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Spremi promjene
              </Button>
            </div>
          )}
          {!isAdmin && (
            <p className="text-xs text-muted-foreground italic">Samo administratori mogu mijenjati postavke organizacije.</p>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Članovi organizacije</CardTitle>
              <CardDescription>{members.length} korisnik{members.length === 1 ? "" : "a"}</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {members.map(m => {
                const isAdminUser = m.roles?.includes("admin");
                const isViewerUser = m.roles?.includes("viewer");
                const isSuperUser = m.roles?.includes("superadmin");
                return (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {m.first_name} {m.last_name}
                        {m.id === profile?.id && <span className="text-xs text-muted-foreground"> (Vi)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {isSuperUser && <Badge className="text-xs bg-primary/15 text-primary border-primary/30">Superadmin</Badge>}
                        {isAdminUser && <Badge variant="secondary" className="text-xs"><ShieldCheck className="w-3 h-3 mr-1" />Admin</Badge>}
                        {isViewerUser && <Badge variant="outline" className="text-xs">Pregled</Badge>}
                        {!isSuperUser && !isAdminUser && !isViewerUser && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Bez uloge</Badge>
                        )}
                      </div>
                    </div>
                    {isAdmin && m.id !== profile?.id && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant={isAdminUser ? "default" : "outline"} onClick={() => setRole(m.id, "admin", !isAdminUser)}>
                          {isAdminUser ? "Ukloni Admin" : "Admin"}
                        </Button>
                        <Button size="sm" variant={isViewerUser ? "default" : "outline"} onClick={() => setRole(m.id, "viewer", !isViewerUser)}>
                          {isViewerUser ? "Ukloni Pregled" : "Pregled"}
                        </Button>
                        {isSuperadmin && (
                          <Button size="sm" variant={isSuperUser ? "default" : "outline"} onClick={() => setRole(m.id, "superadmin", !isSuperUser)}>
                            {isSuperUser ? "Ukloni Super" : "Superadmin"}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => forcePwdReset(m.id)} title="Forsiraj promjenu lozinke">
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!isAdmin && (
                <p className="text-xs text-muted-foreground italic py-3">Samo administratori mogu mijenjati uloge korisnika. Sve izmjene dodatno su zaštićene RLS politikama na bazi.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-4 space-y-4">
          <Card className="border-border/60 max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Promjena lozinke</CardTitle>
              <CardDescription>Postavite novu lozinku za svoj račun ({profile?.email})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nova lozinka</Label>
                <Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder={PASSWORD_RULES_TEXT} />
              </div>
              <div className="space-y-2">
                <Label>Potvrdi novu lozinku</Label>
                <Input type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} />
              </div>
              <Button onClick={changePassword} disabled={pwdSaving}>
                {pwdSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Promijeni lozinku
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, v, on, disabled, type, placeholder, className = "" }: any) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <Input type={type} placeholder={placeholder} value={v ?? ""} disabled={disabled} onChange={e => on(e.target.value)} />
    </div>
  );
}
