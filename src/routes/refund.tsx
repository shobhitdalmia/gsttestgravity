import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/refund")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — GST Munshi" },
      {
        name: "description",
        content: "GSTMunshi.com ke subscription cancellations aur refund cycles se judi standard policy.",
      },
    ],
  }),
  component: RefundPage,
});

function LegalHeader() {
  return (
    <header className="border-b border-border/60 bg-background/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      <div className="mx-auto flex max-w-[1600px] w-full items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-white p-1 shadow-xs">
            <img
              src="/logo.jpg"
              alt="GSTMunshi.com Logo"
              className="h-10 md:h-12 w-auto object-contain rounded-lg"
            />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight text-foreground flex items-center gap-1">
              GSTMunshi<span className="text-primary">.com</span>
            </div>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Sahi Hisab, Pakka Vishwas
            </p>
          </div>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 font-medium">
            <ArrowLeft className="h-4 w-4" /> Home Page
          </Button>
        </Link>
      </div>
    </header>
  );
}

function LegalFooter() {
  return (
    <footer className="border-t border-border bg-card text-foreground pt-12 pb-8 mt-16">
      <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-border/60">
          <div className="space-y-3">
            <div className="font-display text-lg font-bold">GSTMunshi.com</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              India's simple GST invoicing & accounting platform built for small business owners, dukaandars, and distributors.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">Compliance Pages</h4>
            <ul className="space-y-2 text-xs text-muted-foreground font-semibold">
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refund" className="hover:text-primary transition-colors">Refund & Cancellation Policy</Link></li>
            </ul>
          </div>
          <div className="space-y-3 lg:col-span-2">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact details</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> support@gstmunshi.com</p>
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> +91 98765 43210 (10 AM - 6 PM)</p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> GSTMunshi Tech Towers, New Delhi, India</p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-muted-foreground">
          <div>© {new Date().getFullYear()} GSTMunshi.com. All rights reserved.</div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Secure SSL 256-bit Encrypted Cloud</div>
        </div>
      </div>
    </footer>
  );
}

function RefundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <LegalHeader />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12 items-start">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-2.5">
            <div className="font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-4">Sections</div>
            {[
              { id: "overview", label: "1. Policy Overview" },
              { id: "guarantee", label: "2. 7-Day Money-Back Guarantee" },
              { id: "requests", label: "3. How to Request a Refund" },
              { id: "cycle", label: "4. Processing Timeline" },
              { id: "cancellations", label: "5. Subscription Cancellations" },
              { id: "non-refundable", label: "6. Non-Refundable Items" },
              { id: "contact", label: "7. Support Helpdesk" },
            ].map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block text-xs font-semibold text-muted-foreground hover:text-primary transition-colors border-l-2 border-transparent hover:border-primary pl-3 py-1"
              >
                {section.label}
              </a>
            ))}
          </aside>

          {/* Refund Content */}
          <article className="lg:col-span-9 space-y-8 bg-card border border-border/80 rounded-2xl p-6 md:p-10 shadow-sm leading-relaxed text-sm text-muted-foreground">
            <div className="border-b border-border/60 pb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                Updated: August 2026
              </div>
              <h1 className="font-display text-3xl font-extrabold text-foreground tracking-tight">Refund &amp; Cancellation Policy</h1>
              <p className="mt-2 text-xs text-muted-foreground">Information regarding your SaaS plan cancellations, renewals, and refund processing details.</p>
            </div>

            <section id="overview" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">1. Policy Overview</h2>
              <p>
                GSTMunshi.com provides digital software-as-a-service (SaaS) products for invoice generation, tax computing, and bookkeeping. Because our features are fully accessible upon upgrade verification without shipping physical components, we maintain clear guidelines regarding subscription cancellations and refund cycles.
              </p>
            </section>

            <section id="guarantee" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">2. 7-Day Money-Back Guarantee</h2>
              <p>
                To allow our customers to trial and audit our premium accounting tools risk-free, we offer a **7-Day Money-Back Guarantee** on all initial premium plans:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
                <li>If you upgrade your business workspace to a paid premium tier and decide it does not fit your operational style, you can file a refund request within 7 calendar days of purchase.</li>
                <li>Refunds requested under the 7-day guarantee are processed for the full paid amount, without cancellation charges.</li>
                <li>This guarantee strictly applies only to the **first premium purchase** made by a business account and does not apply to subsequent months, renewals, or additional companies added.</li>
              </ul>
            </section>

            <section id="requests" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">3. How to Request a Refund</h2>
              <p>
                To request a refund under our 7-day policy:
              </p>
              <ul className="list-decimal pl-6 space-y-1.5 text-xs sm:text-sm">
                <li>Send an email to <a href="mailto:support@gstmunshi.com" className="text-primary hover:underline">support@gstmunshi.com</a>.</li>
                <li>Provide your registered mobile number, business name, and the receipt/invoice generated by our payment processor (Razorpay, Paytm, etc.).</li>
                <li>Briefly explain the reason for your refund request (which helps us improve the app features for other Vyaparis).</li>
              </ul>
            </section>

            <section id="cycle" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">4. Refund Processing Timeline</h2>
              <p>
                Once your refund request is verified by our team:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
                <li>Refunds are approved within 2 business days.</li>
                <li>The refunded amount is credited back strictly to the **original payment source** (bank account, credit/debit card, or UPI ID used during checkout).</li>
                <li>Depending on your banking institution, it takes **5 to 7 business days** for the credit to reflect in your account statement.</li>
              </ul>
            </section>

            <section id="cancellations" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">5. Subscription Cancellations</h2>
              <p>
                You have the full right to cancel your premium subscription at any time. Cancellations can be performed instantly from your workspace’s **Settings** tab. 
              </p>
              <p>
                Upon cancellation, your premium workspace benefits will remain active until the end of your current active billing period (monthly or annual). No renewal charges will be levied. Once the period ends, your workspace is downgraded to our limits-capped Free Tier, but your history and invoices are securely preserved.
              </p>
            </section>

            <section id="non-refundable" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">6. Non-Refundable Items &amp; Charges</h2>
              <p>
                The following are strictly non-refundable:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
                <li>Subscription renewal charges (unless requested within 48 hours of automatic charge and the account was completely unused during that time).</li>
                <li>Promotional upgrades purchased using discount coupon codes explicitly marked as "non-refundable".</li>
                <li>Custom integrations, custom billing layouts, or bookkeeping consultancy services rendered by our support teams.</li>
              </ul>
            </section>

            <section id="contact" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">7. Support Helpdesk</h2>
              <p>
                If you encounter payment issues, double-billing errors, or cancellation failures, reach out to us:
              </p>
              <p className="font-semibold text-foreground">
                Email: support@gstmunshi.com<br />
                Phone: +91 98765 43210 (Mon-Sat, 10 AM - 6 PM)
              </p>
            </section>
          </article>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
