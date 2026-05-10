"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/stores/auth";
import { AlertTriangle, Mail } from "lucide-react";

const TRIAL_CONTACT_EMAIL = "admin@prioraflow.com";

function daysRemaining(date: string | null | undefined) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function TrialBanner() {
  const { workshops, currentWorkshopId } = useAuthStore();
  const workshop = workshops.find((item) => item.id === currentWorkshopId) ?? (workshops.length === 1 ? workshops[0] : null);
  const remaining = daysRemaining(workshop?.trial_ends_at);

  if (!workshop || remaining === null || remaining > 3) return null;

  const expired = remaining <= 0;
  return (
    <div className={expired ? "border-b border-red-200 bg-red-50 px-4 py-3 text-red-950" : "border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"}>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {expired
              ? "Your PrioraFlow trial has expired. Operational changes are paused until the workspace is activated."
              : `Your PrioraFlow trial ends in ${remaining} day${remaining === 1 ? "" : "s"}.`}
          </p>
        </div>
        <a
          href={`mailto:${TRIAL_CONTACT_EMAIL}?subject=PrioraFlow trial activation - ${encodeURIComponent(workshop.name)}`}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-current px-2.5 py-1 text-xs font-semibold"
        >
          <Mail className="h-3.5 w-3.5" />
          Contact {TRIAL_CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <TrialBanner />
          <div className="min-h-full p-3 md:p-4">{children}</div>
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton duration={4000} toastOptions={{ style: { maxWidth: '340px', padding: '10px 14px' }, classNames: { closeButton: '!right-1 !left-auto' } }} />
    </AuthGuard>
  );
}
