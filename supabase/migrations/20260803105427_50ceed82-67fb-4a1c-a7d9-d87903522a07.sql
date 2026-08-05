CREATE OR REPLACE FUNCTION public.email_registered(_email text)
RETURNS TABLE (exists_flag boolean, confirmed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(trim(_email))),
    COALESCE((SELECT u.email_confirmed_at IS NOT NULL FROM auth.users u WHERE lower(u.email) = lower(trim(_email)) LIMIT 1), false)
$$;

REVOKE ALL ON FUNCTION public.email_registered(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_registered(text) TO anon, authenticated, service_role;