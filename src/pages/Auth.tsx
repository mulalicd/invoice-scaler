import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Loader2, ShieldCheck } from "lucide-react";
import AuthScene from "@/components/three/AuthScene";
import { reportClientError } from "@/lib/errorLogger";


const emailSchema = z.string().trim().email("Neispravna email adresa").max(255);
const passwordSchema = z.string().min(1, "Unesite lozinku").max(72);

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(siEmail);
      passwordSchema.parse(siPwd);
    } catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
      toast.error("Neispravan unos"); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPwd });
    setLoading(false);
    if (error) {
      reportClientError(error.message, "Auth.signInWithPassword", undefined, { email: siEmail, status: error.status, code: error.code });
      return toast.error(
        error.message === "Invalid login credentials" ? "Neispravan email ili lozinka" : error.message
      );
    }
    toast.success("Prijava uspješna");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(213,60%,18%)] to-[hsl(220,40%,8%)]">
      <div className="absolute inset-0 opacity-90">
        <AuthScene />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(220,40%,8%)_85%)] pointer-events-none" />
      <div className="w-full max-w-md space-y-6 animate-fade-in relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-elegant">
            <FileText className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white drop-shadow-lg">Faktura Sistem</h1>
          <p className="text-white/70 text-sm tracking-wide">IDSS · IMH · Platinum Standard</p>
        </div>

        <Card className="shadow-elegant border-white/10 bg-card/95 backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Prijava
            </CardTitle>
            <CardDescription>
              Pristup je ograničen na ovlaštene korisnike (whitelist). Registracija nije dostupna.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" autoComplete="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Lozinka</Label>
                <Input type="password" autoComplete="current-password" value={siPwd} onChange={e => setSiPwd(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Prijavi se
              </Button>
              <div className="text-center">
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                  Zaboravili ste lozinku?
                </Link>
              </div>
            </CardContent>
          </form>
        </Card>

        <p className="text-center text-xs text-white/50">
          © {new Date().getFullYear()} IDSS · IMH · Sistem fakturisanja
        </p>
      </div>
    </div>
  );
}
