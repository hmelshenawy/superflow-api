/**
 * Pure utility functions shared across the Jobs module.
 * No NestJS DI, no Prisma — just deterministic logic.
 */

/**
 * Map a job status (and optionally a workflow stage key) to the legacy
 * workshop-stage value that the board UI expects.
 *
 * If `workshopStage` is already set for an in-progress job, it is returned
 * as-is so callers can preserve the current value when no re-derivation is
 * needed (e.g. meta computation). When the caller wants a fresh derivation
 * (e.g. job update), pass `workshopStage` as `null` or `undefined`.
 */
export function legacyWorkshopStageForStatus(
  status: string,
  workshopStage?: string | null,
  stageKey?: string | null,
): string | null {
  if (status === 'quality_check') return 'quality_check';
  if (status === 'ready') return 'ready_handover';
  if (status !== 'in_progress') return null;
  if (workshopStage) return workshopStage;
  if (stageKey === 'damage_assessment' || stageKey === 'inspection') return 'diagnosis';
  if (stageKey === 'estimate_sent' || stageKey === 'waiting_approval' || stageKey === 'insurance_approval') return 'customer_approval';
  if (stageKey === 'paint' || stageKey === 'final_test') return 'final_test';
  return 'work_in_progress';
}