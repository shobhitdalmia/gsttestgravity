import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/invite/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "You're invited — GST Munshi" },
      { name: "description", content: "Accept an invitation to access a company's books on GST Munshi." },
    ],
  }),
  component: InviteRedirect,
});

function InviteRedirect() {
  const { code } = useParams({ from: "/invite/$code" });
  const navigate = useNavigate();

  useEffect(() => {
    window.localStorage.setItem("gstmunshi.pendingInvite", code.toUpperCase());
    void supabase.auth.getUser().then(({ data }) => {
      navigate({ to: data.user ? "/join" : "/auth", replace: true });
    });
  }, [code, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Invite khol rahe hain…
      </div>
    </div>
  );
}
