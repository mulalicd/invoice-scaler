export type AuthRole = "admin" | "accountant" | "superadmin" | "viewer";

export interface AuthRoleEntry { role: AuthRole; organization_id: string | null; }

interface ProbeFailure {
  step: string;
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number | null;
}

export class AuthRlsProbeError extends Error {
  failures: ProbeFailure[];

  constructor(failures: ProbeFailure[]) {
    super(`Auth/RLS provjera nije prošla: ${failures.map(f => `${f.step}: ${f.message}`).join("; ")}`);
    this.name = "AuthRlsProbeError";
    this.failures = failures;
  }
}

interface ProbeErrorLike {
  message?: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number | null;
  statusCode?: number | null;
}

const failureFrom = (step: string, error: ProbeErrorLike | null | undefined): ProbeFailure | null => {
  if (!error) return null;
  return {
    step,
    message: error.message ?? "Nepoznata backend greška",
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    status: error.status ?? error.statusCode ?? null,
  };
};

// The probe reads generic tables; the concrete DB type isn't required here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProbeClient = SupabaseClient<any, any, any>;

interface RoleRow { role: AuthRole; organization_id: string | null }
interface OrganizationRow { id: string; [key: string]: unknown }

export async function runAuthRlsProbe(client: ProbeClient, userId: string) {
  const [{ data: profile, error: profileError }, { data: rolesData, error: rolesError }] = await Promise.all([
    client.from("profiles").select("*").eq("id", userId).maybeSingle(),
    client.from("user_roles").select("role, organization_id").eq("user_id", userId),
  ]);

  const firstFailures = [failureFrom("profiles", profileError), failureFrom("user_roles", rolesError)].filter(Boolean) as ProbeFailure[];
  if (firstFailures.length) throw new AuthRlsProbeError(firstFailures);

  const roleEntries: AuthRoleEntry[] = ((rolesData ?? []) as RoleRow[]).map(r => ({
    role: r.role,
    organization_id: r.organization_id,
  }));
  const isSuperadmin = roleEntries.some(r => r.role === "superadmin");
  const orgIds = roleEntries.map(r => r.organization_id).filter(Boolean) as string[];

  let orgsQuery = client.from("organizations").select("*");
  if (!isSuperadmin) {
    orgsQuery = orgsQuery.in("id", orgIds.length ? orgIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: organizations, error: organizationsError } = await orgsQuery.order("code");
  const orgFailure = failureFrom("organizations", organizationsError);
  if (orgFailure) throw new AuthRlsProbeError([orgFailure]);

  const orgs = (organizations ?? []) as OrganizationRow[];
  const profileRow = profile as { active_organization_id?: string | null; organization_id?: string | null } | null;
  const activeId = profileRow?.active_organization_id || profileRow?.organization_id;
  const activeOrganization = orgs.find(o => o.id === activeId) || orgs[0] || null;

  return {
    profile,
    roleEntries,
    organizations: orgs,
    activeOrganization,
  };
}

export async function runLoginAuthRlsFlowProbe(client: ProbeClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  const loginFailure = failureFrom("login", error);
  if (loginFailure) throw new AuthRlsProbeError([loginFailure]);

  const userId = data?.user?.id;
  if (!userId) {
    throw new AuthRlsProbeError([{ step: "login", message: "Prijava nije vratila korisnika." }]);
  }

  return runAuthRlsProbe(client, userId);
}