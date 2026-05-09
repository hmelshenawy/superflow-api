import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { PrioraFlowLogo } from "@/components/brand/prioraflow-logo";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "AED 490",
    description: "For a small workshop or single service-advisor team starting with priority control.",
    highlight: false,
    features: [
      "Up to 5 users",
      "300 jobs / month",
      "Priority cockpit + Next Best Action",
      "Customer informed tracking",
      "Deferred work follow-up",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "AED 990",
    description: "For growing service centers that need stronger visibility and team accountability.",
    highlight: true,
    features: [
      "Up to 20 users",
      "1,500 jobs / month",
      "Everything in Starter",
      "Advanced priority matrix controls",
      "Management insights dashboard",
      "Import templates and operations reporting",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "For multi-branch groups, larger operations, or custom integration requirements.",
    highlight: false,
    features: [
      "Custom users and job volume",
      "Multi-workshop setup",
      "Custom onboarding",
      "Integration planning",
      "SLA and dedicated support options",
      "Gateway/payment setup support",
    ],
  },
];

const faqs = [
  {
    question: "Is payment required to start?",
    answer: "No. New workshops start with a 14-day free trial. Payment can be handled manually first, then connected to a gateway later.",
  },
  {
    question: "Which payment gateway is supported?",
    answer: "The billing system is gateway-agnostic. Tap, PayTabs, Network International, Stripe, or another provider can be connected later without changing the core subscription/invoice records.",
  },
  {
    question: "Can pricing change later?",
    answer: "Yes. These packages are an initial commercial structure. Plan limits and prices can be adjusted before public launch.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_32rem),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#f8fafc_100%)] text-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="PrioraFlow home">
          <PrioraFlowLogo imageClassName="h-14 w-auto" />
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

      <section className="mx-auto w-full max-w-7xl px-5 pb-12 pt-10 text-center sm:px-8 lg:pt-16">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-sm font-medium text-blue-700 shadow-sm">
          <Sparkles className="h-4 w-4" />
          14-day free trial · gateway-agnostic billing
        </div>
        <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
          Simple packages for workshop flow control.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Start with a free trial, choose the right package, and connect the payment gateway later when the UAE payment setup is finalized.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 sm:px-8 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className={`relative rounded-[2rem] border p-6 shadow-sm ${plan.highlight ? "border-blue-300 bg-blue-600 text-white shadow-2xl shadow-blue-600/20" : "border-slate-200 bg-white"}`}>
            {plan.highlight && (
              <div className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Recommended
              </div>
            )}
            <h2 className="text-2xl font-black">{plan.name}</h2>
            <p className={`mt-3 min-h-14 text-sm leading-6 ${plan.highlight ? "text-blue-50" : "text-slate-600"}`}>{plan.description}</p>
            <div className="mt-6 flex items-end gap-2">
              <p className="text-4xl font-black">{plan.price}</p>
              {plan.price !== "Custom" && <p className={`pb-1 text-sm font-semibold ${plan.highlight ? "text-blue-100" : "text-slate-500"}`}>/ month</p>}
            </div>
            <Link
              href="/signup"
              className={`mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-black transition ${plan.highlight ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-slate-950 text-white hover:bg-slate-800"}`}
            >
              Start 14-day trial <ArrowRight className="h-4 w-4" />
            </Link>
            <ul className="mt-7 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm font-semibold">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-blue-100" : "text-blue-600"}`} />
                  <span className={plan.highlight ? "text-blue-50" : "text-slate-700"}>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <CreditCard className="mb-4 h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-black">Payment setup stays flexible.</h2>
          <p className="mt-3 leading-7 text-slate-600">
            PrioraFlow stores subscriptions, invoices, payments, and gateway references separately. That means manual payments can work now, and online checkout can be added later without rebuilding the commercial model.
          </p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            Candidate gateways: Manual / Bank Transfer, Tap Payments, PayTabs, Network International, Stripe later if available.
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
