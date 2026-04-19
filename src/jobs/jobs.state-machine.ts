type JobStatus = 'open' | 'in_progress' | 'waiting_parts' | 'completed' | 'closed' | 'invoiced';

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['waiting_parts', 'completed', 'closed'],
  waiting_parts: ['in_progress', 'closed'],
  completed: ['closed', 'invoiced'],
  closed: [],
  invoiced: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(current: JobStatus): JobStatus[] {
  return TRANSITIONS[current] ?? [];
}