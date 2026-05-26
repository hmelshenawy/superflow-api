export type TrafficLight = 'green' | 'amber' | 'red';

const INSPECTION_URGENCY_TO_TRAFFIC_LIGHT: Record<string, TrafficLight> = {
  low: 'green',
  medium: 'amber',
  high: 'red',
  critical: 'red',
};

const INSPECTION_VALUE_TO_TRAFFIC_LIGHT: Record<string, TrafficLight> = {
  pass: 'green',
  yes: 'green',
  ok: 'green',
  warn: 'amber',
  fail: 'red',
  no: 'red',
};

const QC_VALUE_TO_TRAFFIC_LIGHT: Record<string, TrafficLight> = {
  pass: 'green',
  yes: 'green',
  ok: 'green',
  fail: 'red',
  no: 'red',
};

export function inspectionTrafficLight(value: string | null, urgency?: string | null): TrafficLight {
  if (value && INSPECTION_VALUE_TO_TRAFFIC_LIGHT[value]) {
    return INSPECTION_VALUE_TO_TRAFFIC_LIGHT[value];
  }
  if (urgency && INSPECTION_URGENCY_TO_TRAFFIC_LIGHT[urgency]) {
    return INSPECTION_URGENCY_TO_TRAFFIC_LIGHT[urgency];
  }
  return 'green';
}

export function qcTrafficLight(value: string | null): TrafficLight {
  if (value && QC_VALUE_TO_TRAFFIC_LIGHT[value]) {
    return QC_VALUE_TO_TRAFFIC_LIGHT[value];
  }
  return 'green';
}

const INFORMATIONAL_INPUT_TYPES = new Set(['photo', 'odometer', 'fuel_level', 'text']);
const QC_INFORMATIONAL_INPUT_TYPES = new Set(['photo', 'text']);

export function isInformationalInputType(inputType: string): boolean {
  return INFORMATIONAL_INPUT_TYPES.has(inputType);
}

export function isQcInformationalInputType(inputType: string): boolean {
  return QC_INFORMATIONAL_INPUT_TYPES.has(inputType);
}

const INSPECTION_INPUT_TYPE_OPTIONS: Record<string, string[] | null> = {
  pass_fail: ['pass', 'fail'],
  yes_no: ['yes', 'no'],
  ok_warn_fail: ['ok', 'warn', 'fail'],
  toggle: ['on', 'off'],
  fuel_level: ['empty', 'quarter', 'half', 'three_quarter', 'full'],
};

const QC_INPUT_TYPE_OPTIONS: Record<string, string[] | null> = {
  pass_fail: ['pass', 'fail'],
  yes_no: ['yes', 'no'],
  ok_fail: ['ok', 'fail'],
};

export function inspectionAvailableOptions(inputType: string, storedOptions?: string | null): string[] | null {
  if (storedOptions) {
    try { return JSON.parse(storedOptions); } catch { /* fall through */ }
  }
  return INSPECTION_INPUT_TYPE_OPTIONS[inputType] ?? null;
}

export function qcAvailableOptions(inputType: string): string[] | null {
  return QC_INPUT_TYPE_OPTIONS[inputType] ?? null;
}
