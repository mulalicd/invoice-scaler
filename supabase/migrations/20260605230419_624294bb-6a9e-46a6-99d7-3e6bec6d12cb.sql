
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_or_super(uuid, public.app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_org(uuid, public.app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization(uuid) TO authenticated;
