"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Gauge,
  Landmark,
  Package,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
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

type ProductKey = "connect" | "workshop";

const PRODUCT_MULTIPLIER: Record<ProductKey, number> = {
  connect: 1,
  workshop: 1.5,
};

const FALLBACK_PLANS: PlanPricing[] = [
  { id: "starter", name: "Starter", displayName: "Starter", description: "Core operational visibility for a single location.", price: 73000, currency: "AED", features: [] },
  { id: "professional", name: "Professional", displayName: "Professional", description: "Priority engine, next best actions, and deeper team control.", price: 165000, currency: "AED", features: [] },
  { id: "enterprise", name: "Enterprise", displayName: "Enterprise", description: "Multi-branch dashboards, management analytics, and expanded limits.", price: 257000, currency: "AED", features: [] },
];

const TIER_SUMMARY: Record<string, string[]> = {
  starter: ["Single location", "Core WIP visibility", "Standard reports"],
  professional: ["Priority engine", "Next Best Action", "Bottleneck alerts"],
  enterprise: ["Multi-branch analytics", "Management dashboards", "Custom expansion"],
};

const PRODUCT_DETAILS: Record<ProductKey, {
  name: string;
  eyebrow: string;
  description: string;
  icon: typeof Gauge;
  color: string;
  included: string[];
  notIncluded?: string[];
}> = {
  connect: {
    name: "PrioraFlow Connect",
    eyebrow: "DMS-connected intelligence",
    description: "For dealers and workshops that already have a DMS and need live operational visibility on top of it.",
    icon: Zap,
    color: "blue",
    included: [
      "DMS integration settings",
      "WIP board and workshop loading",
      "Capacity management",
      "Priority queue and Next Best Action",
      "Bottlenecks and idle time alerts",
      "Advisor, technician, and branch performance",
      "Financial analytics when DMS data is available",
    ],
    notIncluded: [
      "Native invoicing",
      "Native stock ownership",
      "Full accounting",
      "Parts master ownership",
      "DMS replacement workflows",
    ],
  },
  workshop: {
    name: "PrioraFlow Workshop",
    eyebrow: "Standalone workshop OS",
    description: "For workshops with no existing DMS that need a full operating system from booking to invoice.",
    icon: Wrench,
    color: "slate",
    included: [
      "Appointment booking",
      "Job cards and WIP tracking",
      "Customer and vehicle records",
      "Technician assignment",
      "Parts and stock management",
      "Estimates and quotations",
      "Native invoicing",
      "Operational analytics",
    ],
  },
};

const productOrder: ProductKey[] = ["connect", "workshop"];

const faqs = [
  {
    question: "Why is PrioraFlow Workshop 50% higher?",
    answer: "Workshop includes native operating-system modules such as appointments, customer and vehicle ownership, stock, estimates, and invoicing. Connect is lighter because the DMS remains the system of record.",
  },
  {
    question: "Can an account move between products?",
    answer: "Yes. Platform admins can convert a workshop between PrioraFlow Workshop and PrioraFlow Connect. The account then sees only the modules available for that product.",
  },
  {
    question: "Do both products have Starter, Professional, and Enterprise?",
    answer: "Yes. Each product has its own tier ladder. Connect pricing is the base line; Workshop uses the same tier structure at 1.5x.",
  },
  {
    question: "Does Connect include financial analytics?",
    answer: "Only when those fields are available from the connected DMS. Connect does not create native invoices or become the accounting source of truth.",
  },
];

