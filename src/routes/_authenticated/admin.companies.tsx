import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Eye } from "lucide-react";
import { adminListCompanies } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  component: AdminCompaniesPage,
});

type Row = {
  id: string;
  name: string;
  gstin: string | null;
  state: string | null;
  created_at: string;
  ownerEmail: string | null;
  invoices: number;
  revenue: number;
  members: number;
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function AdminCompaniesPage() {
  const fetchCompanies = useServerFn(adminListCompanies);
  const q = useQuery({ queryKey: ["admin-companies"], queryFn: () => fetchCompanies() });
  const [search, setSearch] = useState("");

  const rows = useMemo<Row[]>(() => {
    const list = (q.data?.companies ?? []) as Row[];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.gstin ?? "").toLowerCase().includes(s) ||
        (c.ownerEmail ?? "").toLowerCase().includes(s),
    );
  }, [q.data, search]);

  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Company, GSTIN ya owner email se search karein"
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">{rows.length} companies</p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Koi company nahi mili.</CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Company</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Invoices</th>
                  <th className="p-3 text-right">Value</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c.ownerEmail ?? "—"}</td>
                    <td className="p-3">{c.gstin ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap">{fmt(c.created_at)}</td>
                    <td className="p-3 text-right">{c.invoices}</td>
                    <td className="p-3 text-right">{inr(c.revenue)}</td>
                    <td className="p-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/admin/companies/$companyId" params={{ companyId: c.id }}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {rows.map((c) => (
              <Card key={c.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="font-medium">{c.name}</div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span className="col-span-2 truncate">Owner: {c.ownerEmail ?? "—"}</span>
                    <span>GSTIN: {c.gstin ?? "—"}</span>
                    <span>Created: {fmt(c.created_at)}</span>
                    <span>Invoices: {c.invoices}</span>
                    <span>Value: {inr(c.revenue)}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/admin/companies/$companyId" params={{ companyId: c.id }}>
                      View details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
