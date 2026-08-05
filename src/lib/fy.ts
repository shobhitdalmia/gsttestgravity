import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTenantUserId } from "@/lib/company";


/** Indian financial year: 1 April <startYear> → 31 March <startYear + 1>. "all" = no date filter. */
export type FYValue = number | "all";

export const ALL_YEARS = "all" as const;

export function currentFYStartYear(d: Date = new Date()): number {
  return d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1;
}

export function fyStartYearOf(dateISO: string): number {
  const [y, m] = dateISO.split("-").map(Number);
  return (m ?? 1) >= 4 ? y! : y! - 1;
}

export function fyLabel(fy: FYValue): string {
  if (fy === ALL_YEARS) return "All Years";
  return `FY ${fy}-${String(fy + 1).slice(2)}`;
}

export function fyRange(fy: FYValue): { from?: string; to?: string } {
  if (fy === ALL_YEARS) return {};
  return { from: `${fy}-04-01`, to: `${fy + 1}-03-31` };
}

/** Default date for a new entry inside the selected FY. */
export function fyDefaultDate(fy: FYValue): string {
  const today = new Date().toISOString().slice(0, 10);
  if (fy === ALL_YEARS || fy === currentFYStartYear()) return today;
  return `${fy + 1}-03-31`;
}

export function isInFY(dateISO: string | null | undefined, fy: FYValue): boolean {
  if (!dateISO || fy === ALL_YEARS) return true;
  const { from, to } = fyRange(fy);
  return dateISO >= from! && dateISO <= to!;
}

/** Month-start / month-end helpers clamped inside the selected FY. */
export function clampToFY(dateISO: string, fy: FYValue): string {
  if (fy === ALL_YEARS) return dateISO;
  const { from, to } = fyRange(fy);
  if (dateISO < from!) return from!;
  if (dateISO > to!) return to!;
  return dateISO;
}

// ---------- shared reactive store ----------

const KEY_PREFIX = "gstmunshi.activeFY.";
const listeners = new Set<() => void>();

/** FY selection is scoped to the signed-in user AND the company. */
function fyKey(companyId: string): string {
  const uid = getTenantUserId();
  return `${KEY_PREFIX}${uid ?? "anon"}.${companyId}`;
}

function read(companyId: string | undefined): FYValue {
  if (typeof window === "undefined" || !companyId) return currentFYStartYear();
  const raw = window.localStorage.getItem(fyKey(companyId));
  if (raw === ALL_YEARS) return ALL_YEARS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 1990 ? n : currentFYStartYear();
}

export function setFinancialYear(companyId: string, fy: FYValue) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(fyKey(companyId), String(fy));
  listeners.forEach((l) => l());
}


/** Selected financial year for a company (persisted, shared across components). */
export function useFinancialYear(companyId: string | undefined) {
  const [fy, setFy] = useState<FYValue>(() => currentFYStartYear());

  useEffect(() => {
    const sync = () => setFy(read(companyId));
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [companyId]);

  const setValue = useCallback(
    (v: FYValue) => {
      if (companyId) setFinancialYear(companyId, v);
      else setFy(v);
    },
    [companyId],
  );

  const { from, to } = fyRange(fy);
  return { fy, setFY: setValue, from, to, label: fyLabel(fy) };
}

/** FY options from the company's oldest entry up to the current FY. */
export function useFYOptions(companyId: string | undefined) {
  const q = useQuery({
    enabled: !!companyId,
    queryKey: ["fy-options", companyId],
    queryFn: async () => {
      const [inv, pur, exp] = await Promise.all([
        supabase.from("invoices").select("invoice_date").eq("company_id", companyId!).order("invoice_date").limit(1),
        supabase.from("purchases").select("bill_date").eq("company_id", companyId!).order("bill_date").limit(1),
        supabase.from("expenses").select("expense_date").eq("company_id", companyId!).order("expense_date").limit(1),
      ]);
      const dates = [
        inv.data?.[0]?.invoice_date,
        pur.data?.[0]?.bill_date,
        exp.data?.[0]?.expense_date,
      ].filter(Boolean) as string[];
      return dates.length ? dates.sort()[0]! : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const current = currentFYStartYear();
  const earliest = q.data ? Math.min(fyStartYearOf(q.data), current) : current;
  const years: number[] = [];
  for (let y = current; y >= earliest; y--) years.push(y);
  // Always allow booking into the next FY once it exists in data
  return years;
}
