type JobStatus = 'booked' | 'checking' | 'estimate_sent' | 'approved' | 'in_progress' | 'waiting_parts' | 'quality_check' | 'completed' | 'invoiced' | 'closed';

// All statuses can transition to any other status (workshop reality: cars go back and forth)
const ALL: JobStatus[] = ['booked', 'checking', 'estimate_sent', 'approved', 'in_progress', 'waiting_parts', 'quality_check', 'completed', 'invoiced', 'closed'];

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  booked: ALL,
  checking: ALL,
  estimate_sent: ALL,
  approved: ALL,
  in_progress: ALL,
  waiting_parts: ALL,
  quality_check: ALL,
  completed: ALL,
  invoiced: ALL,
  closed: ALL,
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return from !== to; // can go anywhere except staying put
}

export function getValidTransitions(current: JobStatus): JobStatus[] {
  return ALL.filter(s => s !== current);
}

// Returns which stages are "completed" relative to the current status
// This gives the green checkmark logic: stages before current in the flow
const FLOW_ORDER: JobStatus[] = ['booked', 'checking', 'estimate_sent', 'approved', 'in_progress', 'waiting_parts', 'quality_check', 'completed', 'invoiced', 'closed'];

export function getCompletedStages(current: JobStatus): JobStatus[] {
  const idx = FLOW_ORDER.indexOf(current);
  if (idx <= 0) return [];
  return FLOW_ORDER.slice(0, idx);
}

export function getFlowOrder(): JobStatus[] {
  return [...FLOW_ORDER];
}