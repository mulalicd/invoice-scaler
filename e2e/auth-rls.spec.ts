import { test, expect } from "@playwright/test";

/**
 * E2E regression: login → profil/uloge/organizacije → dashboard.
 *
 * Env vars required (set as GitHub Actions secrets):
 *   E2E_EMAIL, E2E_PASSWORD
 *
 * If env vars are not set, the test is skipped (so CI ne pada lokalno
 * niti u forkovima bez tajni).
 */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe("Auth + RLS regresija", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_EMAIL/E2E_PASSWORD nisu postavljeni");

  test("login → profil/uloge/organizacije bez 403", async ({ page }) => {
    const forbiddenRequests: { url: string; status: number }[] = [];
    const stackErrors: { message: string; source?: string }[] = [];

    page.on("response", res => {
      const url = res.url();
      if (res.status() === 403 && /\/rest\/v1\/(profiles|user_roles|organizations)/.test(url)) {
        forbiddenRequests.push({ url, status: res.status() });
      }
    });
    page.on("pageerror", err => stackErrors.push({ message: err.message, source: "pageerror" }));
    page.on("console", msg => {
      if (msg.type() === "error") stackErrors.push({ message: msg.text(), source: "console" });
    });

    await page.goto("/auth");
    await page.getByLabel(/email/i).fill(EMAIL!);
    await page.getByLabel(/lozinka/i).fill(PASSWORD!);
    await page.getByRole("button", { name: /prijavi se/i }).click();

    await expect(page.locator("text=/Dobrodošli|Odaberite ustanovu|Pregled/i")).toBeVisible({ timeout: 15_000 });

    const chooserBtn = page.getByRole("button", { name: /Uđi u/i }).first();
    if (await chooserBtn.isVisible().catch(() => false)) await chooserBtn.click();

    await expect(page.locator("text=/Ovaj mjesec|Klijenti|Plaćeno/i").first()).toBeVisible({ timeout: 15_000 });

    const fs = await import("node:fs");
    const samples = [
      ...forbiddenRequests.map(r => ({ message: `403 ${r.url}`, source: "rest" })),
      ...stackErrors,
    ];
    fs.writeFileSync("error-report.json", JSON.stringify({
      forbidden: forbiddenRequests.length,
      stack: stackErrors.length,
      total: samples.length,
      samples,
    }, null, 2));

    expect(forbiddenRequests, `403 odgovori na auth tablicama: ${JSON.stringify(forbiddenRequests)}`).toEqual([]);
  });
});

