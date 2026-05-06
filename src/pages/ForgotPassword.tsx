import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Unesite email");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Email za reset lozinke je poslan");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-accent/30 to-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-elegant">
            <KeyRound className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">Zaboravljena lozinka</h1>
        </div>

        <Card className="shadow-elegant border-border/40">
          <CardHeader>
            <CardTitle>Reset lozinke</CardTitle>
            <CardDescription>
              {sent
                ? "Provjerite vaš inbox za link za postavljanje nove lozinke."
                : "Unesite email i poslat ćemo Vam link za reset."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sent && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Pošalji link za reset
                </Button>
              </form>
            )}
            <div className="mt-4 text-center">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Nazad na prijavu
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
