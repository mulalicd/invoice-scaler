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
    page.on("response", res => {
      const url = res.url();
      if (res.status() === 403 && /\/rest\/v1\/(profiles|user_roles|organizations)/.test(url)) {
        forbiddenRequests.push({ url, status: res.status() });
      }
    });

    await page.goto("/auth");
    await page.getByLabel(/email/i).fill(EMAIL!);
    await page.getByLabel(/lozinka/i).fill(PASSWORD!);
    await page.getByRole("button", { name: /prijavi se/i }).click();

    // Ili dashboard, ili PostLoginOrgChooser (ako korisnik ima 2+ org).
    await expect(page.locator("text=/Dobrodošli|Odaberite ustanovu|Pregled/i")).toBeVisible({ timeout: 15_000 });

    // Ako je org chooser, kliknemo prvu opciju.
    const chooserBtn = page.getByRole("button", { name: /Uđi u/i }).first();
    if (await chooserBtn.isVisible().catch(() => false)) {
      await chooserBtn.click();
    }

    // Dashboard mora prikazati barem jednu KPI karticu.
    await expect(page.locator("text=/Ovaj mjesec|Klijenti|Plaćeno/i").first()).toBeVisible({ timeout: 15_000 });

    expect(forbiddenRequests, `403 odgovori na auth tablicama: ${JSON.stringify(forbiddenRequests)}`).toEqual([]);
  });
});
