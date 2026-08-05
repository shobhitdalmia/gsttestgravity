import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — GST Munshi" },
      {
        name: "description",
        content: "GSTMunshi.com ke use aur services se judi saari terms, conditions aur policies.",
      },
    ],
  }),
  component: TermsPage,
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

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <LegalHeader />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12 items-start">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-2.5">
            <div className="font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-4">Sections</div>
            {[
              { id: "intro", label: "1. Acceptance of Terms" },
              { id: "entity", label: "2. Legal Entity & Info" },
              { id: "accounts", label: "3. Account & OTP security" },
              { id: "payments", label: "4. Billing & SaaS Fees" },
              { id: "refund", label: "5. Refund & Cancellations" },
              { id: "delivery", label: "6. Service Delivery Mode" },
              { id: "compliance", label: "7. GST & Tax Responsibility" },
              { id: "conduct", label: "8. Prohibited Conduct" },
              { id: "liability", label: "9. Liability Limitation" },
              { id: "jurisdiction", label: "10. Governing Law" },
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

          {/* Terms Content */}
          <article className="lg:col-span-9 space-y-8 bg-card border border-border/80 rounded-2xl p-6 md:p-10 shadow-sm leading-relaxed text-sm text-muted-foreground">
            <div className="border-b border-border/60 pb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                <FileText className="h-4 w-4" />
                Updated: August 2026
              </div>
              <h1 className="font-display text-3xl font-extrabold text-foreground tracking-tight">Terms of Service</h1>
              <p className="mt-2 text-xs text-muted-foreground">Please read these Terms &amp; Conditions carefully before using GSTMunshi.com.</p>
            </div>

            <section id="intro" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">1. Acceptance of Terms &amp; Conditions</h2>
              <p>
                GSTMunshi.com (hereinafter referred to as "the Website", "the App", "GSTMunshi", "We", "Us", or "Our") provides invoicing, billing, stock monitoring, accounting, and business reports compilation tools. By registering an account, purchasing any SaaS plan, or accessing any part of our platform, the User (hereinafter "You", "Your", or "Customer") agrees to be legally bound by these Terms of Service, our Privacy Policy, and our Refund &amp; Cancellation Policy.
              </p>
              <p>
                If you do not agree to all terms and conditions, you must not use our software or register an account. We reserve the right to modify these terms from time to time by posting updates on this page.
              </p>
            </section>

            <section id="entity" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">2. Legal Entity &amp; Ownership</h2>
              <p>
                GSTMunshi.com and all associated services are operated and managed under the legal supervision of Shobhit Dalmia / GSTMunshi, with its registered administrative correspondence in New Delhi, India. 
              </p>
              <p>
                For any query regarding this agreement, you can contact our helpdesk at <a href="mailto:support@gstmunshi.com" className="text-primary hover:underline">support@gstmunshi.com</a>.
              </p>
            </section>

            <section id="accounts" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">3. User Registration, OTP &amp; Account Security</h2>
              <p>
                To utilize the services, you must register a valid account using a mobile number and receive a secure One-Time Password (OTP). You agree to provide accurate and updated business particulars, including but not limited to your legal business name, GSTIN (optional for non-GST users), state, and email address.
              </p>
              <p>
                You are solely responsible for all activities occurring under your registered account. Sharing your login OTPs with unauthorized third parties is strictly prohibited and GSTMunshi holds zero liability for any data breach, unauthorized billing, or loss arising from client negligence.
              </p>
            </section>

            <section id="payments" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">4. Billing, SaaS Plans &amp; Payment Gateways</h2>
              <p>
                GSTMunshi offers a Free Tier with transaction limits, as well as premium paid subscription plans (SaaS) with enhanced billing, multi-user access, and priority report compilations. 
              </p>
              <p>
                By opting for a paid plan, you agree to pay the monthly, quarterly, or annual subscription fees as advertised. Payments are securely processed through integrated third-party payment gateways (including but not limited to Razorpay, Cashfree, Paytm, and similar authorized providers). GSTMunshi does not store your debit/credit card credentials, netbanking passwords, or UPI PINs.
              </p>
            </section>

            <section id="refund" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">5. Refund &amp; Cancellation Policy</h2>
              <p>
                Paid subscriptions may be cancelled by the user at any time from the account settings. Upon cancellation, the premium features will remain active until the end of the current billing cycle, after which the account will revert to the standard Free Tier limits.
              </p>
              <p>
                As we provide a fully functional Free Tier for users to evaluate the software before upgrading, refunds for premium upgrades are subject to a **7-Day Money-Back Guarantee** from the initial date of purchase. Refund requests raised after 7 days are not eligible for refunds. Refunds will be processed back to the original source payment method within 5-7 business days of request approval.
              </p>
            </section>

            <section id="delivery" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">6. Mode of Delivery of Service (SaaS Delivery)</h2>
              <p>
                GSTMunshi is a cloud-based software service (SaaS). Upon successful processing of subscription fees, the premium plan benefits (e.g., unlimited invoice generation, multiple company management) are **activated instantly** on the user's account. 
              </p>
              <p>
                No physical components, CDs, keys, or boxed packages are shipped or delivered. The delivery of services is entirely digital and accessible via web browser and authorized devices.
              </p>
            </section>

            <section id="compliance" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">7. GST Compliance &amp; Accounting Liability Disclaimer</h2>
              <p>
                GSTMunshi provides tax invoice calculation tools, HSN/SAC databases, GSTR-1, and GSTR-3B summary compilation features as a helper software. All calculations (such as CGST, SGST, IGST rates and tax amounts) are derived strictly from the values, tax percentages, and HSN classes entered by you.
              </p>
              <p>
                It is the User's absolute duty to verify the correctness of all invoices, customer ledgers, and GSTR returns before filing them with the GST portal. GSTMunshi does not guarantee official tax acceptance and is not liable for penalties, fines, interest, or regulatory actions resulting from filing incorrect records compiled by our platform. You are advised to consult a certified Chartered Accountant (CA) or tax professional for auditing your final books.
              </p>
            </section>

            <section id="conduct" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">8. Prohibited Conduct</h2>
              <p>
                You agree not to use our platform to generate invoices for illegal goods, money laundering, tax evasion, fraud, or upload offensive material in the customer list or item registry. Any suspicious or illegal invoice trails will lead to immediate account suspension and reporting to respective regulatory and law enforcement agencies.
              </p>
            </section>

            <section id="liability" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">9. Limitation of Liability</h2>
              <p>
                In no event shall GSTMunshi, its operators, employees, or associates be liable for any direct, indirect, incidental, or consequential damages (including loss of business data, profits, goodwill, or audit penalties) arising out of the use or inability to use our servers. Our maximum aggregate liability under any circumstance is strictly capped at the total subscription fees paid by you to GSTMunshi in the 3 months preceding the event of claim.
              </p>
            </section>

            <section id="jurisdiction" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">10. Governing Law &amp; Jurisdiction</h2>
              <p>
                These Terms of Service shall be governed by, construed, and enforced in accordance with the laws of the Republic of India. Any disputes, claims, or legal actions arising out of these terms shall be subject to the exclusive jurisdiction of the competent courts in New Delhi, India.
              </p>
            </section>
          </article>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
