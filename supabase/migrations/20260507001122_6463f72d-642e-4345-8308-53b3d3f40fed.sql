
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role_in_org(uuid, app_role, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role_or_super(uuid, app_role, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_superadmin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_member_of_org(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_organization(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_org(uuid, app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_or_super(uuid, app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization(uuid) TO authenticated;
