import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Receipt,
  Search,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CalendarDays,
  ArrowDownToLine,
  Eye,
} from "lucide-react";
import { useFinancialYear } from "@/lib/fy";
import { PaymentDialog, type PaymentPreset } from "@/components/payments/PaymentDialog";

export const Route = createFileRoute("/_authenticated/sales/")({
  head: () => ({
    meta: [
      { title: "Sales Invoices — GST Munshi" },
      { name: "description", content: "Apne saare GST sales invoices dekhein, search karein aur print karein." },
    ],
  }),
  component: SalesList,
});

type RangeKey = "all" | "this_month" | "last_month" | "this_fy" | "last_30";
type TabKey = "all" | "unpaid" | "paid";
type SortKey = "date" | "amount";

const RANGE_LABEL: Record<RangeKey, string> = {
  all: "All Time",
  this_month: "This Month",
  last_month: "Last Month",
  last_30: "Last 30 Days",
  this_fy: "This Financial Year",
};

function rangeBounds(key: RangeKey): { from?: string; to?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "this_month") {
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  }
  if (key === "last_month") {
    return {
      from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (key === "last_30") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { from: iso(d), to: iso(now) };
  }
  if (key === "this_fy") {
    const y = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: `${y}-04-01`, to: iso(now) };
  }
  return {};
}

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

