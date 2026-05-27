import { Shield } from "lucide-react";
import type { PortalData } from "./types";

interface PortalHeaderProps {
  data: PortalData;
}

export function PortalHeader({ data }: PortalHeaderProps) {
  const releaseDate = data.released_snapshot?.released_at
    ? new Date(data.released_snapshot.released_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">PrioraFlow service update</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Review your vehicle update</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Your vehicle has been checked with care. We&apos;ve added photos and clear costs for each item, so you can choose the next step with confidence.
          </p>
        </div>
        <div className="rounded-full bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Shield className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Job {data.job.job_number}</span>
        {data.released_snapshot?.version ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Update v{data.released_snapshot.version}</span> : null}
        {releaseDate ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{releaseDate}</span> : null}
      </div>

      {data.token.is_expired ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
          This link has expired. Please contact your service advisor for a fresh link.
        </div>
      ) : null}
    </header>
  );
}
