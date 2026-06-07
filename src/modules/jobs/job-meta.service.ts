import { Injectable } from '@nestjs/common';
import { PriorityService } from './priority/priority.service';
import { getValidTransitions, FLOW_ORDER } from './jobs.state-machine';
import type { JobStatus } from './jobs.state-machine';
import { legacyWorkshopStageForStatus } from './jobs-utils';
import { WorkflowService } from '../admin/settings/workflow.service';

export interface JobMeta {
  phaseIndex: number;
  phaseLabel: string;
  phaseTotal: number;
  isOverdue: boolean;
  idleHours: number;
  idleTier: 'none' | '6h' | '12h' | '24h';
  priorityScore: number;
  priorityLevel: string;
  priorityFactors: { key: string; weight: number; description: string; category: string }[];
  nextAction: { title: string; reason: string; urgency: string; owner: string; actionType: string; signals: string[] } | null;
  isWorkshopPhase: boolean;
  resolvedWorkshopStage: string | null;
  resolvedWorkflowStageKey: string | null;
  validTransitions: string[];
  nextFlowStatus: string | null;
  availableActions: string[];
  editableFields: string[];
  blockedReason: string | null;
  estimateTotal: number;
  concernsSummary: { total: number; inspected: number; pending: number };
  partsSummary: { requested: number; arrived: number; pending: number };
}

export interface JobListMeta {
  priorityScore: number;
  priorityLevel: string;
  isOverdue: boolean;
  hoursToPromise: number | null;
  idleHours: number;
  phaseIndex: number;
  phaseLabel: string;
  validTransitions: string[];
  nextFlowStatus: string | null;
  nextAction: { title: string; urgency: string; owner: string; actionType: string } | null;
  isWorkshopPhase: boolean;
  resolvedWorkshopStage: string | null;
  resolvedWorkflowStageKey: string | null;
  estimateTotal: number;
  editableFields: string[];
}

const WORKSHOP_PHASE_STATUSES = ['in_progress', 'waiting_parts', 'quality_check', 'ready'];
const WORKSHOP_STAGE_DISABLED_STATUSES = ['booked', 'checking', 'estimate_sent', 'approved', 'waiting_parts', 'closed', 'no_show'];
const PARTS_STATUS_DISABLED_STATUSES = ['booked', 'checking', 'estimate_sent', 'approved', 'waiting_parts', 'closed', 'no_show'];

@Injectable()
export class JobMetaService {
  constructor(
    private priorityService: PriorityService,
    private workflowService: WorkflowService,
  ) {}

  async computeJobMeta(job: any): Promise<JobMeta> {
    const status: JobStatus = (job.status ?? 'booked') as JobStatus;

    // Phase info from state machine flow order
    const phaseIndex = FLOW_ORDER.indexOf(status);
    const phaseLabel = phaseIndex >= 0 ? status.replace(/_/g, ' ') : status;
    const phaseTotal = FLOW_ORDER.length;

    // Priority — reuse the scoring engine
    const priority = this.priorityService.computeForJob(job);

    // Overdue / idle
    const isOverdue = priority.isOverdue;
    const idleHours = priority.idleHours;
    const idleTier: JobMeta['idleTier'] =
      idleHours >= 24 ? '24h' : idleHours >= 12 ? '12h' : idleHours >= 6 ? '6h' : 'none';

    // Workshop phase classification
    const isWorkshopPhase = WORKSHOP_PHASE_STATUSES.includes(status);

    // Resolved workshop stage — uses the same logic as JobsService.legacyWorkshopStageForStatus
    const resolvedWorkshopStage = legacyWorkshopStageForStatus(status, job.workshop_stage, job.workflow_stage_key);

    // Resolved workflow stage key — maps status to category via WorkflowService
    const resolvedWorkflowStageKey = await this.workflowService.resolveStageKeyForStatus(status);

    // Valid transitions from the state machine
    const validTransitions = getValidTransitions(status);
    const nextFlowStatus = this.nextForwardStatus(status, validTransitions);

    // Editable fields — which fields the current status allows editing
    const editableFields: string[] = [];
    if (!WORKSHOP_STAGE_DISABLED_STATUSES.includes(status)) editableFields.push('workshop_stage');
    if (!PARTS_STATUS_DISABLED_STATUSES.includes(status)) editableFields.push('parts_status');
    if (status !== 'closed' && status !== 'no_show') {
      editableFields.push('customer_concern', 'promised_at', 'customer_sensitivity');
    }

    // Estimate total
    const estimateTotal = (job.estimate_lines ?? []).reduce(
      (sum: number, line: any) => sum + Number(line.line_total ?? 0), 0,
    );

    // Concerns summary
    const concerns = job.job_concerns ?? job.concerns ?? [];
    const concernsSummary = {
      total: concerns.length,
      inspected: concerns.filter((c: any) => c.technician_finding).length,
      pending: concerns.filter((c: any) => !c.technician_finding).length,
    };

    // Parts summary
    const parts = job.job_parts ?? [];
    const partsSummary = {
      requested: parts.filter((p: any) => ['reserved', 'used'].includes(p.status)).length,
      arrived: parts.filter((p: any) => p.status === 'used').length,
      pending: parts.filter((p: any) => p.status === 'reserved').length,
    };

    // Available actions
    const availableActions = this.computeAvailableActions(job, status, validTransitions, concernsSummary);

    // Blocked reason
    let blockedReason: string | null = null;
    if (validTransitions.length === 0 && status !== 'closed' && status !== 'no_show') {
      blockedReason = 'No valid transitions from current status';
    } else if (status === 'checking' && concernsSummary.total > 0 && concernsSummary.pending > 0) {
      // Bug fix: explain why submit_for_approval is unavailable after backend action gating.
      blockedReason = `${concernsSummary.pending} concern${concernsSummary.pending === 1 ? '' : 's'} still need technician findings before approval.`;
    }

    return {
      phaseIndex,
      phaseLabel,
      phaseTotal,
      isOverdue,
      idleHours,
      idleTier,
      priorityScore: priority.score,
      priorityLevel: priority.level,
      priorityFactors: priority.factors,
      nextAction: priority.nextAction ?? null,
      isWorkshopPhase,
      resolvedWorkshopStage,
      resolvedWorkflowStageKey,
      validTransitions,
      nextFlowStatus,
      availableActions,
      editableFields,
      blockedReason,
      estimateTotal,
      concernsSummary,
      partsSummary,
    };
  }

