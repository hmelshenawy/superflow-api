"use client";

import { Minus, X } from "lucide-react";
import { useState } from "react";
import type { PriorityCategories, PriorityCategoryKey } from "@/lib/workshop-priority-rules";
import { PriorityCategoryCard } from "./PriorityCategoryCard";
import { PriorityDetailsView } from "./PriorityDetailsView";

const CATEGORY_ORDER: PriorityCategoryKey[] = [
  "overdue",
  "idle",
  "partsEtaMissing",
  "approvalDelay",
  "readyForDelivery",
];

export function getPriorityAlertCount(categories: PriorityCategories) {
  return CATEGORY_ORDER.reduce((sum, category) => sum + categories[category].length, 0);
}

export function PriorityCenter({
  categories,
  onCollapse,
  onClose,
  compact = false,
}: {
  categories: PriorityCategories;
  onCollapse?: () => void;
  onClose?: () => void;
  compact?: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState<PriorityCategoryKey | null>(null);

  return (
    <aside className={compact ? "h-full w-full overflow-y-auto bg-card p-3" : "w-full rounded-2xl border border-border bg-card p-3 shadow-sm xl:w-[320px] xl:shrink-0"}>
      {selectedCategory ? (
        <PriorityDetailsView
          category={selectedCategory}
          jobs={categories[selectedCategory]}
          onBack={() => setSelectedCategory(null)}
        />
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Priority Center</h2>
            </div>
            <div className="flex items-center gap-1">
              {onCollapse ? (
                <button
                  type="button"
                  onClick={onCollapse}
                  className="hidden rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground xl:inline-flex"
                  aria-label="Collapse Priority Center"
                  title="Collapse Priority Center"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground xl:hidden"
                  aria-label="Close Priority Center"
                  title="Close Priority Center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {CATEGORY_ORDER.map((category) => (
              <PriorityCategoryCard
                key={category}
                category={category}
                count={categories[category].length}
                onClick={() => setSelectedCategory(category)}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
