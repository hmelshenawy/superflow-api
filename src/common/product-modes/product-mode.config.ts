export const PRODUCT_MODES = {
  WORKSHOP: 'WORKSHOP',
  CONNECT: 'CONNECT',
} as const;

export type ProductMode = typeof PRODUCT_MODES[keyof typeof PRODUCT_MODES];

export const MODULE_KEYS = {
  APPOINTMENTS: 'appointments',
  JOB_CARDS: 'jobCards',
  CUSTOMERS: 'customers',
  VEHICLES: 'vehicles',
  STOCK: 'stock',
  ESTIMATES: 'estimates',
  INVOICING: 'invoicing',
  TECHNICIAN_LOADING: 'technicianLoading',
  WIP: 'wip',
  OPERATIONAL_ANALYTICS: 'operationalAnalytics',
  DMS_INTEGRATION: 'dmsIntegration',
  WORKSHOP_LOADING: 'workshopLoading',
  CAPACITY_MANAGEMENT: 'capacityManagement',
  PRIORITY_ENGINE: 'priorityEngine',
  BOTTLENECK_DETECTION: 'bottleneckDetection',
  IDLE_TIME_ALERTS: 'idleTimeAlerts',
  NEXT_BEST_ACTION: 'nextBestAction',
  ADVISOR_PERFORMANCE: 'advisorPerformance',
  TECHNICIAN_PERFORMANCE: 'technicianPerformance',
  BRANCH_PERFORMANCE: 'branchPerformance',
  FINANCIAL_ANALYTICS: 'financialAnalytics',
} as const;

export type ModuleKey = typeof MODULE_KEYS[keyof typeof MODULE_KEYS];

export const PRODUCT_MODE_DISPLAY_NAMES: Record<ProductMode, string> = {
  WORKSHOP: 'PrioraFlow Workshop',
  CONNECT: 'PrioraFlow Connect',
};

export const PRODUCT_MODE_MODULES: Record<ProductMode, ModuleKey[]> = {
  WORKSHOP: [
    MODULE_KEYS.APPOINTMENTS,
    MODULE_KEYS.JOB_CARDS,
    MODULE_KEYS.CUSTOMERS,
    MODULE_KEYS.VEHICLES,
    MODULE_KEYS.STOCK,
    MODULE_KEYS.ESTIMATES,
    MODULE_KEYS.INVOICING,
    MODULE_KEYS.TECHNICIAN_LOADING,
    MODULE_KEYS.WIP,
    MODULE_KEYS.OPERATIONAL_ANALYTICS,
  ],
  CONNECT: [
    MODULE_KEYS.DMS_INTEGRATION,
    MODULE_KEYS.WORKSHOP_LOADING,
    MODULE_KEYS.CAPACITY_MANAGEMENT,
    MODULE_KEYS.WIP,
    MODULE_KEYS.PRIORITY_ENGINE,
    MODULE_KEYS.BOTTLENECK_DETECTION,
    MODULE_KEYS.IDLE_TIME_ALERTS,
    MODULE_KEYS.NEXT_BEST_ACTION,
    MODULE_KEYS.ADVISOR_PERFORMANCE,
    MODULE_KEYS.TECHNICIAN_PERFORMANCE,
    MODULE_KEYS.BRANCH_PERFORMANCE,
    MODULE_KEYS.OPERATIONAL_ANALYTICS,
    MODULE_KEYS.FINANCIAL_ANALYTICS,
  ],
};

export const CONNECT_FORBIDDEN_MODULES: ModuleKey[] = [
  MODULE_KEYS.INVOICING,
  MODULE_KEYS.STOCK,
];

export function normalizeProductMode(value: string | null | undefined): ProductMode {
  return value === PRODUCT_MODES.CONNECT ? PRODUCT_MODES.CONNECT : PRODUCT_MODES.WORKSHOP;
}

export function defaultEnabledModules(productMode: ProductMode): ModuleKey[] {
  return PRODUCT_MODE_MODULES[productMode];
}

export function parseEnabledModules(value: string | string[] | null | undefined, productMode: ProductMode): ModuleKey[] {
  if (Array.isArray(value)) return value as ModuleKey[];
  if (!value) return defaultEnabledModules(productMode);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as ModuleKey[] : defaultEnabledModules(productMode);
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean) as ModuleKey[];
  }
}

export function isModuleEnabled(productMode: ProductMode, enabledModules: ModuleKey[], moduleKey: ModuleKey): boolean {
  return PRODUCT_MODE_MODULES[productMode].includes(moduleKey) && enabledModules.includes(moduleKey);
}
