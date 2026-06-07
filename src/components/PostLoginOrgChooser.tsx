import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Building2 } from "lucide-react";
import { toast } from "sonner";
import logoIDSS from "@/assets/logo-idss.png";
import logoIMH from "@/assets/logo-imh.png";

export const ORG_CHOSEN_KEY = "fakt.orgChosen";

export default function PostLoginOrgChooser() {
  const { organizations, organization, switchOrg, signOut } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  const choose = async (orgId: string) => {
    setBusyId(orgId);
    try {
      if (orgId !== organization?.id) await switchOrg(orgId);
      sessionStorage.setItem(ORG_CHOSEN_KEY, orgId);
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Greška pri odabiru ustanove");
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/30">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl gradient-primary items-center justify-center shadow-elegant mb-2">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">Odaberite ustanovu</h1>
          <p className="text-muted-foreground">U koju sistemsku organizaciju želite ući?</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {organizations.map(o => (
            <Card key={o.id} className="hover:shadow-elegant transition-smooth border-border/50">
              <CardHeader className="text-center pb-3">
                <div className="h-20 flex items-center justify-center mb-2">
                  <img
                    src={o.code === "IDSS" ? logoIDSS : logoIMH}
                    alt={o.name}
                    className="max-h-16 max-w-[180px] object-contain"
                  />
                </div>
                <CardTitle className="text-lg">{o.code} — {o.name}</CardTitle>
                <CardDescription className="text-xs">{o.full_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled={!!busyId} onClick={() => choose(o.id)}>
                  {busyId === o.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Uđi u {o.code}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Odjavi se
          </Button>
        </div>
      </div>
    </div>
  );
}
