import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { reportClientError } from "@/lib/errorLogger";
import { runAuthRlsProbe } from "@/lib/authRlsProbe";
import { errorMessage, errorStack, toErrorLike } from "@/lib/errorMessage";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string | null;
  active_organization_id?: string | null;
  must_change_password?: boolean;
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

type Role = "admin" | "accountant" | "superadmin" | "viewer";

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
  authError: string | null;
  mfaRequired: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
  isViewer: boolean;
  canWrite: boolean;
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const loadSeq = useRef(0);

  const evaluateMfa = async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setMfaRequired(data?.currentLevel === "aal1" && data?.nextLevel === "aal2");
    } catch { setMfaRequired(false); }
  };

  const loadUserData = async (userId: string, opts?: { retried?: boolean }) => {
    const seq = ++loadSeq.current;
    try {
      setAuthError(null);
      const result = await runAuthRlsProbe(supabase, userId);
      if (seq !== loadSeq.current) return;
      setProfile(result.profile as Profile | null);
      setRoleEntries(result.roleEntries as RoleEntry[]);
      setOrganizations(result.organizations as unknown as Organization[]);
      setOrganization(result.activeOrganization as unknown as Organization | null);
    } catch (error: unknown) {
      if (seq !== loadSeq.current) return;
      const message = errorMessage(error, "Dohvat profila, uloga ili organizacija nije uspio.");
      const stack = errorStack(error);
      const failures = (toErrorLike(error) as { failures?: unknown }).failures ?? null;
      const isForbidden = /403|jwt|permission denied|forbidden|insufficient_privilege|not authenticated/i.test(message);
      // Auto-retry: refresh session once before surfacing 403
      if (isForbidden && !opts?.retried) {
        try {
          const { data, error: refErr } = await supabase.auth.refreshSession();
          if (!refErr && data?.session?.user?.id) {
            await reportClientError(`Auto-retry after 403 (refresh OK): ${message}`, "AuthContext.loadUserData", stack, { userId, retried: true });
            return loadUserData(data.session.user.id, { retried: true });
          }
        } catch {/* fall through to error */}
      }
      setAuthError(message);
      await reportClientError(message, "AuthContext.loadUserData", stack, { failures, userId, retried: opts?.retried ?? false });
    }
  };


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess); setUser(sess?.user ?? null);
      if (sess?.user && event !== "INITIAL_SESSION") {
        setLoading(true);
        setTimeout(() => loadUserData(sess.user.id).finally(() => setLoading(false)), 0);
      }
      else { loadSeq.current++; setProfile(null); setOrganization(null); setOrganizations([]); setRoleEntries([]); setAuthError(null); setLoading(false); }
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
    const { error } = await supabase.rpc("switch_active_organization", { _org_id: orgId });
    if (error) throw error;
    await refresh();
  };

  const signOut = async () => { try { sessionStorage.removeItem("fakt.orgChosen"); } catch {} await supabase.auth.signOut(); window.location.href = "/auth"; };

  const roles = roleEntries.map(r => r.role);
  const isSuperadmin = roles.includes("superadmin");
  const isAdmin = isSuperadmin || roleEntries.some(r => r.role === "admin" && r.organization_id === organization?.id);
  const orgRoles = roleEntries.filter(r => r.organization_id === organization?.id).map(r => r.role);
  const isViewer = !isSuperadmin && orgRoles.length > 0 && orgRoles.every(r => r === "viewer");
  const canWrite = isAdmin; // admins/superadmins write; viewers/accountants (legacy) treated read-only here

  return (
    <AuthContext.Provider value={{
      user, session, profile, organization, organizations, roleEntries, roles, loading,
      authError, isAdmin, isSuperadmin, isViewer, canWrite, switchOrg, signOut, refresh,
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
