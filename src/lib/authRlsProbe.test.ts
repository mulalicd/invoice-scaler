import { describe, expect, it, vi } from "vitest";
import { AuthRlsProbeError, runLoginAuthRlsFlowProbe } from "./authRlsProbe";

const createFlowClient = (rolesResponse: any) => {
  const profile = { id: "user-1", email: "mulalic.davor@outlook.com", organization_id: "org-1", active_organization_id: "org-1" };
  const organization = { id: "org-1", code: "IDSS", name: "IDSS", full_name: "IDSS" };

  const profilesQuery: any = {
    select: vi.fn(() => profilesQuery),
    eq: vi.fn(() => profilesQuery),
    maybeSingle: vi.fn(() => Promise.resolve({ data: profile, error: null })),
  };
  const rolesQuery: any = {
    select: vi.fn(() => rolesQuery),
    eq: vi.fn(() => Promise.resolve(rolesResponse)),
  };
  const organizationsQuery: any = {
    select: vi.fn(() => organizationsQuery),
    in: vi.fn(() => organizationsQuery),
    order: vi.fn(() => Promise.resolve({ data: [organization], error: null })),
  };

  return {
    auth: {
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } }, error: null })),
    },
    from: vi.fn((table: string) => ({ profiles: profilesQuery, user_roles: rolesQuery, organizations: organizationsQuery } as any)[table]),
    queries: { profilesQuery, rolesQuery, organizationsQuery },
  };
};

describe("login → profil/uloge/organizacije RLS tok", () => {
  it("prolazi kompletan tok bez 403 grešaka", async () => {
    const client = createFlowClient({ data: [{ role: "admin", organization_id: "org-1" }], error: null });

    const result = await runLoginAuthRlsFlowProbe(client, "mulalic.davor@outlook.com", "valid-password");

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: "mulalic.davor@outlook.com", password: "valid-password" });
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.from).toHaveBeenCalledWith("user_roles");
    expect(client.from).toHaveBeenCalledWith("organizations");
    expect(result.profile.email).toBe("mulalic.davor@outlook.com");
    expect(result.roleEntries).toEqual([{ role: "admin", organization_id: "org-1" }]);
    expect(result.activeOrganization.code).toBe("IDSS");
  });

  it("pada s konkretnim detaljem kada RLS vrati 403 za uloge", async () => {
    const client = createFlowClient({
      data: null,
      error: { message: "permission denied for table user_roles", code: "42501", status: 403, details: "RLS/GRANT failure" },
    });

    await expect(runLoginAuthRlsFlowProbe(client, "mulalic.davor@outlook.com", "valid-password"))
      .rejects.toBeInstanceOf(AuthRlsProbeError);
    await expect(runLoginAuthRlsFlowProbe(client, "mulalic.davor@outlook.com", "valid-password"))
      .rejects.toMatchObject({ failures: [{ step: "user_roles", code: "42501", status: 403 }] });
  });
});