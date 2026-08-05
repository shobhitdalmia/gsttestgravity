import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Privacy Policy — GST Munshi" },
      {
        name: "description",
        content: "GSTMunshi.com ke users ke data security, safety aur confidentiality se judi privacy policy.",
      },
    ],
  }),
  component: PrivacyPage,
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

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <LegalHeader />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12 items-start">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-2.5">
            <div className="font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-4">Sections</div>
            {[
              { id: "intro", label: "1. Privacy Statement" },
              { id: "collection", label: "2. Information We Collect" },
              { id: "usage", label: "3. How We Use Data" },
              { id: "sharing", label: "4. Sharing & Disclosure" },
              { id: "security", label: "5. Data Security Methods" },
              { id: "retention", label: "6. Data Retention Policy" },
              { id: "cookies", label: "7. Cookies & Tracking" },
              { id: "rights", label: "8. User Choices & Rights" },
              { id: "contact", label: "9. Privacy Contact" },
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

          {/* Privacy Content */}
          <article className="lg:col-span-9 space-y-8 bg-card border border-border/80 rounded-2xl p-6 md:p-10 shadow-sm leading-relaxed text-sm text-muted-foreground">
            <div className="border-b border-border/60 pb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                <Shield className="h-4 w-4" />
                Updated: August 2026
              </div>
              <h1 className="font-display text-3xl font-extrabold text-foreground tracking-tight">Privacy Policy</h1>
              <p className="mt-2 text-xs text-muted-foreground">Your business records safety is our primary focus. Read how we protect and manage your data.</p>
            </div>

            <section id="intro" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">1. Commitment to Privacy</h2>
              <p>
                At GSTMunshi.com ("GSTMunshi", "We", "Us", or "Our"), we are dedicated to protecting the confidentiality, security, and integrity of the business databases and personal identifiers you share with us. This Privacy Policy details how we collect, store, process, and safeguard your data when using our billing, inventory, and accounting software.
              </p>
            </section>

            <section id="collection" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">2. Information We Collect</h2>
              <p>
                To provide invoicing and bookkeeping services, we collect:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
                <li><strong>Account Registration Data:</strong> Mobile phone number, secure login verification codes (OTPs), and contact email.</li>
                <li><strong>Business Particulars:</strong> Legal firm name, address, GSTIN (Goods and Services Tax Identification Number), signature uploads, and brand logos.</li>
                <li><strong>Transaction Records:</strong> Customer details, item inventories, unit rates, quantities, HSN codes, discount structures, CGST/SGST/IGST calculations, outstanding udhari balances, and expense logs.</li>
                <li><strong>Device Metrics:</strong> IP address, device type, browser settings, operating system version, and system usage analytics logs.</li>
              </ul>
            </section>

            <section id="usage" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">3. How We Use Your Data</h2>
              <p>
                The gathered data is processed to deliver, maintain, and optimize our cloud billing platform. Explicitly, we use your data to:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
                <li>Generate and customize professional GST tax invoices.</li>
                <li>Compile monthly and annual GSTR summary reports (such as GSTR-1 formats).</li>
                <li>Manage party outstanding logs and generate automated ledger reminders.</li>
                <li>Validate account renewals, process transaction fee status, and provide support.</li>
                <li>Improve platform features and resolve performance bottlenecks.</li>
              </ul>
            </section>

            <section id="sharing" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">4. Data Sharing &amp; Disclosure</h2>
              <p>
                <strong>GSTMunshi does not sell, trade, rent, or lease your business data, customer ledgers, or invoice details to any third-party marketing companies.</strong>
              </p>
              <p>
                Your data is only disclosed to:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
                <li><strong>Trusted Infrastructure Providers:</strong> Core database hosting (such as Supabase, Google Cloud, and Vercel) required to keep our cloud platform operational. These sub-processors are legally bound to absolute confidentiality.</li>
                <li><strong>Payment Gateways:</strong> Safe integration partners (like Razorpay, Paytm) to check subscription payment validations.</li>
                <li><strong>Legal Requirements:</strong> If mandated by official government orders, tax tribunals, or judicial warrants in compliance with the laws of India.</li>
              </ul>
            </section>

            <section id="security" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">5. Data Security Methods</h2>
              <p>
                We use industry-standard physical, electronic, and administrative protective measures:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
                <li><strong>Encryption:</strong> Data transmitted between your device and our cloud servers is secured using SSL/TLS 256-bit encryption protocol.</li>
                <li><strong>OTP Login:</strong> Accounts are secured via SMS OTP login code verification, eliminating weak password exploits.</li>
                <li><strong>Automated Backups:</strong> Database instances are backed up continuously to ensure you do not lose data in case of device failure.</li>
              </ul>
            </section>

            <section id="retention" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">6. Data Retention Policy</h2>
              <p>
                We store your business entries as long as your account is active. If you choose to terminate your subscription and request account deletion, we will delete or anonymize your transaction records from our active servers within 30 business days, subject to regulatory compliance. Backup archives are deleted in cycles.
              </p>
            </section>

            <section id="cookies" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">7. Cookies &amp; Tracking Technologies</h2>
              <p>
                We utilize cookies to maintain your login session active, remember your active company workspace, preferred financial year settings, and theme preferences (light/dark mode). You can block cookies in browser settings, but it will require you to log in repeatedly during use.
              </p>
            </section>

            <section id="rights" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">8. User Choice and Rights</h2>
              <p>
                You retain full rights to edit, update, or purge any entries inside your parties list, item master list, and invoices. You can export all your company ledgers, transactions, and sales logs in Excel/PDF at any time from the Reports dashboard.
              </p>
            </section>

            <section id="contact" className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">9. Contacting Our Privacy Officer</h2>
              <p>
                If you have queries, concerns, or requests regarding this Privacy Policy, please write to our dedicated support desk at:
              </p>
              <p className="font-semibold text-foreground">
                Email: support@gstmunshi.com
              </p>
            </section>
          </article>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
