import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string | null;
}

interface Organization {
  id: string;
  code: string;
  name: string;
  full_name: string;
  jib: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  bank_account: string | null;
  logo_url: string | null;
  brand_color: string | null;
  invoice_prefix: string | null;
  default_payment_days: number | null;
  default_note: string | null;
}

type Role = "admin" | "accountant";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    const [{ data: prof }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile(prof as Profile | null);
    setRoles((rolesData ?? []).map((r: any) => r.role as Role));
    if (prof?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", prof.organization_id)
        .maybeSingle();
      setOrganization(org as Organization | null);
    } else {
      setOrganization(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        setProfile(null); setOrganization(null); setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadUserData(sess.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => { if (user) await loadUserData(user.id); };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, organization, roles, loading,
      isAdmin: roles.includes("admin"),
      signOut, refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
