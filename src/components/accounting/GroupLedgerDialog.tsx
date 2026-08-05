import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { LedgerGroupRow } from "@/lib/accounting";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DialogTarget =
  | { kind: "group"; parent: LedgerGroupRow }
  | { kind: "ledger"; parent: LedgerGroupRow };

const NATURE_LABEL: Record<string, string> = {
  assets: "Assets",
  liabilities: "Liabilities",
  income: "Income",
  expenses: "Expenses",
};

export function GroupLedgerDialog({
  target,
  companyId,
  groups,
  onClose,
}: {
  target: DialogTarget | null;
  companyId: string | undefined;
  groups: LedgerGroupRow[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [opening, setOpening] = useState("");
  const [openingType, setOpeningType] = useState<"debit" | "credit">("debit");

  useEffect(() => {
    if (!target) return;
    setName("");
    setOpening("");
    setParentId(target.parent.id);
    setOpeningType(
      target.parent.nature === "assets" || target.parent.nature === "expenses" ? "debit" : "credit",
    );
  }, [target]);

  const parent = groups.find((g) => g.id === parentId) ?? target?.parent ?? null;
  const isLedger = target?.kind === "ledger";

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId || !parent) throw new Error("Company select nahi hui");
      const clean = name.trim();
      if (!clean) throw new Error("Naam likhein");
      if (isLedger) {
        const { error } = await supabase.from("ledgers").insert({
          company_id: companyId,
          group_id: parent.id,
          name: clean,
          opening_balance: Number(opening || 0),
          opening_type: openingType,
          is_system: false,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ledger_groups").insert({
          company_id: companyId,
          parent_id: parent.id,
          name: clean,
          nature: parent.nature,
          is_system: false,
          sort_order: (parent.sort_order ?? 0) + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isLedger ? "Ledger ban gaya" : "Sub-group ban gaya");
      qc.invalidateQueries({ queryKey: ["ledgers", companyId] });
      qc.invalidateQueries({ queryKey: ["ledger-groups", companyId] });
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save nahi hua"),
  });

  const parentOptions = groups
    .filter((g) => g.nature === (target?.parent.nature ?? g.nature))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLedger ? "Naya Ledger" : "Naya Sub-group"}</DialogTitle>
          <DialogDescription>
            Primary group ke under banega — nature parent se hi milta hai, isliye galat classification nahi hogi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{isLedger ? "Ledger ka naam" : "Sub-group ka naam"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam likhein" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Under (parent group)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Group chunein" />
              </SelectTrigger>
              <SelectContent>
                {parentOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                    {g.is_primary ? " (Primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Nature: {NATURE_LABEL[parent?.nature ?? ""] ?? "—"} (auto)
            </p>
          </div>

          {isLedger && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Opening balance</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                  placeholder="0"
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
