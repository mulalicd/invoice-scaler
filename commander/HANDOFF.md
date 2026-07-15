# HANDOFF NOTE — TD-03 Phase 2 (contexts + pages)
Datum: 15.07.2026
Sprint: td-03-phase-2

## Completed (this sprint)

- **`noImplicitAny: true`** i **`noFallthroughCasesInSwitch: true`** uključeni u `tsconfig.app.json`.
- Novi shared helperi:
  - `src/lib/errorMessage.ts` — `errorMessage`, `errorStack`, `toErrorLike` za narrowing `unknown` u `catch` blokovima.
  - `src/lib/domain.ts` — reeksport tipova generisanih iz Supabase schema (`ClientRow`, `InvoiceRow`, `InvoiceItemRow`, `ProfileRow`, `OrganizationRow`, `AuditLogRow`, plus `InvoiceListRow` / `DashboardInvoiceRow` za page-specifične selectove).
- Eliminisan `any` iz:
  - `src/contexts/AuthContext.tsx` (catch → `unknown`, uklonjen `as any` na RPC-u)
  - `src/pages/Auth.tsx` (Error boundary `componentDidCatch`)
  - `src/pages/Admin.tsx` (typed audit rows, `wipe_org_data` RPC bez castova)
  - `src/pages/Clients.tsx` (payload narrowing)
  - `src/pages/Dashboard.tsx` (`DashboardInvoiceRow`, KpiCard props interface, Recharts formatteri)
  - `src/pages/ErrorLog.tsx` (typed context, `error_log` bez `as any`)
  - `src/pages/InvoiceDetail.tsx` (`InvoiceRow`, `InvoiceItemRow`, `ClientRow`, catch → `unknown`)
  - `src/pages/Invoices.tsx` (`InvoiceListRow`, catchevi → `errorMessage()`)
  - `src/pages/NewInvoice.tsx` (uklonjeni `as any` na insert-ovima)
  - `src/pages/Settings.tsx` (Field props interface, typed members merge, RPC bez castova)
  - `src/test/setup.ts` (MediaQueryList tip)
- Typecheck (`tsgo -p tsconfig.app.json`) zelen, svih 15 testova prolazi.

## Prior sprint

- TD-03 Phase 1 (src/lib): redact, errorLogger, authRlsProbe, invoicePdf strogo tipizirani.

## Not completed (planirano)

- TD-01 → feature-based folder migracija
- TD-02 → konsolidovane Zod scheme (potreban preduslov za Fazu 3)
- **TD-03 Phase 3** → uključiti puni `strict: true` (uključujući `strictNullChecks`); zahtijeva narrowing null-ovih polja u `Settings.tsx`, `InvoiceDetail.tsx`, i konsolidaciju validacije klijentskih formi kroz TD-02.
- TD-04 → JSDoc pokrivenost
- TD-05 → RLS regression suite

## Open risks

- SECURITY DEFINER WARN-ovi ostaju (dokumentovano, D-003)
- `strictNullChecks` još nije aktivan — potencijalna null greška može proći review dok se ne uključi u Fazi 3.

## Next sprint (preporuka)

**TD-02 (Zod scheme konsolidacija)** — kreirati `src/domain/schemas/*.ts` sa parse funkcijama koje vraćaju domain tipove; ovo je preduslov da bi Faza 3 (`strict: true`) prošla bez masovnog narrowing-a.
