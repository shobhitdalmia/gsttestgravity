import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { fyDefaultDate, isInFY, useFinancialYear } from "@/lib/fy";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, Save, Sparkles } from "lucide-react";
import { computeLine, formatINR, round2, GST_RATES, INDIAN_STATES } from "@/lib/gst";
import { safeRandomUUID } from "@/lib/utils";
import { postPurchaseVoucher } from "@/lib/accounting.functions";
import type { ExtractedBill } from "@/lib/bill-ocr.functions";

export const Route = createFileRoute("/_authenticated/purchases/new")({
  head: () => ({ meta: [{ title: "New Purchase — GST Munshi" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ draft: (s.draft as string) || undefined }),
  component: NewPurchase,
});

interface Line {
  key: string;
  product_id?: string | null;
  name: string;
  hsn_code?: string;
  unit?: string;
  quantity: number;
  rate: number;
  gstRate: number;
  ai?: boolean;
}
const emptyLine = (): Line => ({ key: safeRandomUUID(), name: "", quantity: 1, rate: 0, gstRate: 18 });

const AI_GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
const nearestGst = (r: number) => AI_GST_RATES.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 18);

function NewPurchase() {
  const navigate = useNavigate();
  const { draft } = Route.useSearch();
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { fy, label: fyLabelText } = useFinancialYear(companyId);

  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(() => fyDefaultDate(fy));
  const dateOutsideFY = !isInFY(billDate, fy);

  const [partyId, setPartyId] = useState<string | null>(null);
  const [supplierStateCode, setSupplierStateCode] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [supplierConfirm, setSupplierConfirm] = useState<null | {
    name: string; gstin: string; state_code: string; address: string; phone: string;
  }>(null);

  const suppliers = useQuery({
    enabled: !!companyId,
    queryKey: ["parties-suppliers", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parties")
        .select("id, name, state_code, gstin")
        .eq("company_id", companyId!)
        .in("type", ["supplier", "both"])
        .order("name");
      return data ?? [];
    },
  });

  const products = useQuery({
    enabled: !!companyId,
    queryKey: ["products-list", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, hsn_code, unit, purchase_price, gst_rate")
        .eq("company_id", companyId!)
        .order("name");
      return data ?? [];
    },
  });

  // Load AI draft
  useEffect(() => {
    if (!draft || aiFilled || !companyId || !suppliers.data || !products.data) return;
    const raw = sessionStorage.getItem(`bill-draft-${draft}`);
    if (!raw) return;
    try {
      const bill = JSON.parse(raw) as ExtractedBill;
      if (bill.bill_number) setBillNumber(bill.bill_number);
      if (bill.bill_date) setBillDate(bill.bill_date);

      // Supplier matching
      const sup = bill.supplier;
      if (sup?.gstin || sup?.name) {
        const match = suppliers.data.find(
          (s) => (sup.gstin && s.gstin && s.gstin.toUpperCase() === sup.gstin.toUpperCase())
            || (sup.name && s.name.toLowerCase() === sup.name.toLowerCase()),
        );
        if (match) {
          setPartyId(match.id);
          if (match.state_code) setSupplierStateCode(match.state_code);
        } else if (sup.name) {
          setSupplierConfirm({
            name: sup.name,
            gstin: sup.gstin ?? "",
            state_code: sup.state_code ?? (sup.gstin?.slice(0, 2) ?? ""),
            address: sup.address ?? "",
            phone: sup.phone ?? "",
          });
        }
      }

      // Line items
      if (bill.items?.length) {
        const newLines: Line[] = bill.items.map((it) => {
          const match = products.data!.find(
            (p) => (it.hsn_code && p.hsn_code === it.hsn_code && p.name.toLowerCase() === it.name.toLowerCase())
              || p.name.toLowerCase() === it.name.toLowerCase(),
          );
          return {
            key: safeRandomUUID(),
            product_id: match?.id ?? null,
            name: it.name,
            hsn_code: it.hsn_code ?? match?.hsn_code ?? "",
            unit: it.unit ?? match?.unit ?? "PCS",
            quantity: it.quantity || 1,
            rate: it.rate || 0,
            gstRate: nearestGst(it.gst_rate ?? 18),
            ai: true,
          };
        });
        setLines(newLines);
      }
      setAiFilled(true);
      sessionStorage.removeItem(`bill-draft-${draft}`);
    } catch {
      // ignore
    }
  }, [draft, aiFilled, companyId, suppliers.data, products.data]);

  useEffect(() => {
    if (!partyId) return;
    const p = suppliers.data?.find((x) => x.id === partyId);
    if (p?.state_code) setSupplierStateCode(p.state_code);
  }, [partyId, suppliers.data]);

  const companyStateCode = company.data?.state_code ?? "";
  const isInterstate = !!supplierStateCode && !!companyStateCode && supplierStateCode !== companyStateCode;

  const totals = useMemo(() => {
    let subtotal = 0, cgst = 0, sgst = 0, igst = 0, total = 0;
    const computed = lines.map((l) => {
      const c = computeLine({ ...l, discountPct: 0 }, isInterstate);
      subtotal += c.taxable; cgst += c.cgst; sgst += c.sgst; igst += c.igst; total += c.total;
      return c;
    });
    return { subtotal: round2(subtotal), cgst: round2(cgst), sgst: round2(sgst), igst: round2(igst), total: round2(total), computed };
  }, [lines, isInterstate]);

  const upd = (k: string, patch: Partial<Line>) => setLines((p) => p.map((l) => l.key === k ? { ...l, ...patch } : l));

  function pickProduct(k: string, id: string) {
    const p = products.data?.find((x) => x.id === id);
    if (!p) return;
    upd(k, { product_id: p.id, name: p.name, hsn_code: p.hsn_code ?? "", unit: p.unit ?? "PCS", rate: Number(p.purchase_price), gstRate: Number(p.gst_rate) });
  }

  async function confirmNewSupplier() {
    if (!supplierConfirm || !companyId) return;
    const { data, error } = await supabase.from("parties").insert({
      company_id: companyId,
      type: "supplier",
      name: supplierConfirm.name.trim(),
      gstin: supplierConfirm.gstin.trim() || null,
      state_code: supplierConfirm.state_code || null,
      billing_address: supplierConfirm.address || null,
      phone: supplierConfirm.phone || null,
    }).select("id, state_code").single();
    if (error) return toast.error(error.message);
    setPartyId(data.id);
    if (data.state_code) setSupplierStateCode(data.state_code);
    suppliers.refetch();
    setSupplierConfirm(null);
    toast.success("Supplier add ho gaya");
  }

  async function save() {
    if (!companyId || !billNumber.trim()) return toast.error("Bill number required");
    if (lines.every((l) => !l.name.trim())) return toast.error("Add at least one line");
    setSaving(true);
    try {
      // Auto-create products for unmatched named lines
      const workingLines = [...lines];
      for (let i = 0; i < workingLines.length; i++) {
        const l = workingLines[i];
        if (!l.name.trim() || l.product_id) continue;
        const { data: prod, error: pErr } = await supabase.from("products").insert({
          company_id: companyId,
          name: l.name.trim(),
          hsn_code: l.hsn_code || null,
          unit: l.unit || "PCS",
          purchase_price: l.rate,
          sale_price: l.rate,
          gst_rate: l.gstRate,
          stock_quantity: 0,
        }).select("id").single();
        if (pErr) throw pErr;
        workingLines[i] = { ...l, product_id: prod.id };
      }

      const { data: bill, error } = await supabase
        .from("purchases")
        .insert({
          company_id: companyId,
          party_id: partyId,
          bill_number: billNumber.trim(),
          bill_date: billDate,
          is_interstate: isInterstate,
          subtotal: totals.subtotal,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          total: totals.total,
          status: "unpaid",
        })
        .select("id")
        .single();
      if (error) throw error;

      const items = workingLines.filter((l) => l.name.trim()).map((l, i) => {
        const c = totals.computed[i];
        return {
          purchase_id: bill!.id,
          product_id: l.product_id ?? null,
          name: l.name,
          hsn_code: l.hsn_code ?? null,
          quantity: l.quantity,
          unit: l.unit ?? null,
          rate: l.rate,
          gst_rate: l.gstRate,
          taxable_amount: c.taxable,
          cgst: c.cgst,
          sgst: c.sgst,
          igst: c.igst,
          total: c.total,
        };
      });
      const { error: iErr } = await supabase.from("purchase_items").insert(items);
      if (iErr) throw iErr;

      // increment stock
      for (const l of workingLines) {
        if (l.product_id) {
          const { data: prod } = await supabase.from("products").select("stock_quantity, is_service").eq("id", l.product_id).eq("company_id", companyId!).single();
          if (prod && !prod.is_service) {
            await supabase.from("products").update({ stock_quantity: Number(prod.stock_quantity) + l.quantity }).eq("id", l.product_id).eq("company_id", companyId!);
          }
        }
      }

      // Double-entry accounting: Purchase Dr + Input GST Dr / Supplier Cr
      try {
        await postPurchaseVoucher({ data: { purchaseId: bill!.id } });
      } catch (accErr: any) {
        toast.warning(`Bill save ho gaya, accounting entry pending: ${accErr?.message ?? "error"}`);
      }

      toast.success("Purchase saved!");
      navigate({ to: "/purchases" });

    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            New Purchase Bill
            {aiFilled && <Badge variant="secondary" className="gap-1 text-amber-700 bg-amber-100"><Sparkles className="h-3 w-3" /> AI Filled</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {aiFilled ? "AI ne fields bhar diye — verify karke Save dabaayein." : "Supplier bill enter karein, stock apne aap badhega."}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/purchases" })}>Cancel</Button>
      </div>


      <div className="card-surface p-5 grid gap-4 md:grid-cols-4">
        <div><Label>Bill #</Label><Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} /></div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          {dateOutsideFY && <p className="mt-1 text-xs text-destructive">Ye date {fyLabelText} ke bahar hai.</p>}
        </div>

        <div>
          <Label>Supplier</Label>
          <Select value={partyId ?? ""} onValueChange={(v) => setPartyId(v || null)}>
            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>
              {suppliers.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Supplier State</Label>
          <Select value={supplierStateCode} onValueChange={setSupplierStateCode}>
            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items — table on desktop, cards on mobile */}
      <div className="card-surface hidden p-4 lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Item</TableHead>
              <TableHead>HSN</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-28">Rate</TableHead>
              <TableHead className="w-24">GST%</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, i) => {
              const c = totals.computed[i];
              return (
                <TableRow key={l.key}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input placeholder="Item" value={l.name} onChange={(e) => upd(l.key, { name: e.target.value })} list={`p-${l.key}`} />
                      {l.ai && !l.product_id && <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />}
                    </div>
                    <datalist id={`p-${l.key}`}>{products.data?.map((p) => <option key={p.id} value={p.name} />)}</datalist>
                    {products.data?.some((p) => p.name === l.name) && !l.product_id && (
                      <button className="mt-1 text-xs text-primary hover:underline" onClick={() => { const p = products.data!.find((x) => x.name === l.name); if (p) pickProduct(l.key, p.id); }}>
                        Use inventory item
                      </button>
                    )}
                  </TableCell>
                  <TableCell><Input className="font-mono text-xs" value={l.hsn_code ?? ""} onChange={(e) => upd(l.key, { hsn_code: e.target.value })} /></TableCell>
                  <TableCell><Input type="number" value={l.quantity} onChange={(e) => upd(l.key, { quantity: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input type="number" value={l.rate} onChange={(e) => upd(l.key, { rate: Number(e.target.value) })} /></TableCell>
                  <TableCell>
                    <Select value={String(l.gstRate)} onValueChange={(v) => upd(l.key, { gstRate: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(c?.total ?? 0)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => setLines((p) => p.length === 1 ? p : p.filter((x) => x.key !== l.key))}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setLines([...lines, emptyLine()])}><Plus className="h-4 w-4" /> Add row</Button>
      </div>

      <div className="space-y-3 lg:hidden">
        {lines.map((l, i) => {
          const c = totals.computed[i];
          return (
            <div key={l.key} className="card-surface space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Item {i + 1}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLines((p) => (p.length === 1 ? p : p.filter((x) => x.key !== l.key)))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div>
                <Label className="text-xs">Item name</Label>
                <div className="flex items-center gap-1">
                  <Input placeholder="Item" value={l.name} onChange={(e) => upd(l.key, { name: e.target.value })} list={`pm-${l.key}`} />
                  {l.ai && !l.product_id && <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />}
                </div>
                <datalist id={`pm-${l.key}`}>{products.data?.map((p) => <option key={p.id} value={p.name} />)}</datalist>
                {products.data?.some((p) => p.name === l.name) && !l.product_id && (
                  <button className="mt-1 text-xs text-primary hover:underline" onClick={() => { const p = products.data!.find((x) => x.name === l.name); if (p) pickProduct(l.key, p.id); }}>
                    Use inventory item
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">HSN</Label><Input className="font-mono text-xs" value={l.hsn_code ?? ""} onChange={(e) => upd(l.key, { hsn_code: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">GST%</Label>
                  <Select value={String(l.gstRate)} onValueChange={(v) => upd(l.key, { gstRate: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Qty</Label><Input type="number" inputMode="decimal" value={l.quantity} onChange={(e) => upd(l.key, { quantity: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Rate</Label><Input type="number" inputMode="decimal" value={l.rate} onChange={(e) => upd(l.key, { rate: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatINR(c?.total ?? 0)}</span>
              </div>
            </div>
          );
        })}
        <Button variant="outline" className="w-full gap-2" onClick={() => setLines([...lines, emptyLine()])}><Plus className="h-4 w-4" /> Add item</Button>
      </div>

      <div className="card-surface space-y-2 p-4 text-sm lg:ml-auto lg:max-w-sm">
        <Row label="Subtotal" value={formatINR(totals.subtotal)} />
        {isInterstate ? (<Row label="IGST" value={formatINR(totals.igst)} />) : (<><Row label="CGST" value={formatINR(totals.cgst)} /><Row label="SGST" value={formatINR(totals.sgst)} /></>)}
        <div className="border-t border-border my-2" />
        <Row label="Total" value={formatINR(totals.total)} strong />
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button size="lg" className="h-12 w-full gap-2 text-base" onClick={save} disabled={saving}>
          <Save className="h-5 w-5" /> {saving ? "Saving…" : "Save Purchase Bill"}
        </Button>
      </div>


      <Dialog open={!!supplierConfirm} onOpenChange={(o) => !o && setSupplierConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" /> Naya Supplier confirm karein</DialogTitle>
            <DialogDescription>AI ne bill se ye details nikale hain. Confirm karein taaki supplier save ho jaye.</DialogDescription>
          </DialogHeader>
          {supplierConfirm && (
            <div className="grid gap-3">
              <div><Label>Name</Label><Input value={supplierConfirm.name} onChange={(e) => setSupplierConfirm({ ...supplierConfirm, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>GSTIN</Label><Input value={supplierConfirm.gstin} onChange={(e) => setSupplierConfirm({ ...supplierConfirm, gstin: e.target.value.toUpperCase() })} /></div>
                <div>
                  <Label>State</Label>
                  <Select value={supplierConfirm.state_code} onValueChange={(v) => setSupplierConfirm({ ...supplierConfirm, state_code: v })}>
                    <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Phone</Label><Input value={supplierConfirm.phone} onChange={(e) => setSupplierConfirm({ ...supplierConfirm, phone: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={supplierConfirm.address} onChange={(e) => setSupplierConfirm({ ...supplierConfirm, address: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierConfirm(null)}>Skip</Button>
            <Button onClick={confirmNewSupplier}>Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "font-display text-lg font-bold" : ""}`}><span className={strong ? "" : "text-muted-foreground"}>{label}</span><span>{value}</span></div>;
}
