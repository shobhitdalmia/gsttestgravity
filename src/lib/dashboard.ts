import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ALL_YEARS, fyRange, type FYValue } from "@/lib/fy";
import { round2 } from "@/lib/gst";

const num = (v: unknown) => Number(v ?? 0) || 0;

export interface MonthPoint {
  key: string; // yyyy-mm
  label: string; // MMM
  sales: number;
  purchases: number;
  newCustomer: number;
  existingCustomer: number;
}

export interface AgeingBuckets {
  current: number;
  d30: number;
  d60: number;
  d90: number;
  over90: number;
}

const emptyAgeing = (): AgeingBuckets => ({ current: 0, d30: 0, d60: 0, d90: 0, over90: 0 });

function ageBucket(b: AgeingBuckets, days: number, amt: number) {
  if (days <= 0) b.current += amt;
  else if (days <= 30) b.d30 += amt;
  else if (days <= 60) b.d60 += amt;
  else if (days <= 90) b.d90 += amt;
  else b.over90 += amt;
}

function monthKey(d: string) {
  return d.slice(0, 7);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleString("en-IN", { month: "short" });
}

function pct(cur: number, prev: number): number | null {
  if (!prev) return cur ? 100 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function daysBetween(fromISO: string, toISO: string) {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);
}

function prevFYRange(fy: FYValue) {
  if (fy === ALL_YEARS) return {} as { from?: string; to?: string };
  return fyRange((fy as number) - 1);
}

