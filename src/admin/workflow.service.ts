import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import {
  DEFAULT_WORKFLOW_STAGES,
  REQUIRED_WORKFLOW_CATEGORIES,
  WORKFLOW_SETTING_KEY,
  WORKFLOW_TEMPLATES,
  WorkflowStageConfig,
} from './workflow-templates';

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  async getWorkflow() {
    const stages = await this.getStages();
    return { stages, templates: WORKFLOW_TEMPLATES };
  }

  async getStages(): Promise<WorkflowStageConfig[]> {
    const row = await this.prisma.tenant.settings.findFirst({ where: { key: WORKFLOW_SETTING_KEY } });
    if (!row?.value) return DEFAULT_WORKFLOW_STAGES;
    try {
      return this.normalizeStages(JSON.parse(row.value));
    } catch {
      return DEFAULT_WORKFLOW_STAGES;
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

  private async saveStages(stages: WorkflowStageConfig[], userId: string) {
    const existing = await this.prisma.tenant.settings.findFirst({ where: { key: WORKFLOW_SETTING_KEY } });
    const data = {
      value: JSON.stringify(stages),
      value_type: 'json' as const,
      description: 'Workshop job workflow stages. Required system categories cannot be removed.',
      updated_by: userId,
    };
    if (existing) {
      return this.prisma.tenant.settings.update({ where: { id: existing.id }, data });
    }
    return this.prisma.tenant.settings.create({
      data: { id: uuid(), key: WORKFLOW_SETTING_KEY, ...data },
    });
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
