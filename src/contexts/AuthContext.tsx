import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string | null;
  active_organization_id?: string | null;
}

interface Organization {
  id: string; code: string; name: string; full_name: string;
  jib: string | null; vat_number: string | null;
  address: string | null; city: string | null; postal_code: string | null; country: string | null;
  phone: string | null; email: string | null;
  bank_name: string | null; bank_account: string | null;
  logo_url: string | null; brand_color: string | null;
  invoice_prefix: string | null; default_payment_days: number | null; default_note: string | null;
}

type Role = "admin" | "accountant" | "superadmin";

interface RoleEntry { role: Role; organization_id: string | null; }

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  organizations: Organization[];
  roleEntries: RoleEntry[];
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
  switchOrg: (orgId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [roleEntries, setRoleEntries] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    const [{ data: prof }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role, organization_id").eq("user_id", userId),
    ]);
    setProfile(prof as Profile | null);
    const entries = (rolesData ?? []).map((r: any) => ({ role: r.role as Role, organization_id: r.organization_id }));
    setRoleEntries(entries);

    const isSuper = entries.some(r => r.role === "superadmin");
    let orgIds = entries.map(r => r.organization_id).filter(Boolean) as string[];

    let orgsQuery = supabase.from("organizations").select("*");
    if (!isSuper) orgsQuery = orgsQuery.in("id", orgIds.length ? orgIds : ["00000000-0000-0000-0000-000000000000"]);
    const { data: orgs } = await orgsQuery.order("code");
    setOrganizations((orgs ?? []) as Organization[]);

    const activeId = (prof as any)?.active_organization_id || (prof as any)?.organization_id;
    const active = (orgs ?? []).find((o: any) => o.id === activeId) || (orgs ?? [])[0] || null;
    setOrganization(active as Organization | null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess); setUser(sess?.user ?? null);
      if (sess?.user) setTimeout(() => loadUserData(sess.user.id), 0);
      else { setProfile(null); setOrganization(null); setOrganizations([]); setRoleEntries([]); }
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess); setUser(sess?.user ?? null);
      if (sess?.user) loadUserData(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => { if (user) await loadUserData(user.id); };

  const switchOrg = async (orgId: string) => {
    const { error } = await supabase.rpc("switch_active_organization", { _org_id: orgId } as any);
    if (error) throw error;
    await refresh();
  };

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/auth"; };

  const roles = roleEntries.map(r => r.role);
  const isSuperadmin = roles.includes("superadmin");
  const isAdmin = isSuperadmin || roleEntries.some(r => r.role === "admin" && r.organization_id === organization?.id);

  return (
    <AuthContext.Provider value={{
      user, session, profile, organization, organizations, roleEntries, roles, loading,
      isAdmin, isSuperadmin, switchOrg, signOut, refresh,
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
