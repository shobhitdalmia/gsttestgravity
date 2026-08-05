import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { round2 } from "@/lib/gst";

export type LedgerNature = "assets" | "liabilities" | "income" | "expenses";

export interface LedgerGroupRow {
  id: string;
  parent_id: string | null;
  name: string;
  code: string | null;
  nature: LedgerNature;
  sort_order: number | null;
  is_primary: boolean;
}

export interface LedgerRow {
  id: string;
  group_id: string;
  party_id: string | null;
  name: string;
  code: string | null;
  opening_balance: number;
  opening_type: "debit" | "credit";
  is_system: boolean;
}

export interface LedgerBalance {
  ledgerId: string;
  debit: number;
  credit: number;
  /** Positive = debit balance, negative = credit balance (opening included). */
  closing: number;
}

export const VOUCHER_TYPE_LABEL: Record<string, string> = {
  sales: "Sales",
  purchase: "Purchase",
  receipt: "Receipt",
  payment: "Payment",
  expense: "Expense",
  journal: "Journal",
  contra: "Contra",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  opening: "Opening",
};

/** Debit-positive sign convention per nature (assets/expenses are debit-natured). */
export function isDebitNature(nature: LedgerNature) {
  return nature === "assets" || nature === "expenses";
}

export function useLedgerGroups(companyId: string | undefined) {
  return useQuery({
    enabled: !!companyId,
    queryKey: ["ledger-groups", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_groups")
        .select("id, parent_id, name, code, nature, sort_order, is_primary")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("name");
      if (error) throw error;
      return (data ?? []).map((g: any) => ({ ...g, is_primary: g.is_primary === true })) as LedgerGroupRow[];
    },
  });
}

export function useLedgers(companyId: string | undefined) {
  return useQuery({
    enabled: !!companyId,
    queryKey: ["ledgers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledgers")
        .select("id, group_id, party_id, name, code, opening_balance, opening_type, is_system")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((l) => ({
        ...l,
        opening_balance: Number(l.opening_balance ?? 0),
      })) as LedgerRow[];
    },
  });
}

/** All posted voucher lines for a company inside a date range. */
export function useVoucherLines(
  companyId: string | undefined,
  from?: string,
  to?: string,
  ledgerId?: string,
) {
  return useQuery({
    enabled: !!companyId,
    queryKey: ["voucher-lines", companyId, from ?? "all", to ?? "all", ledgerId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("voucher_lines")
        .select(
          "id, ledger_id, debit, credit, narration, line_no, vouchers!inner(id, company_id, voucher_type, voucher_no, voucher_date, narration, source_type, source_id, deleted_at)",
        )
        .eq("vouchers.company_id", companyId!)
        .is("vouchers.deleted_at", null);
      if (from) q = q.gte("vouchers.voucher_date", from);
      if (to) q = q.lte("vouchers.voucher_date", to);
      if (ledgerId) q = q.eq("ledger_id", ledgerId);
      const { data, error } = await q.order("voucher_date", {
        referencedTable: "vouchers",
        ascending: true,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id as string,
        ledger_id: r.ledger_id as string,
        debit: Number(r.debit ?? 0),
        credit: Number(r.credit ?? 0),
        narration: (r.narration ?? null) as string | null,
        voucher: {
          id: r.vouchers.id as string,
          voucher_type: r.vouchers.voucher_type as string,
          voucher_no: (r.vouchers.voucher_no ?? null) as string | null,
          voucher_date: r.vouchers.voucher_date as string,
          narration: (r.vouchers.narration ?? null) as string | null,
          source_type: (r.vouchers.source_type ?? null) as string | null,
          source_id: (r.vouchers.source_id ?? null) as string | null,
        },
      }));
    },
  });
}

export type VoucherLineRow = NonNullable<ReturnType<typeof useVoucherLines>["data"]>[number];

/** Aggregate voucher lines into per-ledger debit / credit / closing balances. */
export function buildBalances(
  ledgers: LedgerRow[],
  lines: { ledger_id: string; debit: number; credit: number }[],
  includeOpening = true,
): Map<string, LedgerBalance> {
  const map = new Map<string, LedgerBalance>();
  for (const l of ledgers) {
    const opening = includeOpening
      ? l.opening_type === "credit"
        ? -Number(l.opening_balance || 0)
        : Number(l.opening_balance || 0)
      : 0;
    map.set(l.id, { ledgerId: l.id, debit: 0, credit: 0, closing: opening });
  }
  for (const line of lines) {
    const row = map.get(line.ledger_id);
    if (!row) continue;
    row.debit = round2(row.debit + line.debit);
    row.credit = round2(row.credit + line.credit);
    row.closing = round2(row.closing + line.debit - line.credit);
  }
  return map;
}

/** Day Book: vouchers with totals, newest first. */
export function useDayBook(companyId: string | undefined, from?: string, to?: string) {
  return useQuery({
    enabled: !!companyId,
    queryKey: ["day-book", companyId, from ?? "all", to ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("vouchers")
        .select(
          "id, voucher_type, voucher_no, voucher_date, narration, total_debit, source_type, source_id, is_auto",
        )
        .eq("company_id", companyId!)
        .is("deleted_at", null);
      if (from) q = q.gte("voucher_date", from);
      if (to) q = q.lte("voucher_date", to);
      const { data, error } = await q
        .order("voucher_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((v) => ({ ...v, total_debit: Number(v.total_debit ?? 0) }));
    },
  });
}

/** Ledger tree helper: groups sorted with their ledgers attached. */
export function groupTree(groups: LedgerGroupRow[], ledgers: LedgerRow[]) {
  const byParent = new Map<string | null, LedgerGroupRow[]>();
  for (const g of groups) {
    const key = g.parent_id ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), g]);
  }
  const ledgersByGroup = new Map<string, LedgerRow[]>();
  for (const l of ledgers) {
    ledgersByGroup.set(l.group_id, [...(ledgersByGroup.get(l.group_id) ?? []), l]);
  }
  return { byParent, ledgersByGroup };
}
