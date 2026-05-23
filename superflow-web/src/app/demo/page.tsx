import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  CirclePlay,
  Clock3,
  Gauge,
  MessageCircle,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PrioraFlowLogo } from "@/components/brand/prioraflow-logo";

export const metadata: Metadata = {
  title: "PrioraFlow Demo | Workshop Operations Intelligence",
  description:
    "See how PrioraFlow helps modern automotive workshops improve visibility, priority, and operational flow.",
};

const bookDemoHref = "/book-demo";
const whatsappHref = "https://wa.me/971501234567";
const youtubeEmbedHref = "https://www.youtube.com/embed/YOUTUBE_VIDEO_ID";
const youtubeWatchHref = "https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID";

const kpis = [
  { label: "Active Jobs", value: "24" },
  { label: "Awaiting Approval", value: "3" },
  { label: "Delayed Jobs", value: "2" },
  { label: "Efficiency", value: "87%" },
];

const problems = [
  "No clear job priority",
  "Idle vehicles stay unnoticed",
  "Delayed approvals slow delivery",
  "Managers coach without reliable data",
];

const capabilities = [
  {
    icon: Route,
    title: "Workflow Intelligence",
    description: "See every job stage in real time.",
  },
  {
    icon: Sparkles,
    title: "Smart Priority Engine",
    description: "Know what needs action now.",
  },
  {
    icon: BarChart3,
    title: "Operational Visibility",
    description: "Track performance, bottlenecks, and progress instantly.",
  },
];

const jobRows = [
  { job: "PF-1042", vehicle: "Range Rover Sport", stage: "Approval", score: 96, action: "Call customer" },
  { job: "PF-1187", vehicle: "BMW X5", stage: "Parts", score: 82, action: "Escalate ETA" },
  { job: "PF-1231", vehicle: "Mercedes C300", stage: "QC", score: 74, action: "Final check" },
];

function CtaButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark";
}) {
  const variants = {
    primary:
      "bg-[#0A66FF] text-white shadow-lg shadow-blue-600/20 hover:bg-[#0757dd]",
    secondary:
      "border border-[#E5EAF0] bg-white text-[#0B1220] shadow-sm hover:border-blue-200 hover:bg-blue-50/60",
    dark: "bg-[#0B1220] text-white shadow-lg shadow-slate-950/15 hover:bg-[#152238]",
  };

  return (
    <Link
      href={href}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition duration-200 hover:-translate-y-0.5 ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] text-[#0B1220] [font-family:var(--font-geist-sans)]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:py-6">
        <Link href="/" aria-label="PrioraFlow home">
          <PrioraFlowLogo imageClassName="h-14 w-auto sm:h-16" />
        </Link>
        <div className="hidden items-center gap-3 sm:flex">
          <CtaButton href={whatsappHref} variant="secondary">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </CtaButton>
          <CtaButton href={bookDemoHref}>
            Book Demo
            <ArrowRight className="h-4 w-4" />
          </CtaButton>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pb-20 lg:pt-14">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-bold uppercase text-[#0A66FF] shadow-sm">
            <Gauge className="h-4 w-4" />
            Workshop Operations Intelligence
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.02] text-[#0B1220] sm:text-6xl lg:text-7xl">
            Turn Workshop Chaos Into Operational Flow.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            PrioraFlow gives modern workshops live visibility, smart prioritization, and operational control across every active job.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <CtaButton href={bookDemoHref}>
              <CalendarCheck className="h-4 w-4" />
              Book Demo
            </CtaButton>
            <CtaButton href={whatsappHref} variant="secondary">
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </CtaButton>
            <a
              href="#walkthrough"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E5EAF0] bg-white px-5 text-sm font-bold text-[#0B1220] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60"
            >
              <CirclePlay className="h-4 w-4" />
              Watch Walkthrough
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-3 shadow-2xl shadow-slate-200/70">
          <div className="aspect-video overflow-hidden rounded-2xl bg-[#08111F]">
            <video
              className="h-full w-full object-cover"
              src="/videos/demo.mp4"
              poster="/prioraflow-logo.png"
              playsInline
              controls
              preload="metadata"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-8 lg:pb-20">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70"
            >
              <p className="text-sm font-semibold text-slate-500">{kpi.label}</p>
              <p className="mt-3 text-3xl font-black text-[#0B1220]">{kpi.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#E5EAF0] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase text-[#0A66FF]">The problem</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">
              Workshops do not fail from lack of effort. They fail from lack of visibility.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {problems.map((problem) => (
              <div key={problem} className="rounded-2xl border border-[#E5EAF0] bg-[#F7F9FC] p-6 shadow-sm">
                <Clock3 className="h-5 w-5 text-[#0A66FF]" />
                <p className="mt-5 text-base font-bold leading-7 text-[#0B1220]">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase text-[#0A66FF]">The solution</p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            PrioraFlow brings clarity to every job.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <div
              key={capability.title}
              className="rounded-2xl border border-[#E5EAF0] bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0A66FF]">
                <capability.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black">{capability.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{capability.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8">
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-4 shadow-2xl shadow-slate-200/70 sm:p-6">
          <div className="rounded-2xl bg-[#08111F] p-4 text-white sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-blue-300">Dashboard preview</p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">Priority-ranked job board</h2>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-blue-100">
                <ShieldCheck className="h-4 w-4" />
                Next Best Action
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {["Priority", "In Progress", "Ready"].map((column) => (
                    <div key={column} className="rounded-2xl bg-white/[0.07] p-3">
                      <p className="text-[11px] font-bold uppercase text-slate-400 sm:text-xs">{column}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {jobRows.map((row) => (
                    <div key={row.job} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black">{row.job}</p>
                          <p className="mt-1 text-sm text-slate-300">{row.vehicle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-blue-200">{row.score}</p>
                          <p className="text-xs text-slate-500">score</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="rounded-2xl bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                          {row.stage}
                        </span>
                        <span className="rounded-2xl bg-[#0A66FF]/25 px-3 py-1 text-xs font-bold text-blue-100">
                          {row.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  {kpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-xs font-semibold text-slate-400">{kpi.label}</p>
                      <p className="mt-2 text-2xl font-black">{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <p className="text-sm font-bold text-blue-200">Next Best Action</p>
                  <p className="mt-3 text-2xl font-black leading-tight">Escalate parts ETA for PF-1187</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Parts delay is now affecting promised delivery. Owner visibility recommended.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-200">Daily efficiency</span>
                    <span className="font-black text-blue-200">87%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[87%] rounded-full bg-[#0A66FF]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="walkthrough" className="border-y border-[#E5EAF0] bg-white">
        <div className="mx-auto w-full max-w-5xl px-5 py-20 text-center sm:px-8">
          <p className="text-sm font-bold uppercase text-[#0A66FF]">Walkthrough</p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">See PrioraFlow in action.</h2>
          <div className="mt-10 overflow-hidden rounded-2xl border border-[#E5EAF0] bg-[#08111F] shadow-2xl shadow-slate-200/70">
            <iframe
              className="aspect-video w-full"
              src={youtubeEmbedHref}
              title="PrioraFlow walkthrough video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <Link
            href={youtubeWatchHref}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0B1220] px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#152238]"
          >
            <Play className="h-4 w-4" />
            Watch on YouTube
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
        <div className="rounded-2xl bg-[#08111F] px-6 py-12 text-center text-white shadow-2xl shadow-slate-300/70 sm:px-10 sm:py-16">
          <CheckCircle2 className="mx-auto h-8 w-8 text-blue-300" />
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-black sm:text-5xl">
            Ready to modernize your workshop?
          </h2>
          <div className="mt-8 grid gap-3 sm:flex sm:justify-center">
            <CtaButton href={bookDemoHref}>
              <CalendarCheck className="h-4 w-4" />
              Book Demo
            </CtaButton>
            <CtaButton href={whatsappHref} variant="secondary">
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </CtaButton>
          </div>
          <a
            href="mailto:haitham@prioraflow.com"
            className="mt-8 inline-flex text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            haitham@prioraflow.com
          </a>
        </div>
      </section>
    </main>
  );
}