/** Everything the dashboard needs, in one company + FY scoped fetch. */
export function useDashboardData(companyId: string | undefined, fy: FYValue) {
  const { from, to } = fyRange(fy);
  const prev = prevFYRange(fy);

  return useQuery({
    enabled: !!companyId,
    queryKey: ["dashboard-v2", companyId, from ?? "all", to ?? "all"],
    queryFn: async () => {
      const cid = companyId!;
      const today = new Date().toISOString().slice(0, 10);
      const d90 = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

      const withRange = (q: any, col: string, f?: string, t?: string) => {
        let out = q;
        if (f) out = out.gte(col, f);
        if (t) out = out.lte(col, t);
        return out;
      };

      const [
        invRes,
        invPrevRes,
        purRes,
        purPrevRes,
        payRes,
        expRes,
        expPrevRes,
        prodRes,
        partyRes,
        allInvRes,
      ] = await Promise.all([
        withRange(
          supabase
            .from("invoices")
            .select(
              "id, party_id, invoice_date, due_date, subtotal, cgst, sgst, igst, total, amount_paid, status, invoice_type",
            )
            .eq("company_id", cid),
          "invoice_date",
          from,
          to,
        ),
        withRange(supabase.from("invoices").select("total, subtotal").eq("company_id", cid), "invoice_date", prev.from, prev.to),
        withRange(
          supabase
            .from("purchases")
            .select("id, party_id, bill_date, subtotal, cgst, sgst, igst, total, amount_paid, status")
            .eq("company_id", cid),
          "bill_date",
          from,
          to,
        ),
        withRange(supabase.from("purchases").select("total, subtotal").eq("company_id", cid), "bill_date", prev.from, prev.to),
        withRange(
          supabase.from("payments").select("direction, amount, payment_date").eq("company_id", cid),
          "payment_date",
          from,
          to,
        ),
        withRange(supabase.from("expenses").select("amount, expense_date, category").eq("company_id", cid), "expense_date", from, to),
        withRange(supabase.from("expenses").select("amount").eq("company_id", cid), "expense_date", prev.from, prev.to),
        supabase
          .from("products")
          .select("id, name, unit, stock_quantity, low_stock_threshold, purchase_price, sale_price, is_service")
          .eq("company_id", cid),
        supabase.from("parties").select("id, name, type").eq("company_id", cid),
        supabase.from("invoices").select("party_id, invoice_date").eq("company_id", cid),
      ]);

      const invoices = (invRes.data ?? []) as any[];
      const purchases = (purRes.data ?? []) as any[];
      const products = (prodRes.data ?? []) as any[];
      const parties = (partyRes.data ?? []) as any[];
      const payments = (payRes.data ?? []) as any[];
      const expenses = (expRes.data ?? []) as any[];

      const invoiceIds = invoices.map((i) => i.id);
      const itemsRes = invoiceIds.length
        ? await supabase
            .from("invoice_items")
            .select("invoice_id, product_id, name, quantity, taxable_amount, cost_price, unit")
            .in("invoice_id", invoiceIds)
        : { data: [] as any[] };
      const items = (itemsRes.data ?? []) as any[];

      // last 90 days sold product ids (for unmoved items)
      const recentSold = await supabase
        .from("invoice_items")
        .select("product_id, invoices!inner(company_id, invoice_date)")
        .eq("invoices.company_id", cid)
        .gte("invoices.invoice_date", d90);
      const soldRecently = new Set(
        ((recentSold.data ?? []) as any[]).map((r) => r.product_id).filter(Boolean) as string[],
      );

      // ---- Cash & bank balances (all-time up to FY end) ----
      const ledgerRes = await supabase
        .from("ledgers")
        .select("id, name, opening_balance, opening_type, ledger_groups!inner(code)")
        .eq("company_id", cid)
        .is("deleted_at", null)
        .in("ledger_groups.code", ["cash_in_hand", "bank_accounts"]);
      const ledgerRows = (ledgerRes.data ?? []) as any[];
      const ledgerIds = ledgerRows.map((l) => l.id);
      let lineRows: any[] = [];
      if (ledgerIds.length) {
        let q = supabase
          .from("voucher_lines")
          .select("ledger_id, debit, credit, vouchers!inner(company_id, voucher_date, deleted_at)")
          .eq("vouchers.company_id", cid)
          .is("vouchers.deleted_at", null)
          .in("ledger_id", ledgerIds);
        if (to) q = q.lte("vouchers.voucher_date", to);
        lineRows = ((await q).data ?? []) as any[];
      }
      const ledgerBal = new Map<string, number>();
      for (const l of ledgerRows) {
        const open = l.opening_type === "credit" ? -num(l.opening_balance) : num(l.opening_balance);
        ledgerBal.set(l.id, open);
      }
      for (const r of lineRows) {
        ledgerBal.set(r.ledger_id, (ledgerBal.get(r.ledger_id) ?? 0) + num(r.debit) - num(r.credit));
      }
      let cashBal = 0;
      let bankBal = 0;
      for (const l of ledgerRows) {
        const bal = ledgerBal.get(l.id) ?? 0;
        if (l.ledger_groups?.code === "cash_in_hand") cashBal += bal;
        else bankBal += bal;
      }

      // ---- Sales / purchase totals ----
      const live = invoices.filter((i) => i.status !== "cancelled");
      const salesTotal = live.reduce((s, i) => s + num(i.total), 0);
      const salesTaxable = live.reduce((s, i) => s + num(i.subtotal), 0);
      const salesPrev = ((invPrevRes.data ?? []) as any[]).reduce((s, i) => s + num(i.total), 0);
      const purchaseTotal = purchases.reduce((s, p) => s + num(p.total), 0);
      const purchaseTaxable = purchases.reduce((s, p) => s + num(p.subtotal), 0);
      const purchasePrev = ((purPrevRes.data ?? []) as any[]).reduce((s, p) => s + num(p.total), 0);
      const expenseTotal = expenses.reduce((s, e) => s + num(e.amount), 0);
      const expensePrev = ((expPrevRes.data ?? []) as any[]).reduce((s, e) => s + num(e.amount), 0);

      const outputGst = live.reduce((s, i) => s + num(i.cgst) + num(i.sgst) + num(i.igst), 0);
      const inputGst = purchases.reduce((s, p) => s + num(p.cgst) + num(p.sgst) + num(p.igst), 0);

      const receiptTotal = payments.filter((p) => p.direction === "received").reduce((s, p) => s + num(p.amount), 0);
      const receiptCount = payments.filter((p) => p.direction === "received").length;
      const paymentTotal = payments.filter((p) => p.direction === "paid").reduce((s, p) => s + num(p.amount), 0);
      const paymentCount = payments.filter((p) => p.direction === "paid").length;

      // ---- Gross profit (sale − cost) ----
      const liveIds = new Set(live.map((i) => i.id));
      let profit = 0;
      let costKnownSales = 0;
      let missingCostItems = 0;
      const productCost = new Map<string, number | null>(
        products.map((p) => [p.id as string, p.purchase_price == null ? null : num(p.purchase_price)]),
      );
      const itemAgg = new Map<string, { name: string; qty: number; value: number; profit: number; unit: string | null }>();
      for (const it of items) {
        if (!liveIds.has(it.invoice_id)) continue;
        const taxable = num(it.taxable_amount);
        const qty = num(it.quantity);
        const cost = it.cost_price != null ? num(it.cost_price) : it.product_id ? productCost.get(it.product_id) ?? null : null;
        let itemProfit = 0;
        if (cost != null) {
          itemProfit = taxable - qty * cost;
          profit += itemProfit;
          costKnownSales += taxable;
        } else {
          missingCostItems += 1;
        }
        const key = (it.product_id as string) ?? `n:${it.name}`;
        const row = itemAgg.get(key) ?? { name: it.name as string, qty: 0, value: 0, profit: 0, unit: it.unit ?? null };
        row.qty += qty;
        row.value += taxable;
        row.profit += itemProfit;
        itemAgg.set(key, row);
      }
      const margin = costKnownSales ? (profit / costKnownSales) * 100 : 0;
      const itemList = [...itemAgg.values()];
      const bestSellers = [...itemList].sort((a, b) => b.value - a.value).slice(0, 3);
      const leastSellers = [...itemList].filter((i) => i.qty > 0).sort((a, b) => a.value - b.value).slice(0, 3);
      const bestProfitItem = [...itemList].sort((a, b) => b.profit - a.profit)[0] ?? null;

      // ---- Receivables / payables + ageing ----
      const recAge = emptyAgeing();
      let receivable = 0;
      let receivableOverdue = 0;
      const debtor = new Map<string, number>();
      for (const i of live) {
        const due = num(i.total) - num(i.amount_paid);
        if (due <= 0.5 || i.status === "draft") continue;
        receivable += due;
        const ref = (i.due_date as string) ?? (i.invoice_date as string);
        const days = daysBetween(ref, today);
        if (days > 0) receivableOverdue += due;
        ageBucket(recAge, days, due);
        if (i.party_id) debtor.set(i.party_id, (debtor.get(i.party_id) ?? 0) + due);
      }

      const payAge = emptyAgeing();
      let payable = 0;
      let payableOverdue = 0;
      const creditor = new Map<string, number>();
      for (const p of purchases) {
        const due = num(p.total) - num(p.amount_paid);
        if (due <= 0.5) continue;
        payable += due;
        const days = daysBetween(p.bill_date as string, today);
        if (days > 30) payableOverdue += due;
        ageBucket(payAge, days, due);
        if (p.party_id) creditor.set(p.party_id, (creditor.get(p.party_id) ?? 0) + due);
      }

      const partyName = new Map<string, string>(parties.map((p) => [p.id as string, p.name as string]));
      const topOf = (m: Map<string, number>) => {
        const e = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
        return e ? { name: partyName.get(e[0]) ?? "Party", amount: e[1] } : null;
      };

      // ---- Biggest business customer / vendor (by turnover in period) ----
      const custTurnover = new Map<string, number>();
      for (const i of live) if (i.party_id) custTurnover.set(i.party_id, (custTurnover.get(i.party_id) ?? 0) + num(i.total));
      const vendTurnover = new Map<string, number>();
      for (const p of purchases) if (p.party_id) vendTurnover.set(p.party_id, (vendTurnover.get(p.party_id) ?? 0) + num(p.total));

      // ---- New vs existing customer sales, monthly ----
      const firstSeen = new Map<string, string>();
      for (const r of ((allInvRes.data ?? []) as any[])) {
        if (!r.party_id) continue;
        const cur = firstSeen.get(r.party_id);
        if (!cur || r.invoice_date < cur) firstSeen.set(r.party_id, r.invoice_date);
      }

      const monthKeys: string[] = [];
      const anchor = to && to < today ? new Date(to) : new Date();
      for (let k = 5; k >= 0; k--) {
        const d = new Date(anchor.getFullYear(), anchor.getMonth() - k, 1);
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      const monthMap = new Map<string, MonthPoint>(
        monthKeys.map((k) => [k, { key: k, label: monthLabel(k), sales: 0, purchases: 0, newCustomer: 0, existingCustomer: 0 }]),
      );
      for (const i of live) {
        const m = monthMap.get(monthKey(i.invoice_date));
        if (!m) continue;
        m.sales += num(i.total);
        const first = i.party_id ? firstSeen.get(i.party_id) : undefined;
        const isNew = !!first && monthKey(first) === monthKey(i.invoice_date);
        if (isNew) m.newCustomer += num(i.total);
        else m.existingCustomer += num(i.total);
      }
      for (const p of purchases) {
        const m = monthMap.get(monthKey(p.bill_date));
        if (m) m.purchases += num(p.total);
      }
      const months = monthKeys.map((k) => monthMap.get(k)!);

      const newCustomerCount = [...firstSeen.entries()].filter(([, d]) => (!from || d >= from) && (!to || d <= to)).length;

      // ---- Stock ----
      const stockRows = products.filter((p) => !p.is_service);
      const stockValue = stockRows.reduce((s, p) => s + num(p.stock_quantity) * num(p.purchase_price ?? p.sale_price), 0);
      const lowStock = stockRows.filter((p) => num(p.stock_quantity) <= num(p.low_stock_threshold));
      const outOfStock = stockRows.filter((p) => num(p.stock_quantity) <= 0);
      const unmoved = stockRows.filter((p) => !soldRecently.has(p.id));

      // ---- Pending ----
      const drafts = invoices.filter((i) => i.status === "draft");
      const unpaid = live.filter((i) => i.status === "unpaid" || i.status === "partial");
      const overdueInvoices = live.filter((i) => {
        const due = num(i.total) - num(i.amount_paid);
        const ref = (i.due_date as string) ?? (i.invoice_date as string);
        return due > 0.5 && daysBetween(ref, today) > 0;
      });
      const unpaidPurchases = purchases.filter((p) => num(p.total) - num(p.amount_paid) > 0.5);

      const recent = [...live]
        .sort((a, b) => (a.invoice_date < b.invoice_date ? 1 : -1))
        .slice(0, 5)
        .map((i) => ({
          id: i.id as string,
          invoice_date: i.invoice_date as string,
          total: num(i.total),
          status: i.status as string,
          party: i.party_id ? partyName.get(i.party_id) ?? "Party" : "Walk-in",
        }));

      return {
        sales: {
          total: round2(salesTotal),
          taxable: round2(salesTaxable),
          count: live.length,
          avg: live.length ? round2(salesTotal / live.length) : 0,
          deltaPct: pct(salesTotal, salesPrev),
        },
        purchases: {
          total: round2(purchaseTotal),
          taxable: round2(purchaseTaxable),
          count: purchases.length,
          avg: purchases.length ? round2(purchaseTotal / purchases.length) : 0,
          deltaPct: pct(purchaseTotal, purchasePrev),
        },
        profit: {
          gross: round2(profit),
          marginPct: round2(margin),
          missingCostItems,
          bestItem: bestProfitItem,
          netAfterExpenses: round2(profit - expenseTotal),
        },
        expenses: { total: round2(expenseTotal), count: expenses.length, deltaPct: pct(expenseTotal, expensePrev) },
        gst: { output: round2(outputGst), input: round2(inputGst), net: round2(outputGst - inputGst) },
        cashBank: { cash: round2(cashBal), bank: round2(bankBal), total: round2(cashBal + bankBal) },
        receipts: { total: round2(receiptTotal), count: receiptCount },
        paymentsOut: { total: round2(paymentTotal), count: paymentCount },
        receivables: { total: round2(receivable), overdue: round2(receivableOverdue), ageing: recAge, top: topOf(debtor) },
        payables: { total: round2(payable), overdue: round2(payableOverdue), ageing: payAge, top: topOf(creditor) },
        customers: {
          total: parties.filter((p) => p.type !== "supplier").length,
          newInPeriod: newCustomerCount,
          top: topOf(custTurnover),
        },
        vendors: { total: parties.filter((p) => p.type !== "customer").length, top: topOf(vendTurnover) },
        stock: {
          value: round2(stockValue),
          items: stockRows.length,
          lowStock,
          outOfStock: outOfStock.length,
          unmoved: unmoved.length,
          unmovedNames: unmoved.slice(0, 3).map((p) => p.name as string),
        },
        items: { bestSellers, leastSellers },
        pending: {
          drafts: drafts.length,
          unpaidCount: unpaid.length,
          overdueCount: overdueInvoices.length,
          unpaidPurchaseCount: unpaidPurchases.length,
        },
        invoiceSplit: {
          paid: live.filter((i) => i.status === "paid").length,
          pending: unpaid.length - overdueInvoices.length > 0 ? unpaid.length - overdueInvoices.length : 0,
          overdue: overdueInvoices.length,
          cancelled: invoices.filter((i) => i.status === "cancelled").length,
          draft: drafts.length,
        },

        months,
        recent,
      };
    },
  });
}

export type DashboardData = NonNullable<ReturnType<typeof useDashboardData>["data"]>;
