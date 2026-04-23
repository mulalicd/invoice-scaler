import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Building2 } from "lucide-react";
import { toast } from "sonner";
import logoIDSS from "@/assets/logo-idss.png";
import logoIMH from "@/assets/logo-imh.png";

interface Org { id: string; code: string; name: string; full_name: string; }

export default function OnboardingScreen() {
  const { user, signOut, refresh } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasAnyAdmin, setHasAnyAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: pub } = await supabase.rpc("get_organizations_for_onboarding");
      if (pub) setOrgs(pub as Org[]);

      const { count } = await supabase
        .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
      setHasAnyAdmin((count ?? 0) > 0);
    })();
  }, []);

  const claim = async (orgId: string) => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("claim_organization", { _org_id: orgId });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`Pristup dodijeljen kao ${data === "admin" ? "Administrator" : "Računovodstvo"}`);
    await refresh();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/30">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl gradient-primary items-center justify-center shadow-elegant mb-2">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">Dobrodošli</h1>
          <p className="text-muted-foreground">Odaberite organizaciju kojoj pristupate</p>
        </div>

        {orgs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
              Učitavanje organizacija...
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {orgs.map(org => (
              <Card key={org.id} className="hover:shadow-elegant transition-smooth border-border/50">
                <CardHeader className="text-center pb-3">
                  <div className="h-20 flex items-center justify-center mb-2">
                    <img
                      src={org.code === "IDSS" ? logoIDSS : logoIMH}
                      alt={org.name}
                      className="max-h-16 max-w-[180px] object-contain"
                    />
                  </div>
                  <CardTitle className="text-lg">{org.name}</CardTitle>
                  <CardDescription className="text-xs">{org.full_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={() => claim(org.id)}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Pristupi
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Odjavi se
          </Button>
        </div>

        {hasAnyAdmin === true && (
          <p className="text-center text-xs text-muted-foreground">
            Napomena: dok admin ne odobri vaš pristup, možete odabrati organizaciju i biti dodijeljeni kao računovođa.
          </p>
        )}
      </div>
    </div>
  );
}
