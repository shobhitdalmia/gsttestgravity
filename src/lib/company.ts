import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompanyRole = "owner" | "accountant" | "staff";

export const ROLE_LABEL: Record<CompanyRole, string> = {
  owner: "Owner",
  accountant: "Accountant / CA",
  staff: "Staff (Billing only)",
};

export const ROLE_DESC: Record<CompanyRole, string> = {
  owner: "Full access — settings, team, delete company",
  accountant: "Sales, purchase, expenses, reports & GST",
  staff: "Sirf billing — invoices, parties, products",
};

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  legal_name: string | null;
  gstin: string | null;
  pan: string | null;
  state: string | null;
  state_code: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  invoice_prefix: string | null;
  next_invoice_number: number | null;
  logo_url?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  jurisdiction?: string | null;
  default_terms?: string | null;
  default_transport?: string | null;
}

export interface Membership {
  company: Company;
  role: CompanyRole;
  /** true when the signed-in user owns this company (not an invited accountant/staff). */
  isOwned: boolean;
}

// ---------------------------------------------------------------------------
// Tenant-scoped local storage
//
// The active company (and the FY selection) MUST be stored per signed-in user.
// A single shared key leaks the previous user's selection to whoever signs in
// next on the same browser.
// ---------------------------------------------------------------------------

const APP_STORAGE_PREFIX = "gstmunshi.";
const ACTIVE_PREFIX = "gstmunshi.activeCompanyId.";
const LEGACY_ACTIVE_KEY = "gstmunshi.activeCompanyId";

let tenantUserId: string | null = null;
const tenantListeners = new Set<() => void>();

export function getTenantUserId(): string | null {
  return tenantUserId;
}

export function setTenantUser(userId: string | null) {
  if (tenantUserId === userId) return;
  tenantUserId = userId;
  tenantListeners.forEach((l) => l());
}

/** Wipe every app-local key (active company, FY, pending invite). Call on sign-out/sign-in. */
export function clearTenantStorage() {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(APP_STORAGE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
  tenantUserId = null;
  tenantListeners.forEach((l) => l());
}

export function getActiveCompanyId(userId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  const uid = userId ?? tenantUserId;
  if (!uid) return null;
  return window.localStorage.getItem(ACTIVE_PREFIX + uid);
}

export function setActiveCompanyId(id: string, userId?: string | null) {
  if (typeof window === "undefined") return;
  const uid = userId ?? tenantUserId;
  if (!uid) return;
  window.localStorage.setItem(ACTIVE_PREFIX + uid, id);
  tenantListeners.forEach((l) => l());
}

export function clearActiveCompanyId(userId?: string | null) {
  if (typeof window === "undefined") return;
  const uid = userId ?? tenantUserId;
  if (!uid) return;
  window.localStorage.removeItem(ACTIVE_PREFIX + uid);
  tenantListeners.forEach((l) => l());
}

/** All companies the signed-in user can access, with their role in each. */
export function useMyCompanies() {
  return useQuery({
    queryKey: ["my-companies"],
    queryFn: async (): Promise<Membership[]> => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        setTenantUser(null);
        return [];
      }
      setTenantUser(user.id);
      // Drop the old cross-user key so nobody inherits another account's selection.
      if (typeof window !== "undefined") window.localStorage.removeItem(LEGACY_ACTIVE_KEY);

      // MUST filter by user_id: RLS lets a member read every membership row of a
      // company they belong to, so without this the other owners' rows leak in
      // and render as extra companies in the switcher.
      const { data: members, error } = await supabase
        .from("company_members")
        .select("role, company:companies(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // No implicit company creation — new users complete the mandatory
      // company setup dialog before the app becomes usable.
      const seen = new Set<string>();
      const list: Membership[] = [];
      for (const m of members ?? []) {
        const company = m.company as unknown as Company | null;
        if (!company || seen.has(company.id)) continue;
        seen.add(company.id);
        list.push({
          company,
          role: m.role as CompanyRole,
          isOwned: company.owner_id === user.id,
        });
      }

      // Own books first — an invited accountant must never land on a client's
      // company by default.
      return list.sort((a, b) => Number(b.isOwned) - Number(a.isOwned));
    },
  });
}

/** The currently selected company + the user's role in it. */
export function useCurrentMembership() {
  const companies = useMyCompanies();
  const list = companies.data ?? [];
  const activeId = getActiveCompanyId();
  const stored = activeId ? list.find((m) => m.company.id === activeId) : null;

  // Stale/foreign selection (e.g. another account used this browser) → reset.
  if (activeId && !stored && list.length > 0) clearActiveCompanyId();

  const active = stored ?? list[0] ?? null;
  return { ...companies, membership: active, companies: list };
}

/** Backwards-compatible helper: the active company record. */
export function useCurrentCompany() {
  const m = useCurrentMembership();
  return { ...m, data: m.membership?.company ?? null } as ReturnType<typeof useMyCompanies> & {
    data: Company | null;
    membership: Membership | null;
    companies: Membership[];
  };
}

export function useMyRole(): CompanyRole | null {
  return useCurrentMembership().membership?.role ?? null;
}

export function canManageBooks(role: CompanyRole | null) {
  return role === "owner" || role === "accountant";
}

export function isOwner(role: CompanyRole | null) {
  return role === "owner";
}

export function nextInvoiceNumber(prefix: string | null, n: number | null | undefined) {
  const p = (prefix ?? "INV").toUpperCase();
  const num = String(n ?? 1).padStart(4, "0");
  const fy = new Date();
  const fyStr =
    fy.getMonth() + 1 >= 4
      ? `${String(fy.getFullYear()).slice(2)}-${String(fy.getFullYear() + 1).slice(2)}`
      : `${String(fy.getFullYear() - 1).slice(2)}-${String(fy.getFullYear()).slice(2)}`;
  return `${p}/${fyStr}/${num}`;
}