import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { IndianRupee, Loader2, ArrowLeft, MailCheck, Mail, Smartphone, KeyRound, ShieldAlert } from "lucide-react";
import { siteUrl } from "@/lib/site-url";
import { isValidIndianMobile, normalizePhone } from "@/lib/phone";
import {
  signInWithPhone,
  isPhoneAvailable,
  checkEmailStatus,
  sendPasswordReset,
} from "@/lib/auth.functions";
import { requestPhoneOtp, verifyPhoneOtp, confirmSignupPhone } from "@/lib/otp.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — GST Munshi" },
      { name: "description", content: "Sign in or create your GST Munshi account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "tabs" | "forgot" | "forgot-sent" | "verify" | "phone-otp" | "signup-otp";
type Identifier = "otp" | "phone" | "email";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("tabs");
  const [identifier, setIdentifier] = useState<Identifier>("otp");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [tempOtpMode, setTempOtpMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (identifier === "otp") {
      setLoading(false);
      if (!isValidIndianMobile(phone)) return toast.error("10-digit mobile number daalein");
      return sendOtp("login");
    }

    if (identifier === "phone") {
      if (!isValidIndianMobile(phone)) {
        setLoading(false);
        return toast.error("10-digit mobile number daalein");
      }
      try {
        const res = await signInWithPhone({ data: { phone: normalizePhone(phone), password } });
        if (!res.ok) {
          setLoading(false);
          return toast.error(res.error);
        }
        const { error } = await supabase.auth.setSession({
          access_token: res.accessToken,
          refresh_token: res.refreshToken,
        });
        setLoading(false);
        if (error) return toast.error(error.message);
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      } catch (err) {
        setLoading(false);
        toast.error(err instanceof Error ? err.message : "Sign in nahi ho paya");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("not confirmed")) {
        setMode("verify");
        return toast.error("Email verify karna baaki hai — code ya link use karein");
      }
      return toast.error(error.message);
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidIndianMobile(phone)) return toast.error("Sahi 10-digit mobile number daalein");
    if (password.length < 6) return toast.error("Password min 6 characters ka ho");
    setLoading(true);

    const mobile = normalizePhone(phone);
    try {
      const check = await isPhoneAvailable({ data: { phone: mobile } });
      if (!check.available) {
        setLoading(false);
        return toast.error("Ye mobile number pehle se register hai — usi se sign in karein");
      }
    } catch {
      // availability check fail hone par signup rokna nahi hai — DB unique index protect karta hai
    }

    // Supabase duplicate email par bhi "success" deta hai, isliye pehle khud check karte hain.
    try {
      const status = await checkEmailStatus({ data: { email: email.trim() } });
      if (!status.checked) {
        setLoading(false);
        toast.error("Account check abhi available nahi hai — thodi der baad dobara koshish karein");
        return;
      }
      if (status.exists) {
        setLoading(false);
        if (status.confirmed) {
          toast.error("Ye email pehle se registered hai — sign in karein ya password reset karein");
          setMode("tabs");
          setIdentifier("email");
        } else {
          toast.error("Ye email pehle se signup hai, verification pending hai — code daalein ya resend karein");
          setMode("verify");
        }
        return;
      }
    } catch (error) {
      // Fail closed: Supabase intentionally hides duplicate-email status and may
      // return a fake success, which would incorrectly show the verification UI.
      setLoading(false);
      console.error("[signup] email check failed:", error);
      toast.error("Account check abhi available nahi hai — thodi der baad dobara koshish karein");
      return;
    }

    // Mobile pehle verify hota hai, uske baad hi account banta hai.
    await sendOtp("verify");
  }

  /** Mobile verify hone ke baad account banata hai. */
  async function createAccount() {
    const mobile = normalizePhone(phone);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: siteUrl("/dashboard"),
        data: { full_name: name.trim(), phone: mobile },
      },
    });
    setLoading(false);
    if (error) {
      setMode("tabs");
      return toast.error(error.message);
    }
    // With email-enumeration protection, Supabase can return a fake success for
    // an existing address. An empty identities list is the duplicate signal.
    if (data.user?.identities?.length === 0) {
      toast.error("Ye email pehle se registered hai — sign in karein ya password reset karein");
      setMode("tabs");
      setIdentifier("email");
      return;
    }
    if (data.session) {
      try {
        await confirmSignupPhone({ data: { phone: mobile } });
      } catch {
        // best-effort verification stamp
      }
      // Auto-confirm is on — straight into company setup.
      navigate({ to: "/dashboard" });
      return;
    }
    setOtp("");
    setCooldown(60);
    setMode("verify");
    toast.success("Verification email bhej diya!");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = otp.replace(/\D/g, "");
    if (token.length !== 6) return toast.error("6-digit code daalein");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "signup" });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (isValidIndianMobile(phone)) {
      try {
        await confirmSignupPhone({ data: { phone: normalizePhone(phone) } });
      } catch {
        // Mobile pehle se profile me save hai — verification stamp best-effort hai.
      }
    }
    toast.success("Email verify ho gaya!");
    navigate({ to: "/dashboard" });
  }

  /** Mobile par OTP bhejein — login ke liye ya signup se pehle number verify karne ke liye. */
  async function sendOtp(purpose: "login" | "verify") {
    setLoading(true);
    try {
      const res = await requestPhoneOtp({ data: { phone: normalizePhone(phone), purpose } });
      setLoading(false);
      if (!res.ok) return toast.error(res.error);
      setOtp("");
      setTempOtpMode(res.temporary);
      setCooldown(res.resendIn);
      setMode(purpose === "login" ? "phone-otp" : "signup-otp");
      toast.success(
        res.temporary
          ? "Temporary access mode — GST Munshi team ne jo OTP diya hai wahi daalein"
          : "OTP bhej diya",
      );
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "OTP bhej nahi paye");
    }
  }

  /** OTP se sign in. */
  async function verifyOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.replace(/\D/g, "");
    if (code.length < 4) return toast.error("Poora OTP daalein");
    setLoading(true);
    try {
      const res = await verifyPhoneOtp({ data: { phone: normalizePhone(phone), code, purpose: "login" } });
      if (!res.ok) {
        setLoading(false);
        return toast.error(res.error);
      }
      if (!("accessToken" in res) || !res.accessToken || !res.refreshToken) {
        setLoading(false);
        return toast.error("Sign in nahi ho paya — dobara koshish karein");
      }
      const { error } = await supabase.auth.setSession({
        access_token: res.accessToken,
        refresh_token: res.refreshToken,
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Sign in nahi ho paya");
    }
  }

  /** Signup se pehle mobile verify — verify hone par hi account banta hai. */
  async function verifyOtpForSignup(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.replace(/\D/g, "");
    if (code.length < 4) return toast.error("Poora OTP daalein");
    setLoading(true);
    try {
      const res = await verifyPhoneOtp({ data: { phone: normalizePhone(phone), code, purpose: "verify" } });
      setLoading(false);
      if (!res.ok) return toast.error(res.error);
      toast.success("Mobile number verify ho gaya");
      await createAccount();
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Verify nahi ho paya");
    }
  }

  async function resendVerification() {
    if (cooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: siteUrl("/dashboard") },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setCooldown(60);
    toast.success("Email dobara bhej diya");
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error("Email ya mobile number daalein");
    setLoading(true);
    try {
      const res = await sendPasswordReset({
        data: { identifier: email.trim(), redirectTo: siteUrl("/reset-password") },
      });
      setLoading(false);
      if (!res.ok) return toast.error(res.error);
      setMode("forgot-sent");
      toast.success("Password reset link bhej diya");
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Reset mail bhej nahi paye");
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="hidden md:flex flex-col justify-between p-10 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-foreground/15">
            <IndianRupee className="h-5 w-5" />
          </div>
          GST Munshi
        </Link>
        <div>
          <h2 className="font-display text-3xl font-bold leading-tight">
            Aapka business, <br /> aapki kitab — digital.
          </h2>
          <p className="mt-3 opacity-90 max-w-sm">
            Sign in aur turant billing shuru karo. Multi-company, GST-ready, seedha simple.
          </p>
        </div>
        <div className="text-xs opacity-70">© GST Munshi</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-6 flex items-center gap-2 font-display font-bold">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <IndianRupee className="h-5 w-5" />
            </div>
            GST Munshi
          </div>

          {mode === "tabs" && (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setIdentifier("otp")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                        identifier === "otp" ? "bg-background shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdentifier("phone")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                        identifier === "phone" ? "bg-background shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Mobile
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdentifier("email")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                        identifier === "email" ? "bg-background shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      <Mail className="h-3.5 w-3.5" /> Email
                    </button>
                  </div>

                  {identifier === "email" ? (
                    <div>
                      <Label htmlFor="e1">Email</Label>
                      <Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="m1">Mobile number</Label>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border bg-muted px-2.5 py-2 text-sm text-muted-foreground">+91</span>
                        <Input
                          id="m1"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          placeholder="98765 43210"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        />
                      </div>
                    </div>
                  )}

                  {identifier !== "otp" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="p1">Password</Label>
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    {identifier === "phone" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Password bhool gaye? Reset link registered email par jayega.
                      </p>
                    )}
                  </div>
                  )}
                  {identifier === "otp" && (
                    <p className="text-xs text-muted-foreground">
                      Password ki zaroorat nahi — aapke mobile par OTP se sign in hoga.
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {identifier === "otp" ? "OTP bhejein" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="n2">Your name</Label>
                    <Input id="n2" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="m2">Mobile number</Label>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border bg-muted px-2.5 py-2 text-sm text-muted-foreground">+91</span>
                      <Input
                        id="m2"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder="98765 43210"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Isi number se aap email ki jagah sign in kar sakenge.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="e2">Email</Label>
                    <Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="p2">Password (min 6)</Label>
                    <Input id="p2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create free account
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Account banane ke baad email verification zaroori hai.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {mode === "forgot" && (
            <form onSubmit={sendReset} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode("tabs")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
              <div>
                <h1 className="font-display text-xl font-bold">Password reset karein</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Registered email ya 10-digit mobile number daalein — reset link registered email par jayega.
                </p>
              </div>
              <div>
                <Label htmlFor="fe">Email ya mobile number</Label>
                <Input
                  id="fe"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com / 9876543210"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}

          {mode === "forgot-sent" && (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-10 w-10 text-primary" />
              <h1 className="font-display text-xl font-bold">Email bhej diya</h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{email}</span> par password reset link gaya hai.
                Link kholein aur naya password set karein. Email na mile to spam folder dekhein.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setMode("tabs")}>
                Back to sign in
              </Button>
            </div>
          )}

          {mode === "verify" && (
            <div className="space-y-4">
              <div className="text-center">
                <MailCheck className="mx-auto h-10 w-10 text-primary" />
                <h1 className="mt-2 font-display text-xl font-bold">Email verify karein</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Humne <span className="font-medium text-foreground">{email}</span> par email bheja hai.
                  Usme <strong>verification link</strong> aur <strong>6-digit code</strong> dono hain — link
                  pe click karein, ya code niche daal dein.
                </p>
              </div>
              <form onSubmit={verifyCode} className="space-y-3">
                <div>
                  <Label htmlFor="otp">6-digit code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    className="text-center text-lg tracking-[0.4em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & continue
                </Button>
              </form>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setMode("tabs")}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={cooldown > 0 || loading}
                  className="font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                </button>
              </div>
            </div>
          )}

          {(mode === "phone-otp" || mode === "signup-otp") && (
            <div className="space-y-4">
              <div className="text-center">
                <KeyRound className="mx-auto h-10 w-10 text-primary" />
                <h1 className="mt-2 font-display text-xl font-bold">
                  {mode === "signup-otp" ? "Mobile verify karein" : "OTP se sign in"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">+91 {phone}</span> ke liye OTP daalein.
                </p>
              </div>

              {tempOtpMode && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Temporary access mode:</strong> SMS/WhatsApp delivery (DLT approval) abhi pending
                    hai, isliye GST Munshi team ne aapko jo OTP diya hai wahi kaam karega. Ye OTP kisi ko na
                    batayein.
                  </span>
                </div>
              )}

              <form onSubmit={mode === "signup-otp" ? verifyOtpForSignup : verifyOtpLogin} className="space-y-3">
                <div>
                  <Label htmlFor="potp">OTP</Label>
                  <Input
                    id="potp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="••••••"
                    className="text-center text-lg tracking-[0.4em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signup-otp" ? "Verify & account banayein" : "Verify & sign in"}
                </Button>
              </form>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setMode("tabs"); setOtp(""); }}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => sendOtp(mode === "signup-otp" ? "verify" : "login")}
                  disabled={cooldown > 0 || loading}
                  className="font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms. GST-ready billing for Indian businesses.
          </p>
        </div>
      </div>
    </div>
  );
}
