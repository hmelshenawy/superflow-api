export type WorkflowSystemStatus =
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

export type WorkflowSystemCategory = 'booked' | 'active' | 'ready' | 'closed' | 'cancelled';

export interface WorkflowStageConfig {
  key: string;
  label: string;
  description?: string;
  systemStatus: WorkflowSystemStatus;
  systemCategory: WorkflowSystemCategory;
  color: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
}

export interface WorkflowTemplate {
  key: string;
  label: string;
  description: string;
  stages: WorkflowStageConfig[];
}

export const WORKFLOW_SETTING_KEY = 'job_workflow_stages';

export const REQUIRED_WORKFLOW_CATEGORIES: WorkflowSystemCategory[] = [
  'booked',
  'active',
  'ready',
  'closed',
  'cancelled',
];

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: 'small',
    label: 'Small Workshop',
    description: 'Lean flow for teams that move cars through a simple board.',
    stages: [
      stage('booked', 'Booked', 'Customer is booked in or vehicle is received.', 'booked', 'booked', 'slate', 10, true),
      stage('in_progress', 'In Progress', 'Technician or advisor is actively moving the job.', 'in_progress', 'active', 'blue', 20, true),
      stage('ready', 'Ready', 'Work is finished and the customer can be contacted.', 'ready', 'ready', 'emerald', 30, true),
      stage('delivered', 'Delivered', 'Vehicle handed over and job closed.', 'closed', 'closed', 'zinc', 40, true),
      stage('cancelled', 'Cancelled / No Show', 'Booking cancelled or customer did not arrive.', 'no_show', 'cancelled', 'stone', 50, true),
    ],
  },
  {
    key: 'large',
    label: 'Large Workshop',
    description: 'Detailed service flow with approval, parts, QC, and handover lanes.',
    stages: [
      stage('booked', 'Booked', 'Customer is booked in or vehicle is received.', 'booked', 'booked', 'slate', 10, true),
      stage('inspection', 'Inspection', 'Initial checking, diagnosis, and inspection.', 'checking', 'active', 'amber', 20, false),
      stage('estimate_sent', 'Estimate Sent', 'Estimate is with the customer for review.', 'estimate_sent', 'active', 'rose', 30, false),
      stage('waiting_approval', 'Waiting Approval', 'Advisor is following up for customer approval.', 'estimate_sent', 'active', 'pink', 40, false),
      stage('parts_ordered', 'Parts Ordered', 'Parts have been requested or ordered.', 'waiting_parts', 'active', 'purple', 50, false),
      stage('in_progress', 'In Progress', 'Workshop production is active.', 'in_progress', 'active', 'blue', 60, true),
      stage('quality_control', 'Quality Control', 'Final quality checks before delivery.', 'quality_check', 'active', 'cyan', 70, false),
      stage('ready', 'Ready', 'Vehicle is ready for pickup.', 'ready', 'ready', 'emerald', 80, true),
      stage('delivered', 'Delivered', 'Vehicle handed over and job closed.', 'closed', 'closed', 'zinc', 90, true),
      stage('cancelled', 'Cancelled / No Show', 'Booking cancelled or customer did not arrive.', 'no_show', 'cancelled', 'stone', 100, true),
    ],
  },
  {
    key: 'bodyshop',
    label: 'Body Shop',
    description: 'Repair flow for assessment, insurance approval, parts, paint, QC, and delivery.',
    stages: [
      stage('booked', 'Booked', 'Customer is booked in or vehicle is received.', 'booked', 'booked', 'slate', 10, true),
      stage('damage_assessment', 'Damage Assessment', 'Damage inspection and repair scope.', 'checking', 'active', 'amber', 20, false),
      stage('insurance_approval', 'Insurance Approval', 'Waiting on insurer or customer approval.', 'estimate_sent', 'active', 'rose', 30, false),
      stage('parts_waiting', 'Parts Waiting', 'Waiting for repair parts.', 'waiting_parts', 'active', 'purple', 40, false),
      stage('repair', 'Repair', 'Body repair work is active.', 'in_progress', 'active', 'blue', 50, true),
      stage('paint', 'Paint', 'Paint preparation or paint booth stage.', 'in_progress', 'active', 'indigo', 60, false),
      stage('quality_control', 'Quality Control', 'Fit, finish, and final checks.', 'quality_check', 'active', 'cyan', 70, false),
      stage('ready', 'Ready', 'Vehicle is ready for pickup.', 'ready', 'ready', 'emerald', 80, true),
      stage('delivered', 'Delivered', 'Vehicle handed over and job closed.', 'closed', 'closed', 'zinc', 90, true),
      stage('cancelled', 'Cancelled / No Show', 'Booking cancelled or customer did not arrive.', 'no_show', 'cancelled', 'stone', 100, true),
    ],
  },
];

export const DEFAULT_WORKFLOW_STAGES = WORKFLOW_TEMPLATES[1].stages;

function stage(
  key: string,
  label: string,
  description: string,
  systemStatus: WorkflowSystemStatus,
  systemCategory: WorkflowSystemCategory,
  color: string,
  sortOrder: number,
  isRequired: boolean,
): WorkflowStageConfig {
  return { key, label, description, systemStatus, systemCategory, color, sortOrder, isRequired, isActive: true };
}
