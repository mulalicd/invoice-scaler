# SPRINT 01 — Bootstrap & Password Reset
Datum: Juli 2026 (retroaktivno rekonstruisano)
Status: ✅ DONE

## Cilj
Uspostaviti temelj aplikacije, whitelist pristup i osnovni auth flow.

## Isporučeno
- Auth stranice (Auth.tsx, ForgotPassword.tsx, ResetPassword.tsx)
- Whitelist tabela `allowed_emails` + trigger `handle_new_user`
- Uloge kroz `user_roles` + `has_role_or_super` SD funkcija
- Multi-org model (IDSS, IMH) + `PostLoginOrgChooser`
- ErrorBoundary + client error log

## Odluke
- D-000: PostLoginOrgChooser umjesto auto-switch

## Rezidual
Nije bilo Commander governance — uvedeno u Sprint 07.
