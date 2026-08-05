import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ScrollText } from "lucide-react";
import { adminAuditLog } from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAuditPage,
});

type Entry = {
  id: string;
  action: string;
  actor_email: string | null;
  target_type: string | null;
  target_label: string | null;
  target_id: string | null;
  reason: string | null;
  created_at: string;
};

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function AdminAuditPage() {
  const fetchLog = useServerFn(adminAuditLog);
  const q = useQuery({ queryKey: ["admin-audit"], queryFn: () => fetchLog() });

  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;

  const entries = (q.data?.entries ?? []) as Entry[];

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Abhi tak koi admin action record nahi hua.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <Card key={e.id}>
          <CardContent className="flex flex-wrap items-start justify-between gap-2 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                <Badge variant={e.action.startsWith("delete") ? "destructive" : "secondary"}>{e.action}</Badge>
                <span className="truncate text-sm font-medium">{e.target_label ?? e.target_id ?? "—"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.actor_email ?? "admin"} · {e.target_type ?? "—"}
                {e.reason ? ` · Reason: ${e.reason}` : ""}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{fmt(e.created_at)}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
