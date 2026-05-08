import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Gauge,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

const painPoints = [
  "Promised delivery times get missed before anyone notices.",
  "Parts delays and idle vehicles hide inside WhatsApp groups and spreadsheets.",
  "Managers keep walking the floor because there is no live operational picture.",
  "Service advisors lose time deciding which customer or vehicle needs attention first.",
];

const features = [
  {
    icon: Gauge,
    title: "Live priority score",
    description:
      "Every job gets a 0–100 priority score based on promised time, waiting status, customer urgency, parts risk, and operational delay.",
  },
  {
    icon: ListChecks,
    title: "Next Best Action",
    description:
      "PrioraFlow does not only show status. It tells the team the next practical action: inform customer, chase parts, start work, QC, or prepare handover.",
  },
  {
    icon: MessageSquareText,
    title: "Customer informed flow",
    description:
      "Track when customers were last updated and surface overdue follow-ups before frustration becomes a complaint.",
  },
  {
    icon: BarChart3,
    title: "Management visibility",
    description:
      "Owners and managers see the whole operation in one board: reception, workshop, parts, delivery risk, accountability, and blockers.",
  },
];

const steps = [
  "Import or create active bookings.",
  "Assign advisors, technicians, promised dates, parts status, and workshop stage.",
  "Let the priority engine rank the work automatically.",
  "Use Next Best Action to move each vehicle forward.",
  "Review bottlenecks, deferred work, approvals, and customer follow-up from one cockpit.",
];

const audiences = [
  "Service center owners",
  "General managers",
  "Workshop controllers",
  "Service advisors",
  "Technicians",
  "Parts coordinators",
];

const priorityCategories = [
  {
    title: "Promise Risk",
    strength: "Protects delivery commitment",
    description: "Flags jobs before the promised time is missed, with the strongest weight when already overdue.",
    items: ["Promise overdue", "Due within 2 hours", "Due within 6 hours", "No promised date set"],
  },
  {
    title: "Customer Pressure",
    strength: "Protects customer experience",
    description: "Raises priority when the customer is physically waiting or the relationship needs extra care.",
    items: ["Customer waiting", "Angry / complaint risk", "VIP customer", "Comeback case"],
  },
  {
    title: "Customer Decision",
    strength: "Unblocks advisor follow-up",
    description: "Keeps estimate-sent jobs visible while the workshop is waiting for approval or customer reply.",
    items: ["Waiting customer decision after estimate sent"],
  },
  {
    title: "Parts Risk",
    strength: "Exposes hidden workshop blockers",
    description: "Turns parts problems into visible operational risk instead of letting vehicles sit silently.",
    items: ["Parts backorder", "Waiting warehouse", "Parts need order / waiting parts"],
  },
  {
    title: "Idle / Delay Risk",
    strength: "Finds stuck vehicles",
    description: "Detects jobs with no recent movement so management can intervene before delay becomes normal.",
    items: ["Idle 24h+", "Idle 12h+", "Idle 6h+"],
  },
  {
    title: "Stage Urgency",
    strength: "Pushes critical workflow points",
    description: "Gives extra focus to active diagnosis and QC/near-delivery stages where timing matters.",
    items: ["Checking / diagnosis", "Quality check / near delivery"],
  },
  {
    title: "Ready to Inform",
    strength: "Prevents finished cars sitting idle",
    description: "Highlights vehicles ready for collection when the customer still has not been informed.",
    items: ["Ready but customer not informed"],
  },
  {
    title: "Value Weight",
    strength: "Keeps revenue visible",
    description: "Adds a business-value nudge so high-value estimates receive the right attention.",
    items: ["Estimate 10k+ AED", "Estimate 5k+ AED"],
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_32rem),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#f8fafc_100%)] text-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="PrioraFlow home">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">PrioraFlow</p>
            <p className="text-xs text-slate-500">Clarity in every step</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-950">Features</a>
          <a href="#engine" className="hover:text-slate-950">Priority engine</a>
          <a href="#tutorial" className="hover:text-slate-950">How it works</a>
          <a href="#value" className="hover:text-slate-950">Why it matters</a>
        </nav>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-sm font-medium text-blue-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            AI-powered flow control for service centers
          </div>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Every vehicle. One clear next step.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            PrioraFlow shows which job needs attention now, why it matters, and what action should happen next — bringing clarity in every step.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#tutorial"
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80">
          <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Priority cockpit</p>
                <p className="text-xl font-bold">Today’s active flow</p>
              </div>
              <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">Live</div>
            </div>
            {[
              ["A-1042", "VIP waiting approval", "92", "Call customer now"],
              ["B-2218", "Parts ETA overdue", "84", "Escalate parts"],
              ["C-7781", "QC before handover", "71", "Final inspection"],
            ].map(([job, status, score, action]) => (
              <div key={job} className="mb-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold">{job}</p>
                    <p className="mt-1 text-sm text-slate-400">{status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-300">{score}</p>
                    <p className="text-xs text-slate-500">priority</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-200">
                  Next best action: {action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="value" className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">The problem</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Busy workshops do not fail from lack of effort. They fail from lack of visibility.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {painPoints.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Clock3 className="mb-4 h-5 w-5 text-blue-600" />
                <p className="font-semibold leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">What PrioraFlow does</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">From job tracking to priority-driven operations.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="engine" className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">Priority engine strength</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Priority is not one rule. It is a weighted decision system.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              PrioraFlow starts every job with a base score, then adds points from real operational categories. The result is capped at 100 and translated into Low, Normal, High, or Critical urgency.
            </p>
            <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-blue-950">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">Formula</p>
              <p className="mt-2 font-mono text-sm font-bold sm:text-base">Priority = min(100, 10 + active weighted factors)</p>
              <p className="mt-3 text-sm leading-6 text-blue-900/80">
                Most groups apply the strongest matching item only. Customer waiting can stack with customer sensitivity, because a waiting angry/VIP/comeback customer is genuinely more urgent.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {priorityCategories.map((category) => (
              <div key={category.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black">{category.title}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{category.strength}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{category.items.length}</span>
                </div>
                <p className="text-sm leading-6 text-slate-600">{category.description}</p>
                <ul className="mt-4 space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section id="tutorial" className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">Quick tutorial</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">How the daily flow works.</h2>
              <p className="mt-4 text-slate-300">
                The main landing page should teach this simple story: create/import jobs, let priority scoring rank them, then execute the next best action until delivery.
              </p>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-black">{index + 1}</div>
                  <p className="pt-1 font-semibold text-slate-100">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-14 sm:px-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Users className="mb-4 h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-black">Built for the full team</h3>
          <div className="mt-5 flex flex-wrap gap-2">
            {audiences.map((audience) => (
              <span key={audience} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{audience}</span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldCheck className="mb-4 h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-black">Role-based control</h3>
          <p className="mt-3 leading-7 text-slate-600">Managers see everything. Advisors see their jobs. Technicians see assigned work. Everyone gets the right level of focus.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <CheckCircle2 className="mb-4 h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-black">Clear business outcome</h3>
          <p className="mt-3 leading-7 text-slate-600">Fewer missed promises, faster response to stuck vehicles, better customer updates, and clearer accountability across the workshop.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-8 sm:px-8">
        <div className="rounded-[2rem] bg-blue-600 p-8 text-center text-white shadow-2xl shadow-blue-600/20 sm:p-12">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Ready to control the flow?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-blue-50">Use PrioraFlow as the cockpit for every active job — from booking to handover.</p>
          <Link href="/signup" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-blue-700 transition hover:bg-blue-50">
            Sign in to PrioraFlow <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
