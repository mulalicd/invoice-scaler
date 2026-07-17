# SPRINT 06 — Error Observability + CI + Multi-Org Fix
Datum: Juli 2026 (retroaktivno)
Status: ✅ DONE

## Isporučeno
- `src/lib/authRlsProbe.ts` + unit test za login → profile/roles/org flow
- `src/lib/errorLogger.ts` + `log_client_error` RPC (auth-only)
- ErrorBoundary skope: root + ProtectedRoute
- 403 fallback UI + auto session refresh retry
- `/admin/errors` viewer sa `src/lib/redact.ts` maskiranjem
- `/admin/auth-diag` diagnostic panel
- Playwright E2E (`e2e/auth-rls.spec.ts`) + `.github/workflows/ci.yml` + `scripts/error-gate.mjs`
- Fix: PDF preview clipping (210mm fixed + horizontal scroll)
- Responsive fixes (App.css reset, viewport-fit=cover)

## Sigurnost
- Fix P0 privilege escalation u `user_roles` (cross-org)
- `claim_organization` hardening
- `error_log` insert scope na `auth.uid()`
- Security headers u `index.html`
