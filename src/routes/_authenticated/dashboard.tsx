import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Receipt,
  ShoppingBag,
  Wallet,
  IndianRupee,
  Boxes,
  Plus,
  Landmark,
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  CreditCard,
  Users,
  Truck,
  Percent,
  PackageX,
  AlertTriangle,
  Hourglass,
  FileClock,
  Trophy,
  UserPlus,
  FileText,
  BookOpen,
  Sparkles,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentCompany } from "@/lib/company";
import { formatINR } from "@/lib/gst";
import { ALL_YEARS, currentFYStartYear, useFinancialYear } from "@/lib/fy";
import { useDashboardData, type AgeingBuckets } from "@/lib/dashboard";
import { KpiCardLinked, toneVar } from "@/components/dashboard/KpiCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { MiniBars } from "@/components/dashboard/Sparkline";
import { AreaChart, Donut } from "@/components/dashboard/Charts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Business Dashboard — GST Munshi" },
      {
        name: "description",
        content:
          "Sales, purchase, gross profit, cash & bank, receivables ageing aur stock — sab ek smart GST dashboard par.",
      },
      { property: "og:title", content: "Business Dashboard — GST Munshi" },
      {
        property: "og:description",
        content: "Live GST accounting KPIs: sales, profit, cash flow, receivables ageing aur stock health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const inrCompact = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: Math.abs(n) >= 1_00_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(n) >= 1_00_000 ? 2 : 0,
  }).format(n || 0);

