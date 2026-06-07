export type JobStatus =
  | 'booked'
  | 'checking'
  | 'estimate_sent'
  | 'approved'
  | 'in_progress'
  | 'waiting_parts'
  | 'quality_check'
  | 'ready'
  | 'closed'
  | 'no_show';

export const FLOW_ORDER: JobStatus[] = [
  'booked',
  'checking',
  'estimate_sent',
  'approved',
  'in_progress',
  'waiting_parts',
  'quality_check',
  'ready',
  'closed',
];

// This file is the single source of truth for allowed job status moves.
// Keep it intentionally small and explicit: operational rules should be easy
// to audit here before any service updates or UI changes are made.

// Practical workshop transitions:
// - mostly forward-only
// - small number of controlled backtracks where operations commonly bounce
// - no_show: booked jobs that didn't arrive (auto via end-of-day cron or manual)
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  booked: ['checking', 'closed', 'no_show'],
  checking: ['estimate_sent', 'approved', 'in_progress', 'closed'],
  estimate_sent: ['checking', 'approved', 'closed'],
  approved: ['estimate_sent', 'in_progress', 'closed'],
  in_progress: ['waiting_parts', 'quality_check', 'ready', 'closed'],
  waiting_parts: ['in_progress', 'closed'],
  quality_check: ['in_progress', 'ready'],
  ready: ['quality_check', 'closed'],
  closed: [],
  no_show: [],
};

// Used by JobsService, approval flow, and any future UI validation.
// Returning false for same-status transitions prevents noisy no-op history rows.
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(current: JobStatus): JobStatus[] {
  return [...(TRANSITIONS[current] ?? [])];
}

