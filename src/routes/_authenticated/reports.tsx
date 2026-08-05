import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Building2,
  Landmark,
  Sparkles,
  Coins,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronRight,
  RefreshCw,
  Scale,
  DollarSign,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports & Balance Sheet — GST Munshi" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab as string) || "balance-sheet",
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const currentTab = search.tab || "balance-sheet";

  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const companyName = company.data?.name || "ABC Pvt. Ltd.";

  const { fy, from: fyFrom, to: fyTo, label: fyLabelText } = useFinancialYear(companyId);
  const defFrom = fyFrom ?? "2000-04-01";
  const defTo = fyTo ?? new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(defFrom);
  const [to, setTo] = useState(defTo);

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

  // HSN map
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

  const handleTabChange = (val: string) => {
    navigate({ to: "/reports", search: { tab: val } });
  };

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      {/* Primary 5 Sub-Tabs Navigation */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="pnl" className="py-2.5 text-xs sm:text-sm font-semibold">
            Profit &amp; Loss
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="py-2.5 text-xs sm:text-sm font-semibold">
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="py-2.5 text-xs sm:text-sm font-semibold">
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="trial-balance" className="py-2.5 text-xs sm:text-sm font-semibold">
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="ledger" className="py-2.5 text-xs sm:text-sm font-semibold">
            Ledger
          </TabsTrigger>
        </TabsList>

        {/* Balance Sheet Dashboard */}
        <TabsContent value="balance-sheet" className="mt-6 space-y-6">
          <BalanceSheetDashboard companyName={companyName} />
        </TabsContent>

        {/* Profit & Loss */}
        <TabsContent value="pnl" className="mt-6 space-y-6">
          <div className="card-surface p-6 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="font-display text-xl font-bold">Profit &amp; Loss Statement</h2>
                <p className="text-xs text-muted-foreground">Period: {from} to {to}</p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">{fyLabelText}</Badge>
            </div>
            <div className="space-y-3 text-sm">
              <RowR label="Revenue from Operations (Sales Taxable)" value={formatINR(salesTaxable)} />
              <RowR label="Cost of Goods Sold (Purchases Taxable)" value={formatINR(purchTaxable)} sub />
              <div className="border-t border-border my-2" />
              <RowR label="Gross Profit" value={formatINR(grossProfit)} bold />
              <RowR label="Operating & Indirect Expenses" value={formatINR(expTotal)} sub />
              <div className="border-t border-border my-2" />
              <RowR
                label="Net Profit (Loss)"
                value={formatINR(netProfit)}
                bold
                tone={netProfit >= 0 ? "success" : "destructive"}
              />
            </div>
          </div>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cash-flow" className="mt-6 space-y-6">
          <div className="card-surface p-6 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="font-display text-xl font-bold">Cash Flow Statement</h2>
                <p className="text-xs text-muted-foreground">Summary of Cash Movements ({from} to {to})</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <RowR label="Cash Inflow from Sales Collections" value={formatINR(salesTotal)} />
              <RowR label="Cash Outflow for Purchases" value={formatINR(purchTotal)} sub />
              <RowR label="Cash Outflow for Expenses" value={formatINR(expTotal)} sub />
              <div className="border-t border-border my-2" />
              <RowR
                label="Net Operating Cash Flow"
                value={formatINR(salesTotal - purchTotal - expTotal)}
                bold
                tone={salesTotal - purchTotal - expTotal >= 0 ? "success" : "destructive"}
              />
            </div>
          </div>
        </TabsContent>

        {/* Trial Balance */}
        <TabsContent value="trial-balance" className="mt-6 space-y-6">
          <div className="card-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Trial Balance Summary</h2>
              <Button size="sm" onClick={() => navigate({ to: "/accounting/trial-balance" })}>
                Open Full Trial Balance <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Group</TableHead>
                  <TableHead className="text-right">Debit (₹)</TableHead>
                  <TableHead className="text-right">Credit (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">Sales Accounts</TableCell>
                  <TableCell className="text-right">0.00</TableCell>
                  <TableCell className="text-right">{formatINR(salesTotal)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Purchase Accounts</TableCell>
                  <TableCell className="text-right">{formatINR(purchTotal)}</TableCell>
                  <TableCell className="text-right">0.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Direct &amp; Indirect Expenses</TableCell>
                  <TableCell className="text-right">{formatINR(expTotal)}</TableCell>
                  <TableCell className="text-right">0.00</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted/40">
                  <TableCell>Total Balance</TableCell>
                  <TableCell className="text-right">{formatINR(purchTotal + expTotal)}</TableCell>
                  <TableCell className="text-right">{formatINR(salesTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Ledger */}
        <TabsContent value="ledger" className="mt-6 space-y-6">
          <div className="card-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Ledger Accounts</h2>
              <Button size="sm" onClick={() => navigate({ to: "/accounting/ledgers" })}>
                View All Party Ledgers <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Select any customer or supplier ledger to inspect line-by-line debit/credit transactions.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

{/* Complete Balance Sheet Dashboard Component */}
function BalanceSheetDashboard({ companyName }: { companyName: string }) {
  // Assets vs Liabilities Trend Data
  const trendData = [
    { year: "2022-23", assets: 8.2, liabilities: 4.5 },
    { year: "2023-24", assets: 9.8, liabilities: 5.1 },
    { year: "2024-25", assets: 11.2, liabilities: 6.2 },
    { year: "2025-26", assets: 12.45, liabilities: 4.82 },
  ];

  // Net Worth Growth Data
  const netWorthData = [
    { year: "2022-23", netWorth: 3.7 },
    { year: "2023-24", netWorth: 4.7 },
    { year: "2024-25", netWorth: 5.0 },
    { year: "2025-26", netWorth: 7.63 },
  ];

  // Asset Composition Donut Data
  const assetComp = [
    { name: "Fixed Assets", value: 42.2, color: "#3b82f6" },
    { name: "Current Assets", value: 32.1, color: "#10b981" },
    { name: "Investments", value: 19.4, color: "#f59e0b" },
    { name: "Other Assets", value: 6.3, color: "#8b5cf6" },
  ];

  // Liability Composition Donut Data
  const liabilityComp = [
    { name: "Equity", value: 61.3, color: "#2563eb" },
    { name: "Borrowings", value: 21.1, color: "#10b981" },
    { name: "Trade Payables", value: 14.8, color: "#f97316" },
    { name: "Other Liabilities", value: 2.8, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Balance Sheet
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Financial position and capital structure breakdown as of active period.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs">
            <span className="text-muted-foreground">Period:</span> 31 March 2026
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs">
            <span className="text-muted-foreground">Compare:</span> vs 31 Mar 2025
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 py-1 text-xs font-bold">
            {companyName}
          </Badge>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Assets */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">vs 31 Mar 2025</span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Assets</p>
            <h3 className="font-display text-2xl font-extrabold text-foreground mt-0.5">₹12.45 Cr</h3>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>↑ 14.26%</span>
          </div>
        </div>

        {/* Card 2: Total Liabilities */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <Landmark className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">vs 31 Mar 2025</span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Liabilities</p>
            <h3 className="font-display text-2xl font-extrabold text-foreground mt-0.5">₹4.82 Cr</h3>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>↑ 9.35%</span>
          </div>
        </div>

        {/* Card 3: Net Worth */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">vs 31 Mar 2025</span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Worth</p>
            <h3 className="font-display text-2xl font-extrabold text-foreground mt-0.5">₹7.63 Cr</h3>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>↑ 17.85%</span>
          </div>
        </div>

        {/* Card 4: Cash & Bank Balance */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Coins className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">vs 31 Mar 2025</span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cash &amp; Bank Balance</p>
            <h3 className="font-display text-2xl font-extrabold text-foreground mt-0.5">₹1.28 Cr</h3>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>↑ 22.41%</span>
          </div>
        </div>

        {/* Card 5: Working Capital */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">vs 31 Mar 2025</span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Working Capital</p>
            <h3 className="font-display text-2xl font-extrabold text-foreground mt-0.5">₹2.45 Cr</h3>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>↑ 16.22%</span>
          </div>
        </div>
      </div>

      {/* 4 Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chart 1: Assets vs Liabilities Trend */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <h4 className="font-display text-sm font-bold text-foreground">Assets vs Liabilities Trend</h4>
          <div className="h-44 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="year" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} Cr`} />
                <Tooltip formatter={(value: any) => [`₹${value} Cr`, ""]} />
                <Line type="monotone" dataKey="assets" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="Total Assets" />
                <Line type="monotone" dataKey="liabilities" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Total Liabilities" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs font-medium mt-2">
            <span className="flex items-center gap-1.5 text-blue-600"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Total Assets</span>
            <span className="flex items-center gap-1.5 text-emerald-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Total Liabilities</span>
          </div>
        </div>

        {/* Chart 2: Net Worth Growth */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-foreground">Net Worth Growth</h4>
            <span className="text-[10px] text-muted-foreground font-semibold">(in Cr)</span>
          </div>
          <div className="h-44 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthData}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} Cr`} />
                <Tooltip formatter={(value: any) => [`₹${value} Cr`, "Net Worth"]} />
                <Area type="monotone" dataKey="netWorth" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#netWorthGrad)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Asset Composition Donut */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <h4 className="font-display text-sm font-bold text-foreground">Asset Composition</h4>
          <div className="flex items-center gap-2 h-44 mt-1">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetComp} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                    {assetComp.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-1.5 text-[11px] font-medium">
              {assetComp.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-bold text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 4: Liability Composition Donut */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <h4 className="font-display text-sm font-bold text-foreground">Liability Composition</h4>
          <div className="flex items-center gap-2 h-44 mt-1">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={liabilityComp} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                    {liabilityComp.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-1.5 text-[11px] font-medium">
              {liabilityComp.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-bold text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Column Detailed Schedules & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: ASSETS Schedule */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <h3 className="font-display text-base font-bold text-blue-600 uppercase tracking-wider">
            ASSETS
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80">
                  <TableHead className="text-xs font-bold text-foreground">Particulars</TableHead>
                  <TableHead className="text-xs font-bold text-center w-12">Note</TableHead>
                  <TableHead className="text-xs font-bold text-right">31 Mar 2026</TableHead>
                  <TableHead className="text-xs font-bold text-right">31 Mar 2025</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {/* Non-Current Assets */}
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={4} className="font-bold text-foreground py-2">
                    Non-Current Assets
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Property, Plant &amp; Equipment</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">1</TableCell>
                  <TableCell className="text-right font-medium">5.25 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">4.65 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Intangible Assets</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">2</TableCell>
                  <TableCell className="text-right font-medium">0.85 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.72 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Investments</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">3</TableCell>
                  <TableCell className="text-right font-medium">2.42 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">2.10 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Long Term Loans &amp; Advances</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">4</TableCell>
                  <TableCell className="text-right font-medium">0.65 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.55 Cr</TableCell>
                </TableRow>
                <TableRow className="font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-950/20">
                  <TableCell>Total Non-Current Assets</TableCell>
                  <TableCell />
                  <TableCell className="text-right">9.17 Cr</TableCell>
                  <TableCell className="text-right">8.02 Cr</TableCell>
                </TableRow>

                {/* Current Assets */}
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={4} className="font-bold text-foreground py-2 mt-2">
                    Current Assets
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Inventories</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">5</TableCell>
                  <TableCell className="text-right font-medium">1.20 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">1.05 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Trade Receivables</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">6</TableCell>
                  <TableCell className="text-right font-medium">2.30 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">1.90 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Cash &amp; Bank Balances</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">7</TableCell>
                  <TableCell className="text-right font-medium">1.28 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">1.05 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Short Term Investments</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">8</TableCell>
                  <TableCell className="text-right font-medium">0.42 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.30 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Other Current Assets</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">9</TableCell>
                  <TableCell className="text-right font-medium">0.08 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.06 Cr</TableCell>
                </TableRow>
                <TableRow className="font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-950/20">
                  <TableCell>Total Current Assets</TableCell>
                  <TableCell />
                  <TableCell className="text-right">5.28 Cr</TableCell>
                  <TableCell className="text-right">4.36 Cr</TableCell>
                </TableRow>

                {/* Grand Total Assets */}
                <TableRow className="font-extrabold text-sm text-blue-700 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 border-t-2 border-blue-500">
                  <TableCell>TOTAL ASSETS</TableCell>
                  <TableCell />
                  <TableCell className="text-right">12.45 Cr</TableCell>
                  <TableCell className="text-right">12.38 Cr</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Column 2: EQUITY & LIABILITIES Schedule */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <h3 className="font-display text-base font-bold text-emerald-600 uppercase tracking-wider">
            EQUITY &amp; LIABILITIES
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80">
                  <TableHead className="text-xs font-bold text-foreground">Particulars</TableHead>
                  <TableHead className="text-xs font-bold text-center w-12">Note</TableHead>
                  <TableHead className="text-xs font-bold text-right">31 Mar 2026</TableHead>
                  <TableHead className="text-xs font-bold text-right">31 Mar 2025</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {/* Equity */}
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={4} className="font-bold text-foreground py-2">
                    Equity
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Share Capital</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">10</TableCell>
                  <TableCell className="text-right font-medium">1.00 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">1.00 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Reserves &amp; Surplus</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">11</TableCell>
                  <TableCell className="text-right font-medium">6.63 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">5.62 Cr</TableCell>
                </TableRow>
                <TableRow className="font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <TableCell>Total Equity</TableCell>
                  <TableCell />
                  <TableCell className="text-right">7.63 Cr</TableCell>
                  <TableCell className="text-right">6.62 Cr</TableCell>
                </TableRow>

                {/* Non-Current Liabilities */}
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={4} className="font-bold text-foreground py-2 mt-2">
                    Non-Current Liabilities
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Long Term Borrowings</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">12</TableCell>
                  <TableCell className="text-right font-medium">2.15 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">2.00 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Deferred Tax Liabilities</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">13</TableCell>
                  <TableCell className="text-right font-medium">0.38 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.32 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Long Term Provisions</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">14</TableCell>
                  <TableCell className="text-right font-medium">0.15 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.12 Cr</TableCell>
                </TableRow>
                <TableRow className="font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <TableCell>Total Non-Current Liabilities</TableCell>
                  <TableCell />
                  <TableCell className="text-right">2.68 Cr</TableCell>
                  <TableCell className="text-right">2.44 Cr</TableCell>
                </TableRow>

                {/* Current Liabilities */}
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={4} className="font-bold text-foreground py-2 mt-2">
                    Current Liabilities
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Short Term Borrowings</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">15</TableCell>
                  <TableCell className="text-right font-medium">0.92 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.85 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Trade Payables</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">16</TableCell>
                  <TableCell className="text-right font-medium">1.42 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">1.20 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Other Current Liabilities</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">17</TableCell>
                  <TableCell className="text-right font-medium">0.75 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.65 Cr</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Short Term Provisions</TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">18</TableCell>
                  <TableCell className="text-right font-medium">0.15 Cr</TableCell>
                  <TableCell className="text-right text-muted-foreground">0.12 Cr</TableCell>
                </TableRow>
                <TableRow className="font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <TableCell>Total Current Liabilities</TableCell>
                  <TableCell />
                  <TableCell className="text-right">3.24 Cr</TableCell>
                  <TableCell className="text-right">2.82 Cr</TableCell>
                </TableRow>

                {/* Grand Total Equity & Liabilities */}
                <TableRow className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 border-t-2 border-emerald-500">
                  <TableCell>TOTAL EQUITY &amp; LIABILITIES</TableCell>
                  <TableCell />
                  <TableCell className="text-right">12.45 Cr</TableCell>
                  <TableCell className="text-right">12.38 Cr</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Column 3: Key Ratios & AI Insights (Right Column) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Key Ratios Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <h4 className="font-display text-sm font-bold text-foreground">Key Ratios</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground font-medium">Current Ratio</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">2.31</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-1.5 py-0 text-[10px]">↑ Healthy</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground font-medium">Quick Ratio</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">1.78</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-1.5 py-0 text-[10px]">↑ Good</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground font-medium">Debt to Equity Ratio</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">0.38</span>
                  <Badge className="bg-blue-500/10 text-blue-600 border-none px-1.5 py-0 text-[10px]">↑ Low Risk</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground font-medium">Return on Equity (ROE)</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">18.75%</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-1.5 py-0 text-[10px]">↑ Excellent</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground font-medium">Inventory Turnover</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">6.24</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-1.5 py-0 text-[10px]">↑ Good</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pb-1">
                <span className="text-muted-foreground font-medium">Receivables Turnover</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">5.12</span>
                  <Badge className="bg-amber-500/10 text-amber-600 border-none px-1.5 py-0 text-[10px]">↕ Needs Focus</Badge>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="w-full text-xs font-semibold text-primary hover:bg-primary/5 gap-1">
              View All Ratios <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* AI Insights Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-primary font-display text-sm font-bold">
              <Sparkles className="h-4 w-4" /> AI Insights
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  Total Assets increased by <strong className="text-foreground">14.26%</strong> compared to last year.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  Trade Receivables have increased faster than revenue. Consider improving collection cycle.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  Cash &amp; Bank balance improved by <strong className="text-foreground">22.41%</strong>. Strong liquidity position.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  Debt to Equity ratio is <strong className="text-foreground">0.38</strong> which indicates low financial risk.
                </p>
              </div>
            </div>

            <Button variant="secondary" size="sm" className="w-full text-xs font-semibold gap-1">
              View Detailed Insights <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-4 gap-2">
        <div className="flex items-center gap-2">
          <span>🔒 All amounts in ₹ Indian Rupees</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Last updated: 12 May 2026, 10:30 AM</span>
          <RefreshCw className="h-3.5 w-3.5 hover:rotate-180 transition-transform cursor-pointer text-primary" />
        </div>
      </div>
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
      className={`flex justify-between ${bold ? "font-display text-base font-bold" : ""} ${tone === "success" ? "text-emerald-600" : tone === "destructive" ? "text-destructive" : ""}`}
    >
      <span className={sub ? "text-muted-foreground" : ""}>
        {sub ? "(−) " : ""}
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
