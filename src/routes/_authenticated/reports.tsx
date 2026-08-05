import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { formatINR } from "@/lib/gst";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinancialYear } from "@/lib/fy";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — GST Munshi" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { fy, from: fyFrom, to: fyTo, label: fyLabelText } = useFinancialYear(companyId);
  const defFrom = fyFrom ?? "2000-04-01";
  const defTo = fyTo ?? new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(defFrom);
  const [to, setTo] = useState(defTo);

  // Reset the report range whenever the financial year changes
  useEffect(() => {
    setFrom(defFrom);
    setTo(defTo);
  }, [defFrom, defTo]);

  const invoices = useQuery({
    enabled: !!companyId,
    queryKey: ["reports-invoices", companyId, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, invoice_items(*), parties(name, gstin)")
        .eq("company_id", companyId!)
        .gte("invoice_date", from)
        .lte("invoice_date", to)
        .order("invoice_date");
      return data ?? [];
    },
  });

  const purchases = useQuery({
    enabled: !!companyId,
    queryKey: ["reports-purchases", companyId, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("*")
        .eq("company_id", companyId!)
        .gte("bill_date", from)
        .lte("bill_date", to);
      return data ?? [];
    },
  });

  const expenses = useQuery({
    enabled: !!companyId,
    queryKey: ["reports-expenses", companyId, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .eq("company_id", companyId!)
        .gte("expense_date", from)
        .lte("expense_date", to);
      return data ?? [];
    },
  });

  const sum = (arr: any[] | undefined, k: string) => (arr ?? []).reduce((s, r) => s + Number(r[k] ?? 0), 0);

  const salesTotal = sum(invoices.data, "total");
  const salesTaxable = sum(invoices.data, "subtotal");
  const salesCgst = sum(invoices.data, "cgst");
  const salesSgst = sum(invoices.data, "sgst");
  const salesIgst = sum(invoices.data, "igst");
  const outputGst = salesCgst + salesSgst + salesIgst;

  const purchTotal = sum(purchases.data, "total");
  const purchTaxable = sum(purchases.data, "subtotal");
  const purchCgst = sum(purchases.data, "cgst");
  const purchSgst = sum(purchases.data, "sgst");
  const purchIgst = sum(purchases.data, "igst");
  const inputGst = purchCgst + purchSgst + purchIgst;

  const expTotal = sum(expenses.data, "amount");
  const netGst = outputGst - inputGst;
  const grossProfit = salesTaxable - purchTaxable;
  const netProfit = grossProfit - expTotal;

  // HSN summary
  const hsnMap = new Map<
    string,
    { hsn: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }
  >();
  invoices.data?.forEach((inv: any) => {
    inv.invoice_items?.forEach((it: any) => {
      const hsn = it.hsn_code ?? "—";
      const row = hsnMap.get(hsn) ?? { hsn, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
      row.qty += Number(it.quantity);
      row.taxable += Number(it.taxable_amount);
      row.cgst += Number(it.cgst ?? 0);
      row.sgst += Number(it.sgst ?? 0);
      row.igst += Number(it.igst ?? 0);
      row.total += Number(it.total);
      hsnMap.set(hsn, row);
    });
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          View all financial, tax, and business reports in one place. Active period:{" "}
          <span className="font-medium text-foreground">{fyLabelText}</span>
        </p>
      </div>

      <div className="card-surface p-4 flex flex-wrap items-end gap-3">
        <div>
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {fy !== "all" && (
          <button
            className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            onClick={() => {
              setFrom(defFrom);
              setTo(defTo);
            }}
          >
            Full {fyLabelText}
          </button>
        )}
      </div>

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="gst">GST Summary</TabsTrigger>
          <TabsTrigger value="hsn">HSN Summary</TabsTrigger>
          <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <div className="card-surface p-6 max-w-lg space-y-2 text-sm mt-2">
            <RowR label="Sales (taxable)" value={formatINR(salesTaxable)} />
            <RowR label="Purchases (taxable)" value={formatINR(purchTaxable)} sub />
            <div className="border-t border-border my-2" />
            <RowR label="Gross Profit" value={formatINR(grossProfit)} bold />
            <RowR label="Expenses" value={formatINR(expTotal)} sub />
            <div className="border-t border-border my-2" />
            <RowR
              label="Net Profit"
              value={formatINR(netProfit)}
              bold
              tone={netProfit >= 0 ? "success" : "destructive"}
            />
          </div>
        </TabsContent>

        <TabsContent value="gst">
          <div className="grid gap-3 md:grid-cols-2 mt-2">
            <div className="card-surface p-5">
              <h3 className="font-display font-semibold mb-3">Output GST (Sales)</h3>
              <RowR label="CGST" value={formatINR(salesCgst)} />
              <RowR label="SGST" value={formatINR(salesSgst)} />
              <RowR label="IGST" value={formatINR(salesIgst)} />
              <div className="border-t border-border my-2" />
              <RowR label="Total Output GST" value={formatINR(outputGst)} bold />
            </div>
            <div className="card-surface p-5">
              <h3 className="font-display font-semibold mb-3">Input GST (Purchase / ITC)</h3>
              <RowR label="CGST" value={formatINR(purchCgst)} />
              <RowR label="SGST" value={formatINR(purchSgst)} />
              <RowR label="IGST" value={formatINR(purchIgst)} />
              <div className="border-t border-border my-2" />
              <RowR label="Total ITC" value={formatINR(inputGst)} bold />
            </div>
            <div className="card-surface p-5 md:col-span-2 bg-primary text-primary-foreground">
              <div className="flex items-center justify-between">
                <div className="font-display text-lg font-bold">Net GST Payable</div>
                <div className="font-display text-2xl font-bold">{formatINR(netGst)}</div>
              </div>
              <p className="text-xs opacity-80 mt-1">
                = Output GST − Input Tax Credit (period: {from} to {to})
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hsn">
          <div className="card-surface p-4 mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HSN</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...hsnMap.values()].map((r) => (
                  <TableRow key={r.hsn}>
                    <TableCell className="font-mono text-xs">{r.hsn}</TableCell>
                    <TableCell className="text-right">{r.qty}</TableCell>
                    <TableCell className="text-right">{formatINR(r.taxable)}</TableCell>
                    <TableCell className="text-right">{formatINR(r.cgst)}</TableCell>
                    <TableCell className="text-right">{formatINR(r.sgst)}</TableCell>
                    <TableCell className="text-right">{formatINR(r.igst)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatINR(r.total)}</TableCell>
                  </TableRow>
                ))}
                {hsnMap.size === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="gstr1">
          <div className="card-surface p-4 mt-2">
            <div className="mb-3 text-sm text-muted-foreground">B2B & B2C outward supplies</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">Total Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.data?.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                    <TableCell>{i.parties?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{i.parties?.gstin ?? "—"}</TableCell>
                    <TableCell>{i.parties?.gstin ? "B2B" : "B2C"}</TableCell>
                    <TableCell className="text-right">{formatINR(i.subtotal)}</TableCell>
                    <TableCell className="text-right">
                      {formatINR(Number(i.cgst) + Number(i.sgst) + Number(i.igst))}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatINR(i.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RowR({
  label,
  value,
  bold,
  sub,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  sub?: boolean;
  tone?: "success" | "destructive";
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-display text-base font-bold" : ""} ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}
    >
      <span className={sub ? "text-muted-foreground" : ""}>
        {sub ? "(−) " : ""}
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
