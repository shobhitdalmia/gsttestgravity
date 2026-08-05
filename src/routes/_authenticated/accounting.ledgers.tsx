import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { useCurrentCompany } from "@/lib/company";
import { useFinancialYear } from "@/lib/fy";
import { useLedgers, useVoucherLines, VOUCHER_TYPE_LABEL } from "@/lib/accounting";
import { formatINR, round2 } from "@/lib/gst";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const searchSchema = z.object({ ledger: z.string().optional() });

export const Route = createFileRoute("/_authenticated/accounting/ledgers")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Ledger Statement — GST Munshi" },
      { name: "description", content: "Kisi bhi ledger ka running balance statement." },
    ],
  }),
  component: LedgerStatement,
});

function LedgerStatement() {
  const navigate = useNavigate();
  const { ledger: ledgerId } = Route.useSearch();
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { from, to, label } = useFinancialYear(companyId);
  const ledgers = useLedgers(companyId);
  const selected = ledgers.data?.find((l) => l.id === ledgerId) ?? ledgers.data?.[0];
  const lines = useVoucherLines(companyId, from, to, selected?.id);

  const rows = useMemo(() => {
    if (!selected) return [];
    let running =
      selected.opening_type === "credit" ? -Number(selected.opening_balance) : Number(selected.opening_balance);
    const out = (lines.data ?? []).map((l) => {
      running = round2(running + l.debit - l.credit);
      return { ...l, running };
    });
    return out;
  }, [lines.data, selected]);

  const opening = selected
    ? selected.opening_type === "credit"
      ? -Number(selected.opening_balance)
      : Number(selected.opening_balance)
    : 0;
  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0));
  const closing = rows.length ? rows[rows.length - 1]!.running : opening;

  function exportCsv() {
    const head = ["Date", "Voucher", "Type", "Particulars", "Debit", "Credit", "Balance"];
    const body = rows.map((r) => [
      r.voucher.voucher_date,
      r.voucher.voucher_no ?? "",
      VOUCHER_TYPE_LABEL[r.voucher.voucher_type] ?? r.voucher.voucher_type,
      (r.narration ?? r.voucher.narration ?? "").replace(/[",\n]/g, " "),
      r.debit || "",
      r.credit || "",
      r.running,
    ]);
    const csv = [head, ...body].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected?.name ?? "ledger"}-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <label className="text-xs font-medium text-muted-foreground">Ledger</label>
          <Select
            value={selected?.id ?? ""}
            onValueChange={(v) => navigate({ to: "/accounting/ledgers", search: { ledger: v } })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ledger chunein" />
            </SelectTrigger>
            <SelectContent>
              {(ledgers.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Opening" value={opening} />
        <Stat label="Debit total" value={totalDebit} plain />
        <Stat label="Closing" value={closing} />
      </div>

      {/* Desktop table */}
      <div className="card-surface hidden overflow-x-auto p-2 lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-2 font-medium">Date</th>
              <th className="p-2 font-medium">Voucher</th>
              <th className="p-2 font-medium">Particulars</th>
              <th className="p-2 text-right font-medium">Debit</th>
              <th className="p-2 text-right font-medium">Credit</th>
              <th className="p-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="p-2 whitespace-nowrap">{r.voucher.voucher_date}</td>
                <td className="p-2">
                  <div className="font-medium">{VOUCHER_TYPE_LABEL[r.voucher.voucher_type] ?? r.voucher.voucher_type}</div>
                  <div className="text-xs text-muted-foreground">{r.voucher.voucher_no ?? "—"}</div>
                </td>
                <td className="p-2 text-muted-foreground">{r.narration ?? r.voucher.narration ?? "—"}</td>
                <td className="p-2 text-right font-mono">{r.debit ? formatINR(r.debit) : "—"}</td>
                <td className="p-2 text-right font-mono">{r.credit ? formatINR(r.credit) : "—"}</td>
                <td className="p-2 text-right font-mono font-semibold">
                  {formatINR(Math.abs(r.running))} {r.running >= 0 ? "Dr" : "Cr"}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  Is period me koi entry nahi.
                </td>
              </tr>
            )}
          </tbody>
          {!!rows.length && (
            <tfoot>
              <tr className="font-semibold">
                <td className="p-2" colSpan={3}>
                  Total
                </td>
                <td className="p-2 text-right font-mono">{formatINR(totalDebit)}</td>
                <td className="p-2 text-right font-mono">{formatINR(totalCredit)}</td>
                <td className="p-2 text-right font-mono">
                  {formatINR(Math.abs(closing))} {closing >= 0 ? "Dr" : "Cr"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 lg:hidden">
        {rows.map((r) => (
          <div key={r.id} className="card-surface space-y-1 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {VOUCHER_TYPE_LABEL[r.voucher.voucher_type] ?? r.voucher.voucher_type} {r.voucher.voucher_no ?? ""}
              </span>
              <span className="text-xs text-muted-foreground">{r.voucher.voucher_date}</span>
            </div>
            <p className="text-xs text-muted-foreground">{r.narration ?? r.voucher.narration ?? "—"}</p>
            <div className="flex justify-between font-mono text-xs">
              <span>{r.debit ? `Dr ${formatINR(r.debit)}` : `Cr ${formatINR(r.credit)}`}</span>
              <span className="font-semibold">
                {formatINR(Math.abs(r.running))} {r.running >= 0 ? "Dr" : "Cr"}
              </span>
            </div>
          </div>
        ))}
        {!rows.length && (
          <div className="card-surface p-6 text-center text-sm text-muted-foreground">Is period me koi entry nahi.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, plain }: { label: string; value: number; plain?: boolean }) {
  return (
    <div className="card-surface p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-bold">
        {formatINR(Math.abs(value))}
        {!plain && <span className="ml-1 text-xs text-muted-foreground">{value >= 0 ? "Dr" : "Cr"}</span>}
      </div>
    </div>
  );
}
