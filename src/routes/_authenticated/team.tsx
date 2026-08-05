import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users,
  Copy,
  Trash2,
  Mail,
  Link2,
  ShieldCheck,
  Calculator,
  ReceiptText,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentMembership, ROLE_LABEL, ROLE_DESC, type CompanyRole } from "@/lib/company";
import { listTeam, createInvite, revokeInvite, removeMember, updateMemberRole } from "@/lib/team.functions";
import { siteUrl } from "@/lib/site-url";


export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team & CA Access — GST Munshi" }] }),
  component: TeamPage,
});

const ROLE_ICON: Record<CompanyRole, typeof ShieldCheck> = {
  owner: ShieldCheck,
  accountant: Calculator,
  staff: ReceiptText,
};

function TeamPage() {
  const { membership, isLoading } = useCurrentMembership();
  const companyId = membership?.company.id;
  const myRole = membership?.role ?? null;
  const qc = useQueryClient();

  const fetchTeam = useServerFn(listTeam);
  const doCreate = useServerFn(createInvite);
  const doRevoke = useServerFn(revokeInvite);
  const doRemove = useServerFn(removeMember);
  const doUpdateRole = useServerFn(updateMemberRole);

  const team = useQuery({
    queryKey: ["team", companyId],
    enabled: !!companyId,
    queryFn: () => fetchTeam({ data: { companyId: companyId! } }),
  });

  const [inviteRole, setInviteRole] = useState<CompanyRole>("accountant");
  const [inviteEmail, setInviteEmail] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["team", companyId] });

  const createMut = useMutation({
    mutationFn: (vars: { email?: string | null }) =>
      doCreate({ data: { companyId: companyId!, role: inviteRole, email: vars.email ?? null } }),
    onSuccess: (row) => {
      setInviteEmail("");
      invalidate();
      toast.success(`Invite ready — code ${row.code}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (inviteId: string) => doRevoke({ data: { inviteId, companyId: companyId! } }),
    onSuccess: () => { invalidate(); toast.success("Invite cancel ho gaya"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (memberId: string) => doRemove({ data: { memberId, companyId: companyId! } }),
    onSuccess: () => { invalidate(); toast.success("Access hata diya gaya"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (vars: { memberId: string; role: CompanyRole }) =>
      doUpdateRole({ data: { companyId: companyId!, memberId: vars.memberId, role: vars.role } }),
    onSuccess: () => { invalidate(); toast.success("Role update ho gaya"); },
    onError: (e: Error) => toast.error(e.message),
  });

  function inviteLink(code: string) {
    return siteUrl(`/invite/${code}`);
  }


  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error("Copy nahi ho paya — manually select karein");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (myRole !== "owner") {
    return (
      <div className="card-surface p-6 max-w-lg space-y-2">
        <h1 className="font-display text-xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">
          Sirf company owner hi team members manage kar sakta hai. Aapka role: <b>{ROLE_LABEL[myRole ?? "staff"]}</b>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Team &amp; CA Access
        </h1>
        <p className="text-sm text-muted-foreground">
          Apne Chartered Accountant ya staff ko is company ka access dein. Wo apne hi login se aapke books dekh payenge.
        </p>
      </div>

      {/* Invite box */}
      <div className="card-surface p-5 space-y-4">
        <h2 className="font-semibold">Naya invite banayein</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Role</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as CompanyRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accountant">{ROLE_LABEL.accountant}</SelectItem>
                <SelectItem value="staff">{ROLE_LABEL.staff}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{ROLE_DESC[inviteRole]}</p>
          </div>
          <div>
            <Label>Email (optional)</Label>
            <Input
              type="email"
              placeholder="ca@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email daalein to sirf wahi email join kar payegi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => createMut.mutate({ email: inviteEmail || null })}
            disabled={createMut.isPending}
            className="gap-2"
          >
            <Link2 className="h-4 w-4" />
            {createMut.isPending ? "Ban raha hai…" : "Invite code + link banayein"}
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Invite link ya 6-digit code WhatsApp / SMS pe bhej dein. Automatic email bhejne ke liye apna email domain
            setup karna padega — bataiye to wo bhi laga dete hain.
          </span>
        </div>
      </div>

      {/* Pending invites */}
      {(team.data?.invites.length ?? 0) > 0 && (
        <div className="card-surface p-5 space-y-3">
          <h2 className="font-semibold">Pending invites</h2>
          <div className="space-y-2">
            {team.data!.invites.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{ROLE_LABEL[i.role]}</Badge>
                    {i.email && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {i.email}
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revokeMut.mutate(i.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-base font-bold tracking-widest">
                    {i.code}
                  </code>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => copy(i.code, "Code copy ho gaya")}>
                    <Copy className="h-3.5 w-3.5" /> Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => copy(inviteLink(i.code), "Invite link copy ho gaya")}
                  >
                    <Link2 className="h-3.5 w-3.5" /> Link
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Expires {new Date(i.expiresAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card-surface p-5 space-y-3">
        <h2 className="font-semibold">Members ({team.data?.members.length ?? 0})</h2>
        {team.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        <div className="space-y-2">
          {team.data?.members.map((m) => {
            const Icon = ROLE_ICON[m.role];
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(m.joinedAt).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>
                {m.role === "owner" ? (
                  <Badge>Owner</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={m.role} onValueChange={(v) => roleMut.mutate({ memberId: m.id, role: v as CompanyRole })}>
                      <SelectTrigger className="w-[190px] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accountant">{ROLE_LABEL.accountant}</SelectItem>
                        <SelectItem value="staff">{ROLE_LABEL.staff}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeMut.mutate(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Aap khud kisi doosri company mein CA ke roop mein judna chahte hain?{" "}
        <Link to="/join" className="text-primary font-medium underline">
          Code se join karein
        </Link>
      </p>
    </div>
  );
}
