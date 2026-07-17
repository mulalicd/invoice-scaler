# SPRINT 08 — TD-03 Strict Typing (Phase 1 + 2)
Datum: 14–15.07.2026
Status: ✅ DONE (Faze 1–2) · ⏳ Faza 3 planirana

## Faza 1 — src/lib
- Eliminisan `any` iz redact, errorLogger, authRlsProbe, invoicePdf
- Uvedeni `RedactableValue`, `SupabaseLikeError` tipovi

## Faza 2 — contexts + pages
- `noImplicitAny: true`, `noFallthroughCasesInSwitch: true` u `tsconfig.app.json`
- Novi helperi: `src/lib/errorMessage.ts`, `src/lib/domain.ts`
- Strict typing u AuthContext + svih 9 pages
- Typecheck čist, 15/15 testova zeleno

## Odluke
- D-004: incremental strict flip (ne big bang)
- D-005: samo `noImplicitAny` u Fazi 2, `strictNullChecks` u Fazi 3 nakon TD-02

## Next
TD-02 (Zod scheme konsolidacija) → preduslov za TD-03 Fazu 3.
