# SPRINT 05 — BRUTAL Stress Test + P0 Hotfix
Datum: Juli 2026 (retroaktivno)
Status: ✅ DONE (P0/P1) · ⚠️ P2/P3 rezidual

## Isporučeno
- `STRESS-TEST-01062026.md` — 98 nalaza u 9 blokova
- P0 fix wave 1: A1 (Zod returns), A5/A6 (viewer status/email lock), B1/B2 (parseNum, negativni brojevi), B3 (UNIQUE invoice_number), D1 (multi-page PDF)
- P0 fix wave 2: A2 (uklonjena registracija), A3 (`src/lib/passwordPolicy.ts`), A7/A9/A10 (`protect_profile_columns` trigger, superadmin row lock), B4 (TZ-safe due_date), C1 (null-safe filteri)

## Rezidual
Vidi STRESS-TEST-01062026.md — P2/P3 stavke prenesene u TD registar.
