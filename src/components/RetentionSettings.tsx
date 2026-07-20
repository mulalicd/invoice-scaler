import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Save, ShieldAlert, Archive } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errorMessage";

interface RetentionPolicy {
  id?: string;
  organization_id: string;
  error_log_days: number;
  audit_log_days: number;
  draft_invoice_days: number;
  invoice_retention_years: number;
  updated_at?: string;
}

const DEFAULTS: Omit<RetentionPolicy, "organization_id"> = {
  error_log_days: 90,
  audit_log_days: 2555,
  draft_invoice_days: 365,
  invoice_retention_years: 11,
};

export default function RetentionSettings() {
  const { organization, isAdmin } = useAuth();
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("retention_policies")
      .select("*")
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (error && error.code !== "PGRST116") toast.error(errorMessage(error));
    setPolicy(
      data
        ? (data as RetentionPolicy)
        : { organization_id: organization.id, ...DEFAULTS }
    );
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organization?.id]);

  const save = async () => {
    if (!policy || !organization || !isAdmin) return;
    setSaving(true);
    const payload = {
      organization_id: organization.id,
      error_log_days: Number(policy.error_log_days),
      audit_log_days: Number(policy.audit_log_days),
      draft_invoice_days: Number(policy.draft_invoice_days),
      invoice_retention_years: Number(policy.invoice_retention_years),
    };
    const { error } = await supabase
      .from("retention_policies")
      .upsert(payload, { onConflict: "organization_id" });
    setSaving(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Politika zadržavanja spremljena");
    await load();
  };

  const runCleanup = async () => {
    if (!organization || !isAdmin) return;
    setCleaning(true);
    const { data, error } = await supabase.rpc("run_retention_cleanup", { _org_id: organization.id });
    setCleaning(false);
    if (error) return toast.error(errorMessage(error));
    const r = (data ?? {}) as Record<string, number>;
    toast.success(
      `Čišćenje završeno: ${r.error_log_deleted ?? 0} error logova, ${r.audit_log_deleted ?? 0} audit zapisa, ${r.draft_invoices_deleted ?? 0} draft faktura`
    );
  };

  if (loading || !policy) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Učitavanje politike zadržavanja…
      </div>
    );
  }

  const set = <K extends keyof RetentionPolicy>(k: K, v: RetentionPolicy[K]) =>
    setPolicy({ ...policy, [k]: v });

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Archive className="w-4 h-4" /> Politika zadržavanja podataka
              </CardTitle>
              <CardDescription>
                GDPR/regulatorna usklađenost: kontroliše koliko dugo se čuvaju logovi i draft fakture za aktivnu organizaciju.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Fakture: {policy.invoice_retention_years} god. (zakonski minimum)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <RField
            label="Error log (dana)"
            hint="Tehnički logovi grešaka. Preporuka: 90 dana."
            min={7} max={3650} value={policy.error_log_days}
            onChange={(v) => set("error_log_days", v)} disabled={!isAdmin}
          />
          <RField
            label="Audit log (dana)"
            hint="Trag akcija korisnika. Preporuka: 2555 (~7 god.)."
            min={30} max={3650} value={policy.audit_log_days}
            onChange={(v) => set("audit_log_days", v)} disabled={!isAdmin}
          />
          <RField
            label="Draft fakture (dana)"
            hint="Nezavršene fakture (status=draft). Izdate fakture se NIKADA ne brišu automatski."
            min={30} max={3650} value={policy.draft_invoice_days}
            onChange={(v) => set("draft_invoice_days", v)} disabled={!isAdmin}
          />
          <RField
            label="Zadržavanje izdatih faktura (godina)"
            hint="Informativno — izdate fakture se ne brišu automatski (zakonska obaveza čuvanja)."
            min={5} max={50} value={policy.invoice_retention_years}
            onChange={(v) => set("invoice_retention_years", v)} disabled={!isAdmin}
          />
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Spremi politiku
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={cleaning}>
                {cleaning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Pokreni čišćenje sada
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-destructive" /> Trajno brisanje starih podataka?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Ova radnja trajno briše error/audit logove starije od zadanih dana i draft fakture van roka.
                  Izdate/naplaćene fakture <strong>neće</strong> biti dirnute. Radnja je zapisana u audit log.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Otkaži</AlertDialogCancel>
                <AlertDialogAction onClick={runCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Da, pokreni čišćenje
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      {!isAdmin && (
        <p className="text-xs text-muted-foreground italic">
          Samo administratori mogu mijenjati politiku zadržavanja i pokretati čišćenje.
        </p>
      )}
    </div>
  );
}

interface RFieldProps {
  label: string; hint: string; min: number; max: number;
  value: number; onChange: (v: number) => void; disabled?: boolean;
}
function RField({ label, hint, min, max, value, onChange, disabled }: RFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number" min={min} max={max} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
