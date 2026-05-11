/**
 * Canonical feature keys for plan-based feature gating.
 * These map 1:1 to the `plan_features.feature_key` column in the database.
 */
export const FEATURE_KEYS = {
  // Core features (Starter+)
  JOB_BOARD:             'job_board',
  STAGES:                'stages',
  CUSTOMER_APPROVAL:     'customer_approval',
  DVI_REPORTS:           'dvi_reports',
  ESTIMATES:             'estimates',
  AI_SCORED_JOBS:        'ai_scored_jobs',
  CUSTOMER_APPROVAL_SMS: 'customer_approval_sms',

  // Professional features
  PRIORITY_ENGINE:       'priority_engine',
  NBA:                   'nba',
  DELIVERY_RISK:         'delivery_risk',

  // Enterprise features
  MULTI_SHOP:            'multi_shop',
  ADVISOR_WORKLOAD:      'advisor_workload',
  AI_MESSAGE_DRAFTS:    'ai_message_drafts',
  ANALYTICS:             'analytics',

  // Limits (is_included=TRUE, ceiling=N)
  MAX_USERS:             'max_users',
  MAX_LOCATIONS:        'max_locations',
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  job_board:             'Job Board',
  stages:                'Job Stages & Kanban',
  customer_approval:     'Customer Approval Portal',
  dvi_reports:           'DVI Reports',
  estimates:             'Estimates & Quotes',
  ai_scored_jobs:        'AI-Scored Jobs',
  customer_approval_sms: 'Customer Approval SMS',
  priority_engine:       'Priority Engine',
  nba:                   'Next Best Actions',
  delivery_risk:         'Delivery Risk Alerts',
  multi_shop:            'Multi-Shop',
  advisor_workload:      'Advisor Workload',
  ai_message_drafts:    'AI Message Drafts',
  analytics:             'Analytics Dashboard',
  max_users:             'Max Users',
  max_locations:        'Max Locations',
};