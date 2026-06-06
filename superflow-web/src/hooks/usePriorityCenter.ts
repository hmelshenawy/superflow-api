import { useMemo } from "react";
import { getWorkshopPriorityCategories } from "@/lib/workshop-priority-rules";
import type { PriorityCategories } from "@/lib/workshop-priority-rules";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";

export function usePriorityCenter(items: WorkshopJobInsight[]): PriorityCategories {
  return useMemo(() => getWorkshopPriorityCategories(items), [items]);
}
