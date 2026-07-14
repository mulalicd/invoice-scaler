# Commander Compliance Audit — Faktura Sistem
Datum: 14.07.2026
Governance: Commander v1.1 (retroactive)

Retroaktivna analiza usklađenosti postojećeg koda s Commander pravilima.
Legenda: ✅ usklađeno · ⚠️ djelimično · ❌ nije usklađeno · N/A neprimjenjivo

---

## CONSTITUTION (Mindset)

| Rule | Naslov | Status | Napomena |
|------|--------|--------|----------|
| M-1  | CTO Principle | ✅ | Institucionalna namjena jasna |
| M-2  | Architectural Thinking Order | ✅ | Vision → Data → API → Feature prošlo |
| M-3  | Decision Hierarchy | ✅ | Security > Data Integrity dosljedno |
| M-4  | Anti-Hallucination | ✅ | Whitelist u `allowed_emails`, uloge u enumu |
| M-5  | Layered Architecture | ✅ | Presentation → Domain → Infrastructure jasno |
| M-6  | Feature-Based Folders | ❌ | **TD-01** — trenutno `pages/`, `components/`, `lib/` |
| M-7  | Single Source of Truth | ⚠️ | Zod schemas raspršeni po stranicama; treba `lib/validation/schemas.ts` — **TD-02** |
| M-8  | Iteration Philosophy | ✅ | Sprintovi po fokusiranim promjenama |
| M-9  | AI Collaboration | ⚠️ | JSDoc djelimičan; HANDOFF sada uveden |
| M-10 | Context Insufficiency | ✅ | Pitanja se postavljaju prije nagađanja |

## ENGINEERING_RULES

| Rule | Naslov | Status | Napomena |
|------|--------|--------|----------|
| E-1  | TypeScript strict | ⚠️ | `strict: false` u `tsconfig.app.json`; postoji `any` na više mjesta — **TD-03** |
| E-2  | Zod na boundary | ⚠️ | Auth i password rade Zod; ostatak forme (klijenti, fakture) — **TD-02** |
| E-3  | RLS + GRANT | ✅ | Sve `public.*` tabele imaju GRANT + RLS |
| E-4  | SECURITY DEFINER search_path | ✅ | Svaka SD funkcija `SET search_path = public` |
| E-5  | Audit log | ✅ | `log_action` na svakoj privilegovanoj operaciji |
| E-6  | Error log maskiranje | ✅ | `src/lib/redact.ts` + `redact.test.ts` |

## ARCHITECTURE_PATTERNS

| Rule | Naslov | Status | Napomena |
|------|--------|--------|----------|
| A-1  | Client → RPC → Repo → DB | ✅ | Nema direktnih `service_role` poziva iz klijenta |
| A-2  | Multi-org izolacija | ✅ | Svi RLS-ovi filtriraju po `active_organization_id` |
| A-3  | Idempotentni bulk import | ✅ | `bulk_import_invoices_detailed` skip + error report |

## DONE_CHECKLIST

| Stavka | Status |
|--------|--------|
| Lint + typecheck prolazi | ✅ |
| Unit testovi | ✅ |
| Regresijski test dynamic import | ✅ |
| E2E Playwright login flow | ✅ |
| CI/GitHub Actions | ✅ |
| Error gating u PR | ✅ |
| RLS test za svaku novu tabelu | ✅ |
| Security scan (linter) | ✅ WARN dokumentiran u STRESS-TEST |
| SEO meta + Permissions-Policy | ✅ |
| Responsive (mobile/tablet/desktop) | ✅ |

---

## Tech Debt registar

| ID | Naslov | Prioritet | Effort | Vlasnik |
|----|--------|-----------|--------|---------|
| TD-01 | Migracija na feature-based folder strukturu | P2 | L | ACA |
| TD-02 | Konsolidacija Zod schema u `lib/validation/schemas.ts` | P2 | M | ACA |
| TD-03 | Uključiti `strict: true` u TypeScript i eliminisati `any` | P1 | M | ACA |
| TD-04 | JSDoc na svakoj eksportovanoj funkciji domain sloja | P3 | S | ACA |
| TD-05 | Ekstenzivno RLS regression testovi po org-u | P2 | M | ACA |

## Otvoreni rizici

1. **SECURITY DEFINER funkcije** (`switch_active_organization`, `next_invoice_number`,
   `bulk_import_*`, `admin_set_user_role`, `wipe_org_data`) prijavljene su kao
   WARN u Supabase linter-u. Prihvaćeno kao potreban risk — funkcije rade
   eksplicitnu auth provjeru unutar tijela. Vidi `STRESS-TEST-01062026.md` A7.
2. **`profiles.email`** je duplikat `auth.users.email` — sinhronizacija kroz
   `handle_new_user` trigger; promjena email-a blokirana kroz
   `protect_profile_columns`.
