-- =============== 1. CORE SCHEMA ===============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile upsert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_name TEXT,
  gstin TEXT,
  pan TEXT,
  state TEXT,
  state_code TEXT,
  address TEXT,
  city TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  financial_year_start DATE DEFAULT (date_trunc('year', now()) + interval '3 months')::date,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INT DEFAULT 1,
  logo_url text,
  bank_name text,
  bank_account_no text,
  bank_ifsc text,
  bank_branch text,
  jurisdiction text,
  default_terms text,
  default_transport text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.party_type AS ENUM ('customer','supplier','both');
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.party_type NOT NULL DEFAULT 'customer',
  name TEXT NOT NULL,
  gstin TEXT,
  phone TEXT,
  email TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  state TEXT,
  state_code TEXT,
  opening_balance NUMERIC(14,2) DEFAULT 0,
  credit_limit NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.parties(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT ALL ON public.parties TO service_role;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  hsn_code TEXT,
  unit TEXT DEFAULT 'PCS',
  sale_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  purchase_price NUMERIC(14,2) DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
  stock_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(14,2) DEFAULT 5,
  is_service BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.products(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.invoice_status AS ENUM ('draft','unpaid','partial','paid','cancelled');
CREATE TYPE public.invoice_doc_type AS ENUM ('tax_invoice', 'bill_of_supply');
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  place_of_supply TEXT,
  is_interstate BOOLEAN DEFAULT false,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'unpaid',
  invoice_type public.invoice_doc_type NOT NULL DEFAULT 'tax_invoice',
  reverse_charge boolean NOT NULL DEFAULT false,
  transport_name text,
  vehicle_no text,
  gr_rr_no text,
  station text,
  shipping_address text,
  invoice_time text,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, invoice_number)
);
CREATE INDEX ON public.invoices(company_id, invoice_date DESC);
CREATE INDEX ON public.invoices(party_id);
CREATE INDEX idx_invoices_company_date ON public.invoices (company_id, invoice_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hsn_code TEXT,
  quantity NUMERIC(14,2) NOT NULL DEFAULT 1,
  unit TEXT,
  rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) DEFAULT 0,
  sgst NUMERIC(14,2) DEFAULT 0,
  igst NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_price numeric,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items (invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_interstate BOOLEAN DEFAULT false,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.purchases(company_id, bill_date DESC);
CREATE INDEX idx_purchases_company_date ON public.purchases (company_id, bill_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hsn_code TEXT,
  quantity NUMERIC(14,2) NOT NULL DEFAULT 1,
  unit TEXT,
  rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) DEFAULT 0,
  sgst NUMERIC(14,2) DEFAULT 0,
  igst NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.purchase_items(purchase_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT ALL ON public.purchase_items TO service_role;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.expenses(company_id, expense_date DESC);
CREATE INDEX idx_expenses_company_date ON public.expenses (company_id, expense_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.payment_direction AS ENUM ('received','paid');
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  direction public.payment_direction NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments(company_id, payment_date DESC);
CREATE INDEX idx_payments_company_date ON public.payments (company_id, payment_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_companies_upd BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_parties_upd BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_upd BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_purchases_upd BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== 2. TEAM / ROLES ===============
CREATE TYPE public.company_role AS ENUM ('owner', 'accountant', 'staff');

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.company_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text,
  code text NOT NULL UNIQUE,
  role public.company_role NOT NULL DEFAULT 'accountant',
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_by uuid,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_invites TO authenticated;
GRANT ALL ON public.company_invites TO service_role;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX company_members_user_idx ON public.company_members(user_id);
CREATE INDEX company_invites_company_idx ON public.company_invites(company_id);

CREATE OR REPLACE FUNCTION public.company_role_of(_company_id uuid)
RETURNS public.company_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.company_members
  WHERE company_id = _company_id AND user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_books(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = auth.uid()
      AND role IN ('owner', 'accountant')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = auth.uid() AND role = 'owner'
  ) OR EXISTS (
    SELECT 1 FROM public.companies WHERE id = _company_id AND owner_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.company_role_of(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.can_manage_books(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_company_owner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.company_role_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_books(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_owner(uuid) TO authenticated;

CREATE POLICY "members visible to members" ON public.company_members
  FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "owner manages members insert" ON public.company_members
  FOR INSERT TO authenticated WITH CHECK (public.is_company_owner(company_id));
CREATE POLICY "owner manages members update" ON public.company_members
  FOR UPDATE TO authenticated USING (public.is_company_owner(company_id));
CREATE POLICY "owner manages members delete" ON public.company_members
  FOR DELETE TO authenticated USING (public.is_company_owner(company_id) OR user_id = auth.uid());

CREATE POLICY "owner manages invites" ON public.company_invites
  FOR ALL TO authenticated USING (public.is_company_owner(company_id)) WITH CHECK (public.is_company_owner(company_id));

CREATE POLICY "members read company" ON public.companies
  FOR SELECT TO authenticated USING (public.is_company_member(id) OR auth.uid() = owner_id);
CREATE POLICY "create own company" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner updates company" ON public.companies
  FOR UPDATE TO authenticated USING (public.is_company_owner(id)) WITH CHECK (public.is_company_owner(id));
CREATE POLICY "owner deletes company" ON public.companies
  FOR DELETE TO authenticated USING (public.is_company_owner(id));

CREATE POLICY "parties by member" ON public.parties FOR ALL TO authenticated
  USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "products by member" ON public.products FOR ALL TO authenticated
  USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "invoices by member" ON public.invoices FOR ALL TO authenticated
  USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "invoice items by member" ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_company_member(i.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_company_member(i.company_id)));

CREATE POLICY "purchases by books manager" ON public.purchases FOR ALL TO authenticated
  USING (public.can_manage_books(company_id)) WITH CHECK (public.can_manage_books(company_id));
CREATE POLICY "purchase items by books manager" ON public.purchase_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.can_manage_books(p.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.can_manage_books(p.company_id)));
CREATE POLICY "expenses by books manager" ON public.expenses FOR ALL TO authenticated
  USING (public.can_manage_books(company_id)) WITH CHECK (public.can_manage_books(company_id));
CREATE POLICY "payments by books manager" ON public.payments FOR ALL TO authenticated
  USING (public.can_manage_books(company_id)) WITH CHECK (public.can_manage_books(company_id));

CREATE OR REPLACE FUNCTION public.add_company_owner_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (company_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.add_company_owner_member() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.add_company_owner_member() TO service_role;

CREATE TRIGGER companies_add_owner_member
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.add_company_owner_member();

CREATE TRIGGER company_members_updated_at
BEFORE UPDATE ON public.company_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== 3. PLATFORM ADMIN ===============
CREATE TABLE public.platform_admins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email text,
  is_super boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

CREATE POLICY "admins read admin list"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE TABLE public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  target_label text,
  reason text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.grant_platform_admin_for_seed_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'infotheadvices@gmail.com' THEN
    INSERT INTO public.platform_admins (user_id, email, is_super)
    VALUES (NEW.id, lower(NEW.email), true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.grant_platform_admin_for_seed_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_grant_platform_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_platform_admin_for_seed_email();

CREATE TRIGGER on_auth_user_confirmed_grant_platform_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_platform_admin_for_seed_email();

INSERT INTO public.platform_admins (user_id, email, is_super)
SELECT id, lower(email), true FROM auth.users
WHERE lower(email) = 'infotheadvices@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- =============== 4. PHONE + ACCOUNTING ===============
CREATE OR REPLACE FUNCTION public.normalize_phone(_raw text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(RIGHT(regexp_replace(COALESCE(_raw, ''), '\D', '', 'g'), 10), '')
$$;
REVOKE EXECUTE ON FUNCTION public.normalize_phone(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.normalize_phone(text) TO authenticated, service_role;

CREATE UNIQUE INDEX profiles_phone_unique_idx
  ON public.profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _phone text;
BEGIN
  _phone := public.normalize_phone(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone));
  IF _phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = _phone AND id <> NEW.id
  ) THEN
    _phone := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    _phone
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        phone     = COALESCE(public.profiles.phone, EXCLUDED.phone);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.ledger_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.ledger_groups(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  nature text NOT NULL CHECK (nature IN ('assets','liabilities','income','expenses')),
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX ledger_groups_company_code_idx ON public.ledger_groups (company_id, code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX ledger_groups_company_name_idx ON public.ledger_groups (company_id, lower(name));
CREATE INDEX ledger_groups_company_idx ON public.ledger_groups (company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_groups TO authenticated;
GRANT ALL ON public.ledger_groups TO service_role;
ALTER TABLE public.ledger_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups read by member" ON public.ledger_groups FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "groups insert by books manager" ON public.ledger_groups FOR INSERT TO authenticated WITH CHECK (public.can_manage_books(company_id));
CREATE POLICY "groups update by books manager" ON public.ledger_groups FOR UPDATE TO authenticated USING (public.can_manage_books(company_id)) WITH CHECK (public.can_manage_books(company_id));
CREATE POLICY "groups delete by books manager" ON public.ledger_groups FOR DELETE TO authenticated USING (public.can_manage_books(company_id));

CREATE TABLE public.ledgers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.ledger_groups(id) ON DELETE RESTRICT,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  gst_rate numeric,
  opening_balance numeric NOT NULL DEFAULT 0,
  opening_type text NOT NULL DEFAULT 'debit' CHECK (opening_type IN ('debit','credit')),
  is_system boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX ledgers_company_code_idx ON public.ledgers (company_id, code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX ledgers_company_name_idx ON public.ledgers (company_id, lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX ledgers_company_idx ON public.ledgers (company_id);
CREATE INDEX ledgers_group_idx ON public.ledgers (group_id);
CREATE INDEX ledgers_party_idx ON public.ledgers (party_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledgers TO authenticated;
GRANT ALL ON public.ledgers TO service_role;
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledgers read by member" ON public.ledgers FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "ledgers insert by books manager" ON public.ledgers FOR INSERT TO authenticated WITH CHECK (public.can_manage_books(company_id));
CREATE POLICY "ledgers update by books manager" ON public.ledgers FOR UPDATE TO authenticated USING (public.can_manage_books(company_id)) WITH CHECK (public.can_manage_books(company_id));
CREATE POLICY "ledgers delete by books manager" ON public.ledgers FOR DELETE TO authenticated USING (public.can_manage_books(company_id));

CREATE TABLE public.vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  voucher_type text NOT NULL CHECK (voucher_type IN ('sales','purchase','receipt','payment','expense','journal','contra','credit_note','debit_note','opening')),
  voucher_no text,
  voucher_date date NOT NULL DEFAULT CURRENT_DATE,
  narration text,
  source_type text,
  source_id uuid,
  is_auto boolean NOT NULL DEFAULT false,
  total_debit numeric NOT NULL DEFAULT 0,
  total_credit numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX vouchers_source_idx ON public.vouchers (company_id, source_type, source_id) WHERE source_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX vouchers_company_date_idx ON public.vouchers (company_id, voucher_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vouchers read by member" ON public.vouchers FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "vouchers insert by books manager" ON public.vouchers FOR INSERT TO authenticated WITH CHECK (public.can_manage_books(company_id));
CREATE POLICY "vouchers update by books manager" ON public.vouchers FOR UPDATE TO authenticated USING (public.can_manage_books(company_id)) WITH CHECK (public.can_manage_books(company_id));
CREATE POLICY "vouchers delete by books manager" ON public.vouchers FOR DELETE TO authenticated USING (public.can_manage_books(company_id));

CREATE TABLE public.voucher_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  ledger_id uuid NOT NULL REFERENCES public.ledgers(id) ON DELETE RESTRICT,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  narration text,
  line_no integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX voucher_lines_voucher_idx ON public.voucher_lines (voucher_id);
CREATE INDEX voucher_lines_ledger_idx ON public.voucher_lines (ledger_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voucher_lines TO authenticated;
GRANT ALL ON public.voucher_lines TO service_role;
ALTER TABLE public.voucher_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voucher lines read by member" ON public.voucher_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vouchers v WHERE v.id = voucher_lines.voucher_id AND public.is_company_member(v.company_id)));
CREATE POLICY "voucher lines write by books manager" ON public.voucher_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vouchers v WHERE v.id = voucher_lines.voucher_id AND public.can_manage_books(v.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vouchers v WHERE v.id = voucher_lines.voucher_id AND public.can_manage_books(v.company_id)));

CREATE TRIGGER ledger_groups_updated_at BEFORE UPDATE ON public.ledger_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ledgers_updated_at BEFORE UPDATE ON public.ledgers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.seed_default_coa(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g record;
  l record;
  gid uuid;
BEGIN
  FOR g IN
    SELECT * FROM (VALUES
      ('capital',        'Capital Account',      NULL,          'liabilities', 10),
      ('loans',          'Loans (Liability)',    NULL,          'liabilities', 20),
      ('current_liab',   'Current Liabilities',  NULL,          'liabilities', 30),
      ('duties_taxes',   'Duties & Taxes',       'current_liab','liabilities', 31),
      ('sundry_cred',    'Sundry Creditors',     'current_liab','liabilities', 32),
      ('provisions',     'Provisions',           'current_liab','liabilities', 33),
      ('fixed_assets',   'Fixed Assets',         NULL,          'assets',      40),
      ('investments',    'Investments',          NULL,          'assets',      50),
      ('current_assets', 'Current Assets',       NULL,          'assets',      60),
      ('bank_accounts',  'Bank Accounts',        'current_assets','assets',    61),
      ('cash_in_hand',   'Cash-in-Hand',         'current_assets','assets',    62),
      ('sundry_deb',     'Sundry Debtors',       'current_assets','assets',    63),
      ('stock_in_hand',  'Stock-in-Hand',        'current_assets','assets',    64),
      ('loans_advances', 'Loans & Advances (Asset)','current_assets','assets', 65),
      ('sales_accounts', 'Sales Accounts',       NULL,          'income',      70),
      ('purchase_accounts','Purchase Accounts',  NULL,          'expenses',    80),
      ('direct_exp',     'Direct Expenses',      NULL,          'expenses',    85),
      ('indirect_exp',   'Indirect Expenses',    NULL,          'expenses',    90),
      ('direct_inc',     'Direct Income',        NULL,          'income',      95),
      ('indirect_inc',   'Indirect Income',      NULL,          'income',      96)
    ) AS t(code, name, parent_code, nature, sort)
    ORDER BY sort
  LOOP
    INSERT INTO public.ledger_groups (company_id, code, name, nature, is_system, sort_order, parent_id)
    VALUES (
      _company_id, g.code, g.name, g.nature, true, g.sort,
      CASE WHEN g.parent_code IS NULL THEN NULL
           ELSE (SELECT id FROM public.ledger_groups WHERE company_id = _company_id AND code = g.parent_code) END
    )
    ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;
  END LOOP;

  FOR l IN
    SELECT * FROM (VALUES
      ('sales_local',      'Sales (Local)',              'sales_accounts'),
      ('sales_interstate', 'Sales (Interstate)',         'sales_accounts'),
      ('sales_exempt',     'Sales - Exempt / Nil Rated', 'sales_accounts'),
      ('sales_bos',        'Sales - Bill of Supply',     'sales_accounts'),
      ('sales_return',     'Sales Return',               'sales_accounts'),
      ('purchase_local',      'Purchase (Local)',        'purchase_accounts'),
      ('purchase_interstate', 'Purchase (Interstate)',   'purchase_accounts'),
      ('purchase_exempt',     'Purchase - Exempt',       'purchase_accounts'),
      ('purchase_rcm',        'Purchase - RCM',          'purchase_accounts'),
      ('purchase_return',     'Purchase Return',         'purchase_accounts'),
      ('output_cgst', 'Output CGST', 'duties_taxes'),
      ('output_sgst', 'Output SGST', 'duties_taxes'),
      ('output_igst', 'Output IGST', 'duties_taxes'),
      ('output_cess', 'Output CESS', 'duties_taxes'),
      ('input_cgst',  'Input CGST',  'duties_taxes'),
      ('input_sgst',  'Input SGST',  'duties_taxes'),
      ('input_igst',  'Input IGST',  'duties_taxes'),
      ('input_cess',  'Input CESS',  'duties_taxes'),
      ('gst_payable', 'GST Payable', 'duties_taxes'),
      ('tds_payable', 'TDS Payable', 'duties_taxes'),
      ('tcs_payable', 'TCS Payable', 'duties_taxes'),
      ('round_off',   'Round Off',   'indirect_exp'),
      ('cash',        'Cash',        'cash_in_hand'),
      ('petty_cash',  'Petty Cash',  'cash_in_hand'),
      ('bank',        'Bank Account','bank_accounts'),
      ('upi_wallet',  'UPI / Wallet','bank_accounts'),
      ('freight',        'Freight & Transport',      'direct_exp'),
      ('wages',          'Wages',                    'direct_exp'),
      ('power_fuel',     'Power & Fuel',             'direct_exp'),
      ('rent',           'Rent',                     'indirect_exp'),
      ('salary',         'Salary & Staff Welfare',   'indirect_exp'),
      ('electricity',    'Electricity Expenses',     'indirect_exp'),
      ('telephone',      'Telephone & Internet',     'indirect_exp'),
      ('bank_charges',   'Bank Charges',             'indirect_exp'),
      ('professional',   'Professional & Legal Fees','indirect_exp'),
      ('discount_allowed','Discount Allowed',        'indirect_exp'),
      ('printing',       'Printing & Stationery',    'indirect_exp'),
      ('repairs',        'Repairs & Maintenance',    'indirect_exp'),
      ('travelling',     'Travelling & Conveyance',  'indirect_exp'),
      ('advertisement',  'Advertisement & Marketing','indirect_exp'),
      ('misc_exp',       'Miscellaneous Expenses',   'indirect_exp'),
      ('discount_received','Discount Received',      'indirect_inc'),
      ('interest_income',  'Interest Income',        'indirect_inc'),
      ('other_income',     'Other Income',           'indirect_inc'),
      ('opening_stock',  'Opening Stock',            'stock_in_hand'),
      ('closing_stock',  'Closing Stock',            'stock_in_hand'),
      ('capital_account','Capital Account',          'capital'),
      ('drawings',       'Drawings',                 'capital'),
      ('opening_balance_equity','Opening Balance Equity','capital'),
      ('furniture',      'Furniture & Fixtures',     'fixed_assets'),
      ('plant_machinery','Plant & Machinery',        'fixed_assets'),
      ('computers',      'Computers & Equipment',    'fixed_assets'),
      ('vehicles',       'Vehicles',                 'fixed_assets')
    ) AS t(code, name, group_code)
  LOOP
    SELECT id INTO gid FROM public.ledger_groups WHERE company_id = _company_id AND code = l.group_code;
    IF gid IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.ledgers (company_id, group_id, code, name, is_system)
    VALUES (_company_id, gid, l.code, l.name, true)
    ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.seed_default_coa(uuid) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_coa(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.seed_coa_for_new_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_coa(NEW.id);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.seed_coa_for_new_company() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_coa_for_new_company() TO service_role;

CREATE TRIGGER companies_seed_coa AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.seed_coa_for_new_company();

ALTER TABLE public.parties ADD COLUMN ledger_id uuid REFERENCES public.ledgers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.ensure_party_ledger(_party_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p record;
  gid uuid;
  lid uuid;
  base_name text;
  final_name text;
  n integer := 1;
BEGIN
  SELECT * INTO p FROM public.parties WHERE id = _party_id;
  IF p IS NULL THEN RETURN NULL; END IF;
  IF p.ledger_id IS NOT NULL THEN RETURN p.ledger_id; END IF;

  PERFORM public.seed_default_coa(p.company_id);

  SELECT id INTO gid FROM public.ledger_groups
  WHERE company_id = p.company_id
    AND code = CASE WHEN p.type = 'supplier' THEN 'sundry_cred' ELSE 'sundry_deb' END;
  IF gid IS NULL THEN RETURN NULL; END IF;

  base_name := COALESCE(NULLIF(trim(p.name), ''), 'Party');
  final_name := base_name;
  WHILE EXISTS (
    SELECT 1 FROM public.ledgers
    WHERE company_id = p.company_id AND lower(name) = lower(final_name) AND deleted_at IS NULL
  ) LOOP
    n := n + 1;
    final_name := base_name || ' (' || n || ')';
  END LOOP;

  INSERT INTO public.ledgers (company_id, group_id, party_id, name, opening_balance, opening_type, is_system)
  VALUES (
    p.company_id, gid, p.id, final_name, COALESCE(p.opening_balance, 0),
    CASE WHEN p.type = 'supplier' THEN 'credit' ELSE 'debit' END, false
  )
  RETURNING id INTO lid;

  UPDATE public.parties SET ledger_id = lid WHERE id = p.id;
  RETURN lid;
END $$;
REVOKE EXECUTE ON FUNCTION public.ensure_party_ledger(uuid) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_party_ledger(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.party_ledger_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ensure_party_ledger(NEW.id);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.party_ledger_trigger() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.party_ledger_trigger() TO service_role;

CREATE TRIGGER parties_ensure_ledger AFTER INSERT ON public.parties
FOR EACH ROW EXECUTE FUNCTION public.party_ledger_trigger();