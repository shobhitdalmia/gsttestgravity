ALTER TABLE public.ledger_groups ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.seed_default_coa(_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g record;
  l record;
  gid uuid;
BEGIN
  FOR g IN
    SELECT * FROM (VALUES
      ('capital',        'Capital Account',      NULL,          'liabilities', 10,  true),
      ('loans',          'Loans (Liability)',    NULL,          'liabilities', 20,  true),
      ('current_liab',   'Current Liabilities',  NULL,          'liabilities', 30,  true),
      ('duties_taxes',   'Duties & Taxes',       'current_liab','liabilities', 31,  false),
      ('sundry_cred',    'Sundry Creditors',     'current_liab','liabilities', 32,  false),
      ('provisions',     'Provisions',           'current_liab','liabilities', 33,  false),
      ('suspense',       'Suspense Account',     NULL,          'liabilities', 35,  true),
      ('profit_loss',    'Profit & Loss',        NULL,          'liabilities', 36,  true),
      ('fixed_assets',   'Fixed Assets',         NULL,          'assets',      40,  true),
      ('investments',    'Investments',          NULL,          'assets',      50,  true),
      ('pre_operative',  'Pre-Operative Expenses', NULL,        'assets',      55,  true),
      ('current_assets', 'Current Assets',       NULL,          'assets',      60,  true),
      ('bank_accounts',  'Bank Accounts',        'current_assets','assets',    61,  false),
      ('cash_in_hand',   'Cash-in-Hand',         'current_assets','assets',    62,  false),
      ('sundry_deb',     'Sundry Debtors',       'current_assets','assets',    63,  false),
      ('stock_in_hand',  'Stock-in-Hand',        'current_assets','assets',    64,  false),
      ('loans_advances', 'Loans & Advances (Asset)','current_assets','assets', 65,  false),
      ('revenue_accounts','Revenue Accounts',    NULL,          'income',      70,  true),
      ('sales_accounts', 'Sales Accounts',       'revenue_accounts','income',  71,  false),
      ('direct_inc',     'Direct Income',        'revenue_accounts','income',  72,  false),
      ('indirect_inc',   'Indirect Income',      'revenue_accounts','income',  73,  false),
      ('expense_accounts','Expense Accounts',    NULL,          'expenses',    80,  true),
      ('purchase_accounts','Purchase Accounts',  'expense_accounts','expenses',81,  false),
      ('direct_exp',     'Direct Expenses',      'expense_accounts','expenses',82,  false),
      ('indirect_exp',   'Indirect Expenses',    'expense_accounts','expenses',83,  false)
    ) AS t(code, name, parent_code, nature, sort, primary_flag)
    ORDER BY sort
  LOOP
    INSERT INTO public.ledger_groups (company_id, code, name, nature, is_system, is_primary, sort_order, parent_id)
    VALUES (
      _company_id, g.code, g.name, g.nature, true, g.primary_flag, g.sort,
      CASE WHEN g.parent_code IS NULL THEN NULL
           ELSE (SELECT id FROM public.ledger_groups WHERE company_id = _company_id AND code = g.parent_code) END
    )
    ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO UPDATE
      SET is_primary = EXCLUDED.is_primary,
          sort_order = EXCLUDED.sort_order,
          parent_id  = COALESCE(EXCLUDED.parent_id, public.ledger_groups.parent_id);
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
      ('vehicles',       'Vehicles',                 'fixed_assets'),
      ('profit_loss_ac', 'Profit & Loss A/c',        'profit_loss'),
      ('suspense_ac',    'Suspense A/c',             'suspense'),
      ('preliminary_exp','Preliminary Expenses',     'pre_operative')
    ) AS t(code, name, group_code)
  LOOP
    SELECT id INTO gid FROM public.ledger_groups WHERE company_id = _company_id AND code = l.group_code;
    IF gid IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.ledgers (company_id, group_id, code, name, is_system)
    VALUES (_company_id, gid, l.code, l.name, true)
    ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;
  END LOOP;
END $function$;

DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_default_coa(c.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.guard_primary_ledger_group()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_admin() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.is_primary THEN
      RAISE EXCEPTION 'Primary group delete nahi ho sakta — yeh system ka main group hai';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_primary AND (
       NEW.name IS DISTINCT FROM OLD.name
    OR NEW.nature IS DISTINCT FROM OLD.nature
    OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
    OR NEW.code IS DISTINCT FROM OLD.code
    OR NEW.is_primary IS DISTINCT FROM OLD.is_primary
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
  ) THEN
    RAISE EXCEPTION 'Primary group edit nahi ho sakta — sirf platform admin badal sakta hai';
  END IF;
  RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public.guard_primary_ledger_group() FROM anon, authenticated;

DROP TRIGGER IF EXISTS ledger_groups_guard_primary_upd ON public.ledger_groups;
CREATE TRIGGER ledger_groups_guard_primary_upd
  BEFORE UPDATE ON public.ledger_groups
  FOR EACH ROW EXECUTE FUNCTION public.guard_primary_ledger_group();

DROP TRIGGER IF EXISTS ledger_groups_guard_primary_del ON public.ledger_groups;
CREATE TRIGGER ledger_groups_guard_primary_del
  BEFORE DELETE ON public.ledger_groups
  FOR EACH ROW EXECUTE FUNCTION public.guard_primary_ledger_group();