import { Injectable } from '@nestjs/common';
import { PriorityService } from '../priority/priority.service';
import { getValidTransitions, FLOW_ORDER } from './jobs.state-machine';
import type { JobStatus } from './jobs.state-machine';

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
  estimateTotal: number;
  editableFields: string[];
}

const WORKSHOP_PHASE_STATUSES = ['in_progress', 'waiting_parts', 'quality_check', 'ready'];
const WORKSHOP_STAGE_DISABLED_STATUSES = ['booked', 'checking', 'estimate_sent', 'closed', 'no_show'];
const PARTS_STATUS_DISABLED_STATUSES = ['booked', 'checking', 'estimate_sent', 'approved', 'closed', 'no_show'];

@Injectable()
export class JobMetaService {
  constructor(private priorityService: PriorityService) {}

  computeJobMeta(job: any): JobMeta {
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
    const resolvedWorkshopStage = this.legacyWorkshopStageForStatus(status, job.workshop_stage, job.workflow_stage_key);

    // Resolved workflow stage key — maps status to category like JobsService.defaultWorkflowStageKeyForStatus
    const resolvedWorkflowStageKey = this.defaultWorkflowStageKeyForStatus(status);

    // Valid transitions from the state machine
    const validTransitions = getValidTransitions(status);
    const nextFlowStatus = validTransitions.length > 0 ? validTransitions[0] : null;

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
    const parts = job.parts ?? [];
    const partsSummary = {
      requested: parts.filter((p: any) => p.status === 'requested' || p.status === 'order_parts').length,
      arrived: parts.filter((p: any) => p.status === 'arrived' || p.status === 'parts_ready' || p.status === 'parts_ready').length,
      pending: parts.filter((p: any) => !['arrived', 'parts_ready'].includes(p.status)).length,
    };

    // Available actions
    const availableActions = this.computeAvailableActions(job, status, validTransitions, concernsSummary);

    // Blocked reason
    let blockedReason: string | null = null;
    if (validTransitions.length === 0 && status !== 'closed' && status !== 'no_show') {
      blockedReason = 'No valid transitions from current status';
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

  computeJobListMeta(job: any): JobListMeta {
    const status: JobStatus = (job.status ?? 'booked') as JobStatus;
    const priority = this.priorityService.computeForJob(job);

    const phaseIndex = FLOW_ORDER.indexOf(status);
    const phaseLabel = phaseIndex >= 0 ? status.replace(/_/g, ' ') : status;
    const isWorkshopPhase = WORKSHOP_PHASE_STATUSES.includes(status);
    const resolvedWorkshopStage = this.legacyWorkshopStageForStatus(status, job.workshop_stage, job.workflow_stage_key);
    const validTransitions = getValidTransitions(status);
    const nextFlowStatus = validTransitions.length > 0 ? validTransitions[0] : null;

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
    if (status === 'waiting_parts' && job.parts_status === 'all_arrived') {
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

  private legacyWorkshopStageForStatus(status: string, workshopStage?: string | null, stageKey?: string | null): string | null {
    if (workshopStage) return workshopStage;
    if (status === 'quality_check') return 'quality_check';
    if (status === 'ready') return 'ready_handover';
    if (status !== 'in_progress') return null;
    if (stageKey === 'damage_assessment' || stageKey === 'inspection') return 'diagnosis';
    if (stageKey === 'estimate_sent' || stageKey === 'waiting_approval' || stageKey === 'insurance_approval') return 'customer_approval';
    if (stageKey === 'paint' || stageKey === 'final_test') return 'final_test';
    return 'work_in_progress';
  }

  private defaultWorkflowStageKeyForStatus(status: string): string | null {
    if (status === 'booked') return 'booked';
    if (status === 'ready') return 'ready';
    if (status === 'closed') return 'closed';
    if (status === 'no_show') return 'cancelled';
    return 'active';
  }
}