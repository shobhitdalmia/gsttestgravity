import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ShoppingBag, Camera, ImageIcon, FileText, Sparkles, Loader2, ArrowUpFromLine, Search } from "lucide-react";
import { PaymentDialog, type PaymentPreset } from "@/components/payments/PaymentDialog";
import { useFinancialYear } from "@/lib/fy";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { extractPurchaseBill } from "@/lib/bill-ocr.functions";

export const Route = createFileRoute("/_authenticated/purchases/")({
  head: () => ({ meta: [{ title: "Purchase Register — GST Munshi" }] }),
  component: PurchasesList,
});

function formatGstDate(d: string) {
  if (!d) return "-";
  const [yyyy, mm, dd] = d.split("-");
  if (yyyy && mm && dd) return `${dd}-${mm}-${yyyy}`;
  return d;
}

function formatNum(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num) || num === 0) return "";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatNumRequired(num: number | null | undefined): string {
  const val = Number(num ?? 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function computeGstType(row: any): string {
  const igst = Number(row.igst ?? 0);
  const cgst = Number(row.cgst ?? 0);
  const sgst = Number(row.sgst ?? 0);
  const totalTax = igst + cgst + sgst;
  const taxable = Number(row.subtotal ?? (row.total - totalTax) ?? 0);
  const isInterstate = Boolean(row.is_interstate || igst > 0);
  
  let ratePct = 0;
  if (taxable > 0 && totalTax > 0) {
    ratePct = Math.round((totalTax / taxable) * 100);
  }
  
  const prefix = isInterstate ? "I/GST" : "L/GST";
  if (ratePct > 0) return `${prefix}-${ratePct}%`;
  return `${prefix}-0%`;
}

function PurchasesList() {
  const company = useCurrentCompany();
  const navigate = useNavigate();
  const extract = useServerFn(extractPurchaseBill);
  const [scanOpen, setScanOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [search, setSearch] = useState("");
  const [payPreset, setPayPreset] = useState<PaymentPreset | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const { from: fyFrom, to: fyTo } = useFinancialYear(company.data?.id);

  const list = useQuery({
    enabled: !!company.data?.id,
    queryKey: ["purchases", company.data?.id, fyFrom ?? "all", fyTo ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("purchases")
        .select("*, parties(name)")
        .eq("company_id", company.data!.id);
      if (fyFrom) q = q.gte("bill_date", fyFrom);
      if (fyTo) q = q.lte("bill_date", fyTo);
      const { data, error } = await q.order("bill_date", { ascending: false }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list.data ?? [];
    return (list.data ?? []).filter((r: any) =>
      String(r.bill_number ?? "").toLowerCase().includes(q) ||
      String(r.parties?.name ?? "").toLowerCase().includes(q)
    );
  }, [list.data, search]);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File 10MB se kam honi chahiye");
      return;
    }
    setScanOpen(false);
    setExtracting(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const bill = await extract({ data: { fileBase64, mimeType: file.type } });
      const draftId = crypto.randomUUID();
      sessionStorage.setItem(`bill-draft-${draftId}`, JSON.stringify(bill));
      toast.success("Bill extract ho gaya! Review karke Save dabaayein.");
      navigate({ to: "/purchases/new", search: { draft: draftId } as any });
    } catch (e: any) {
      toast.error(e.message ?? "Extract failed");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Purchase Register</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Vendor bills aur purchase entries ka GST register.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => setPayPreset({ direction: "paid" })}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            <span className="hidden sm:inline">Pay Payment</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setScanOpen(true)} disabled={extracting}>
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
            {extracting ? "Extracting…" : "Scan Bill (AI)"}
          </Button>
          <Link to="/purchases/new" search={{ draft: undefined }}>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Purchase</Button>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 text-xs sm:text-sm"
            placeholder="Search Vch/Bill No or Supplier Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Register Table Container */}
      <div className="card-surface overflow-hidden rounded-xl border border-border shadow-xs">
        {filteredList.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Koi purchase entry nahi mila.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-xs font-sans border-collapse">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/60 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  <TableHead className="w-12 text-center py-3">#</TableHead>
                  <TableHead className="py-3">DATE</TableHead>
                  <TableHead className="py-3">VCH/BILL NO</TableHead>
                  <TableHead className="py-3">ACCOUNT</TableHead>
                  <TableHead className="py-3">TYPE</TableHead>
                  <TableHead className="text-right py-3">TOTAL AMOUNT</TableHead>
                  <TableHead className="text-right py-3">PURCHASE AMOUNT</TableHead>
                  <TableHead className="text-right py-3">TAXABLE AMT</TableHead>
                  <TableHead className="text-right py-3">IGST</TableHead>
                  <TableHead className="text-right py-3">CGST</TableHead>
                  <TableHead className="text-right py-3">SGST</TableHead>
                  <TableHead className="text-center py-3">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((r: any, idx: number) => {
                  const totalTax = Number(r.igst ?? 0) + Number(r.cgst ?? 0) + Number(r.sgst ?? 0);
                  const taxableAmt = Number(r.subtotal ?? (r.total - totalTax) ?? 0);
                  const purchaseAmt = taxableAmt;
                  const gstType = computeGstType(r);
                  const isAlternateRow = idx % 2 === 0;

                  return (
                    <TableRow
                      key={r.id}
                      className={`transition-colors border-b border-border/40 ${
                        isAlternateRow
                          ? "bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-200/70 dark:hover:bg-slate-800/70"
                          : "bg-card hover:bg-muted/50"
                      }`}
                    >
                      {/* # Sr No */}
                      <TableCell className="text-center font-medium text-muted-foreground py-3">
                        {idx + 1}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="whitespace-nowrap font-medium text-foreground py-3">
                        {formatGstDate(r.bill_date)}
                      </TableCell>

                      {/* Vch/Bill No */}
                      <TableCell className="font-mono text-xs font-semibold text-foreground whitespace-nowrap py-3">
                        {r.bill_number}
                      </TableCell>

                      {/* Account */}
                      <TableCell className="font-semibold text-foreground uppercase tracking-tight py-3 min-w-[160px]">
                        {r.parties?.name ?? "VENDOR / SUPPLIER"}
                      </TableCell>

                      {/* Type */}
                      <TableCell className="whitespace-nowrap font-semibold text-xs text-muted-foreground py-3">
                        {gstType}
                      </TableCell>

                      {/* Total Amount */}
                      <TableCell className="whitespace-nowrap text-right font-bold text-foreground py-3">
                        {formatNumRequired(r.total)}
                      </TableCell>

                      {/* Purchase Amount */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-foreground py-3">
                        {formatNumRequired(purchaseAmt)}
                      </TableCell>

                      {/* Taxable Amount */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-foreground py-3">
                        {formatNumRequired(taxableAmt)}
                      </TableCell>

                      {/* IGST */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-muted-foreground py-3">
                        {formatNum(r.igst)}
                      </TableCell>

                      {/* CGST */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-muted-foreground py-3">
                        {formatNum(r.cgst)}
                      </TableCell>

                      {/* SGST */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-muted-foreground py-3">
                        {formatNum(r.sgst)}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-center py-3">
                        <div className="flex items-center justify-center gap-1">
                          {["unpaid", "partial", "draft"].includes(r.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2 gap-1"
                              onClick={() =>
                                setPayPreset({
                                  direction: "paid",
                                  partyId: r.party_id ?? null,
                                  docId: r.party_id ? r.id : null,
                                  amount: Math.max(0, Number(r.total) - Number(r.amount_paid ?? 0)),
                                })
                              }
                            >
                              <ArrowUpFromLine className="h-3 w-3" /> Pay
                            </Button>
                          )}
                          <Badge variant={r.status === "paid" ? "default" : "secondary"} className="capitalize text-[10px]">
                            {r.status}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Scan Bill with AI
            </DialogTitle>
            <DialogDescription>
              Photo ya PDF upload karein — AI supplier, items, GST sab auto-fill kar dega.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <ScanChoice icon={<Camera className="h-6 w-6" />} label="Camera" onClick={() => cameraRef.current?.click()} />
            <ScanChoice icon={<ImageIcon className="h-6 w-6" />} label="Gallery" onClick={() => galleryRef.current?.click()} />
            <ScanChoice icon={<FileText className="h-6 w-6" />} label="PDF" onClick={() => pdfRef.current?.click()} />
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        </DialogContent>
      </Dialog>

      <PaymentDialog preset={payPreset} companyId={company.data?.id} onClose={() => setPayPreset(null)} />
    </div>
  );
}

function ScanChoice({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-primary-soft hover:border-primary transition"
    >
      <div className="text-primary">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
