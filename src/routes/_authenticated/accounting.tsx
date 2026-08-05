import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/accounting")({
  head: () => ({
    meta: [
      { title: "Accounting — GST Munshi" },
      { name: "description", content: "Chart of accounts, ledgers, day book aur trial balance." },
    ],
  }),
  component: AccountingLayout,
});

const TABS: { to: string; label: string; exact?: boolean }[] = [
  { to: "/accounting", label: "Chart of Accounts", exact: true },
  { to: "/accounting/ledgers", label: "Ledgers" },
  { to: "/accounting/day-book", label: "Day Book" },
  { to: "/accounting/trial-balance", label: "Trial Balance" },
];


function AccountingLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Double-entry books — har bill, payment aur expense automatic post hota hai.
          </p>
        </div>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to as never}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
