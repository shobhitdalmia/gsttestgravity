import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PayDirection = "received" | "paid";

export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank / NEFT" },
  { value: "upi", label: "UPI / Wallet" },
  { value: "cheque", label: "Cheque" },
] as const;

export interface PartyOption {
  id: string;
  name: string;
  type: "customer" | "supplier" | "both";
}

/** Parties usable for a given direction (receive = customers, pay = suppliers). */
export function usePartyOptions(companyId: string | undefined, direction: PayDirection) {
  return useQuery({
    enabled: !!companyId,
    queryKey: ["party-options", companyId, direction],
    queryFn: async () => {
      const wanted = direction === "received" ? "customer" : "supplier";
      const { data, error } = await supabase
        .from("parties")
        .select("id, name, type")
        .eq("company_id", companyId!)
        .in("type", [wanted, "both"])
        .order("name");
      if (error) throw error;
      return (data ?? []) as PartyOption[];
    },
  });
}

export interface OpenDoc {
  id: string;
  number: string;
  date: string;
  total: number;
  paid: number;
  outstanding: number;
}

/** Pending sales invoices of a customer (outstanding > 0). */
export function useOpenInvoices(companyId: string | undefined, partyId: string | undefined) {
  return useQuery({
    enabled: !!companyId && !!partyId,
    queryKey: ["open-invoices", companyId, partyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, total, amount_paid, status")
        .eq("company_id", companyId!)
        .eq("party_id", partyId!)
        .neq("status", "cancelled")
        .order("invoice_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? [])
        .map((r) => ({
          id: r.id,
          number: r.invoice_number,
          date: r.invoice_date,
          total: Number(r.total ?? 0),
          paid: Number(r.amount_paid ?? 0),
          outstanding: Number(r.total ?? 0) - Number(r.amount_paid ?? 0),
        }))
        .filter((r) => r.outstanding > 0.009) as OpenDoc[];
    },
  });
}

/** Pending purchase bills of a supplier (outstanding > 0). */
export function useOpenBills(companyId: string | undefined, partyId: string | undefined) {
  return useQuery({
    enabled: !!companyId && !!partyId,
    queryKey: ["open-bills", companyId, partyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, bill_number, bill_date, total, amount_paid, status")
        .eq("company_id", companyId!)
        .eq("party_id", partyId!)
        .neq("status", "cancelled")
        .order("bill_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? [])
        .map((r) => ({
          id: r.id,
          number: r.bill_number,
          date: r.bill_date,
          total: Number(r.total ?? 0),
          paid: Number(r.amount_paid ?? 0),
          outstanding: Number(r.total ?? 0) - Number(r.amount_paid ?? 0),
        }))
        .filter((r) => r.outstanding > 0.009) as OpenDoc[];
    },
  });
}

export interface PaymentRow {
  id: string;
  payment_date: string;
  direction: PayDirection;
  amount: number;
  mode: string | null;
  reference: string | null;
  notes: string | null;
  party: { id: string; name: string } | null;
  invoice: { id: string; invoice_number: string } | null;
  purchase: { id: string; bill_number: string } | null;
}

/** Receipt / payment register for the selected period. */
export function usePaymentsList(companyId: string | undefined, from?: string, to?: string) {
  return useQuery({
    enabled: !!companyId,
    queryKey: ["payments-list", companyId, from ?? "all", to ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("payments")
        .select(
          "id, payment_date, direction, amount, mode, reference, notes, parties(id, name), invoices(id, invoice_number), purchases(id, bill_number)",
        )
        .eq("company_id", companyId!);
      if (from) q = q.gte("payment_date", from);
      if (to) q = q.lte("payment_date", to);
      const { data, error } = await q
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id as string,
        payment_date: r.payment_date as string,
        direction: r.direction as PayDirection,
        amount: Number(r.amount ?? 0),
        mode: r.mode ?? null,
        reference: r.reference ?? null,
        notes: r.notes ?? null,
        party: r.parties ? { id: r.parties.id, name: r.parties.name } : null,
        invoice: r.invoices ? { id: r.invoices.id, invoice_number: r.invoices.invoice_number } : null,
        purchase: r.purchases ? { id: r.purchases.id, bill_number: r.purchases.bill_number } : null,
      })) as PaymentRow[];
    },
  });
}

export function statusFor(total: number, paid: number): "paid" | "partial" | "unpaid" {
  if (paid >= total - 0.009) return "paid";
  return paid > 0.009 ? "partial" : "unpaid";
}
