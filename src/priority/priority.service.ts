import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PriorityResultDto,
  PriorityFactorDto,
  NextBestActionDto,
  BulkPriorityResultDto,
  PriorityLevel,
} from './dto/priority-result.dto';

// ─── Default Priority Weights ──────────────────────────────────
export const DEFAULT_PRIORITY_WEIGHTS: Record<string, number> = {
  promiseOverdue: 30,
  promiseDue2h: 20,
  promiseDue6h: 10,
  noPromiseDate: 5,
  customerWaiting: 22,
  customerAngry: 18,
  customerVip: 16,
  customerComeback: 14,
  waitingCustomerDecision: 20,
  partsBackorder: 22,
  partsWaitingWarehouse: 16,
  partsNeedOrder: 12,
  idle24h: 20,
  idle12h: 12,
  idle6h: 6,
  stageCheckingDiagnosis: 10,
  stageQcNearDelivery: 10,
  readyToInform: 20,
  highEstimateValue: 8,
  mediumEstimateValue: 4,
};

// ─── Thresholds (unified — same everywhere) ────────────────────
const THRESHOLDS = { low: 22, normal: 40, high: 60 } as const;

function scoreToLevel(score: number): PriorityLevel {
  if (score >= THRESHOLDS.high) return PriorityLevel.CRITICAL;
  if (score >= THRESHOLDS.normal) return PriorityLevel.HIGH;
  if (score >= THRESHOLDS.low) return PriorityLevel.NORMAL;
  return PriorityLevel.LOW;
}

// ─── Status exclusions ────────────────────────────────────────
const IDLE_EXCLUDED_STATUSES = ['booked', 'ready', 'closed'];
const OVERDUE_EXCLUDED_STATUSES = ['booked', 'ready', 'closed'];

// ─── Next Best Action types ───────────────────────────────────
type NextActionOwner = 'advisor' | 'workshop' | 'parts' | 'customer';

interface NextActionDef {
  title: string;
  reason: string;
  owner: NextActionOwner;
  actionType: string;
}

@Injectable()
export class PriorityService {
  constructor(private prisma: PrismaService) {}

  /** Compute priority for a single job */
  async computeOne(jobId: string): Promise<PriorityResultDto> {
    const job = await this.prisma.tenant.jobs.findUnique({
      where: { id: jobId },
      include: {
        estimate_lines: true,
        customers: true,
        vehicles: true,
        users_jobs_advisor_idTousers: true,
        users_jobs_technician_idTousers: true,
      },
    });
    if (!job) throw new Error('Job not found');
    return this.computeForJob(job as any);
  }

  /** Compute priority for all active jobs */
  async computeAll(opts?: { status?: string; advisorId?: string; limit?: number }): Promise<BulkPriorityResultDto> {
    const where: any = { is_deleted: false, archived_at: null };
    if (opts?.status) {
      const statuses = opts.status.split(',').map((s) => s.trim());
      where.status = { in: statuses };
    } else {
      where.status = { notIn: ['closed', 'no_show'] };
    }
    if (opts?.advisorId) where.advisor_id = opts.advisorId;

    const jobs = await this.prisma.tenant.jobs.findMany({
      where,
      include: {
        estimate_lines: true,
        customers: true,
        vehicles: true,
        users_jobs_advisor_idTousers: true,
        users_jobs_technician_idTousers: true,
      },
      orderBy: { updated_at: 'desc' },
      take: opts?.limit ?? 200,
    });

    const results = jobs
      .map((job: any) => this.computeForJob(job as any))
      .sort((a: any, b: any) => b.score - a.score);

    return { results, computedAt: new Date() };
  }

