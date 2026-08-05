import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { previewInvite, acceptInvite } from "@/lib/team.functions";
import { ROLE_LABEL, ROLE_DESC, type CompanyRole } from "@/lib/company";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({
    meta: [
      { title: "Join a company — GST Munshi" },
      { name: "description", content: "Enter your invite code to access a client's GST books." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<{ companyName: string; role: CompanyRole } | null>(null);

  const doPreview = useServerFn(previewInvite);
  const doAccept = useServerFn(acceptInvite);

  const previewMut = useMutation({
    mutationFn: (c: string) => doPreview({ data: { code: c } }),
    onSuccess: (d) => setInfo(d),
    onError: (e: Error) => { setInfo(null); toast.error(e.message); },
  });

  const acceptMut = useMutation({
    mutationFn: (c: string) => doAccept({ data: { code: c } }),
    onSuccess: async (d) => {
      window.localStorage.removeItem("gstmunshi.pendingInvite");
      // Access mil gaya, par active company apne aap nahi badalti — user khud switch kare.
      await qc.invalidateQueries();
      toast.success(`${d.companyName} join ho gaya — sidebar se switch karein`);
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const pending = window.localStorage.getItem("gstmunshi.pendingInvite");
    if (pending) {
      setCode(pending);
      previewMut.mutate(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" /> Company join karein
        </h1>
        <p className="text-sm text-muted-foreground">
          Client ne jo 6-digit invite code diya hai wo yahan daalein.
        </p>
      </div>

      <div className="card-surface p-5 space-y-4">
        <div>
          <Label>Invite code</Label>
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setInfo(null); }}
            placeholder="ABC123"
            maxLength={6}
            className="font-mono text-lg tracking-widest uppercase"
          />
        </div>

        {!info ? (
          <Button
            className="w-full"
            disabled={code.length < 6 || previewMut.isPending}
            onClick={() => previewMut.mutate(code)}
          >
            {previewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Code check karein"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-accent/40 p-3 text-sm">
              <div className="font-semibold">{info.companyName}</div>
              <div className="text-muted-foreground">
                Role: {ROLE_LABEL[info.role]} — {ROLE_DESC[info.role]}
              </div>
            </div>
            <Button className="w-full" disabled={acceptMut.isPending} onClick={() => acceptMut.mutate(code)}>
              {acceptMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join karein"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
