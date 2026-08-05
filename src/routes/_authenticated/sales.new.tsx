import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany, nextInvoiceNumber } from "@/lib/company";
import { fyDefaultDate, isInFY, useFinancialYear } from "@/lib/fy";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Save, FileText, Truck } from "lucide-react";
import { computeLine, formatINR, round2, GST_RATES, INDIAN_STATES } from "@/lib/gst";
import { postInvoiceVoucher } from "@/lib/accounting.functions";
import { safeRandomUUID } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sales/new")({
  head: () => ({ meta: [{ title: "New Invoice — GST Munshi" }] }),
  component: NewInvoice,
});

interface Line {
  key: string;
  product_id?: string | null;
  name: string;
  hsn_code?: string;
  unit?: string;
  quantity: number;
  rate: number;
  discountPct: number;
  gstRate: number;
}

type DocType = "tax_invoice" | "bill_of_supply";

function emptyLine(): Line {
  return { key: safeRandomUUID(), name: "", quantity: 1, rate: 0, discountPct: 0, gstRate: 18 };
}

function nowTimeLabel() {
  return new Date()
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toUpperCase();
}

function NewInvoice() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { fy, label: fyLabelText } = useFinancialYear(companyId);

  const [docType, setDocType] = useState<DocType>("tax_invoice");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => fyDefaultDate(fy));
  const dateOutsideFY = !isInFY(invoiceDate, fy);

  const [dueDate, setDueDate] = useState("");
  const [partyId, setPartyId] = useState<string | null>(null);
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState("");
  const [notes, setNotes] = useState("");
  const [amountPaid, setAmountPaid] = useState("0");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  // Transport / document details
  const [grRrNo, setGrRrNo] = useState("");
  const [transportName, setTransportName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [station, setStation] = useState("");
  const [reverseCharge, setReverseCharge] = useState(false);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [shippingAddress, setShippingAddress] = useState("");

  useEffect(() => {
    if (company.data) {
      setInvoiceNumber(nextInvoiceNumber(company.data.invoice_prefix, company.data.next_invoice_number));
      if (!placeOfSupplyCode && company.data.state_code) {
        setPlaceOfSupplyCode(company.data.state_code);
      }
      if (company.data.default_transport) setTransportName((t) => t || company.data!.default_transport!);
    }
  }, [company.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const parties = useQuery({
    enabled: !!companyId,
    queryKey: ["parties-customers", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parties")
        .select("id, name, state_code, gstin, billing_address, shipping_address")
        .eq("company_id", companyId!)
        .in("type", ["customer", "both"])
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
        .select("id, name, hsn_code, unit, sale_price, purchase_price, gst_rate")
        .eq("company_id", companyId!)
        .order("name");
      return data ?? [];
    },
  });

  const selectedParty = parties.data?.find((x) => x.id === partyId) ?? null;

  // When party changes, sync POS + shipping address
  useEffect(() => {
    if (!selectedParty) return;
    if (selectedParty.state_code) setPlaceOfSupplyCode(selectedParty.state_code);
    if (sameAsBilling) setShippingAddress(selectedParty.billing_address ?? "");
  }, [selectedParty, sameAsBilling]);

  const companyStateCode = company.data?.state_code ?? "";
  const isInterstate = !!placeOfSupplyCode && !!companyStateCode && placeOfSupplyCode !== companyStateCode;
  const isBOS = docType === "bill_of_supply";

  const totals = useMemo(() => {
    let subtotal = 0, cgst = 0, sgst = 0, igst = 0, total = 0;
    const computed = lines.map((l) => {
      const c = computeLine({ ...l, gstRate: isBOS ? 0 : l.gstRate }, isInterstate);
      subtotal += c.taxable;
      cgst += c.cgst;
      sgst += c.sgst;
      igst += c.igst;
      total += c.total;
      return c;
    });
    return {
      subtotal: round2(subtotal),
      cgst: round2(cgst),
      sgst: round2(sgst),
      igst: round2(igst),
      total: round2(total),
      computed,
    };
  }, [lines, isInterstate, isBOS]);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));
  }
  function pickProduct(key: string, productId: string) {
    const p = products.data?.find((x) => x.id === productId);
    if (!p) return;
    updateLine(key, {
      product_id: p.id,
      name: p.name,
      hsn_code: p.hsn_code ?? "",
      unit: p.unit ?? "PCS",
      rate: Number(p.sale_price),
      gstRate: Number(p.gst_rate),
    });
  }

  async function save() {
    if (!companyId) return;
    if (!invoiceNumber.trim()) return toast.error("Invoice number required");
    if (lines.every((l) => !l.name.trim())) return toast.error("Add at least one line item");
    setSaving(true);
    try {
      const { data: inv, error } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          party_id: partyId,
          invoice_type: docType,
          invoice_number: invoiceNumber.trim(),
          invoice_date: invoiceDate,
          invoice_time: nowTimeLabel(),
          due_date: dueDate || null,
          place_of_supply: placeOfSupplyCode,
          is_interstate: isInterstate,
          reverse_charge: reverseCharge,
          gr_rr_no: grRrNo || null,
          transport_name: transportName || null,
          vehicle_no: vehicleNo || null,
          station: station || null,
          shipping_address: (sameAsBilling ? selectedParty?.billing_address : shippingAddress) || null,
          subtotal: totals.subtotal,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          total: totals.total,
          amount_paid: Number(amountPaid) || 0,
          status:
            Number(amountPaid) >= totals.total
              ? "paid"
              : Number(amountPaid) > 0
              ? "partial"
              : "unpaid",
          notes: notes || null,
          terms: company.data?.default_terms || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const itemsPayload = lines
        .filter((l) => l.name.trim())
        .map((l, i) => {
          const c = totals.computed[i];
          const prod = l.product_id ? products.data?.find((p) => p.id === l.product_id) : null;
          return {
            invoice_id: inv!.id,
            product_id: l.product_id ?? null,
            name: l.name,
            hsn_code: l.hsn_code ?? null,
            quantity: l.quantity,
            unit: l.unit ?? null,
            rate: l.rate,
            discount_pct: l.discountPct,
            gst_rate: isBOS ? 0 : l.gstRate,
            taxable_amount: c.taxable,
            cgst: c.cgst,
            sgst: c.sgst,
            igst: c.igst,
            total: c.total,
            cost_price: prod?.purchase_price ?? null,
          };
        });
      const { error: itemsErr } = await supabase.from("invoice_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      // Update stock + invoice number counter
      for (const l of lines) {
        if (l.product_id && l.quantity > 0) {
          const { data: prod } = await supabase
            .from("products")
            .select("stock_quantity, is_service")
            .eq("id", l.product_id!)
            .eq("company_id", companyId!)
            .single();
          if (prod && !prod.is_service) {
            await supabase
              .from("products")
              .update({ stock_quantity: Number(prod.stock_quantity) - l.quantity })
              .eq("id", l.product_id!)
              .eq("company_id", companyId!);
          }
        }
      }

      await supabase
        .from("companies")
        .update({ next_invoice_number: (company.data?.next_invoice_number ?? 1) + 1 })
        .eq("id", companyId);

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["invoices"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        qc.invalidateQueries({ queryKey: ["my-companies"] }),
        qc.invalidateQueries({ queryKey: ["voucher-lines"] }),
        qc.invalidateQueries({ queryKey: ["day-book"] }),
      ]);

      // Double-entry accounting: Party Dr / Sales Cr + Output GST Cr
      try {
        await postInvoiceVoucher({ data: { invoiceId: inv!.id } });
      } catch (accErr: any) {
        toast.warning(`Invoice save ho gaya, accounting entry pending: ${accErr?.message ?? "error"}`);
      }

      toast.success(isBOS ? "Bill of Supply saved!" : "Invoice saved!");
      navigate({ to: "/sales/$invoiceId", params: { invoiceId: inv!.id } });

    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-4 pb-28">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
            {isBOS ? "New Bill of Supply" : "New Tax Invoice"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isBOS
              ? "GST charge nahi hoga (composition / exempt supply)."
              : isInterstate
              ? "IGST (interstate) auto-calculated."
              : "CGST + SGST (intrastate) auto-calculated."}
          </p>
        </div>
        <Button variant="outline" className="shrink-0" onClick={() => navigate({ to: "/sales" })}>
          Cancel
        </Button>
      </div>

      {/* Document type */}
      <div className="card-surface p-4">
        <Label className="mb-2 flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" /> Document type
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <DocOption
            active={docType === "tax_invoice"}
            title="1. Regular — Tax Invoice"
            desc="GST (CGST/SGST ya IGST) lagega, buyer ITC claim kar sakta hai."
            onClick={() => setDocType("tax_invoice")}
          />
          <DocOption
            active={docType === "bill_of_supply"}
            title="2. Bill of Supply"
            desc="Composition scheme / exempt goods — koi tax nahi, ITC nahi."
            onClick={() => setDocType("bill_of_supply")}
          />
        </div>
      </div>

      {/* Header */}
      <div className="card-surface grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>{isBOS ? "Bill of Supply #" : "Invoice #"}</Label>
          <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          {dateOutsideFY && (
            <p className="mt-1 text-xs text-destructive">Ye date {fyLabelText} ke bahar hai.</p>
          )}
        </div>

        <div>
          <Label>Due date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <Label>Party</Label>
          <Select value={partyId ?? ""} onValueChange={(v) => setPartyId(v || null)}>
            <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
            <SelectContent>
              {parties.data?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Place of Supply</Label>
          <Select value={placeOfSupplyCode} onValueChange={setPlaceOfSupplyCode}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <Checkbox
            id="rcm"
            checked={reverseCharge}
            onCheckedChange={(v) => setReverseCharge(v === true)}
          />
          <Label htmlFor="rcm" className="cursor-pointer">Reverse Charge applicable</Label>
        </div>
      </div>

      {/* Transport details */}
      <div className="card-surface p-4">
        <Label className="mb-3 flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4" /> Transport details
        </Label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label className="text-xs">GR / RR No.</Label><Input value={grRrNo} onChange={(e) => setGrRrNo(e.target.value)} /></div>
          <div><Label className="text-xs">Transport</Label><Input placeholder="SELF" value={transportName} onChange={(e) => setTransportName(e.target.value)} /></div>
          <div><Label className="text-xs">Vehicle No.</Label><Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} /></div>
          <div><Label className="text-xs">Station</Label><Input value={station} onChange={(e) => setStation(e.target.value)} /></div>
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="mb-2 flex items-center gap-2">
              <Checkbox
                id="ship-same"
                checked={sameAsBilling}
                onCheckedChange={(v) => {
                  const on = v === true;
                  setSameAsBilling(on);
                  if (on) setShippingAddress(selectedParty?.billing_address ?? "");
                }}
              />
              <Label htmlFor="ship-same" className="cursor-pointer text-xs">Shipping address same as billing</Label>
            </div>
            {!sameAsBilling && (
              <Textarea
                rows={2}
                placeholder="Shipped to address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Items — desktop table */}
      <div className="card-surface hidden p-4 lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-2 font-medium">Item</th>
              <th className="p-2 font-medium">HSN</th>
              <th className="w-24 p-2 font-medium">Qty</th>
              <th className="w-28 p-2 font-medium">Rate</th>
              <th className="w-20 p-2 font-medium">Disc%</th>
              {!isBOS && <th className="w-24 p-2 font-medium">GST%</th>}
              <th className="p-2 text-right font-medium">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const c = totals.computed[idx];
              return (
                <tr key={l.key} className="border-b border-border/60">
                  <td className="p-2 align-top">
                    <ItemNameInput
                      line={l}
                      products={products.data}
                      onChange={(v) => updateLine(l.key, { name: v })}
                      onPick={(id) => pickProduct(l.key, id)}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <Input className="font-mono text-xs" value={l.hsn_code ?? ""} onChange={(e) => updateLine(l.key, { hsn_code: e.target.value })} />
                  </td>
                  <td className="p-2 align-top">
                    <Input type="number" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: Number(e.target.value) })} />
                  </td>
                  <td className="p-2 align-top">
                    <Input type="number" value={l.rate} onChange={(e) => updateLine(l.key, { rate: Number(e.target.value) })} />
                  </td>
                  <td className="p-2 align-top">
                    <Input type="number" value={l.discountPct} onChange={(e) => updateLine(l.key, { discountPct: Number(e.target.value) })} />
                  </td>
                  {!isBOS && (
                    <td className="p-2 align-top">
                      <Select value={String(l.gstRate)} onValueChange={(v) => updateLine(l.key, { gstRate: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  <td className="p-2 text-right align-middle font-semibold">{formatINR(c?.total ?? 0)}</td>
                  <td className="p-2 align-middle">
                    <Button variant="ghost" size="icon" onClick={() => removeLine(l.key)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setLines([...lines, emptyLine()])}>
          <Plus className="h-4 w-4" /> Add row
        </Button>
      </div>

      {/* Items — mobile cards */}
      <div className="space-y-3 lg:hidden">
        {lines.map((l, idx) => {
          const c = totals.computed[idx];
          return (
            <div key={l.key} className="card-surface space-y-3 p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</span>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeLine(l.key)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <ItemNameInput
                line={l}
                products={products.data}
                onChange={(v) => updateLine(l.key, { name: v })}
                onPick={(id) => pickProduct(l.key, id)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">HSN</Label>
                  <Input className="font-mono text-xs" value={l.hsn_code ?? ""} onChange={(e) => updateLine(l.key, { hsn_code: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Input value={l.unit ?? ""} placeholder="PCS" onChange={(e) => updateLine(l.key, { unit: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Rate</Label>
                  <Input type="number" value={l.rate} onChange={(e) => updateLine(l.key, { rate: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Disc%</Label>
                  <Input type="number" value={l.discountPct} onChange={(e) => updateLine(l.key, { discountPct: Number(e.target.value) })} />
                </div>
                {!isBOS && (
                  <div>
                    <Label className="text-xs">GST%</Label>
                    <Select value={String(l.gstRate)} onValueChange={(v) => updateLine(l.key, { gstRate: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatINR(c?.total ?? 0)}</span>
              </div>
            </div>
          );
        })}
        <Button variant="outline" className="w-full gap-2" onClick={() => setLines([...lines, emptyLine()])}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      {/* Totals + notes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-4 lg:col-span-2">
          <Label>Notes / Terms</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thank you for your business!" />
        </div>
        <div className="card-surface space-y-2 p-4 text-sm">
          <Row label="Taxable Value" value={formatINR(totals.subtotal)} />
          {!isBOS &&
            (isInterstate ? (
              <Row label="IGST" value={formatINR(totals.igst)} />
            ) : (
              <>
                <Row label="CGST" value={formatINR(totals.cgst)} />
                <Row label="SGST" value={formatINR(totals.sgst)} />
              </>
            ))}
          <div className="my-2 border-t border-border" />
          <Row label="Total" value={formatINR(totals.total)} strong />
          <div className="pt-2">
            <Label className="text-xs">Amount Received</Label>
            <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
          </div>
          <Row
            label="Balance Due"
            value={formatINR(Math.max(0, totals.total - Number(amountPaid || 0)))}
          />
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <div className="hidden min-w-0 flex-1 sm:block">
            <div className="text-xs text-muted-foreground">{isBOS ? "Bill of Supply" : "Tax Invoice"} total</div>
            <div className="font-display text-lg font-bold">{formatINR(totals.total)}</div>
          </div>
          <Button size="lg" className="h-14 flex-1 gap-2 text-base sm:flex-none sm:px-12" onClick={save} disabled={saving}>
            <Save className="h-5 w-5" /> {saving ? "Saving…" : isBOS ? "Save Bill of Supply" : "Save Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DocOption({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${
        active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}

function ItemNameInput({
  line,
  products,
  onChange,
  onPick,
}: {
  line: Line;
  products: { id: string; name: string }[] | undefined;
  onChange: (v: string) => void;
  onPick: (id: string) => void;
}) {
  const match = products?.find((p) => p.name === line.name);
  return (
    <>
      <Input
        placeholder="Item name"
        value={line.name}
        onChange={(e) => onChange(e.target.value)}
        list={`prodlist-${line.key}`}
      />
      <datalist id={`prodlist-${line.key}`}>
        {products?.map((p) => <option key={p.id} value={p.name} />)}
      </datalist>
      {match && line.product_id == null && (
        <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => onPick(match.id)}>
          Use item from inventory
        </button>
      )}
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-display text-lg font-bold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
