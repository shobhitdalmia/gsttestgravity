import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  UserPlus,
  Building2,
  Receipt,
  ShoppingBag,
  IndianRupee,
  MailCheck,
  MailWarning,
  Activity,
} from "lucide-react";
import { adminOverview } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverviewPage,
});

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">{label}</div>
          <div className="font-display text-lg font-bold">{value}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminOverviewPage() {
  const fetchOverview = useServerFn(adminOverview);
  const q = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });

  if (q.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (q.error) {
    return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  }

  const d = q.data!;
  const maxTrend = Math.max(1, ...d.trend.map((t) => t.count));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total users" value={d.users.total} icon={Users} hint={`${d.users.active7} active (7d)`} />
        <Kpi
          label="New signups"
          value={d.users.today}
          icon={UserPlus}
          hint={`${d.users.week} this week · ${d.users.month} this month`}
        />
        <Kpi label="Verified emails" value={d.users.verified} icon={MailCheck} />
        <Kpi label="Unverified" value={d.users.unverified} icon={MailWarning} />
        <Kpi label="Companies" value={d.counts.companies} icon={Building2} />
        <Kpi label="Invoices" value={d.counts.invoices} icon={Receipt} />
        <Kpi label="Purchase bills" value={d.counts.purchases} icon={ShoppingBag} />
        <Kpi label="Total invoiced value" value={inr(d.gmv)} icon={IndianRupee} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Signups — last 14 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-1">
            {d.trend.map((t) => (
              <div key={t.date} className="flex flex-1 flex-col items-center gap-1" title={`${t.date}: ${t.count}`}>
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${Math.max(4, (t.count / maxTrend) * 100)}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{t.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/admin/users" className="font-medium text-primary underline">
          Manage users
        </Link>
        <Link to="/admin/companies" className="font-medium text-primary underline">
          Browse companies
        </Link>
      </div>
    </div>
  );
}
