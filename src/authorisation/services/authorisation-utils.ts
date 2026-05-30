import * as crypto from 'crypto';

/**
 * Hash a raw token using SHA-256. Portal tokens are stored hashed for
 * the same reason as refresh tokens: a leaked DB row should not grant
 * direct customer portal access.
 */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Map a job status string to the customer-facing portal stage label.
 * Pure function with no side effects or DB access.
 */
export function portalStageForStatus(status?: string | null): string {
  if (status === 'estimate_sent') return 'approval_needed';
  if (status === 'approved' || status === 'in_progress' || status === 'waiting_parts') return 'work_in_progress';
  if (status === 'quality_check' || status === 'ready' || status === 'closed') return 'final_report';
  return 'initial_findings';
}