"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/stores/auth";
import { AlertTriangle, Mail, ArrowRight, Lock } from "lucide-react";
import { PRODUCT_LABELS, getRouteRestriction, getWorkshopProductMode } from "@/lib/product-modes";

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
    <div className={expired ? "border-b border-red-200 bg-red-50 px-4 py-3 text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200" : "border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"}>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {expired
              ? "Your PrioraFlow trial has expired. Operational changes are paused until the workspace is activated."
              : `Your PrioraFlow trial ends in ${remaining} day${remaining === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="inline-flex w-fit items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
          >
            View Plans <ArrowRight className="h-3 w-3" />
          </Link>
          <a
            href={`mailto:${TRIAL_CONTACT_EMAIL}?subject=PrioraFlow trial activation - ${encodeURIComponent(workshop.name)}`}
            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-current px-2.5 py-1 text-xs font-semibold"
          >
            <Mail className="h-3.5 w-3.5" />
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { workshops, currentWorkshopId } = useAuthStore();
  const currentWorkshop = workshops.find((item) => item.id === currentWorkshopId) ?? (workshops.length === 1 ? workshops[0] : null);
  const restriction = getRouteRestriction(pathname, currentWorkshop);
  const productMode = getWorkshopProductMode(currentWorkshop);

  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <TrialBanner />
          <div className="min-h-full p-3 md:p-4">
            {restriction ? (
              <div className="mx-auto mt-16 max-w-xl rounded-lg border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground">Feature not available in your product</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This area is not enabled for {currentWorkshop?.packageName || currentWorkshop?.package_name || PRODUCT_LABELS[productMode]}.
                </p>
                <Link href="/dashboard" className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                  Back to dashboard
                </Link>
              </div>
            ) : children}
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton duration={4000} toastOptions={{ style: { maxWidth: '340px', padding: '10px 14px' }, classNames: { closeButton: '!right-1 !left-auto' } }} />
    </AuthGuard>
  );
}