function formatPrice(cents: number, currency: string): string {
  if (currency === "AED") return `AED ${Math.round(cents / 100).toLocaleString()}`;
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function productPrice(plan: PlanPricing, product: ProductKey) {
  return Math.round(plan.price * PRODUCT_MULTIPLIER[product]);
}

function tierName(plan: PlanPricing) {
  const id = plan.id.toLowerCase();
  if (id.includes("starter")) return "Starter";
  if (id.includes("professional") || id.includes("pro")) return "Professional";
  if (id.includes("enterprise")) return "Enterprise";
  return plan.displayName || plan.name;
}

function normalizedTierId(plan: PlanPricing) {
  const id = plan.id.toLowerCase();
  if (id.includes("professional") || id.includes("pro")) return "professional";
  if (id.includes("enterprise")) return "enterprise";
  return "starter";
}

function PackageCard({ product, plan, recommended }: { product: ProductKey; plan: PlanPricing; recommended?: boolean }) {
  const tierId = normalizedTierId(plan);
  const price = productPrice(plan, product);
  const workshop = product === "workshop";

  return (
    <div className={`relative rounded-2xl border p-5 shadow-sm ${recommended ? "border-blue-300 bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "border-slate-200 bg-white"}`}>
      {recommended && (
        <div className="absolute right-4 top-4 rounded-full bg-white px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
          Popular
        </div>
      )}
      <p className={`text-xs font-black uppercase tracking-[0.18em] ${recommended ? "text-blue-100" : workshop ? "text-slate-500" : "text-blue-600"}`}>
        {PRODUCT_DETAILS[product].name}
      </p>
      <h3 className="mt-2 text-2xl font-black">{tierName(plan)}</h3>
      <p className={`mt-3 min-h-12 text-sm leading-6 ${recommended ? "text-blue-50" : "text-slate-600"}`}>
        {TIER_SUMMARY[tierId]?.join(" · ") || plan.description}
      </p>
      <div className="mt-5 flex items-end gap-2">
        <p className="text-4xl font-black">{formatPrice(price, plan.currency)}</p>
        <p className={`pb-1 text-sm font-semibold ${recommended ? "text-blue-100" : "text-slate-500"}`}>/ month</p>
      </div>
      {workshop && (
        <p className={`mt-2 text-xs font-semibold ${recommended ? "text-blue-100" : "text-slate-500"}`}>
          50% higher than Connect for full standalone ownership
        </p>
      )}
      <Link
        href="/signup"
        className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-black transition ${recommended ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-slate-950 text-white hover:bg-slate-800"}`}
      >
        Start trial <ArrowRight className="h-4 w-4" />
      </Link>
      <ul className="mt-6 space-y-2.5">
        {(TIER_SUMMARY[tierId] || []).map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm font-semibold">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${recommended ? "text-blue-100" : "text-blue-600"}`} />
            <span className={recommended ? "text-blue-50" : "text-slate-700"}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<"gcc" | "us">("gcc");

  useEffect(() => {
    const saved = localStorage.getItem("sf_pricing_region");
    if (saved === "us" || saved === "gcc") setRegion(saved);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/billing/pricing?region=${region}`)
      .then((r) => r.json())
      .then((data) => { setPlans(Array.isArray(data) && data.length ? data : FALLBACK_PLANS); setLoading(false); })
      .catch(() => { setPlans(FALLBACK_PLANS); setLoading(false); });
  }, [region]);

  const visiblePlans = useMemo(() => {
    return [...(plans.length ? plans : FALLBACK_PLANS)]
      .filter((plan) => !plan.id.toLowerCase().includes("trial"))
      .sort((a, b) => a.price - b.price);
  }, [plans]);

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
          <Link href="/#products" className="hover:text-slate-950">Products</Link>
          <Link href="/pricing" className="text-slate-950">Pricing</Link>
        </nav>
        <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
          Sign in
        </Link>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 pb-8 pt-10 text-center sm:px-8 lg:pt-16">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-sm font-medium text-blue-700 shadow-sm">
          <Sparkles className="h-4 w-4" />
          Two products · each with its own tier ladder
        </div>
        <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
          Choose the PrioraFlow product that matches your workshop stack.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Connect is the DMS-connected intelligence layer. Workshop is the full standalone operating system and is priced 50% above the equivalent Connect tier.
        </p>

        <div className="mx-auto mt-6 flex w-fit items-center justify-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
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

      <section id="products" className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 sm:px-8 lg:grid-cols-2">
        {productOrder.map((product) => {
          const item = PRODUCT_DETAILS[product];
          const Icon = item.icon;
          return (
            <div key={product} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${product === "connect" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-800"}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{item.eyebrow}</p>
                  <h2 className="mt-1 text-2xl font-black">{item.name}</h2>
                  <p className="mt-2 leading-7 text-slate-600">{item.description}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {item.included.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              {item.notIncluded && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-black text-slate-900">Not included in Connect</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.notIncluded.map((feature) => (
                      <span key={feature} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <XCircle className="h-3.5 w-3.5" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-500">Loading packages...</div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-2">
            {productOrder.map((product) => (
              <div key={product}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">{PRODUCT_DETAILS[product].eyebrow}</p>
                    <h2 className="mt-1 text-3xl font-black">{PRODUCT_DETAILS[product].name} tiers</h2>
                  </div>
                  {product === "workshop" && (
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">+50%</span>
                  )}
                </div>
                <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  {visiblePlans.map((plan) => (
                    <PackageCard
                      key={`${product}-${plan.id}`}
                      product={product}
                      plan={plan}
                      recommended={product === "connect" && normalizedTierId(plan) === "professional"}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-10 sm:px-8 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Gauge className="mb-4 h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-black">Starter</h3>
          <p className="mt-2 leading-7 text-slate-600">Best for getting visibility into daily workload and basic operational control.</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <Package className="mb-4 h-6 w-6 text-blue-700" />
          <h3 className="text-xl font-black">Professional</h3>
          <p className="mt-2 leading-7 text-blue-950/80">Adds the priority engine, Next Best Action, and stronger bottleneck management.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <BarChart3 className="mb-4 h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-black">Enterprise</h3>
          <p className="mt-2 leading-7 text-slate-600">Built for multi-branch management, executive dashboards, and custom rollout needs.</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <CreditCard className="mb-4 h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-black">Payment stays flexible.</h2>
          <p className="mt-3 leading-7 text-slate-600">
            PrioraFlow keeps subscriptions, invoices, and payments separate from payment gateways. Start with manual payment and connect a gateway later.
          </p>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            Available gateways: Manual / Bank Transfer, Tap Payments, PayTabs, Network International, Stripe
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldCheck className="mb-4 h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-black">Frequently asked</h2>
          <div className="mt-5 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-black text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-4 sm:px-8">
        <div className="rounded-2xl bg-slate-950 p-8 text-center text-white shadow-2xl shadow-slate-300/60 sm:p-12">
          <Landmark className="mx-auto mb-4 h-8 w-8 text-blue-300" />
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">One platform, two product paths.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Choose Connect when your DMS remains the source of truth. Choose Workshop when PrioraFlow runs the full operation.
          </p>
          <Link href="/signup" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-blue-50">
            Start 14-day trial <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
