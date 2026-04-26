type JobStatus =
  | 'booked'
  | 'checking'
  | 'estimate_sent'
  | 'approved'
  | 'in_progress'
  | 'waiting_parts'
  | 'quality_check'
  | 'ready'
  | 'closed';

const FLOW_ORDER: JobStatus[] = [
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

// Practical workshop transitions:
// - mostly forward-only
// - small number of controlled backtracks where operations commonly bounce
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  booked: ['checking', 'closed'],
  checking: ['estimate_sent', 'approved', 'in_progress', 'closed'],
  estimate_sent: ['checking', 'approved', 'closed'],
  approved: ['estimate_sent', 'in_progress', 'closed'],
  in_progress: ['waiting_parts', 'quality_check', 'ready', 'closed'],
  waiting_parts: ['in_progress', 'closed'],
  quality_check: ['in_progress', 'ready'],
  ready: ['quality_check', 'closed'],
  closed: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(current: JobStatus): JobStatus[] {
  return [...(TRANSITIONS[current] ?? [])];
}

// Returns which stages are "completed" relative to the current status
// This gives the green checkmark logic: stages before current in the flow
export function getCompletedStages(current: JobStatus): JobStatus[] {
  const idx = FLOW_ORDER.indexOf(current);
  if (idx <= 0) return [];
  return FLOW_ORDER.slice(0, idx);
}

export function getFlowOrder(): JobStatus[] {
  return [...FLOW_ORDER];
}