# SPRINT 04 — Access Lockdown + Force Password Change
Datum: Juli 2026 (retroaktivno)
Status: ✅ DONE

## Isporučeno
- `seed-users` edge funkcija: kreira 3 whitelisted korisnika, briše ostale
- Forsirana promjena lozinke pri prvoj prijavi (`must_change_password` flag)
- Server-side gating: viewer nema pristup /invoices/new i /admin
- Settings > Users tab za role management (`admin_set_user_role` RPC)
- HIBP + disable_signup u auth konfiguraciji
