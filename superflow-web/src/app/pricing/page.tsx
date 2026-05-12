"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, XCircle, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { PrioraFlowLogo } from "@/components/brand/prioraflow-logo";

interface PlanFeature {
  key: string;
  isIncluded: boolean;
  ceiling: number | null;
  overageUnitCents: number;
}

interface PlanPricing {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  displayName: string;
  features: PlanFeature[];
}

const FEATURE_LABELS: Record<string, string> = {
  job_board: "Job board",
  stages: "Job stages & Kanban",
  customer_approval: "Customer approval portal",
  dvi_reports: "DVI reports",
  estimates: "Estimates & quotes",
  ai_scored_jobs: "AI-scored jobs",
  customer_approval_sms: "Customer approval SMS",
  priority_engine: "Priority Engine",
  nba: "Next Best Actions",
  delivery_risk: "Delivery risk alerts",
  multi_shop: "Multi-Shop",
  advisor_workload: "Advisor workload",
  ai_message_drafts: "AI message drafts",
  analytics: "Analytics dashboard",
  max_users: "Max users",
  max_locations: "Max locations",
};

const COMPARISON_FEATURES = [
  "job_board", "stages", "customer_approval", "dvi_reports", "estimates",
  "ai_scored_jobs", "customer_approval_sms",
  "priority_engine", "nba", "delivery_risk",
  "multi_shop", "advisor_workload", "ai_message_drafts", "analytics",
  "max_users", "max_locations",
];