  /** ─── CORE SCORING ENGINE ─────────────────────────────────── */
  private computeForJob(job: any): PriorityResultDto {
    const now = Date.now();
    const factors: PriorityFactorDto[] = [];
    let score = 10; // base

    const w = DEFAULT_PRIORITY_WEIGHTS;
    const status: string = job.status ?? 'booked';
    const partsStatus: string = job.parts_status ?? 'no_parts';
    const sensitivity: string = job.customer_sensitivity ?? 'normal';
    const isReady = status === 'ready';
    const isCustomerInformed = !!job.customer_informed;
    const informedReady = isReady && isCustomerInformed;

    // Promise risk
    const hoursToPromise = job.promised_at
      ? (new Date(job.promised_at).getTime() - now) / 36e5
      : null;
    const promiseOverdue = this.isOverdue(job, now);

    if (!informedReady) {
      if (promiseOverdue) {
        score += w.promiseOverdue;
        factors.push({ key: 'promiseOverdue', weight: w.promiseOverdue, description: 'Promise risk: overdue', category: 'promise' });
      } else if (hoursToPromise !== null && hoursToPromise <= 2) {
        score += w.promiseDue2h;
        factors.push({ key: 'promiseDue2h', weight: w.promiseDue2h, description: 'Promise risk: due ≤2h', category: 'promise' });
      } else if (hoursToPromise !== null && hoursToPromise <= 6) {
        score += w.promiseDue6h;
        factors.push({ key: 'promiseDue6h', weight: w.promiseDue6h, description: 'Promise risk: due ≤6h', category: 'promise' });
      }

      if (!job.promised_at && status !== 'booked' && status !== 'closed') {
        score += w.noPromiseDate;
        factors.push({ key: 'noPromiseDate', weight: w.noPromiseDate, description: 'No promised date set', category: 'promise' });
      }

      if (job.is_customer_waiting) {
        score += w.customerWaiting;
        factors.push({ key: 'customerWaiting', weight: w.customerWaiting, description: 'Customer waiting', category: 'customer' });
      }
    }

    // Customer sensitivity (always applies)
    if (sensitivity === 'angry') {
      score += w.customerAngry;
      factors.push({ key: 'customerAngry', weight: w.customerAngry, description: 'Customer sensitivity: angry', category: 'customer' });
    } else if (sensitivity === 'vip') {
      score += w.customerVip;
      factors.push({ key: 'customerVip', weight: w.customerVip, description: 'Customer sensitivity: VIP', category: 'customer' });
    } else if (sensitivity === 'comeback') {
      score += w.customerComeback;
      factors.push({ key: 'customerComeback', weight: w.customerComeback, description: 'Customer sensitivity: comeback', category: 'customer' });
    }

    // Waiting customer decision
    if (!informedReady && status === 'estimate_sent') {
      score += w.waitingCustomerDecision;
      factors.push({ key: 'waitingCustomerDecision', weight: w.waitingCustomerDecision, description: 'Customer decision: waiting', category: 'approval' });
    }

    // Parts risk
    if (!informedReady) {
      if (partsStatus === 'backorder') {
        score += w.partsBackorder;
        factors.push({ key: 'partsBackorder', weight: w.partsBackorder, description: 'Parts risk: backorder', category: 'parts' });
      } else if (partsStatus === 'waiting_warehouse') {
        score += w.partsWaitingWarehouse;
        factors.push({ key: 'partsWaitingWarehouse', weight: w.partsWaitingWarehouse, description: 'Parts risk: waiting warehouse', category: 'parts' });
      } else if (partsStatus === 'order_parts' || status === 'waiting_parts') {
        score += w.partsNeedOrder;
        factors.push({ key: 'partsNeedOrder', weight: w.partsNeedOrder, description: 'Parts risk: need order', category: 'parts' });
      }
    }

    // Idle risk (excludes booked/ready/closed)
    const idleHours = Math.max(0, (now - new Date(job.updated_at).getTime()) / 36e5);
    if (!IDLE_EXCLUDED_STATUSES.includes(status)) {
      if (idleHours >= 24) {
        score += w.idle24h;
        factors.push({ key: 'idle24h', weight: w.idle24h, description: 'Idle risk: 24h+', category: 'idle' });
      } else if (idleHours >= 12) {
        score += w.idle12h;
        factors.push({ key: 'idle12h', weight: w.idle12h, description: 'Idle risk: 12h+', category: 'idle' });
      } else if (idleHours >= 6) {
        score += w.idle6h;
        factors.push({ key: 'idle6h', weight: w.idle6h, description: 'Idle risk: 6h+', category: 'idle' });
      }
    }

    // Stage urgency
    if (!informedReady) {
      if (status === 'checking') {
        score += w.stageCheckingDiagnosis;
        factors.push({ key: 'stageCheckingDiagnosis', weight: w.stageCheckingDiagnosis, description: 'Stage urgency: checking/diagnosis', category: 'stage' });
      } else if (status === 'quality_check') {
        score += w.stageQcNearDelivery;
        factors.push({ key: 'stageQcNearDelivery', weight: w.stageQcNearDelivery, description: 'Stage urgency: QC/near delivery', category: 'stage' });
      }
    }

    // Ready to inform
    if (isReady && !isCustomerInformed) {
      score += w.readyToInform;
      factors.push({ key: 'readyToInform', weight: w.readyToInform, description: 'Ready to inform customer', category: 'delivery' });
    }

    // Estimate value
    const estimateTotal = (job.estimate_lines ?? []).reduce(
      (sum: number, line: any) => sum + Number(line.line_total ?? 0), 0,
    );
    if (estimateTotal >= 10000) {
      score += w.highEstimateValue;
      factors.push({ key: 'highEstimateValue', weight: w.highEstimateValue, description: 'Value: high estimate', category: 'value' });
    } else if (estimateTotal >= 5000) {
      score += w.mediumEstimateValue;
      factors.push({ key: 'mediumEstimateValue', weight: w.mediumEstimateValue, description: 'Value: medium estimate', category: 'value' });
    }

    // Cap score
    const priorityScore = Math.min(100, score);
    const priorityLevel = scoreToLevel(priorityScore);

    // Next Best Action
    const nextAction = this.buildNextBestAction(job, informedReady, priorityScore);

    return {
      jobId: job.id,
      jobNumber: job.job_number,
      score: priorityScore,
      level: priorityLevel,
      factors,
      idleHours: Math.round(idleHours * 10) / 10,
      hoursToPromise: hoursToPromise !== null ? Math.round(hoursToPromise * 10) / 10 : null,
      isOverdue: promiseOverdue,
      nextAction,
    };
  }