function SectionHead({ title, hint, dot }: { title: string; hint?: string; dot: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
      <h2 className="font-display text-base font-bold">{title}</h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function Panel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel-card p-4 sm:p-5 ${className ?? ""}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold">{title}</h3>
          {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AgeingStrip({ ageing, tone }: { ageing: AgeingBuckets; tone: string }) {
  const rows: [string, number][] = [
    ["Current", ageing.current],
    ["1-30d", ageing.d30],
    ["31-60d", ageing.d60],
    ["61-90d", ageing.d90],
    ["90d+", ageing.over90],
  ];
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <div className="space-y-1">
      {rows.map(([label, v]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] text-muted-foreground">{label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: tone }} />
          </span>
          <span className="kpi-num w-20 shrink-0 text-right text-[10px] font-semibold">{inrCompact(v)}</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const company = useCurrentCompany();
  const companyId = company.data?.id;
  const { fy, label: fyLabelText } = useFinancialYear(companyId);
  const periodLabel = fy === ALL_YEARS ? "All years" : fy === currentFYStartYear() ? "Current FY" : fyLabelText;

  const q = useDashboardData(companyId, fy);
  const d = q.data;

  const months = d?.months ?? [];
  const salesSpark = months.map((m) => m.sales);
  const purchaseSpark = months.map((m) => m.purchases);
  const labels = months.map((m) => m.label);

  const split = d?.invoiceSplit;
  const donutSlices = [
    { label: "Paid", value: split?.paid ?? 0, color: "var(--kpi-emerald)" },
    { label: "Pending", value: split?.pending ?? 0, color: "var(--kpi-yellow)" },
    { label: "Overdue", value: split?.overdue ?? 0, color: "var(--kpi-red)" },
    { label: "Draft", value: split?.draft ?? 0, color: "var(--kpi-slate)" },
    { label: "Cancelled", value: split?.cancelled ?? 0, color: "var(--kpi-purple)" },
  ];
  const invoiceTotal = donutSlices.reduce((s, x) => s + x.value, 0);

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[118px] rounded-[18px]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-[18px] lg:col-span-2" />
          <Skeleton className="h-64 rounded-[18px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Framer Motion Animated Hero Section (UI/UX Pro Max Enhanced) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-primary-foreground shadow-xl border border-primary/20"
        style={{ background: "var(--gradient-hero)" }}
      >
        {/* Animated glowing backdrop aura */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/20 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 grid gap-6 lg:grid-cols-12 items-center">
          {/* Left Title & Subtitle */}
          <div className="lg:col-span-7 space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-bold tracking-wide uppercase shadow-xs border border-white/20"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              <span>{periodLabel}</span>
              <span className="opacity-60">•</span>
              <span className="font-extrabold">{company.data?.name ?? "Aapka Business"}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight drop-shadow-xs"
            >
              Your Finance at a Glance
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-sm sm:text-base opacity-90 max-w-xl font-medium leading-relaxed"
            >
              {d?.sales.count ?? 0} total invoices · <span className="font-bold">{formatINR(d?.sales.total ?? 0)}</span> total sales · margin{" "}
              <span className="font-bold text-amber-300">{(d?.profit.marginPct ?? 0).toFixed(1)}%</span>
            </motion.p>
          </div>

          {/* Right Action Buttons */}
          <div className="lg:col-span-5 flex flex-wrap lg:justify-end gap-2.5">
            {[
              { label: "New Invoice", icon: Plus, to: "/sales/new", color: "bg-white text-slate-950 hover:bg-slate-100 font-bold" },
              { label: "New Purchase", icon: ShoppingBag, to: "/purchases/new", search: { draft: undefined }, color: "bg-white/15 text-white backdrop-blur-md border border-white/25 hover:bg-white/25" },
              { label: "Payment Receive", icon: ArrowDownToLine, to: "/payments", color: "bg-white/15 text-white backdrop-blur-md border border-white/25 hover:bg-white/25" },
              { label: "Reports", icon: BarChart3, to: "/reports", search: { tab: "balance-sheet" }, color: "bg-white/15 text-white backdrop-blur-md border border-white/25 hover:bg-white/25" },
              { label: "Products", icon: Boxes, to: "/products", color: "bg-white/15 text-white backdrop-blur-md border border-white/25 hover:bg-white/25" },
              { label: "Parties", icon: Users, to: "/parties", color: "bg-white/15 text-white backdrop-blur-md border border-white/25 hover:bg-white/25" },
            ].map((btn, idx) => (
              <motion.div
                key={btn.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to={btn.to} search={btn.search}>
                  <Button className={`gap-2 text-xs sm:text-sm h-10 px-4 rounded-xl shadow-md transition-shadow ${btn.color}`}>
                    <btn.icon className="h-4 w-4 shrink-0" />
                    <span>{btn.label}</span>
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 12 colourful KPI tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          tone="emerald"
          icon={IndianRupee}
          label="Revenue"
          value={d?.sales.total ?? 0}
          format={inrCompact}
          deltaPct={d?.sales.deltaPct ?? null}
          spark={salesSpark}
          to="/sales"
        />
        <StatCard
          tone="orange"
          icon={Percent}
          label="GST Liability"
          value={d?.gst.net ?? 0}
          format={inrCompact}
          deltaLabel={`Output ${inrCompact(d?.gst.output ?? 0)}`}
          to="/reports"
        />
        <StatCard
          tone="blue"
          icon={Receipt}
          label="Sales Invoices"
          value={d?.sales.count ?? 0}
          deltaLabel={`Avg bill ${inrCompact(d?.sales.avg ?? 0)}`}
          spark={salesSpark}
          to="/sales"
        />
        <StatCard
          tone="purple"
          icon={ShoppingBag}
          label="Purchase"
          value={d?.purchases.total ?? 0}
          format={inrCompact}
          deltaPct={d?.purchases.deltaPct ?? null}
          spark={purchaseSpark}
          to="/purchases"
        />
        <StatCard
          tone="teal"
          icon={TrendingUp}
          label="Gross Profit"
          value={d?.profit.gross ?? 0}
          format={inrCompact}
          deltaLabel={`Margin ${(d?.profit.marginPct ?? 0).toFixed(1)}%`}
          to="/reports"
        />
        <StatCard
          tone="red"
          icon={Wallet}
          label="Expenses"
          value={d?.expenses.total ?? 0}
          format={inrCompact}
          deltaPct={d?.expenses.deltaPct ?? null}
          to="/expenses"
        />
        <StatCard
          tone="cyan"
          icon={Users}
          label="Customers"
          value={d?.customers.total ?? 0}
          deltaLabel={`${d?.customers.newInPeriod ?? 0} new is period`}
          to="/parties"
        />
        <StatCard
          tone="indigo"
          icon={Truck}
          label="Vendors"
          value={d?.vendors.total ?? 0}
          deltaLabel={d?.vendors.top?.name ? `Top: ${d.vendors.top.name}` : "Supplier master"}
          to="/parties"
        />
        <StatCard
          tone="yellow"
          icon={FileClock}
          label="Unpaid Invoices"
          value={d?.pending.unpaidCount ?? 0}
          deltaLabel={`${d?.pending.overdueCount ?? 0} overdue`}
          to="/sales"
        />
        <StatCard
          tone="pink"
          icon={HandCoins}
          label="Cash Flow"
          value={(d?.receipts.total ?? 0) - (d?.paymentsOut.total ?? 0)}
          format={inrCompact}
          deltaLabel={`In ${inrCompact(d?.receipts.total ?? 0)} · Out ${inrCompact(d?.paymentsOut.total ?? 0)}`}
          to="/accounting"
        />
        <StatCard
          tone="sky"
          icon={Landmark}
          label="Bank Balance"
          value={d?.cashBank.bank ?? 0}
          format={inrCompact}
          deltaLabel={`Cash ${inrCompact(d?.cashBank.cash ?? 0)}`}
          to="/accounting"
        />
        <StatCard
          tone="violet"
          icon={Boxes}
          label="Inventory"
          value={d?.stock.value ?? 0}
          format={inrCompact}
          deltaLabel={`${d?.stock.items ?? 0} items · ${d?.stock.lowStock.length ?? 0} low`}
          to="/products"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Sales Overview"
          hint={`Monthly sales · ${periodLabel}`}
          className="lg:col-span-2"
          action={
            <span className="kpi-num shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
              {inrCompact(d?.sales.total ?? 0)}
            </span>
          }
        >
          <AreaChart data={salesSpark} labels={labels} color="var(--kpi-emerald)" />
        </Panel>

        <Panel title="Invoice Summary" hint={`${invoiceTotal} invoices`}>
          <div className="flex flex-wrap items-center gap-4">
            <Donut slices={donutSlices} center={String(invoiceTotal)} />
            <div className="min-w-0 flex-1 space-y-1.5">
              {donutSlices.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
                  <span className="kpi-num shrink-0 font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title="Purchase Overview"
          hint={`Monthly purchases · ${periodLabel}`}
          className="lg:col-span-2"
          action={
            <span className="kpi-num shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              {inrCompact(d?.purchases.total ?? 0)}
            </span>
          }
        >
          <AreaChart data={purchaseSpark} labels={labels} color="var(--kpi-purple)" />
        </Panel>

        <Panel title="Quick Actions" hint="Roz ke kaam, ek click me">
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: "/sales/new", label: "New Invoice", icon: Plus, tone: "var(--kpi-emerald)" },
              { to: "/purchases/new", label: "New Purchase", icon: ShoppingBag, tone: "var(--kpi-purple)" },
              { to: "/payments", label: "Receipts & Payments", icon: HandCoins, tone: "var(--kpi-teal)" },
              { to: "/parties", label: "Add Party", icon: UserPlus, tone: "var(--kpi-cyan)" },
              { to: "/products", label: "Add Item", icon: Boxes, tone: "var(--kpi-violet)" },
              { to: "/expenses", label: "Add Expense", icon: Wallet, tone: "var(--kpi-red)" },
              { to: "/accounting", label: "Day Book", icon: BookOpen, tone: "var(--kpi-indigo)" },
              { to: "/reports", label: "GST Reports", icon: FileText, tone: "var(--kpi-orange)" },
              { to: "/sales", label: "All Invoices", icon: Receipt, tone: "var(--kpi-blue)" },
            ].map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex items-center gap-2 rounded-xl border border-border p-2.5 text-xs font-semibold transition hover:bg-accent"
              >
                <a.icon className="h-4 w-4 shrink-0" style={{ color: a.tone }} />
                <span className="truncate">{a.label}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* Receivables / Payables */}
      <div className="space-y-3">
        <SectionHead title="Receivables & Payables" hint="Ageing analysis" dot="var(--kpi-orange)" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCardLinked
            tone="orange"
            icon={ArrowDownToLine}
            label="Receivables"
            value={d?.receivables.total ?? 0}
            format={inrCompact}
            rows={[
              { label: "Overdue", value: inrCompact(d?.receivables.overdue ?? 0), emphasis: "danger" },
              { label: "Top debtor", value: d?.receivables.top?.name ?? "—", emphasis: "muted" },
            ]}
            to="/sales"
          >
            <AgeingStrip ageing={d?.receivables.ageing ?? { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 }} tone={toneVar("orange")} />
          </KpiCardLinked>

          <KpiCardLinked
            tone="red"
            icon={ArrowUpFromLine}
            label="Payables"
            value={d?.payables.total ?? 0}
            format={inrCompact}
            rows={[
              { label: "Overdue", value: inrCompact(d?.payables.overdue ?? 0), emphasis: "danger" },
              { label: "Top creditor", value: d?.payables.top?.name ?? "—", emphasis: "muted" },
            ]}
            to="/purchases"
          >
            <AgeingStrip ageing={d?.payables.ageing ?? { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 }} tone={toneVar("red")} />
          </KpiCardLinked>

          <KpiCardLinked
            tone="cyan"
            icon={UserPlus}
            label="New vs Existing Sale"
            valueText={inrCompact(d?.sales.total ?? 0)}
            subtitle="Monthly comparison"
          >
            <MiniBars
              series={months.slice(-6).map((m) => ({
                label: m.label,
                values: [
                  { value: m.newCustomer, color: "var(--kpi-cyan)" },
                  { value: m.existingCustomer, color: "var(--kpi-indigo)" },
                ],
              }))}
            />
          </KpiCardLinked>

          <KpiCardLinked
            tone="emerald"
            icon={Trophy}
            label="Top Business"
            valueText={d?.customers.top?.name ?? "—"}
            rows={[
              { label: "Customer turnover", value: inrCompact(d?.customers.top?.amount ?? 0) },
              { label: "Top vendor", value: d?.vendors.top?.name ?? "—", emphasis: "muted" },
              { label: "Vendor turnover", value: inrCompact(d?.vendors.top?.amount ?? 0) },
            ]}
            to="/parties"
          />
        </div>
      </div>

      {/* Stock & attention */}
      <div className="space-y-3">
        <SectionHead title="Stock & Attention" hint="Inventory health" dot="var(--kpi-violet)" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCardLinked
            tone="violet"
            icon={Boxes}
            label="Stock Value"
            value={d?.stock.value ?? 0}
            format={inrCompact}
            rows={[{ label: "Items", value: String(d?.stock.items ?? 0) }]}
            to="/products"
          />
          <KpiCardLinked
            tone="yellow"
            icon={AlertTriangle}
            label="Low Stock"
            value={d?.stock.lowStock.length ?? 0}
            rows={(d?.stock.lowStock ?? []).slice(0, 3).map((p) => ({
              label: p.name,
              value: String(Number(p.stock_quantity ?? 0)),
              emphasis: "danger" as const,
            }))}
            to="/products"
          />
          <KpiCardLinked
            tone="slate"
            icon={PackageX}
            label="Unmoved Items"
            value={d?.stock.unmoved ?? 0}
            subtitle="90+ din se koi sale nahi"
            rows={(d?.stock.unmovedNames ?? []).map((n) => ({ label: n, value: "0 sale", emphasis: "muted" as const }))}
            to="/products"
          />
          <KpiCardLinked
            tone="blue"
            icon={Hourglass}
            label="Pending Work"
            value={(d?.pending.drafts ?? 0) + (d?.pending.unpaidCount ?? 0)}
            rows={[
              { label: "Draft invoices", value: String(d?.pending.drafts ?? 0) },
              { label: "Unpaid invoices", value: String(d?.pending.unpaidCount ?? 0) },
              { label: "Unpaid bills", value: String(d?.pending.unpaidPurchaseCount ?? 0) },
            ]}
            to="/sales"
          />
        </div>
      </div>

      {/* Best / least sellers + recent */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Best Selling Products" hint={periodLabel}>
          <div className="space-y-2">
            {(d?.items.bestSellers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Abhi koi sale nahi hui.</p>
            ) : (
              (d?.items.bestSellers ?? []).map((it) => (
                <div key={it.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{it.name}</span>
                  <span className="kpi-num shrink-0 font-semibold">
                    {it.qty} · {inrCompact(it.value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Recent Invoices" hint="Last 5" action={
          <Link to="/sales" className="shrink-0 text-xs font-semibold text-primary">View all</Link>
        }>
          <div className="space-y-2">
            {(d?.recent ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Koi invoice nahi mila.</p>
            ) : (
              (d?.recent ?? []).map((r) => (
                <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.party}</div>
                    <div className="text-[11px] text-muted-foreground">{r.invoice_date}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="kpi-num font-semibold">{inrCompact(r.total)}</div>
                    <div className="text-[11px] capitalize text-muted-foreground">{r.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5" />
        {d?.profit.missingCostItems
          ? `${d.profit.missingCostItems} items ka cost price missing hai — gross profit approx hai.`
          : "Gross profit = sale value − cost price (GST included nahi)."}
      </p>
    </div>
  );
}
