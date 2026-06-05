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

const failureFrom = (step: string, error: any): ProbeFailure | null => {
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

export async function runAuthRlsProbe(client: any, userId: string) {
  const [{ data: profile, error: profileError }, { data: rolesData, error: rolesError }] = await Promise.all([
    client.from("profiles").select("*").eq("id", userId).maybeSingle(),
    client.from("user_roles").select("role, organization_id").eq("user_id", userId),
  ]);

  const firstFailures = [failureFrom("profiles", profileError), failureFrom("user_roles", rolesError)].filter(Boolean) as ProbeFailure[];
  if (firstFailures.length) throw new AuthRlsProbeError(firstFailures);

  const roleEntries: AuthRoleEntry[] = (rolesData ?? []).map((r: any) => ({
    role: r.role as AuthRole,
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

  const activeId = profile?.active_organization_id || profile?.organization_id;
  const activeOrganization = (organizations ?? []).find((o: any) => o.id === activeId) || (organizations ?? [])[0] || null;

  return {
    profile,
    roleEntries,
    organizations: organizations ?? [],
    activeOrganization,
  };
}