import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCurrentCompany } from "@/lib/company";
import { useFinancialYear } from "@/lib/fy";
import {
  buildBalances,
  isDebitNature,
  useLedgerGroups,
  useLedgers,
  useVoucherLines,
  type LedgerGroupRow,
} from "@/lib/accounting";
import { formatINR } from "@/lib/gst";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Search, Lock, FolderPlus, Plus } from "lucide-react";
import { GroupLedgerDialog, type DialogTarget } from "@/components/accounting/GroupLedgerDialog";

export const Route = createFileRoute("/_authenticated/accounting/")({
  head: () => ({
    meta: [
      { title: "Chart of Accounts — GST Munshi" },
      { name: "description", content: "Tally-style groups aur ledgers ek jagah." },
    ],
  }),
  component: ChartOfAccounts,
});

const NATURE_ORDER: { key: "assets" | "liabilities" | "income" | "expenses"; label: string }[] = [
  { key: "liabilities", label: "Liabilities & Capital" },
  { key: "assets", label: "Assets" },
  { key: "income", label: "Income" },
  { key: "expenses", label: "Expenses" },
];

function ChartOfAccounts() {
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { from, to, label } = useFinancialYear(companyId);
  const groups = useLedgerGroups(companyId);
  const ledgers = useLedgers(companyId);
  const lines = useVoucherLines(companyId, from, to);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DialogTarget | null>(null);

  const balances = useMemo(
    () => buildBalances(ledgers.data ?? [], lines.data ?? []),
    [ledgers.data, lines.data],
  );

  const childGroups = useMemo(() => {
    const m = new Map<string | null, LedgerGroupRow[]>();
    for (const g of groups.data ?? []) {
      const k = g.parent_id ?? null;
      m.set(k, [...(m.get(k) ?? []), g]);
    }
    return m;
  }, [groups.data]);

  const ledgersByGroup = useMemo(() => {
    const m = new Map<string, typeof ledgers.data>();
    const term = search.trim().toLowerCase();
    for (const l of ledgers.data ?? []) {
      if (term && !l.name.toLowerCase().includes(term)) continue;
      m.set(l.group_id, [...(m.get(l.group_id) ?? []), l] as typeof ledgers.data);
    }
    return m;
  }, [ledgers.data, search]);

  const loading = groups.isLoading || ledgers.isLoading;

  function GroupNode({ group, depth }: { group: LedgerGroupRow; depth: number }) {
    const kids = childGroups.get(group.id) ?? [];
    const own = ledgersByGroup.get(group.id) ?? [];
    const hasMatch = own.length > 0 || kids.some((k) => hasContent(k));
    if (search.trim() && !hasMatch) return null;
    const isOpen = open[group.id] ?? (depth === 0 || !!search.trim());

    return (
      <div>
        <div
          className="group/row flex w-full items-center gap-1 rounded-lg pr-1 hover:bg-muted"
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => ({ ...o, [group.id]: !isOpen }))}
            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm font-semibold"
          >
            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 truncate">{group.name}</span>
            {group.is_primary && (
              <span
                title="Primary group — locked. Sirf platform admin badal sakta hai."
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                <Lock className="h-3 w-3" /> Primary
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
            title="Naya sub-group"
            onClick={() => setDialog({ kind: "group", parent: group })}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
            title="Naya ledger"
            onClick={() => setDialog({ kind: "ledger", parent: group })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {isOpen && (
          <div>
            {kids.map((k) => (
              <GroupNode key={k.id} group={k} depth={depth + 1} />
            ))}
            {own.map((l) => {
              const b = balances.get(l.id);
              const closing = b?.closing ?? 0;
              const drCr = closing >= 0 ? "Dr" : "Cr";
              return (
                <Link
                  key={l.id}
                  to="/accounting/ledgers"
                  search={{ ledger: l.id } as never}
                  className="flex items-center justify-between gap-3 rounded-lg py-2 pr-2 text-sm hover:bg-muted"
                  style={{ paddingLeft: 32 + depth * 16 }}
                >
                  <span className="min-w-0 truncate">{l.name}</span>
                  <span className="shrink-0 font-mono text-xs">
                    {formatINR(Math.abs(closing))} <span className="text-muted-foreground">{drCr}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function hasContent(g: LedgerGroupRow): boolean {
    if ((ledgersByGroup.get(g.id) ?? []).length) return true;
    return (childGroups.get(g.id) ?? []).some(hasContent);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Ledger search karein"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground">Balances: {label}</div>
      </div>

      <p className="text-xs text-muted-foreground">
        <Lock className="mr-1 inline h-3 w-3" />
        11 primary groups system-locked hain — inke andar aap apne sub-group aur ledger bana sakte hain.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {NATURE_ORDER.map((n) => {
            const roots = (childGroups.get(null) ?? []).filter((g) => g.nature === n.key);
            return (
              <div key={n.key} className="card-surface p-3">
                <div className="mb-2 flex items-center justify-between px-2">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    {n.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {isDebitNature(n.key) ? "Debit nature" : "Credit nature"}
                  </span>
                </div>
                {roots.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground">Koi group nahi mila.</p>
                ) : (
                  roots.map((g) => <GroupNode key={g.id} group={g} depth={0} />)
                )}
              </div>
            );
          })}
        </div>
      )}

      <GroupLedgerDialog
        target={dialog}
        companyId={companyId}
        groups={groups.data ?? []}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
