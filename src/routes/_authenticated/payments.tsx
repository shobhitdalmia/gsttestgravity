import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { useFinancialYear } from "@/lib/fy";
import { formatINR } from "@/lib/gst";
import { usePaymentsList, type PaymentRow } from "@/lib/payments";
import { unpostVoucher } from "@/lib/accounting.functions";
import { PaymentDialog, type PaymentPreset } from "@/components/payments/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownToLine, ArrowUpFromLine, HandCoins, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Receipts & Payments — GST Munshi" },
      {
        name: "description",
        content: "Customer se payment receive aur supplier ko payment — ek hi register me entry aur books voucher.",
      },
      { property: "og:title", content: "Receipts & Payments — GST Munshi" },
      {
        property: "og:description",
        content: "Payment receive aur pay entries, invoice/bill ke against, double-entry ke saath.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

type TabKey = "all" | "received" | "paid";

function PaymentsPage() {
  const qc = useQueryClient();
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { from, to, label } = useFinancialYear(companyId);
  const list = usePaymentsList(companyId, from, to);
  const [preset, setPreset] = useState<PaymentPreset | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data ?? []).filter((r) => {
      if (tab !== "all" && r.direction !== tab) return false;
      if (!q) return true;
      return [r.party?.name, r.invoice?.invoice_number, r.purchase?.bill_number, r.reference, r.mode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [list.data, search, tab]);

  const totals = useMemo(() => {
    let inAmt = 0;
    let outAmt = 0;
    for (const r of list.data ?? []) {
      if (r.direction === "received") inAmt += r.amount;
      else outAmt += r.amount;
    }
    return { inAmt, outAmt };
  }, [list.data]);

  const remove = useMutation({
    mutationFn: async (row: PaymentRow) => {
      if (!companyId) throw new Error("Company select nahi hui");
      const doc = row.invoice ?? row.purchase;
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", row.id)
        .eq("company_id", companyId);
      if (error) throw error;

      // Linked bill / invoice ka paid amount wapas ghatao
      if (doc) {
        if (row.invoice) {
          const { data: inv } = await supabase
            .from("invoices")
            .select("total, amount_paid")
            .eq("id", row.invoice.id)
            .maybeSingle();
          if (inv) {
            const paid = Math.max(0, Number(inv.amount_paid ?? 0) - row.amount);
            const status = paid >= Number(inv.total ?? 0) - 0.009 ? "paid" : paid > 0.009 ? "partial" : "unpaid";
            await supabase.from("invoices").update({ amount_paid: paid, status }).eq("id", row.invoice.id);
          }
        } else if (row.purchase) {
          const { data: pur } = await supabase
            .from("purchases")
            .select("total, amount_paid")
            .eq("id", row.purchase.id)
            .maybeSingle();
          if (pur) {
            const paid = Math.max(0, Number(pur.amount_paid ?? 0) - row.amount);
            const status = paid >= Number(pur.total ?? 0) - 0.009 ? "paid" : paid > 0.009 ? "partial" : "unpaid";
            await supabase.from("purchases").update({ amount_paid: paid, status }).eq("id", row.purchase.id);
          }
        }
      }

      try {
        await unpostVoucher({ data: { companyId, sourceType: "payment", sourceId: row.id } });
      } catch {
        /* books cleanup best-effort */
      }
    },
    onSuccess: async () => {
      toast.success("Entry delete ho gayi");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["payments-list"] }),
        qc.invalidateQueries({ queryKey: ["invoices"] }),
        qc.invalidateQueries({ queryKey: ["purchases"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        qc.invalidateQueries({ queryKey: ["voucher-lines"] }),
        qc.invalidateQueries({ queryKey: ["day-book"] }),
      ]);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete nahi hua"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Receipts &amp; Payments</h1>
          <p className="text-sm text-muted-foreground">
            Sale ki payment receive karein aur purchase ki payment karein — entry books me apne aap post hoti hai.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" onClick={() => setPreset({ direction: "received" })}>
            <ArrowDownToLine className="h-4 w-4" /> Payment Receive
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setPreset({ direction: "paid" })}>
            <ArrowUpFromLine className="h-4 w-4" /> Payment Pay
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label={`Received (${label})`} value={totals.inAmt} />
        <SummaryCard label={`Paid (${label})`} value={totals.outAmt} />
        <SummaryCard label="Net cash flow" value={totals.inAmt - totals.outAmt} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Party, bill ya reference search karein"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border p-1">
          {(["all", "received", "paid"] as TabKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                tab === k ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {k === "all" ? "All" : k === "received" ? "Receive" : "Pay"}
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface p-4">
        {list.isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <HandCoins className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Is period me koi payment entry nahi.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Against</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{r.payment_date}</TableCell>
                      <TableCell>
                        <Badge variant={r.direction === "received" ? "default" : "secondary"}>
                          {r.direction === "received" ? "Receive" : "Pay"}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.party?.name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.invoice?.invoice_number ?? r.purchase?.bill_number ?? r.reference ?? "On account"}
                      </TableCell>
                      <TableCell className="capitalize">{r.mode ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{formatINR(r.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Entry delete karein"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="space-y-2 lg:hidden">
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{r.party?.name ?? "—"}</span>
                    <Badge variant={r.direction === "received" ? "default" : "secondary"}>
                      {r.direction === "received" ? "Receive" : "Pay"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {r.payment_date} · {r.mode ?? "—"}
                    </span>
                    <span className="font-mono">
                      {r.invoice?.invoice_number ?? r.purchase?.bill_number ?? "On account"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-display text-lg font-bold">{formatINR(r.amount)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-destructive"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(r)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <PaymentDialog preset={preset} companyId={companyId} onClose={() => setPreset(null)} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-bold">{formatINR(value)}</div>
    </div>
  );
}
