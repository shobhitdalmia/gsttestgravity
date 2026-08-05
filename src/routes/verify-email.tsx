import { useEffect, useRef, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verify email — GST Munshi" },
      { name: "description", content: "Verify your GST Munshi email address securely." },
      { property: "og:title", content: "Verify email — GST Munshi" },
      { property: "og:description", content: "Verify your GST Munshi email address securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
})

type VerificationState = "verifying" | "verified" | "error"

function VerifyEmailPage() {
  const navigate = useNavigate()
  const started = useRef(false)
  const [state, setState] = useState<VerificationState>("verifying")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (started.current) return
    started.current = true

    const params = new URLSearchParams(window.location.search)
    const email = params.get("email")?.trim()
    const token = params.get("token")?.trim()

    if (!email || !token) {
      setState("error")
      setMessage("Verification link incomplete hai. Naya verification email mangayein.")
      return
    }

    void supabase.auth.verifyOtp({ email, token, type: "signup" }).then(({ error }) => {
      window.history.replaceState({}, "", "/verify-email")
      if (error) {
        setState("error")
        setMessage("Link expire ya pehle use ho chuka hai. Naya verification email mangayein.")
        return
      }

      setState("verified")
      setMessage("Email verify ho gaya. Aapko dashboard par le ja rahe hain…")
      window.setTimeout(() => navigate({ to: "/dashboard" }), 900)
    })
  }, [navigate])

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <section className="w-full max-w-md text-center" aria-live="polite">
        {state === "verifying" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
        {state === "verified" && <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />}
        {state === "error" && <XCircle className="mx-auto h-10 w-10 text-destructive" />}

        <h1 className="mt-4 font-display text-2xl font-bold">
          {state === "verifying" ? "Email verify ho raha hai" : state === "verified" ? "Email verified" : "Verification nahi hui"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state === "verifying" ? "Bas ek pal…" : message}
        </p>

        {state === "error" && (
          <Button asChild className="mt-6">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        )}
      </section>
    </main>
  )
}