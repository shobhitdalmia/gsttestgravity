import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCurrentCompany } from "@/lib/company";
import { useFinancialYear } from "@/lib/fy";
import { useDayBook, useVoucherLines, VOUCHER_TYPE_LABEL } from "@/lib/accounting";
import { formatINR } from "@/lib/gst";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/accounting/day-book")({
  head: () => ({
    meta: [
      { title: "Day Book — GST Munshi" },
      { name: "description", content: "Sab vouchers ek list me — sales, purchase, receipt, payment." },
    ],
  }),
  component: DayBook,
});

const TYPES = ["all", "sales", "purchase", "receipt", "payment", "expense", "journal"] as const;

function DayBook() {
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { from, to, label } = useFinancialYear(companyId);
  const [type, setType] = useState<string>("all");
  const vouchers = useDayBook(companyId, from, to);
  const lines = useVoucherLines(companyId, from, to);

  const linesByVoucher = useMemo(() => {
    const m = new Map<string, { name: string; debit: number; credit: number }[]>();
    for (const l of lines.data ?? []) {
      m.set(l.voucher.id, [
        ...(m.get(l.voucher.id) ?? []),
        { name: l.ledger_id, debit: l.debit, credit: l.credit },
      ]);
    }
    return m;
  }, [lines.data]);

  const rows = (vouchers.data ?? []).filter((v) => type === "all" || v.voucher_type === type);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-[200px]">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All vouchers" : VOUCHER_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          {label} · {rows.length} vouchers
        </div>
      </div>

      {vouchers.isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            Is period me koi voucher nahi. Invoice ya purchase banate hi entry automatic yahan aa jayegi.
          </p>
        </div>
      ) : (
        <div className="card-surface divide-y divide-border p-0">
          {rows.map((v) => {
            const count = (linesByVoucher.get(v.id) ?? []).length;
            const inner = (
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                      {VOUCHER_TYPE_LABEL[v.voucher_type] ?? v.voucher_type}
                    </span>
                    <span className="truncate text-sm font-medium">{v.voucher_no ?? "—"}</span>
                    {!v.is_auto && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        manual
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.voucher_date} · {v.narration ?? "—"} · {count} lines
                  </p>
                </div>
                <div className="shrink-0 font-mono text-sm font-semibold">{formatINR(v.total_debit)}</div>
              </div>
            );
            if (v.source_type === "invoice" && v.source_id) {
              return (
                <Link
                  key={v.id}
                  to="/sales/$invoiceId"
                  params={{ invoiceId: v.source_id }}
                  className="block hover:bg-muted/50"
                >
                  {inner}
                </Link>
              );
            }
            return (
              <div key={v.id} className="block">
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
