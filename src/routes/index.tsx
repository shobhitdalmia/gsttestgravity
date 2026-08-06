import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Receipt,
  Boxes,
  BarChart3,
  ShieldCheck,
  IndianRupee,
  Sparkles,
  FileCheck2,
  Users,
  CheckCircle2,
  PhoneCall,
  Mail,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Send,
  Zap,
  Building2,
  Lock,
  Smartphone,
  Printer,
  FileText,
  Clock,
  Star,
  HelpCircle,
  Shield,
  FileCode,
  Layers,
  Laptop,
  RefreshCw,
  CalendarRange,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GSTMunshi.com — Sahi Hisab, Pakka Vishwas | Simple GST Billing & Accounting" },
      {
        name: "description",
        content:
          "Free GST invoicing, inventory, and accounting software for Indian dukaandars, traders, and small businesses. Bill fast, track stock, and file GST with GSTMunshi.com.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"billing" | "inventory" | "gst" | "ledger">("billing");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | "refund" | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="mx-auto flex max-w-[1600px] w-full items-center justify-between px-4 py-3 md:px-6">
          {/* Logo / Home Button */}
          <Link
            to="/"
            className="flex items-center transition-opacity hover:opacity-90 group"
            title="GSTMunshi.com Home"
          >
            <img
              src="/logo.jpg"
              alt="GSTMunshi.com Logo"
              className="w-[200px] h-[100px] object-contain rounded-lg"
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-primary">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-primary">
              Kaise Kaam Karta Hai
            </a>
            <a href="#demo" className="transition-colors hover:text-primary">
              Live Demo
            </a>
            <a href="#reviews" className="transition-colors hover:text-primary">
              Reviews
            </a>
            <a href="#faq" className="transition-colors hover:text-primary">
              FAQs
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="font-medium">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-2 shadow-xs bg-primary hover:bg-primary/90">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col space-y-3 font-medium text-sm text-muted-foreground">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded-md hover:bg-muted hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded-md hover:bg-muted hover:text-foreground"
              >
                Kaise Kaam Karta Hai
              </a>
              <a
                href="#demo"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded-md hover:bg-muted hover:text-foreground"
              >
                Live Demo
              </a>
              <a
                href="#reviews"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded-md hover:bg-muted hover:text-foreground"
              >
                Reviews
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded-md hover:bg-muted hover:text-foreground"
              >
                FAQs
              </a>
            </nav>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  Sign in
                </Button>
              </Link>
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full justify-center gap-2">
                  Start Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Glowing Background Mesh */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(55% 45% at 20% 10%, oklch(0.92 0.07 190 / 0.7) 0%, transparent 60%), radial-gradient(50% 50% at 85% 25%, oklch(0.94 0.1 75 / 0.6) 0%, transparent 60%), radial-gradient(40% 40% at 50% 80%, oklch(0.95 0.05 160 / 0.5) 0%, transparent 50%)",
          }}
        />

        <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="lg:col-span-7 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-xs">
                <Sparkles className="h-4 w-4 text-accent fill-accent" />
                GST-Ready Billing &amp; Accounting • Made in India 🇮🇳
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-[1.1]">
                Your Finance at a Glance — <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-primary via-emerald-600 to-teal-700 bg-clip-text text-transparent">
                  Sahi Hisab, Pakka Vishwas.
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Indian shops, wholesalers aur traders ke liye sabse aasaan GST software. 
                Kuch hi seconds mein GST tax invoices banayein, inventory auto-track karein, party balances manage karein aur GSTR-1 / 3B reports ready karein!
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/auth" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 h-12 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                      Start Free — No Credit Card <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/sales/new">
                    <Button size="lg" variant="outline" className="gap-2 text-base h-12 border-border/80 hover:bg-card">
                      + New Invoice
                    </Button>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/reports" search={{ tab: "balance-sheet" }}>
                    <Button size="lg" variant="outline" className="gap-2 text-base h-12 border-border/80 hover:bg-card">
                      <BarChart3 className="h-4 w-4" /> Reports
                    </Button>
                  </Link>
                </motion.div>
              </div>

              {/* Trust Badges */}
              <div className="mt-10 pt-6 border-t border-border/60 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-medium text-muted-foreground">
                <div className="flex items-center justify-center lg:justify-start gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span>100% Safe &amp; Encrypted</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-2">
                  <FileCheck2 className="h-5 w-5 text-emerald-600" />
                  <span>GSTR-1 &amp; 3B Auto Ready</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-2 col-span-2 sm:col-span-1">
                  <Send className="h-5 w-5 text-emerald-600" />
                  <span>Instant WhatsApp Bill</span>
                </div>
              </div>
            </motion.div>

            {/* Right Interactive Mockup / Hero Card */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary to-accent opacity-20 blur-xl"></div>
              
              <div className="relative card-surface p-6 rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-md">
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-4 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-green-500 inline-block" />
                    <span className="ml-2 text-xs font-semibold text-muted-foreground">GSTMunshi Dashboard</span>
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 border border-emerald-500/20">
                    Live Status
                  </span>
                </div>

                {/* Dashboard KPI Preview */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
                    <div className="text-xs text-muted-foreground font-medium">Aaj Ki Total Sales</div>
                    <div className="mt-1 font-display text-2xl font-bold text-foreground">₹ 48,250</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <span>↑ +14%</span> vs kal
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-500/5 p-4 border border-amber-500/10">
                    <div className="text-xs text-muted-foreground font-medium">Kul Udhari (Pending)</div>
                    <div className="mt-1 font-display text-2xl font-bold text-foreground">₹ 1,12,400</div>
                    <div className="mt-1 text-[11px] text-amber-600 font-medium">12 Parties</div>
                  </div>
                </div>

                {/* Sample Invoice Items list */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-3">
                    <span>Recent Invoices</span>
                    <span className="text-primary hover:underline cursor-pointer">View All</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: "Gupta Traders", inv: "INV-2026-089", status: "Paid", amt: "₹ 18,400", time: "10 min pehle" },
                      { name: "Sharma General Store", inv: "INV-2026-088", status: "Pending", amt: "₹ 5,250", time: "1 hr pehle" },
                      { name: "Verma Electronics", inv: "INV-2026-087", status: "Paid", amt: "₹ 24,600", time: "3 hr pehle" },
                    ].map((row) => (
                      <div
                        key={row.inv}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">{row.name}</div>
                            <div className="text-[10px] text-muted-foreground">{row.inv} • {row.time}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-foreground">{row.amt}</div>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              row.status === "Paid"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Tag */}
                <div className="mt-5 p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <span className="text-xs font-semibold">GSTR-1 Monthly Return Ready</span>
                  </div>
                  <span className="text-[11px] font-bold underline cursor-pointer">Export Excel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats Counter Bar */}
      <section className="border-y border-border/60 bg-muted/30 py-10">
        <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-display text-3xl md:text-4xl font-extrabold text-foreground">10,000+</div>
              <div className="mt-1 text-xs md:text-sm font-medium text-muted-foreground">Indian Small Businesses</div>
            </div>
            <div>
              <div className="font-display text-3xl md:text-4xl font-extrabold text-primary">₹ 500 Cr+</div>
              <div className="mt-1 text-xs md:text-sm font-medium text-muted-foreground">Invoices Generated</div>
            </div>
            <div>
              <div className="font-display text-3xl md:text-4xl font-extrabold text-foreground">100%</div>
              <div className="mt-1 text-xs md:text-sm font-medium text-muted-foreground">GST & Tax Compliant</div>
            </div>
            <div>
              <div className="font-display text-3xl md:text-4xl font-extrabold text-emerald-600">99.9%</div>
              <div className="mt-1 text-xs md:text-sm font-medium text-muted-foreground">Cloud Uptime & Safety</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-20 bg-background">
        <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Interactive Preview</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold">
              Dekhein GSTMunshi.com kaise aapka kaam aasaan banata hai
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Niche diye gaye tabs par click karein aur software ke alag-alag features ka live preview dekhein.
            </p>
          </div>

          {/* Tabs header */}
          <div className="mt-10 flex overflow-x-auto sm:flex-wrap justify-start sm:justify-center gap-2 border-b border-border pb-4 w-full scrollbar-none snap-x snap-mandatory px-4 sm:px-0">
            {[
              { id: "billing", label: "📄 Billing & Tax Invoices", icon: Receipt },
              { id: "inventory", label: "📦 Inventory & Stock", icon: Boxes },
              { id: "gst", label: "📊 GSTR Reports", icon: BarChart3 },
              { id: "ledger", label: "👥 Party Ledgers", icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 snap-center ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="mt-8 max-w-none w-full mx-auto card-surface p-6 md:p-8 rounded-2xl border border-border bg-card shadow-xl">
            {activeTab === "billing" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold">Tax Invoice #INV-2026-0104</h3>
                    <p className="text-xs text-muted-foreground">Customer: Ramesh Electricals (GSTIN: 07AAAAA0000A1Z5)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                      <Printer className="h-3.5 w-3.5" /> Print / Thermal
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
                      <Send className="h-3.5 w-3.5" /> Send on WhatsApp
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                        <th className="p-3">Item Description</th>
                        <th className="p-3">HSN</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Rate (₹)</th>
                        <th className="p-3 text-right">GST %</th>
                        <th className="p-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-medium">
                      <tr>
                        <td className="p-3 font-semibold">Havells 1.5 Sqmm Copper Wire</td>
                        <td className="p-3 text-muted-foreground">8544</td>
                        <td className="p-3 text-center">10 Box</td>
                        <td className="p-3 text-right">1,450.00</td>
                        <td className="p-3 text-right">18%</td>
                        <td className="p-3 text-right font-bold">17,110.00</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Philips 12W LED Bulb</td>
                        <td className="p-3 text-muted-foreground">8539</td>
                        <td className="p-3 text-center">50 Pcs</td>
                        <td className="p-3 text-right">120.00</td>
                        <td className="p-3 text-right">12%</td>
                        <td className="p-3 text-right font-bold">6,720.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between pt-4 border-t border-border gap-4 text-xs sm:text-sm">
                  <div className="text-muted-foreground space-y-1">
                    <p><strong className="text-foreground">Payment Mode:</strong> UPI / Online Transfer</p>
                    <p><strong className="text-foreground">Terms:</strong> Goods once sold cannot be returned.</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex justify-between sm:justify-end gap-6 text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>₹ 20,500.00</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-muted-foreground">
                      <span>CGST (9%) + SGST (9%):</span>
                      <span>₹ 3,330.00</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-base font-bold text-foreground pt-2 border-t border-border">
                      <span>Grand Total:</span>
                      <span className="text-primary">₹ 23,830.00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "inventory" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="font-display text-xl font-bold">Inventory & Low-Stock Monitor</h3>
                    <p className="text-xs text-muted-foreground">Automatic stock deduction on every sale invoice</p>
                  </div>
                  <Button size="sm" className="gap-1 text-xs">
                    + Add New Product
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { name: "Basmati Rice 26kg Bag", category: "Grocery", stock: "45 Bags", status: "In Stock", alert: false },
                    { name: "Fortune Mustard Oil 1L", category: "Edible Oil", stock: "4 Bottles", status: "Low Stock Alert!", alert: true },
                    { name: "Tata Salt 1kg", category: "Grocery", stock: "120 Pcs", status: "In Stock", alert: false },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className={`p-4 rounded-xl border ${
                        item.alert ? "border-red-500/40 bg-red-500/5" : "border-border bg-background/50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-muted-foreground font-medium">{item.category}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.alert ? "bg-red-500/20 text-red-600" : "bg-emerald-500/20 text-emerald-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <h4 className="mt-2 font-bold text-sm text-foreground">{item.name}</h4>
                      <div className="mt-3 font-display text-lg font-extrabold text-primary">{item.stock}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "gst" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="font-display text-xl font-bold">GSTR-1 Monthly Return Summary</h3>
                    <p className="text-xs text-muted-foreground">Ready-to-file B2B, B2C and HSN summary for GST Portal</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    Download GSTR-1 Excel
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border">
                    <div className="text-xs text-muted-foreground font-medium">B2B Supplies</div>
                    <div className="mt-1 text-xl font-bold text-foreground">₹ 3,42,800</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border">
                    <div className="text-xs text-muted-foreground font-medium">B2C Retail</div>
                    <div className="mt-1 text-xl font-bold text-foreground">₹ 1,18,400</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border">
                    <div className="text-xs text-muted-foreground font-medium">Total Tax Liability</div>
                    <div className="mt-1 text-xl font-bold text-emerald-600">₹ 64,250</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border">
                    <div className="text-xs text-muted-foreground font-medium">HSN Summary</div>
                    <div className="mt-1 text-xl font-bold text-primary">18 Items</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ledger" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="font-display text-xl font-bold">Customer Udhari & Payment Reminders</h3>
                    <p className="text-xs text-muted-foreground">Send payment reminder links via WhatsApp in 1 click</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { party: "Mahavir Traders", phone: "+91 98112 34567", balance: "₹ 42,500", due: "15 Days Overdue" },
                    { party: "Singhania Stores", phone: "+91 98765 12345", balance: "₹ 18,200", due: "Due Tomorrow" },
                  ].map((p) => (
                    <div key={p.party} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-background/50 gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{p.party}</h4>
                        <div className="text-xs text-muted-foreground">{p.phone} • <span className="text-amber-600 font-semibold">{p.due}</span></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Pending Balance</div>
                          <div className="text-base font-bold text-red-600">{p.balance}</div>
                        </div>
                        <Button size="sm" className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
                          <Send className="h-3.5 w-3.5" /> Remind on WhatsApp
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Run Your Business from Anywhere Section */}
      <section className="py-20 bg-background overflow-hidden border-t border-border/60">
        <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 text-center lg:text-left space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Multi-Device Access</span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Run Your Business <br className="hidden sm:inline" />
                from Anywhere
              </h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Whether you're at the shop, at home, or on the move, your business stays with you on every device.
              </p>
              
              <div className="space-y-4 pt-4 max-w-md mx-auto lg:mx-0 text-left">
                {[
                  { label: "Available on PC, Web, Android & iOS", icon: Laptop },
                  { label: "Real-Time Sync Across Devices", icon: RefreshCw },
                  { label: "Access Business Data Anytime", icon: CalendarRange },
                  { label: "Multi-User Access for Teams", icon: Users },
                ].map((feat, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs">
                      <feat.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-foreground">{feat.label}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 h-12 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                    Sign up for free <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Side Mockup */}
            <div className="lg:col-span-6 relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary to-accent opacity-15 blur-2xl"></div>
              <img
                src="/device_mockup.jpg"
                alt="GST Munshi on Laptop and Mobile"
                className="relative mx-auto max-w-full h-auto rounded-2xl shadow-2xl border border-border/80 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Kaise Kaam Karta Hai (3 Steps) */}
      <section id="how-it-works" className="py-20 bg-muted/20 border-y border-border/60">
        <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Simple 3-Step Process</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold">
              Keval 2 minute mein billing shuru karein
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Koi mushkil configuration nahi. Bas 3 aasaan steps aur aapka digital hisab tayyar!
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative card-surface p-8 rounded-2xl border border-border bg-card text-center hover:shadow-lg transition-shadow">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-display font-bold text-lg shadow-md">
                1
              </div>
              <div className="mt-4 inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-4">
                <Building2 className="h-8 w-8" />
              </div>
              <h3 className="font-display text-xl font-bold">Dukaan Register Karein</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Apne business ka naam, mobile number aur GSTIN enter karein. Multi-branch ya multiple dukaan bhi add kar sakte hain.
              </p>
            </div>

            <div className="relative card-surface p-8 rounded-2xl border border-border bg-card text-center hover:shadow-lg transition-shadow">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-display font-bold text-lg shadow-md">
                2
              </div>
              <div className="mt-4 inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-4">
                <Boxes className="h-8 w-8" />
              </div>
              <h3 className="font-display text-xl font-bold">Items & Customers Add Karein</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Apne saare products, unka GST rate aur HSN code add karein. Excel sheet upload karke ek saath saare items import karein.
              </p>
            </div>

            <div className="relative card-surface p-8 rounded-2xl border border-border bg-card text-center hover:shadow-lg transition-shadow">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-display font-bold text-lg shadow-md">
                3
              </div>
              <div className="mt-4 inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-4">
                <Receipt className="h-8 w-8" />
              </div>
              <h3 className="font-display text-xl font-bold">1-Click Invoice & WhatsApp</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Customer ka name select karein, items pick karein aur bill banayein. Direct WhatsApp pe PDF bill bhejein ya print nikalein!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" className="py-20 bg-background">
        <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">All-in-One Capabilities</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold">
              Har feature jo ek Indian Vyapari ko chahiye
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              GSTMunshi.com ko khaas taur par Indian dukaandaron aur traders ki daily zarooraton ko dhyan me rakh kar banaya gaya hai.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Receipt,
                title: "GST Tax Invoice & Quotation",
                desc: "Auto CGST/SGST/IGST calculation, custom shop logo, thermal & A4 print ready. Professional estimate aur delivery challan banayein.",
              },
              {
                icon: Boxes,
                title: "Stock Management + HSN",
                desc: "Sales hone par stock automatic deduct hota hai. Low-stock alerts paayein taaki aapka koi fast-selling item khatam na ho.",
              },
              {
                icon: Users,
                title: "Customer & Supplier Udhar Ledger",
                desc: "Party wise opening balance, credit limits aur complete transaction statement dekhne ki suvidha. Polite WhatsApp reminders bhejein.",
              },
              {
                icon: FileCheck2,
                title: "GSTR-1 & 3B Filing Reports",
                desc: "Monthly GST filing ke liye auto-generated summaries. Outward taxable supply, HSN summary aur tax liability JSON / Excel me export karein.",
              },
              {
                icon: Smartphone,
                title: "Mobile & Desktop Compatible",
                desc: "Chahe aap dukaandar hain ya traveling salesperson — mobile, tablet ya laptop kisi bhi device par easily access karein.",
              },
              {
                icon: ShieldCheck,
                title: "Multi-Company & Secure Cloud",
                desc: "Ek hi account se multiple shops ya firms manage karein. Role-based staff access and 256-bit SSL encrypted safe backup.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="card-surface p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Reviews / Testimonials */}
      <section id="reviews" className="py-20 bg-muted/20 border-y border-border/60">
        <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Customer Testimonials</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold">
              Desh bhar ke Dukaandaron ka bharosa
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Suniyen hamare users kya kehte hain GSTMunshi.com ke baare mein.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "Pehle Tally me bill banana boht mushkil lagta tha. GSTMunshi.com aane ke baad mobile se 1 minute me bill ban jata hai aur WhatsApp par customer ko chala jata hai!",
                name: "Rajesh Sharma",
                role: "Sharma Kirana & General Store, Jaipur",
                rating: 5,
              },
              {
                quote: "GSTR-1 report ready milne se har mahine CA ko data bhejna boht aasaan ho gaya hai. Udhaar reminder feature se collection 30% fast ho gayi hai.",
                name: "Vikram Patel",
                role: "Patel Electricals & Hardware, Ahmedabad",
                rating: 5,
              },
              {
                quote: "Stock track karna and low stock alert milna sabse best lagta hai. Multi-user login ki wajah se meri dukaan ka staff bhi billing easily kar leta hai.",
                name: "Amitabh Gupta",
                role: "Gupta Garments Wholesalers, Delhi",
                rating: 5,
              },
            ].map((rev) => (
              <div key={rev.name} className="card-surface p-6 rounded-2xl border border-border bg-card flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 text-amber-500 mb-3">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                    "{rev.quote}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60">
                  <div className="font-bold text-sm text-foreground">{rev.name}</div>
                  <div className="text-[11px] text-muted-foreground font-medium">{rev.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-background">
        <div className="mx-auto max-w-[1100px] w-full px-4 md:px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Frequently Asked Questions</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold">
              Aapke Sawaal, Hamare Jawab
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {[
              {
                q: "Kya GSTMunshi.com ka use karne ke liye accounting seekhni padegi?",
                a: "Bilkul nahi! GSTMunshi.com ko iss tarah design kiya gaya hai ki bina kisi accounting training ke bhi koi bhi dukaandar 2 minute me bill banana shuru kar sakta hai.",
              },
              {
                q: "Kya main mobile phone se billing aur invoice generate kar sakta hun?",
                a: "Haan, GSTMunshi.com sabhi smartphones, tablets aur computers par perfectly chalta hai. Aap direct mobile se bill banakar WhatsApp par share kar sakte hain.",
              },
              {
                q: "GSTR-1 aur 3B filing reports kaise milti hain?",
                a: "Aap jo bhi sales aur purchase invoices banate hain, software unka automatic GST summary tayyar karta hai. Aap 1-click me Excel ya JSON download karke apne CA ko de sakte hain ya khud portal par upload kar sakte hain.",
              },
              {
                q: "Mera business data kitna safe aur secure hai?",
                a: "Aapka poora data 256-bit SSL encrypted cloud server par safe rehta hai. Automatic daily backups liye jaate hain taaki aapka data kabhi loss na ho.",
              },
              {
                q: "Kya main thermal printer se bill nikal sakta hun?",
                a: "Ji haan! GSTMunshi.com regular A4/A5 printers ke alawa 2-inch aur 3-inch POS thermal printers ko bhi full support karta hai.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="card-surface rounded-xl border border-border overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-sm sm:text-base flex justify-between items-center gap-4 hover:text-primary transition-colors"
                >
                  <span>{item.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 mt-1">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-[1600px] w-full px-4 md:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-white text-center shadow-2xl bg-gradient-to-r from-primary via-teal-700 to-emerald-700">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Aaj hi apni dukaan ko digital banayein!
            </h2>
            <p className="mt-4 text-base sm:text-lg opacity-90 leading-relaxed">
              5,000+ Indian businesses GSTMunshi.com ka use karke fast billing aur sahi accounting kar rahe hain. 
              Start free today — no credit card needed!
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-primary font-bold px-8 h-12 gap-2 text-base shadow-lg">
                  Create Free Account Now <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Footer */}
      <footer className="border-t border-border bg-card/80 text-foreground pt-16 pb-12">
        <div className="mx-auto max-w-[1600px] w-full px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-border/60">
            {/* Col 1: Brand Info */}
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="inline-block" title="GSTMunshi.com Home">
                <img
                  src="/logo.jpg"
                  alt="GSTMunshi.com Logo"
                  className="w-[200px] h-[100px] object-contain rounded-lg"
                />
              </Link>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
                India ka trusted GST billing, inventory & accounting software for dukaandars, retailers, wholesalers, and small enterprises.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <ShieldCheck className="h-4 w-4" /> Made with ❤️ in India for Indian Businesses
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Product Features
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">GST Tax Invoices</a></li>
                <li><a href="#features" className="hover:text-primary transition-colors">Inventory Tracker</a></li>
                <li><a href="#features" className="hover:text-primary transition-colors">Customer Udhar Ledger</a></li>
                <li><a href="#features" className="hover:text-primary transition-colors">GSTR-1 & 3B Reports</a></li>
                <li><a href="#features" className="hover:text-primary transition-colors">Thermal & A4 Print</a></li>
              </ul>
            </div>

            {/* Col 3: Important Pages / Legal */}
            <div className="space-y-3">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Important Pages
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>
                  <Link to="/terms" className="hover:text-primary transition-colors block text-left">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-primary transition-colors block text-left">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/refund" className="hover:text-primary transition-colors block text-left">
                    Refund & Cancellation Policy
                  </Link>
                </li>
                <li><a href="#faq" className="hover:text-primary transition-colors">Help & FAQ Center</a></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">User Login</Link></li>
              </ul>
            </div>

            {/* Col 4: Contact & Support */}
            <div className="space-y-3">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Contact & Support
              </h4>
              <div className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href="mailto:info@gstmunshi.com" className="hover:text-primary transition-colors">
                    support@gstmunshi.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
  <PhoneCall className="h-4 w-4 text-primary shrink-0" />
  <a
    href="tel:+919310811555"
    className="hover:text-primary cursor-pointer transition-colors"
  >
    +91 9310811555 (Mon-Sat, 9AM-7PM)
  </a>
</div>
                <div className="flex items-start gap-2 pt-1">
                  <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>GSTMunshi Tech Towers, New Delhi, India</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom copyright & compliance note */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div>
              © {new Date().getFullYear()} GSTMunshi.com. All rights reserved. Registered trademark.
            </div>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:underline">
                Terms of Service
              </Link>
              <span>•</span>
              <Link to="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/refund" className="hover:underline">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Documents Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-foreground max-w-2xl w-full max-h-[85vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-display text-lg font-bold">
                {legalModal === "terms" && "Terms & Conditions — GSTMunshi.com"}
                {legalModal === "privacy" && "Privacy Policy — GSTMunshi.com"}
                {legalModal === "refund" && "Refund & Cancellation Policy"}
              </h3>
              <button
                onClick={() => setLegalModal(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs sm:text-sm text-muted-foreground space-y-4 leading-relaxed">
              {legalModal === "terms" && (
                <>
                  <p className="font-semibold text-foreground">1. Introduction & Acceptance</p>
                  <p>Welcome to GSTMunshi.com. By registering or using our billing, accounting, and inventory services, you agree to comply with these terms.</p>
                  <p className="font-semibold text-foreground">2. User Accounts & Data Security</p>
                  <p>You are responsible for maintaining the confidentiality of your login credentials and OTPs. GSTMunshi.com stores your data using 256-bit encryption.</p>
                  <p className="font-semibold text-foreground">3. GST Compliance & Accounting Usage</p>
                  <p>GSTMunshi.com provides GST tax invoice generation and GSTR report summaries based on user input. Users are responsible for verifying their final tax filings with their CA or tax advisor.</p>
                </>
              )}

              {legalModal === "privacy" && (
                <>
                  <p className="font-semibold text-foreground">1. Data We Collect</p>
                  <p>We collect your business name, mobile number, GSTIN, invoice details, and customer master lists to provide billing and inventory services.</p>
                  <p className="font-semibold text-foreground">2. How We Protect Your Data</p>
                  <p>Your business records are strictly private. GSTMunshi.com does not sell or rent your business data to any third party.</p>
                  <p className="font-semibold text-foreground">3. Cloud Backup</p>
                  <p>Automated cloud backup runs continuously to protect your business records from loss.</p>
                </>
              )}

              {legalModal === "refund" && (
                <>
                  <p className="font-semibold text-foreground">1. Subscription & Free Tier</p>
                  <p>GSTMunshi.com offers a free plan for small businesses. Paid plans come with a 7-day money-back guarantee.</p>
                  <p className="font-semibold text-foreground">2. Cancellation Policy</p>
                  <p>You can cancel your subscription at any time from your account settings without any cancellation fees.</p>
                </>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 text-right">
              <Button size="sm" onClick={() => setLegalModal(null)}>
                Close Window
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