  async computeJobListMeta(job: any): Promise<JobListMeta> {
    const status: JobStatus = (job.status ?? 'booked') as JobStatus;
    const priority = this.priorityService.computeForJob(job);

    const phaseIndex = FLOW_ORDER.indexOf(status);
    const phaseLabel = phaseIndex >= 0 ? status.replace(/_/g, ' ') : status;
    const isWorkshopPhase = WORKSHOP_PHASE_STATUSES.includes(status);
    const resolvedWorkshopStage = legacyWorkshopStageForStatus(status, job.workshop_stage, job.workflow_stage_key);
    const resolvedWorkflowStageKey = await this.workflowService.resolveStageKeyForStatus(status);
    const validTransitions = getValidTransitions(status);
    const nextFlowStatus = this.nextForwardStatus(status, validTransitions);

    const editableFields: string[] = [];
    if (!WORKSHOP_STAGE_DISABLED_STATUSES.includes(status)) editableFields.push('workshop_stage');
    if (!PARTS_STATUS_DISABLED_STATUSES.includes(status)) editableFields.push('parts_status');

    const estimateTotal = (job.estimate_lines ?? []).reduce(
      (sum: number, line: any) => sum + Number(line.line_total ?? 0), 0,
    );

    return {
      priorityScore: priority.score,
      priorityLevel: priority.level,
      isOverdue: priority.isOverdue,
      hoursToPromise: priority.hoursToPromise,
      idleHours: priority.idleHours,
      phaseIndex,
      phaseLabel,
      validTransitions,
      nextFlowStatus,
      nextAction: priority.nextAction
        ? { title: priority.nextAction.title, urgency: priority.nextAction.urgency, owner: priority.nextAction.owner, actionType: priority.nextAction.actionType }
        : null,
      isWorkshopPhase,
      resolvedWorkshopStage,
      resolvedWorkflowStageKey,
      estimateTotal,
      editableFields,
    };
  }

  private computeAvailableActions(job: any, status: JobStatus, validTransitions: string[], concernsSummary: { total: number; inspected: number; pending: number }): string[] {
    const actions: string[] = [];
    const isTerminal = status === 'closed' || status === 'no_show';

    if (status === 'booked') {
      actions.push('check_in', 'mark_no_show');
    }
    if (status === 'checking' && concernsSummary.pending === 0 && concernsSummary.total > 0) {
      actions.push('submit_for_approval');
    }
    if (status === 'estimate_sent') {
      actions.push('send_estimate', 'approve_estimate');
    }
    if (status === 'approved') {
      actions.push('start_work');
    }
    if (status === 'in_progress') {
      actions.push('start_qc');
      if (job.parts_status && job.parts_status !== 'no_parts' && job.parts_status !== 'parts_ready') {
        actions.push('request_parts');
      }
    }
    if (status === 'waiting_parts' && job.parts_status === 'parts_ready') {
      actions.push('resume_work');
    }
    if (status === 'ready') {
      actions.push('close_job');
      if (!job.customer_informed) actions.push('inform_customer');
    }
    if (!job.technician_id && !isTerminal) {
      actions.push('assign_technician');
    }
    if (!isTerminal) {
      actions.push('add_concern');
    }
    if (status === 'closed' && !job.archived_at) {
      actions.push('archive_job');
    }
    if (job.archived_at) {
      actions.push('unarchive_job');
    }

    return actions;
  }

  private nextForwardStatus(current: JobStatus, validTransitions: string[]): string | null {
    if (!validTransitions.length) return null;
    if (current === 'waiting_parts' && validTransitions.includes('in_progress')) return 'in_progress';
    // Bug fix: prefer forward flow over controlled backtracks for the primary CTA.
    const currentIndex = FLOW_ORDER.indexOf(current);
    const forward = validTransitions.find((status) => FLOW_ORDER.indexOf(status as JobStatus) > currentIndex);
    return forward ?? validTransitions[0] ?? null;
  }
}
