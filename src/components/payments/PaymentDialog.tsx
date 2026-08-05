import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { postPaymentVoucher } from "@/lib/accounting.functions";
import { formatINR, round2 } from "@/lib/gst";
import {
  PAYMENT_MODES,
  statusFor,
  useOpenBills,
  useOpenInvoices,
  usePartyOptions,
  type PayDirection,
} from "@/lib/payments";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export interface PaymentPreset {
  direction: PayDirection;
  partyId?: string | null;
  /** Invoice id (receive) or purchase id (pay). */
  docId?: string | null;
  amount?: number | null;
  reference?: string | null;
}

const ON_ACCOUNT = "__on_account__";
const NO_PARTY = "__walkin__";

export function PaymentDialog({
  preset,
  companyId,
  onClose,
}: {
  preset: PaymentPreset | null;
  companyId: string | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const direction: PayDirection = preset?.direction ?? "received";
  const isReceive = direction === "received";

  const [partyId, setPartyId] = useState<string>(NO_PARTY);
  const [docId, setDocId] = useState<string>(ON_ACCOUNT);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const parties = usePartyOptions(companyId, direction);
  const realParty = partyId === NO_PARTY ? undefined : partyId;
  const invoices = useOpenInvoices(isReceive ? companyId : undefined, realParty);
  const bills = useOpenBills(isReceive ? undefined : companyId, realParty);
  const docs = useMemo(
    () => (isReceive ? invoices.data ?? [] : bills.data ?? []),
    [isReceive, invoices.data, bills.data],
  );
  const docsLoading = isReceive ? invoices.isLoading : bills.isLoading;

  useEffect(() => {
    if (!preset) return;
    setPartyId(preset.partyId ?? NO_PARTY);
    setDocId(preset.docId ?? ON_ACCOUNT);
    setAmount(preset.amount ? String(round2(preset.amount)) : "");
    setDate(new Date().toISOString().slice(0, 10));
    setMode("cash");
    setReference(preset.reference ?? "");
    setNotes("");
  }, [preset]);

  const selectedDoc = docs.find((d) => d.id === docId) ?? null;

  // Pre-selected document ke outstanding se amount auto-fill (jab user ne khud na bhara ho).
  useEffect(() => {
    if (selectedDoc && !amount) setAmount(String(round2(selectedDoc.outstanding)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoc?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Company select nahi hui");
      const amt = round2(Number(amount));
      if (!amt || amt <= 0) throw new Error("Valid amount daalein");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date sahi chunein");

      const docRef = docId === ON_ACCOUNT ? null : docId;

      const { data: payRow, error } = await supabase
        .from("payments")
        .insert({
          company_id: companyId,
          party_id: realParty ?? null,
          invoice_id: isReceive ? docRef : null,
          purchase_id: isReceive ? null : docRef,
          direction,
          amount: amt,
          payment_date: date,
          mode,
          reference: reference.trim() || selectedDoc?.number || null,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Bill / invoice ka paid amount aur status update
      if (docRef && selectedDoc) {
        const paid = round2(selectedDoc.paid + amt);
        const status = statusFor(selectedDoc.total, paid);
        const { error: upErr } = isReceive
          ? await supabase
              .from("invoices")
              .update({ amount_paid: paid, status })
              .eq("id", docRef)
              .eq("company_id", companyId)
          : await supabase
              .from("purchases")
              .update({ amount_paid: paid, status })
              .eq("id", docRef)
              .eq("company_id", companyId);
        if (upErr) throw upErr;
      }

      try {
        await postPaymentVoucher({ data: { paymentId: payRow.id } });
      } catch (e) {
        toast.warning(
          `Entry save ho gayi, books voucher pending: ${e instanceof Error ? e.message : "error"}`,
        );
      }
    },
    onSuccess: async () => {
      toast.success(isReceive ? "Payment receive entry ho gayi" : "Payment entry ho gayi");
      onClose();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["payments-list"] }),
        qc.invalidateQueries({ queryKey: ["invoices"] }),
        qc.invalidateQueries({ queryKey: ["invoice"] }),
        qc.invalidateQueries({ queryKey: ["purchases"] }),
        qc.invalidateQueries({ queryKey: ["open-invoices"] }),
        qc.invalidateQueries({ queryKey: ["open-bills"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        qc.invalidateQueries({ queryKey: ["voucher-lines"] }),
        qc.invalidateQueries({ queryKey: ["day-book"] }),
      ]);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save nahi hua"),
  });

  return (
    <Dialog open={!!preset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReceive ? "Payment Receive (Receipt)" : "Payment Pay"}</DialogTitle>
          <DialogDescription>
            {isReceive
              ? "Customer se mili payment — invoice ke against ya on-account."
              : "Supplier ko di gayi payment — bill ke against ya on-account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{isReceive ? "Customer" : "Supplier"}</Label>
            <Select
              value={partyId}
              onValueChange={(v) => {
                setPartyId(v);
                setDocId(ON_ACCOUNT);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Party chunein" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARTY}>{isReceive ? "Walk-in / cash sale" : "Bina party"}</SelectItem>
                {(parties.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {realParty && (
            <div className="space-y-1.5">
              <Label>{isReceive ? "Invoice ke against" : "Bill ke against"}</Label>
              <Select value={docId} onValueChange={setDocId} disabled={docsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={docsLoading ? "Load ho raha hai…" : "On account"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ON_ACCOUNT}>On account (kisi bill se link nahi)</SelectItem>
                  {docs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.number} · {d.date} · baaki {formatINR(d.outstanding)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!docsLoading && docs.length === 0 && (
                <p className="text-xs text-muted-foreground">Is party ka koi pending bill nahi hai.</p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              {selectedDoc && (
                <p className="text-xs text-muted-foreground">
                  Outstanding: {formatINR(selectedDoc.outstanding)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Cheque / UTR / bill no."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !Number(amount)}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {save.isPending ? "Saving…" : "Save Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
