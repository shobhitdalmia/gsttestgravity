import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Trash2, TriangleAlert } from "lucide-react";
import { adminCompanyDetail, adminDeleteCompany } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/companies_/$companyId")({
  component: AdminCompanyDetailPage,
});

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function AdminCompanyDetailPage() {
  const { companyId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchDetail = useServerFn(adminCompanyDetail);
  const doDelete = useServerFn(adminDeleteCompany);

  const q = useQuery({
    queryKey: ["admin-company", companyId],
    queryFn: () => fetchDetail({ data: { companyId } }),
  });

  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: () => doDelete({ data: { companyId, reason } }),
    onSuccess: async () => {
      toast.success("Company aur uska data delete ho gaya");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-companies"] });
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
      navigate({ to: "/admin/companies" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;

  const d = q.data!;
  const c = d.company as {
    name: string;
    legal_name: string | null;
    gstin: string | null;
    pan: string | null;
    state: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/companies">
          <ArrowLeft className="mr-1 h-4 w-4" /> Companies
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-1 p-4">
          <h2 className="font-display text-lg font-bold">{c.name}</h2>
          <p className="text-sm text-muted-foreground">{c.legal_name ?? "—"}</p>
          <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
            <span>Owner: {d.ownerEmail ?? "—"}</span>
            <span>GSTIN: {c.gstin ?? "—"}</span>
            <span>PAN: {c.pan ?? "—"}</span>
            <span>State: {c.state ?? "—"}</span>
            <span>City: {c.city ?? "—"}</span>
            <span>Contact: {c.phone ?? c.email ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {[
          ["Invoices", d.counts.invoices],
          ["Purchases", d.counts.purchases],
          ["Parties", d.counts.parties],
          ["Products", d.counts.products],
          ["Expenses", d.counts.expenses],
          ["Invoiced value", inr(d.revenue)],
          ["GST collected", inr(d.gst)],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-display text-lg font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Team members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {(d.members as Array<{ user_id: string; role: string; email: string | null }>).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between border-b py-2 last:border-0">
              <Link to="/admin/users/$userId" params={{ userId: m.user_id }} className="truncate text-primary underline">
                {m.email ?? m.user_id}
              </Link>
              <Badge variant="outline">{m.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <TriangleAlert className="h-4 w-4" /> Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Is company ka poora data (invoices, purchases, parties, products, expenses, payments, team) permanently
            delete ho jaayega. Owner ka account bana rahega.
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {c.name}?</DialogTitle>
                <DialogDescription>Reason audit log me save hoga. Yeh undo nahi ho sakta.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Test company" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" disabled={del.isPending || reason.trim().length < 3} onClick={() => del.mutate()}>
                  {del.isPending ? "Deleting..." : "Delete permanently"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
