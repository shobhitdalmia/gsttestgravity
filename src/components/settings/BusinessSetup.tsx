import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useLedgerGroups,
  useLedgers,
  type LedgerGroupRow,
  type LedgerNature,
  type LedgerRow,
} from "@/lib/accounting";
import { formatINR } from "@/lib/gst";
import { GroupLedgerDialog, type DialogTarget } from "@/components/accounting/GroupLedgerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderTree, Lock, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";

const NATURE_LABEL: Record<LedgerNature, string> = {
  assets: "Assets",
  liabilities: "Liabilities",
  income: "Income",
  expenses: "Expenses",
};

type SubTab = "accounts" | "groups";

export function BusinessSetup({ companyId }: { companyId: string | undefined }) {
  const [tab, setTab] = useState<SubTab>("accounts");
  const groups = useLedgerGroups(companyId);
  const ledgers = useLedgers(companyId);
  const [createTarget, setCreateTarget] = useState<DialogTarget | null>(null);
  const [editLedger, setEditLedger] = useState<LedgerRow | null>(null);
  const [editGroup, setEditGroup] = useState<LedgerGroupRow | null>(null);

  const groupList = groups.data ?? [];
  const ledgerList = ledgers.data ?? [];
  const primaryGroups = groupList.filter((g) => g.is_primary);
  const defaultParent = primaryGroups[0] ?? groupList[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-border p-1">
          <SubTabButton active={tab === "accounts"} onClick={() => setTab("accounts")} icon={Wallet} label="Accounts (Ledgers)" />
          <SubTabButton active={tab === "groups"} onClick={() => setTab("groups")} icon={FolderTree} label="Account Groups" />
        </div>
        {defaultParent && (
          <Button
            className="gap-2"
            onClick={() =>
              setCreateTarget({ kind: tab === "accounts" ? "ledger" : "group", parent: defaultParent })
            }
          >
            <Plus className="h-4 w-4" /> {tab === "accounts" ? "Naya Account" : "Naya Group"}
          </Button>
        )}
      </div>

      {groups.isLoading || ledgers.isLoading ? (
        <div className="card-surface space-y-2 p-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : tab === "accounts" ? (
        <AccountsTab
          groups={groupList}
          ledgers={ledgerList}
          onEdit={setEditLedger}
          onCreate={(parent) => setCreateTarget({ kind: "ledger", parent })}
        />
      ) : (
        <GroupsTab
          groups={groupList}
          ledgers={ledgerList}
          onEdit={setEditGroup}
          onAddChild={(parent) => setCreateTarget({ kind: "group", parent })}
          onAddLedger={(parent) => setCreateTarget({ kind: "ledger", parent })}
        />
      )}

      <GroupLedgerDialog
        target={createTarget}
        companyId={companyId}
        groups={groupList}
        onClose={() => setCreateTarget(null)}
      />
      <EditLedgerDialog
        ledger={editLedger}
        companyId={companyId}
        groups={groupList}
        onClose={() => setEditLedger(null)}
      />
      <EditGroupDialog
        group={editGroup}
        companyId={companyId}
        groups={groupList}
        ledgers={ledgerList}
        onClose={() => setEditGroup(null)}
      />
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Wallet;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

/* ---------------- Accounts (ledgers) ---------------- */

function AccountsTab({
  groups,
  ledgers,
  onEdit,
  onCreate,
}: {
  groups: LedgerGroupRow[];
  ledgers: LedgerRow[];
  onEdit: (l: LedgerRow) => void;
  onCreate: (parent: LedgerGroupRow) => void;
}) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledgers
      .filter((l) => (groupFilter === "all" ? true : l.group_id === groupFilter))
      .filter((l) => (q ? l.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ledgers, groupFilter, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Account search karein"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Saare groups</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-surface p-3">
        <div className="hidden overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account (Ledger)</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Nature</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => {
                const g = groupById.get(l.group_id);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      {l.name}
                      {l.is_system && (
                        <Badge variant="secondary" className="ml-2 gap-1 text-[10px]">
                          <Lock className="h-3 w-3" /> System
                        </Badge>
                      )}
                      {l.party_id && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Party
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{g?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {g ? NATURE_LABEL[g.nature] : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatINR(l.opening_balance)} {l.opening_type === "credit" ? "Cr" : "Dr"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => onEdit(l)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Koi account nahi mila.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2 lg:hidden">
          {rows.map((l) => {
            const g = groupById.get(l.group_id);
            return (
              <div key={l.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {g?.name ?? "—"} · {g ? NATURE_LABEL[g.nature] : "—"}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => onEdit(l)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
                <div className="mt-1 font-mono text-xs">
                  Opening {formatINR(l.opening_balance)} {l.opening_type === "credit" ? "Cr" : "Dr"}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Koi account nahi mila.</p>
          )}
        </div>
      </div>

      {groups[0] && (
        <p className="text-xs text-muted-foreground">
          Naya account banane ke liye upar “Naya Account” dabaayein — group chunna zaroori hai taaki reports sahi
          banein.{" "}
          <button className="underline" onClick={() => onCreate(groups[0]!)}>
            Turant banayein
          </button>
        </p>
      )}
    </div>
  );
}

/* ---------------- Account groups tree ---------------- */

function GroupsTab({
  groups,
  ledgers,
  onEdit,
  onAddChild,
  onAddLedger,
}: {
  groups: LedgerGroupRow[];
  ledgers: LedgerRow[];
  onEdit: (g: LedgerGroupRow) => void;
  onAddChild: (parent: LedgerGroupRow) => void;
  onAddLedger: (parent: LedgerGroupRow) => void;
}) {
  const byParent = useMemo(() => {
    const m = new Map<string | null, LedgerGroupRow[]>();
    for (const g of groups) {
      const k = g.parent_id ?? null;
      m.set(k, [...(m.get(k) ?? []), g]);
    }
    return m;
  }, [groups]);
  const countByGroup = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of ledgers) m.set(l.group_id, (m.get(l.group_id) ?? 0) + 1);
    return m;
  }, [ledgers]);

  function render(parentId: string | null, depth: number): React.ReactNode {
    const list = (byParent.get(parentId) ?? []).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
    );
    return list.map((g) => (
      <div key={g.id}>
        <div
          className="group flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60"
          style={{ paddingLeft: 8 + depth * 18 }}
        >
          <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">{g.name}</span>
          {g.is_primary && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Lock className="h-3 w-3" /> Primary
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {NATURE_LABEL[g.nature]} · {countByGroup.get(g.id) ?? 0} accounts
          </span>
          <div className="ml-auto flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => onAddChild(g)}>
              <Plus className="h-3.5 w-3.5" /> Sub-group
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => onAddLedger(g)}>
              <Plus className="h-3.5 w-3.5" /> Account
            </Button>
            {!g.is_primary && (
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => onEdit(g)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
          </div>
        </div>
        {render(g.id, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="card-surface p-3">
      <p className="mb-2 px-2 text-xs text-muted-foreground">
        Primary groups Tally jaise fixed hote hain (lock) — unke andar aap apne sub-group aur accounts bana, rename ya
        move kar sakte hain.
      </p>
      {render(null, 0)}
    </div>
  );
}

/* ---------------- Edit dialogs ---------------- */

function EditLedgerDialog({
  ledger,
  companyId,
  groups,
  onClose,
}: {
  ledger: LedgerRow | null;
  companyId: string | undefined;
  groups: LedgerGroupRow[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [opening, setOpening] = useState("");
  const [openingType, setOpeningType] = useState<"debit" | "credit">("debit");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (ledger && loadedFor !== ledger.id) {
    setLoadedFor(ledger.id);
    setName(ledger.name);
    setGroupId(ledger.group_id);
    setOpening(String(ledger.opening_balance ?? 0));
    setOpeningType(ledger.opening_type);
  }

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["ledgers", companyId] }),
      qc.invalidateQueries({ queryKey: ["ledger-groups", companyId] }),
    ]);

  const save = useMutation({
    mutationFn: async () => {
      if (!ledger || !companyId) throw new Error("Account select nahi hua");
      const clean = name.trim();
      if (!clean) throw new Error("Naam likhein");
      const { error } = await supabase
        .from("ledgers")
        .update({
          name: clean,
          group_id: groupId,
          opening_balance: Number(opening || 0),
          opening_type: openingType,
        })
        .eq("id", ledger.id)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Account update ho gaya");
      onClose();
      await invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save nahi hua"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!ledger || !companyId) throw new Error("Account select nahi hua");
      const { count, error: cErr } = await supabase
        .from("voucher_lines")
        .select("id", { count: "exact", head: true })
        .eq("ledger_id", ledger.id);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) throw new Error("Is account me entries hain — delete nahi ho sakta");
      const { error } = await supabase
        .from("ledgers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", ledger.id)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Account delete ho gaya");
      onClose();
      await invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete nahi hua"),
  });

  const busy = save.isPending || remove.isPending;
  const locked = !!ledger?.is_system;

  return (
    <Dialog open={!!ledger} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account edit karein</DialogTitle>
          <DialogDescription>
            {locked
              ? "Yeh system account hai — naam aur group badla ja sakta hai, delete nahi."
              : "Naam, group aur opening balance change kar sakte hain."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Account ka naam</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Group (under)</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} — {NATURE_LABEL[g.nature]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Opening balance</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dr / Cr</Label>
              <Select value={openingType} onValueChange={(v) => setOpeningType(v as "debit" | "credit")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {!locked ? (
            <Button
              variant="ghost"
              className="gap-2 text-destructive"
              disabled={busy}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={busy || !name.trim()}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditGroupDialog({
  group,
  companyId,
  groups,
  ledgers,
  onClose,
}: {
  group: LedgerGroupRow | null;
  companyId: string | undefined;
  groups: LedgerGroupRow[];
  ledgers: LedgerRow[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (group && loadedFor !== group.id) {
    setLoadedFor(group.id);
    setName(group.name);
    setParentId(group.parent_id ?? "");
  }

  const parentOptions = useMemo(
    () => groups.filter((g) => g.id !== group?.id && g.parent_id !== group?.id),
    [groups, group],
  );
  const parent = groups.find((g) => g.id === parentId) ?? null;

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["ledger-groups", companyId] }),
      qc.invalidateQueries({ queryKey: ["ledgers", companyId] }),
    ]);

  const save = useMutation({
    mutationFn: async () => {
      if (!group || !companyId) throw new Error("Group select nahi hua");
      const clean = name.trim();
      if (!clean) throw new Error("Naam likhein");
      if (!parent) throw new Error("Parent group chunein");
      const { error } = await supabase
        .from("ledger_groups")
        .update({ name: clean, parent_id: parent.id, nature: parent.nature })
        .eq("id", group.id)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Group update ho gaya");
      onClose();
      await invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save nahi hua"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!group || !companyId) throw new Error("Group select nahi hua");
      if (groups.some((g) => g.parent_id === group.id)) throw new Error("Pehle iske sub-groups hatayein");
      if (ledgers.some((l) => l.group_id === group.id)) throw new Error("Is group me accounts hain — pehle move karein");
      const { error } = await supabase
        .from("ledger_groups")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", group.id)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Group delete ho gaya");
      onClose();
      await invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete nahi hua"),
  });

  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account group edit karein</DialogTitle>
          <DialogDescription>Naam badlein ya group ko doosre parent ke under move karein.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Group ka naam</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Under (parent group)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Parent chunein" />
              </SelectTrigger>
              <SelectContent>
                {parentOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} — {NATURE_LABEL[g.nature]}
                    {g.is_primary ? " (Primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Nature: {parent ? NATURE_LABEL[parent.nature] : "—"} (parent se auto)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="gap-2 text-destructive" disabled={busy} onClick={() => remove.mutate()}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={busy || !name.trim()}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
