import { useMemo } from "react";
import type { Job } from "@/types";
import {
  getWorkshopBoardStage,
  WORKSHOP_BOARD_STAGE_META,
  WORKSHOP_BOARD_STAGE_ORDER,
  type WorkshopBoardStage,
} from "@/lib/workshop-stage-groups";

export function useWorkshopColumns(jobs: Job[]) {
  return useMemo(() => {
    return WORKSHOP_BOARD_STAGE_ORDER.map((stageKey) => ({
      ...WORKSHOP_BOARD_STAGE_META[stageKey],
      jobs: jobs.filter((job) => getWorkshopBoardStage(job) === stageKey),
    })) as Array<{
      key: WorkshopBoardStage;
      label: string;
      sub: string;
      tone: string;
      jobs: Job[];
    }>;
  }, [jobs]);
}