function formatPrice(cents: number, currency: string): string {
  if (currency === "AED") return `AED ${Math.round(cents / 100).toLocaleString()}`;
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function formatFeatureValue(feature: PlanFeature): string {
  if (!feature.isIncluded) return "";
  if (feature.key === "max_users") return feature.ceiling ? `${feature.ceiling} users` : "Unlimited";
  if (feature.key === "max_locations") return feature.ceiling ? `${feature.ceiling} location${feature.ceiling > 1 ? "s" : ""}` : "Unlimited";
  if (feature.ceiling === null) return "Unlimited";
  return `${feature.ceiling}/mo`;
}

function FeatureCell({ feature }: { feature: PlanFeature }) {
  if (!feature.isIncluded) {
    return <XCircle className="h-4 w-4 text-slate-300" />;
  }
  const val = formatFeatureValue(feature);
  if (val && val !== "Unlimited") {
    return <span className="text-sm font-medium">{val}</span>;
  }
  return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
}

const faqs = [
  {
    question: "Is payment required to start?",
    answer: "No. New workshops start with a 14-day free trial with full Starter access. No credit card required.",
  },
  {
    question: "What happens when my trial expires?",
    answer: "You can still view your data in read-only mode. Mutations (creating, updating, deleting) are blocked until you activate a paid plan. Contact us to get started.",
  },
  {
    question: "Can I upgrade later?",
    answer: "Yes. You can upgrade from Starter to Professional or Enterprise at any time. Your data carries over and new features unlock immediately.",
  },
  {
    question: "Is there a per-user fee?",
    answer: "No. Each plan includes a set number of users. Additional users can be added with add-on packs. We don't charge per seat like legacy DMS systems.",
  },
];

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<"gcc" | "us">("gcc");

  useEffect(() => {
    const saved = localStorage.getItem("sf_pricing_region");
    if (saved === "us" || saved === "gcc") setRegion(saved);
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/billing/pricing?region=${region}`)
      .then(r => r.json())
      .then(data => { setPlans(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [region]);

  const toggleRegion = (r: "gcc" | "us") => {
    setRegion(r);
    localStorage.setItem("sf_pricing_region", r);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_32rem),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#f8fafc_100%)] text-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="PrioraFlow home">
          <PrioraFlowLogo imageClassName="h-20 w-auto" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#features" className="hover:text-slate-950">Features</Link>
          <Link href="/#engine" className="hover:text-slate-950">Priority engine</Link>
          <Link href="/pricing" className="text-slate-950">Pricing</Link>
        </nav>
        <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
          Sign in
        </Link>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 pb-8 pt-10 text-center sm:px-8 lg:pt-16">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-sm font-medium text-blue-700 shadow-sm">
          <Sparkles className="h-4 w-4" />
          14-day free trial · no credit card required
        </div>
        <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
          Simple, powerful packages for workshop flow control.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Start with a free trial, choose the right package, and scale as your operation grows.
        </p>

        {/* Region toggle */}
        <div className="mx-auto mt-6 flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm w-fit">
          <button
            onClick={() => toggleRegion("gcc")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${region === "gcc" ? "bg-slate-950 text-white" : "text-slate-600 hover:text-slate-950"}`}
          >
            GCC / MENA (AED)
          </button>
          <button
            onClick={() => toggleRegion("us")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${region === "us" ? "bg-slate-950 text-white" : "text-slate-600 hover:text-slate-950"}`}
          >
            US / Global (USD)
          </button>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 sm:px-8 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-4 py-20 text-center text-muted-foreground">Loading plans...</div>
        ) : (
          [...plans].sort((a, b) => a.price - b.price).map((plan) => {
            const isPro = plan.id === "professional";
            const featureMap = new Map(plan.features.map(f => [f.key, f]));
            return (
              <div key={plan.id} className={`relative rounded-[2rem] border p-6 shadow-sm ${isPro ? "border-blue-300 bg-blue-600 text-white shadow-2xl shadow-blue-600/20" : "border-slate-200 bg-white"}`}>
                {isPro && (
                  <div className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                    Recommended
                  </div>
                )}
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <p className={`mt-3 min-h-14 text-sm leading-6 ${isPro ? "text-blue-50" : "text-slate-600"}`}>{plan.description}</p>
                <div className="mt-6 flex items-end gap-2">
                  <p className="text-4xl font-black">{formatPrice(plan.price, plan.currency)}</p>
                  <p className={`pb-1 text-sm font-semibold ${isPro ? "text-blue-100" : "text-slate-500"}`}>/ month</p>
                </div>
                <Link
                  href="/signup"
                  className={`mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-black transition ${isPro ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-slate-950 text-white hover:bg-slate-800"}`}
                >
                  Start 14-day trial <ArrowRight className="h-4 w-4" />
                </Link>
                <ul className="mt-7 space-y-3">
                  {COMPARISON_FEATURES.map(key => {
                    const feature = featureMap.get(key);
                    if (!feature) return null;
                    return (
                      <li key={key} className="flex items-start gap-2 text-sm font-semibold">
                        {feature.isIncluded ? (
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${isPro ? "text-blue-100" : "text-blue-600"}`} />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-30" />
                        )}
                        <span className={`${isPro ? "text-blue-50" : "text-slate-700"} ${!feature.isIncluded ? "opacity-50" : ""}`}>
                          {FEATURE_LABELS[key] || key}
                          {feature.isIncluded && feature.ceiling !== null && feature.key !== "max_users" && feature.key !== "max_locations"
                            ? ` (${formatFeatureValue(feature)})`
                            : feature.isIncluded && (feature.key === "max_users" || feature.key === "max_locations")
                            ? ` — ${formatFeatureValue(feature)}`
                            : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </section>

      {/* Add-on section */}
      <section className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Add-ons</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">MultiShop</h3>
              <p className="mt-1 text-sm text-slate-600">Additional location beyond included allowance</p>
              <p className="mt-2 text-lg font-black text-blue-700">
                {region === "gcc" ? "+AED 550/mo" : "+$100/mo"} <span className="text-sm font-medium text-slate-500">per location</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ + Payment flexibility */}
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <CreditCard className="mb-4 h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-black">Payment stays flexible.</h2>
          <p className="mt-3 leading-7 text-slate-600">
            PrioraFlow stores subscriptions, invoices, and payments separately from any gateway. Start with manual payments (bank transfer, cash) and connect a payment gateway later without rebuilding your billing setup.
          </p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            Available gateways: Manual / Bank Transfer, Tap Payments, PayTabs, Network International, Stripe
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldCheck className="mb-4 h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-black">Frequently asked</h2>
          <div className="mt-5 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-black text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}