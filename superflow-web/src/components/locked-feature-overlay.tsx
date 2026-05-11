"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { FEATURE_UPGRADE_MAP } from "@/hooks/use-plan-features";

interface LockedFeatureOverlayProps {
  featureKey: string;
  title?: string;
  description?: string;
}

export function LockedFeatureOverlay({ featureKey, title, description }: LockedFeatureOverlayProps) {
  const upgrade = FEATURE_UPGRADE_MAP[featureKey];
  const planLabel = upgrade?.label || "Professional";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {title || "Feature Locked"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {description || `This feature is available on the ${planLabel} plan. Upgrade to unlock it.`}
        </p>
        <Link href="/pricing">
          <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
            Upgrade to {planLabel}
          </button>
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          Already on {planLabel}? Contact support if you believe this is an error.
        </p>
      </div>
    </div>
  );
}