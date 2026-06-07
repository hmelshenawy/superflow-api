import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { getWorkshopContext } from '@prisma/workshop-context';
import { v4 as uuid } from 'uuid';
import {
  DEFAULT_WORKFLOW_STAGES,
  REQUIRED_WORKFLOW_CATEGORIES,
  WORKFLOW_SETTING_KEY,
  WORKFLOW_TEMPLATES,
  WorkflowStageConfig,
} from './workflow-templates';

/** Cache entry for a workshop's workflow stages. */
interface StagesCacheEntry {
  stages: WorkflowStageConfig[];
  expiry: number;
}

const STAGES_CACHE_TTL_MS = 30_000; // 30 seconds

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  /** Per-workshop TTL cache for resolved stages. Keyed by workshopId. */
  private stagesCacheByWorkshop = new Map<string, StagesCacheEntry>();

  async getWorkflow() {
    const stages = await this.getStages();
    return { stages, templates: WORKFLOW_TEMPLATES };
  }

  async getStages(): Promise<WorkflowStageConfig[]> {
    const { workshopId } = getWorkshopContext();

    // Per-workshop cache lookup
    if (workshopId) {
      const cached = this.stagesCacheByWorkshop.get(workshopId);
      if (cached && Date.now() < cached.expiry) {
        return cached.stages;
      }
    }

    const stages = await this.loadStagesFromDb();

    // Store in per-workshop cache
    if (workshopId) {
      this.stagesCacheByWorkshop.set(workshopId, {
        stages,
        expiry: Date.now() + STAGES_CACHE_TTL_MS,
      });
    }

    return stages;
  }

  /**
   * Invalidate cached stages for a specific workshop, or all workshops.
   * Called automatically after workflow stage updates.
   */
  invalidateStagesCache(workshopId?: string) {
    if (workshopId) {
      this.stagesCacheByWorkshop.delete(workshopId);
    } else {
      this.stagesCacheByWorkshop.clear();
    }
  }

  async updateStages(stages: WorkflowStageConfig[], userId: string) {
    const normalized = this.normalizeStages(stages);
    await this.saveStages(normalized, userId);
    return { stages: normalized, templates: WORKFLOW_TEMPLATES };
  }

  async applyTemplate(templateKey: string, userId: string) {
    const template = WORKFLOW_TEMPLATES.find((item) => item.key === templateKey);
    if (!template) throw new BadRequestException('Unknown workflow template');
    const stages = this.normalizeStages(template.stages);
    await this.saveStages(stages, userId);
    return { stages, templates: WORKFLOW_TEMPLATES };
  }

  async resolveStage(stageKey: string): Promise<WorkflowStageConfig> {
    const stages = await this.getStages();
    const stage = stages.find((item) => item.key === stageKey && item.isActive);
    if (!stage) throw new BadRequestException('Workflow stage is not active for this workshop');
    return stage;
  }

  /**
   * Given a job status, resolve the workflow stage key that should be set.
   * First tries an exact match on systemStatus; falls back to matching by
   * systemCategory using the same mapping used across the codebase:
   *   booked → booked, ready → ready, closed → closed, no_show → cancelled, rest → active
   */
  async resolveStageKeyForStatus(status: string): Promise<string | null> {
    const stages = await this.getStages();
    const exact = stages.find((stage) => stage.isActive && stage.systemStatus === status);
    if (exact) return exact.key;
    const category = status === 'booked' ? 'booked'
      : status === 'ready' ? 'ready'
      : status === 'closed' ? 'closed'
      : status === 'no_show' ? 'cancelled'
      : 'active';
    return stages.find((stage) => stage.isActive && stage.systemCategory === category)?.key ?? null;
  }

  private async loadStagesFromDb(): Promise<WorkflowStageConfig[]> {
    const row = await this.prisma.tenant.settings.findFirst({ where: { key: WORKFLOW_SETTING_KEY } });
    if (!row?.value) return DEFAULT_WORKFLOW_STAGES;
    try {
      return this.normalizeStages(JSON.parse(row.value));
    } catch {
      return DEFAULT_WORKFLOW_STAGES;
    }
  }

  private async saveStages(stages: WorkflowStageConfig[], userId: string) {
    const existing = await this.prisma.tenant.settings.findFirst({ where: { key: WORKFLOW_SETTING_KEY } });
    const data = {
      value: JSON.stringify(stages),
      value_type: 'json' as const,
      description: 'Workshop job workflow stages. Required system categories cannot be removed.',
      updated_by: userId,
    };
    if (existing) {
      await this.prisma.tenant.settings.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.tenant.settings.create({
        data: { id: uuid(), key: WORKFLOW_SETTING_KEY, ...data },
      });
    }
    // Invalidate cache for the current workshop so updates are visible immediately.
    const { workshopId } = getWorkshopContext();
    this.invalidateStagesCache(workshopId ?? undefined);
  }

  private normalizeStages(input: unknown): WorkflowStageConfig[] {
    if (!Array.isArray(input)) throw new BadRequestException('Workflow stages must be an array');
    const seen = new Set<string>();
    const stages = input.map((raw, index) => {
      const item = raw as Partial<WorkflowStageConfig>;
      const key = this.normalizeKey(item.key || item.label || '');
      if (!key) throw new BadRequestException('Each workflow stage needs a key or label');
      if (seen.has(key)) throw new BadRequestException(`Duplicate workflow stage key: ${key}`);
      seen.add(key);
      const label = String(item.label || key.replace(/_/g, ' ')).trim().slice(0, 80);
      const systemStatus = String(item.systemStatus || 'in_progress');
      const systemCategory = String(item.systemCategory || this.categoryForStatus(systemStatus));
      if (!['booked', 'checking', 'estimate_sent', 'approved', 'in_progress', 'waiting_parts', 'quality_check', 'ready', 'closed', 'no_show'].includes(systemStatus)) {
        throw new BadRequestException(`Invalid system status for ${label}`);
      }
      if (!['booked', 'active', 'ready', 'closed', 'cancelled'].includes(systemCategory)) {
        throw new BadRequestException(`Invalid system category for ${label}`);
      }
      return {
        key,
        label,
        description: item.description ? String(item.description).slice(0, 240) : undefined,
        systemStatus: systemStatus as WorkflowStageConfig['systemStatus'],
        systemCategory: systemCategory as WorkflowStageConfig['systemCategory'],
        color: String(item.color || 'slate').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'slate',
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : (index + 1) * 10,
        isRequired: Boolean(item.isRequired),
        isActive: item.isActive !== false,
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);

    for (const category of REQUIRED_WORKFLOW_CATEGORIES) {
      if (!stages.some((stage) => stage.systemCategory === category && stage.isRequired && stage.isActive)) {
        throw new BadRequestException(`Workflow must include one active required ${category} stage`);
      }
    }
    return stages;
  }

  private normalizeKey(value: string) {
    return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  }

  private categoryForStatus(status: string) {
    if (status === 'booked') return 'booked';
    if (status === 'ready') return 'ready';
    if (status === 'closed') return 'closed';
    if (status === 'no_show') return 'cancelled';
    return 'active';
  }
}
