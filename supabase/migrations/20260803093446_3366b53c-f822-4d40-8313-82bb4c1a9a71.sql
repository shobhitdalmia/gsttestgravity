-- Internal-only functions: not callable from the API at all
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.add_company_owner_member() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_coa_for_new_company() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_default_coa(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_party_ledger(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.party_ledger_trigger() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_platform_admin_for_seed_email() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_phone(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;

-- Authorization helpers: signed-in users only (needed by RLS policies and app checks)
REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_company_owner(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_manage_books(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.company_role_of(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM anon;

GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_books(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_role_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;