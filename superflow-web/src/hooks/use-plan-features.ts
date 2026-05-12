"use client";

import { create } from "zustand";
import api from "@/lib/api";
import type { Subscription, PlanFeature } from "@/types";

interface PlanState {
  subscription: Subscription | null;
  features: PlanFeature[];
  loading: boolean;
  error: string | null;
  fetchSubscription: () => Promise<void>;
  hasFeature: (key: string) => boolean;
  isPlan: (planId: string) => boolean;
  isTrialExpired: () => boolean;
}

export const usePlanStore = create<PlanState>()((set, get) => ({
  subscription: null,
  features: [],
  loading: false,
  error: null,

  fetchSubscription: async () => {
    if (get().subscription) return; // Already loaded
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/billing/subscription");
      // API returns { subscription, plan, features, usage } — normalize
      const sub = data.subscription || data;
      const features = data.features || data.plan?.features || [];
      set({
        subscription: sub ? {
          ...sub,
          plan: {
            ...sub.plan,
            ...(data.plan || {}),
            features,
          },
        } : null,
        features,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || "Failed to load subscription", loading: false });
    }
  },

  hasFeature: (key: string) => {
    const features = get().features;
    if (!features || features.length === 0) return true; // If not loaded yet, don't block
    return features.some((f: PlanFeature) => f.key === key && f.isIncluded);
  },

  isPlan: (planId: string) => {
    const sub = get().subscription;
    return sub?.plan_id === planId;
  },

  isTrialExpired: () => {
    const sub = get().subscription;
    if (!sub) return false;
    const status = sub.status || (sub as any).subscription?.status;
    if (status !== "trialing") return false;
    const trialEnd = sub.trial_ends_at || (sub as any).trialEndsAt;
    if (!trialEnd) return false;
    return new Date(trialEnd) < new Date();
  },
}));

// Feature key constants matching the backend
export const FEATURES = {
  JOB_BOARD: "job_board",
  STAGES: "stages",
  CUSTOMER_APPROVAL: "customer_approval",
  DVI_REPORTS: "dvi_reports",
  ESTIMATES: "estimates",
  AI_SCORED_JOBS: "ai_scored_jobs",
  CUSTOMER_APPROVAL_SMS: "customer_approval_sms",
  PRIORITY_ENGINE: "priority_engine",
  NBA: "nba",
  DELIVERY_RISK: "delivery_risk",
  MULTI_SHOP: "multi_shop",
  ADVISOR_WORKLOAD: "advisor_workload",
  AI_MESSAGE_DRAFTS: "ai_message_drafts",
  ANALYTICS: "analytics",
} as const;

// Map nav items to feature keys for lock display
export const NAV_FEATURE_MAP: Record<string, string> = {
  "/insights": FEATURES.ANALYTICS,
  "/advisor": FEATURES.PRIORITY_ENGINE,
};

// Map feature keys to upgrade plan suggestions
export const FEATURE_UPGRADE_MAP: Record<string, { plan: string; label: string }> = {
  [FEATURES.PRIORITY_ENGINE]: { plan: "professional", label: "Professional" },
  [FEATURES.NBA]: { plan: "professional", label: "Professional" },
  [FEATURES.DELIVERY_RISK]: { plan: "professional", label: "Professional" },
  [FEATURES.ANALYTICS]: { plan: "enterprise", label: "Enterprise" },
  [FEATURES.MULTI_SHOP]: { plan: "enterprise", label: "Enterprise" },
  [FEATURES.ADVISOR_WORKLOAD]: { plan: "enterprise", label: "Enterprise" },
  [FEATURES.AI_MESSAGE_DRAFTS]: { plan: "enterprise", label: "Enterprise" },
  [FEATURES.DVI_REPORTS]: { plan: "starter", label: "Starter" },
  [FEATURES.CUSTOMER_APPROVAL]: { plan: "starter", label: "Starter" },
};