function SalesList() {
  const navigate = useNavigate();
  const company = useCurrentCompany();
  const companyId = company.data?.id;

  const [search, setSearch] = useState("");
  const [range, setRange] = useState<RangeKey>("all");
  const [tab, setTab] = useState<TabKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [payPreset, setPayPreset] = useState<PaymentPreset | null>(null);

  const { from: fyFrom, to: fyTo, label: fyLabelText } = useFinancialYear(companyId);

  const invoices = useQuery({
    enabled: !!companyId,
    queryKey: ["invoices", companyId, fyFrom ?? "all", fyTo ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, due_date, subtotal, total, igst, cgst, sgst, is_interstate, amount_paid, status, party_id, parties(name)")
        .eq("company_id", companyId!);
      if (fyFrom) q = q.gte("invoice_date", fyFrom);
      if (fyTo) q = q.lte("invoice_date", fyTo);
      const { data, error } = await q.order("invoice_date", { ascending: false }).limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const inRange = useMemo(() => {
    const { from, to } = rangeBounds(range);
    return (invoices.data ?? []).filter((i: any) => {
      if (from && i.invoice_date < from) return false;
      if (to && i.invoice_date > to) return false;
      return true;
    });
  }, [invoices.data, range]);

  const stats = useMemo(() => {
    let total = 0,
      paid = 0,
      unpaid = 0;
    for (const i of inRange as any[]) {
      total += Number(i.total);
      paid += Number(i.amount_paid);
      unpaid += Math.max(0, Number(i.total) - Number(i.amount_paid));
    }
    return { total, paid, unpaid };
  }, [inRange]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = (inRange as any[]).filter((i) => {
      if (tab === "unpaid" && !["unpaid", "partial"].includes(i.status)) return false;
      if (tab === "paid" && i.status !== "paid") return false;
      if (!q) return true;
      return (
        String(i.invoice_number).toLowerCase().includes(q) ||
        String(i.parties?.name ?? "walk-in").toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      const cmp =
        sortKey === "amount"
          ? Number(a.total) - Number(b.total)
          : a.invoice_date.localeCompare(b.invoice_date);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [inRange, search, tab, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const SortIcon = ({ active }: { active: boolean }) =>
    !active ? (
      <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 inline ml-1" />
    ) : sortAsc ? (
      <ChevronUp className="h-3.5 w-3.5 inline ml-1" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 inline ml-1" />
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold">Sales Register</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Apne saare sales vouchers aur GST breakdown dekhein.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => setPayPreset({ direction: "received" })}
          >
            <ArrowDownToLine className="h-4 w-4" />
            <span className="hidden sm:inline">Receive Payment</span>
          </Button>
          <Link to="/sales/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Create Sales Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 text-xs sm:text-sm"
              placeholder="Search Vch/Bill No or Account Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-full sm:w-56 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {k === "all" ? `Whole ${fyLabelText}` : RANGE_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Reports <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate({ to: "/reports" })}>Sales Summary</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/reports" })}>GST Report (GSTR-1)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/parties" })}>Party-wise Sales</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary tabs */}
      <div className="card-surface overflow-hidden rounded-xl border border-border shadow-xs">
        <div className="flex overflow-x-auto border-b border-border bg-card">
          <SummaryTab
            label="Total Sales"
            value={formatNumRequired(stats.total)}
            active={tab === "all"}
            onClick={() => setTab("all")}
          />
          <SummaryTab
            label="Unpaid"
            value={formatNumRequired(stats.unpaid)}
            active={tab === "unpaid"}
            onClick={() => setTab("unpaid")}
          />
          <SummaryTab
            label="Paid"
            value={formatNumRequired(stats.paid)}
            active={tab === "paid"}
            onClick={() => setTab("paid")}
          />
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {invoices.data?.length ? "Is filter mein koi invoice nahi." : "Abhi tak koi sales invoice nahi."}
            </p>
            <Link to="/sales/new" className="mt-3 inline-block">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Create Sales Invoice
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-xs font-sans border-collapse">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/60 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  <TableHead className="w-12 text-center py-3">#</TableHead>
                  <TableHead className="py-3">
                    <button className="flex items-center hover:text-foreground" onClick={() => toggleSort("date")}>
                      DATE <SortIcon active={sortKey === "date"} />
                    </button>
                  </TableHead>
                  <TableHead className="py-3">VCH/BILL NO</TableHead>
                  <TableHead className="py-3">ACCOUNT</TableHead>
                  <TableHead className="py-3">TYPE</TableHead>
                  <TableHead className="text-right py-3">
                    <button className="ml-auto flex items-center hover:text-foreground" onClick={() => toggleSort("amount")}>
                      TOTAL AMOUNT <SortIcon active={sortKey === "amount"} />
                    </button>
                  </TableHead>
                  <TableHead className="text-right py-3">SALE AMOUNT</TableHead>
                  <TableHead className="text-right py-3">TAXABLE AMT</TableHead>
                  <TableHead className="text-right py-3">IGST</TableHead>
                  <TableHead className="text-right py-3">CGST</TableHead>
                  <TableHead className="text-right py-3">SGST</TableHead>
                  <TableHead className="text-center py-3">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i: any, idx: number) => {
                  const totalTax = Number(i.igst ?? 0) + Number(i.cgst ?? 0) + Number(i.sgst ?? 0);
                  const taxableAmt = Number(i.subtotal ?? (i.total - totalTax) ?? 0);
                  const saleAmt = taxableAmt;
                  const gstType = computeGstType(i);
                  const isAlternateRow = idx % 2 === 0;

                  return (
                    <TableRow
                      key={i.id}
                      className={`cursor-pointer transition-colors border-b border-border/40 ${
                        isAlternateRow
                          ? "bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-200/70 dark:hover:bg-slate-800/70"
                          : "bg-card hover:bg-muted/50"
                      }`}
                      onClick={() => navigate({ to: "/sales/$invoiceId", params: { invoiceId: i.id } })}
                    >
                      {/* # Sr No */}
                      <TableCell className="text-center font-medium text-muted-foreground py-3">
                        {idx + 1}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="whitespace-nowrap font-medium text-foreground py-3">
                        {formatGstDate(i.invoice_date)}
                      </TableCell>

                      {/* Vch/Bill No */}
                      <TableCell className="font-mono text-xs font-semibold text-foreground whitespace-nowrap py-3">
                        {i.invoice_number}
                      </TableCell>

                      {/* Account */}
                      <TableCell className="font-semibold text-foreground uppercase tracking-tight py-3 min-w-[160px]">
                        {i.parties?.name ?? "WALK-IN CUSTOMER"}
                      </TableCell>

                      {/* Type */}
                      <TableCell className="whitespace-nowrap font-semibold text-xs text-muted-foreground py-3">
                        {gstType}
                      </TableCell>

                      {/* Total Amount */}
                      <TableCell className="whitespace-nowrap text-right font-bold text-foreground py-3">
                        {formatNumRequired(i.total)}
                      </TableCell>

                      {/* Sale Amount */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-foreground py-3">
                        {formatNumRequired(saleAmt)}
                      </TableCell>

                      {/* Taxable Amount */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-foreground py-3">
                        {formatNumRequired(taxableAmt)}
                      </TableCell>

                      {/* IGST */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-muted-foreground py-3">
                        {formatNum(i.igst)}
                      </TableCell>

                      {/* CGST */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-muted-foreground py-3">
                        {formatNum(i.cgst)}
                      </TableCell>

                      {/* SGST */}
                      <TableCell className="whitespace-nowrap text-right font-medium text-muted-foreground py-3">
                        {formatNum(i.sgst)}
                      </TableCell>

                      {/* Action / View */}
                      <TableCell className="text-center py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="View Invoice"
                            onClick={() => navigate({ to: "/sales/$invoiceId", params: { invoiceId: i.id } })}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {["unpaid", "partial"].includes(i.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2 gap-1"
                              onClick={() => {
                                setPayPreset({
                                  direction: "received",
                                  partyId: i.party_id ?? null,
                                  docId: i.party_id ? i.id : null,
                                  amount: Math.max(0, Number(i.total) - Number(i.amount_paid)),
                                });
                              }}
                            >
                              <ArrowDownToLine className="h-3 w-3" /> Receive
                            </Button>
                          )}
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

      <PaymentDialog preset={payPreset} companyId={companyId} onClose={() => setPayPreset(null)} />
    </div>
  );
}

function SummaryTab({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[140px] p-4 text-left border-r border-border transition-colors ${
        active ? "bg-primary/5 font-bold border-b-2 border-b-primary" : "hover:bg-muted/40"
      }`}
    >
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 font-display text-lg font-bold text-foreground">₹ {value}</div>
    </button>
  );
}
