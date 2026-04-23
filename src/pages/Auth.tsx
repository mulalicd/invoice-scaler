import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";

const emailSchema = z.string().trim().email("Neispravna email adresa").max(255);
const passwordSchema = z.string().min(8, "Minimalno 8 karaktera").max(72);
const nameSchema = z.string().trim().min(1, "Obavezno polje").max(80);

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // sign in state
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");

  // sign up state
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");
  const [suFirst, setSuFirst] = useState("");
  const [suLast, setSuLast] = useState("");

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
      if (err instanceof z.ZodError) return toast.error(err.errors[0].message);
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPwd });
    setLoading(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "Neispravan email ili lozinka" : error.message);
    toast.success("Prijava uspješna");
    navigate("/");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(suFirst);
      nameSchema.parse(suLast);
      emailSchema.parse(suEmail);
      passwordSchema.parse(suPwd);
    } catch (err) {
      if (err instanceof z.ZodError) return toast.error(err.errors[0].message);
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { first_name: suFirst, last_name: suLast },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) return toast.error("Korisnik s ovim email-om već postoji");
      return toast.error(error.message);
    }
    toast.success("Račun kreiran! Prijavite se.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-accent/30 to-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-elegant">
            <FileText className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">Faktura Sistem</h1>
          <p className="text-muted-foreground text-sm">IDSS · IMH</p>
        </div>

        <Card className="shadow-elegant border-border/40">
          <Tabs defaultValue="signin">
            <CardHeader className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Prijava</TabsTrigger>
                <TabsTrigger value="signup">Registracija</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="signin" className="m-0">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <CardDescription>Unesite svoje pristupne podatke</CardDescription>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Lozinka</Label>
                    <Input type="password" value={siPwd} onChange={e => setSiPwd(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Prijavi se
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="m-0">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <CardDescription>Kreirajte novi račun</CardDescription>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Ime</Label>
                      <Input value={suFirst} onChange={e => setSuFirst(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Prezime</Label>
                      <Input value={suLast} onChange={e => setSuLast(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Lozinka</Label>
                    <Input type="password" value={suPwd} onChange={e => setSuPwd(e.target.value)} required />
                    <p className="text-xs text-muted-foreground">Min. 8 karaktera</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Kreiraj račun
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Nakon registracije, administrator će Vam dodijeliti organizaciju i ulogu.
                  </p>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} IDSS · IMH · Sistem fakturisanja
        </p>
      </div>
    </div>
  );
}
