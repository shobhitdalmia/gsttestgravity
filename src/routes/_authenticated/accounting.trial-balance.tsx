import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useCurrentCompany } from "@/lib/company";
import { useFinancialYear } from "@/lib/fy";
import { buildBalances, useLedgerGroups, useLedgers, useVoucherLines } from "@/lib/accounting";
import { formatINR, round2 } from "@/lib/gst";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/accounting/trial-balance")({
  head: () => ({
    meta: [
      { title: "Trial Balance — GST Munshi" },
      { name: "description", content: "Trial balance, Profit & Loss aur Balance Sheet summary." },
    ],
  }),
  component: TrialBalance,
});

function TrialBalance() {
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { from, to, label } = useFinancialYear(companyId);
  const groups = useLedgerGroups(companyId);
  const ledgers = useLedgers(companyId);
  const lines = useVoucherLines(companyId, from, to);

  const natureOf = useMemo(() => {
    const m = new Map<string, "assets" | "liabilities" | "income" | "expenses">();
    for (const g of groups.data ?? []) m.set(g.id, g.nature);
    return m;
  }, [groups.data]);

  const groupName = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups.data ?? []) m.set(g.id, g.name);
    return m;
  }, [groups.data]);

  const balances = useMemo(
    () => buildBalances(ledgers.data ?? [], lines.data ?? []),
    [ledgers.data, lines.data],
  );

  const rows = useMemo(
    () =>
      (ledgers.data ?? [])
        .map((l) => {
          const b = balances.get(l.id);
          return {
            id: l.id,
            name: l.name,
            group: groupName.get(l.group_id) ?? "—",
            nature: natureOf.get(l.group_id) ?? "assets",
            debit: b && b.closing > 0 ? b.closing : 0,
            credit: b && b.closing < 0 ? -b.closing : 0,
          };
        })
        .filter((r) => r.debit !== 0 || r.credit !== 0)
        .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)),
    [ledgers.data, balances, groupName, natureOf],
  );

  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0));
  const balanced = Math.abs(totalDebit - totalCredit) < 0.05;

  const income = round2(
    rows.filter((r) => r.nature === "income").reduce((s, r) => s + r.credit - r.debit, 0),
  );
  const expense = round2(
    rows.filter((r) => r.nature === "expenses").reduce((s, r) => s + r.debit - r.credit, 0),
  );
  const netProfit = round2(income - expense);
  const assets = round2(rows.filter((r) => r.nature === "assets").reduce((s, r) => s + r.debit - r.credit, 0));
  const liabilities = round2(
    rows.filter((r) => r.nature === "liabilities").reduce((s, r) => s + r.credit - r.debit, 0),
  );

  function exportCsv() {
    const head = ["Ledger", "Group", "Debit", "Credit"];
    const body = rows.map((r) => [r.name.replace(/[",\n]/g, " "), r.group, r.debit || "", r.credit || ""]);
    const csv = [head, ...body, ["Total", "", totalDebit, totalCredit]].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial-balance-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            balanced ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive"
          }`}
        >
          {balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {balanced ? "Books balanced hain" : "Dr aur Cr match nahi kar rahe"}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Income" value={income} />
        <Kpi label="Total Expenses" value={expense} />
        <Kpi label={netProfit >= 0 ? "Net Profit" : "Net Loss"} value={Math.abs(netProfit)} accent />
        <Kpi label="Assets / Liabilities" value={assets} sub={formatINR(liabilities)} />
      </div>

      <div className="card-surface overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-2 font-medium">Ledger</th>
              <th className="p-2 font-medium">Group</th>
              <th className="p-2 text-right font-medium">Debit</th>
              <th className="p-2 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="p-2 font-medium">{r.name}</td>
                <td className="p-2 text-xs text-muted-foreground">{r.group}</td>
                <td className="p-2 text-right font-mono">{r.debit ? formatINR(r.debit) : "—"}</td>
                <td className="p-2 text-right font-mono">{r.credit ? formatINR(r.credit) : "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                  Is period me koi balance nahi.
                </td>
              </tr>
            )}
          </tbody>
          {!!rows.length && (
            <tfoot>
              <tr className="font-semibold">
                <td className="p-2" colSpan={2}>
                  Total
                </td>
                <td className="p-2 text-right font-mono">{formatINR(totalDebit)}</td>
                <td className="p-2 text-right font-mono">{formatINR(totalCredit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: boolean }) {
  return (
    <div className="card-surface p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-display text-xl font-bold ${accent ? "text-primary" : ""}`}>{formatINR(value)}</div>
      {sub && <div className="text-xs text-muted-foreground">Liabilities: {sub}</div>}
    </div>
  );
}
