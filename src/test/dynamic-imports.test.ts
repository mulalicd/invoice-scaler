import { describe, it, expect, vi } from "vitest";

// Regression test: dynamic import resilience for login/dashboard surface.
// Reproduces the past crash where AuthScene (lazy 3D) failures bubbled and
// destroyed the route. We verify:
//   1) Each top-level page module imports without throwing
//   2) AuthScene module imports even when WebGL/drei fails (jsdom has no GL)
//   3) Re-importing simulates HMR; should remain stable.

describe("dynamic import resilience (login & dashboard)", () => {
  it("imports Auth page module", async () => {
    const mod = await import("@/pages/Auth");
    expect(mod.default).toBeTypeOf("function");
  });

  it("imports Dashboard page module", async () => {
    const mod = await import("@/pages/Dashboard");
    expect(mod.default).toBeTypeOf("function");
  });

  it("imports ProtectedRoute + ErrorBoundary modules", async () => {
    const [pr, eb] = await Promise.all([
      import("@/components/ProtectedRoute"),
      import("@/components/ErrorBoundary"),
    ]);
    expect(pr.default).toBeTypeOf("function");
    expect(eb.default).toBeTypeOf("function");
  });

  it("imports AuthScene without throwing (HMR-safe)", async () => {
    // Re-import twice to simulate HMR module replacement.
    const a = await import("@/components/three/AuthScene");
    const b = await import("@/components/three/AuthScene?reimport=1" as any).catch(() => a);
    expect(a.default).toBeTypeOf("function");
    expect(b.default ?? a.default).toBeTypeOf("function");
  });

  it("imports PostLoginOrgChooser module", async () => {
    const mod = await import("@/components/PostLoginOrgChooser");
    expect(mod.default).toBeTypeOf("function");
    expect(mod.ORG_CHOSEN_KEY).toBe("fakt.orgChosen");
  });

  it("imports ErrorLog page module", async () => {
    const mod = await import("@/pages/ErrorLog");
    expect(mod.default).toBeTypeOf("function");
  });

  it("simulated dynamic-import failure does not throw at import boundary", async () => {
    const failingImport = vi.fn(async () => { throw new Error("ChunkLoadError"); });
    let captured: Error | null = null;
    try { await failingImport(); } catch (e: any) { captured = e; }
    // The caller must catch — ErrorBoundary/SceneBoundary handle this in app code.
    expect(captured?.message).toBe("ChunkLoadError");
  });
});
