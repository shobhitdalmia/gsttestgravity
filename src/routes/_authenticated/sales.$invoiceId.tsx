import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Printer, Download, Share2, Trash2, IndianRupee, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/gst";
import { postPaymentVoucher, unpostVoucher } from "@/lib/accounting.functions";
import { InvoiceA4 } from "@/components/invoice/InvoiceA4";
import { InvoiceThermal } from "@/components/invoice/InvoiceThermal";
import type { InvoiceFull } from "@/components/invoice/types";

export const Route = createFileRoute("/_authenticated/sales/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice — GST Munshi" },
      { name: "description", content: "GST tax invoice detail, print (A4 / 3 inch / 2 inch) aur payment record." },
      { property: "og:title", content: "Invoice — GST Munshi" },
      { property: "og:description", content: "GST tax invoice detail, print aur payment record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoiceDetail,
});

type Format = "a4" | "80mm" | "58mm";

const FORMAT_LABEL: Record<Format, string> = {
  a4: "A4 Tax Invoice",
  "80mm": "3 inch (80mm)",
  "58mm": "2 inch (58mm)",
};

const PAGE_SIZE: Record<Format, string> = {
  a4: "A4",
  "80mm": "80mm auto",
  "58mm": "58mm auto",
};

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const company = useCurrentCompany();
  const [format, setFormat] = useState<Format>("a4");
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  const companyId = company.data?.id;

  const q = useQuery({
    queryKey: ["invoice", invoiceId, companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // company_id filter is defence-in-depth on top of RLS: an invoice id from
      // another tenant must never resolve here.
      const { data, error } = await supabase
        .from("invoices")
        .select("*, parties(id, name, gstin, phone, billing_address, shipping_address, state, state_code), invoice_items(*)")
        .eq("id", invoiceId)
        .eq("company_id", companyId!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const inv: InvoiceFull | null = q.data
    ? {
        ...(q.data as any),
        items: [...((q.data as any).invoice_items ?? [])].sort((a: any, b: any) =>
          String(a.created_at).localeCompare(String(b.created_at)),
        ),
        party: (q.data as any).parties ?? null,
        company: company.data,
      }
    : null;

  // Inject the right @page size for the selected format before printing.
  useEffect(() => {
    const id = "invoice-page-size";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = `@media print { @page { size: ${PAGE_SIZE[format]}; margin: ${format === "a4" ? "8mm" : "2mm"}; } }`;
    document.body.classList.remove("print-a4", "print-80mm", "print-58mm");
    document.body.classList.add(`print-${format}`);
    return () => {
      document.body.classList.remove("print-a4", "print-80mm", "print-58mm");
    };
  }, [format]);

  async function recordPayment() {
    if (!inv) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error("Valid amount daalein");
    setSaving(true);
    try {
      const paid = Number(inv.amount_paid) + amt;
      const status = paid >= Number(inv.total) ? "paid" : paid > 0 ? "partial" : "unpaid";
      const { error } = await supabase
        .from("invoices")
        .update({ amount_paid: paid, status })
        .eq("id", inv.id)
        .eq("company_id", companyId!);
      if (error) throw error;

      // Receipt entry in books (Cash/Bank Dr / Party Cr)
      const { data: payRow } = await supabase
        .from("payments")
        .insert({
          company_id: companyId!,
          party_id: inv.party?.id ?? null,
          invoice_id: inv.id,
          direction: "received",
          amount: amt,
          payment_date: new Date().toISOString().slice(0, 10),
          mode: "cash",
          reference: inv.invoice_number,
        })
        .select("id")
        .maybeSingle();
      if (payRow?.id) {
        try {
          await postPaymentVoucher({ data: { paymentId: payRow.id } });
        } catch (accErr: any) {
          toast.warning(`Payment saved, accounting entry pending: ${accErr?.message ?? "error"}`);
        }
      }

      toast.success("Payment record ho gaya");
      setPayOpen(false);
      setPayAmount("");
      await qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      await qc.invalidateQueries({ queryKey: ["voucher-lines"] });
      await qc.invalidateQueries({ queryKey: ["day-book"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId)
        .eq("company_id", companyId!);
      if (error) throw error;
      try {
        await unpostVoucher({ data: { companyId: companyId!, sourceType: "invoice", sourceId: invoiceId } });
        await unpostVoucher({ data: { companyId: companyId!, sourceType: "invoice_receipt", sourceId: invoiceId } });
      } catch {
        /* books entry cleanup best-effort */
      }
      toast.success("Invoice delete ho gaya");
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      await qc.invalidateQueries({ queryKey: ["voucher-lines"] });
      await qc.invalidateQueries({ queryKey: ["day-book"] });
      navigate({ to: "/sales" });
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  }


  function share() {
    if (!inv) return;
    const balance = Math.max(0, Number(inv.total) - Number(inv.amount_paid));
    const text =
      `*${company.data?.name ?? "Invoice"}*\n` +
      `Invoice ${inv.invoice_number} (${inv.invoice_date})\n` +
      `Total: ${formatINR(inv.total)}\nBalance: ${formatINR(balance)}\n` +
      `Dhanyawaad!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  if (q.isLoading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (q.error || !inv) {
    return (
      <div className="card-surface p-8 text-center">
        <p className="text-sm text-muted-foreground">Invoice nahi mila.</p>
        <Link to="/sales" className="mt-3 inline-block">
          <Button variant="outline" size="sm">Back to Sales</Button>
        </Link>
      </div>
    );
  }

  const balance = Math.max(0, Number(inv.total) - Number(inv.amount_paid));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/sales">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
              Invoice {inv.invoice_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              {inv.party?.name ?? "Walk-in"} · {inv.invoice_date}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge
            variant={inv.status === "paid" ? "default" : inv.status === "unpaid" ? "destructive" : "secondary"}
            className="capitalize"
          >
            {inv.status}
          </Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setPayOpen(true)}>
            <IndianRupee className="h-4 w-4" /> Payment
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={share}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDelOpen(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Format switcher */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Print format:</span>
        {(Object.keys(FORMAT_LABEL) as Format[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={format === f ? "default" : "outline"}
            onClick={() => setFormat(f)}
          >
            {FORMAT_LABEL[f]}
          </Button>
        ))}
      </div>

      {/* Summary */}
      <div className="no-print grid gap-3 sm:grid-cols-3">
        <Stat label="Invoice Total" value={formatINR(inv.total)} />
        <Stat label="Received" value={formatINR(inv.amount_paid)} />
        <Stat label="Balance Due" value={formatINR(balance)} />
      </div>

      {/* Preview + print area */}
      <div className="card-surface overflow-x-auto p-4 print:border-0 print:p-0 print:shadow-none">
        <div className="print-area-visible">
          {format === "a4" ? <InvoiceA4 inv={inv} /> : <InvoiceThermal inv={inv} width={format} />}
        </div>
      </div>

      {/* Record payment */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Amount received (balance {formatINR(balance)})</Label>
            <Input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder={String(balance)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={recordPayment} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invoice delete karein?</AlertDialogTitle>
            <AlertDialogDescription>
              Ye invoice aur uske items permanently delete ho jaayenge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}