  /** ─── Overdue check ─────────────────────────────────────── */
  private isOverdue(job: any, nowTs: number): boolean {
    if (!job.promised_at) return false;
    if (OVERDUE_EXCLUDED_STATUSES.includes(job.status)) return false;
    return new Date(job.promised_at).getTime() < nowTs;
  }

  /** ─── Next Best Action ────────────────────────────────── */
  private buildNextBestAction(job: any, informedReady: boolean, priorityScore: number): NextBestActionDto {
    const status: string = job.status ?? 'booked';
    const partsStatus: string = job.parts_status ?? 'no_parts';
    const workshopStage: string | null = job.workshop_stage;

    let def: NextActionDef;
    const signals: string[] = [];

    if (informedReady) {
      def = { title: 'Arrange collection with customer', reason: 'Customer already informed. Confirm collection time and prepare handover paperwork.', owner: 'advisor', actionType: 'ready_arrange_collection' };
      signals.push('customer informed', 'ready for delivery');
    } else if (status === 'booked') {
      def = { title: 'Receive vehicle and start check-in', reason: 'Booking is still in reception phase. Receive the vehicle before it enters workshop flow.', owner: 'advisor', actionType: 'vehicle_check_in' };
      signals.push('booked/reception phase');
    } else if (status === 'checking') {
      def = { title: 'Complete diagnosis and prepare estimate', reason: 'Vehicle is in checking/diagnosis. Confirm findings and prepare the estimate for customer decision.', owner: 'advisor', actionType: 'diagnosis_to_estimate' };
      signals.push('checking/diagnosis phase');
    } else if (status === 'estimate_sent') {
      def = { title: 'Follow up customer decision', reason: 'Estimate has been sent. The vehicle cannot move forward until the customer approves, rejects, or asks a question.', owner: 'advisor', actionType: 'customer_decision_follow_up' };
      signals.push('waiting customer decision');
    } else if (status === 'approved') {
      def = { title: 'Print job card and release to workshop', reason: 'Customer approval is received. The next operational step is to print/open the job card and hand it to workshop control.', owner: 'advisor', actionType: 'print_job_card_release_workshop' };
      signals.push('approved phase', 'ready for workshop release');
    } else if (status === 'waiting_parts') {
      def = { title: 'Check parts ETA and update plan', reason: 'Job is blocked by parts. Confirm ETA/status and update advisor, workshop, and customer plan if needed.', owner: 'parts', actionType: 'parts_eta_check' };
      signals.push('waiting parts phase');
    } else if (status === 'in_progress') {
      if (workshopStage === 'waiting_technician' || !job.technician_id) {
        def = { title: 'Assign technician and start work', reason: 'Job is already in workshop phase but still needs a clear technician/workshop owner.', owner: 'workshop', actionType: 'assign_technician' };
        signals.push('workshop phase', 'needs technician');
      } else if (workshopStage === 'customer_approval') {
        def = { title: 'Resolve advisor / approval blocker', reason: 'Workshop progress is blocked by advisor/customer approval. Clear the decision before work continues.', owner: 'advisor', actionType: 'workshop_approval_blocker' };
        signals.push('workshop approval blocker');
      } else if (['order_parts', 'waiting_warehouse', 'backorder'].includes(partsStatus)) {
        def = { title: 'Check parts ETA and unblock technician', reason: 'Work is active but parts are blocking progress. Confirm ETA and update workshop plan.', owner: 'parts', actionType: 'parts_eta_check' };
        signals.push('parts blocking active work');
      } else {
        def = { title: 'Check technician progress', reason: 'Work is in progress. Confirm progress, blockers, and expected finish time.', owner: 'workshop', actionType: 'technician_progress_check' };
        signals.push('work in progress');
      }
    } else if (status === 'quality_check') {
      def = { title: 'Complete QC and prepare delivery', reason: 'Vehicle is near delivery. Finish quality check, confirm readiness, and prepare handover.', owner: 'workshop', actionType: 'qc_completion' };
      signals.push('QC / near delivery');
    } else if (status === 'ready') {
      def = { title: 'Notify customer for collection', reason: 'Vehicle is ready. Contact the customer and arrange delivery/collection.', owner: 'advisor', actionType: 'ready_collection_notice' };
      signals.push('ready for delivery');
    } else {
      def = { title: 'Review job', reason: 'No specific phase action was detected. Review the job for normal follow-up.', owner: 'advisor', actionType: 'general_review' };
    }

    return {
      title: def.title,
      reason: def.reason,
      urgency: scoreToLevel(priorityScore),
      owner: def.owner,
      actionType: def.actionType,
      score: priorityScore,
      signals,
    };
  }
}