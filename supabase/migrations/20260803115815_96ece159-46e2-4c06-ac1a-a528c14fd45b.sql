-- 1. Profiles: verified mobile + one number per account
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

UPDATE public.profiles SET phone = public.normalize_phone(phone) WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON public.profiles (phone) WHERE phone IS NOT NULL;

-- 2. Companies: owner mobile snapshot, permanently linked with the GSTIN
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_phone text;

UPDATE public.companies c
   SET owner_phone = p.phone
  FROM public.profiles p
 WHERE p.id = c.owner_id AND c.owner_phone IS NULL AND p.phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_company_owner_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_phone IS NULL THEN
    SELECT phone INTO NEW.owner_phone FROM public.profiles WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.set_company_owner_phone() FROM anon, authenticated;

DROP TRIGGER IF EXISTS companies_set_owner_phone ON public.companies;
CREATE TRIGGER companies_set_owner_phone
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_company_owner_phone();

-- Owner mobile is immutable for normal users; platform admins may correct it.
CREATE OR REPLACE FUNCTION public.guard_company_owner_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_phone IS DISTINCT FROM OLD.owner_phone
     AND auth.uid() IS NOT NULL
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Company ka owner mobile sirf platform admin badal sakta hai';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.guard_company_owner_phone() FROM anon, authenticated;

DROP TRIGGER IF EXISTS companies_guard_owner_phone ON public.companies;
CREATE TRIGGER companies_guard_owner_phone
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.guard_company_owner_phone();

-- 3. OTP store — server-only (service_role), never reachable from the browser
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  channel text NOT NULL DEFAULT 'temporary',
  attempts integer NOT NULL DEFAULT 0,
  ip text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_otps TO service_role;

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phone_otps no client access" ON public.phone_otps;
CREATE POLICY "phone_otps no client access" ON public.phone_otps
  FOR SELECT TO authenticated USING (false);

CREATE INDEX IF NOT EXISTS phone_otps_phone_created_idx ON public.phone_otps (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS phone_otps_ip_created_idx ON public.phone_otps (ip, created_at DESC);

-- 4. Users can read audit entries about their own account (mobile changes etc.)
DROP POLICY IF EXISTS "Users can view audit entries about themselves" ON public.admin_audit_log;
CREATE POLICY "Users can view audit entries about themselves" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (target_type = 'user' AND target_id = auth.uid()::text);