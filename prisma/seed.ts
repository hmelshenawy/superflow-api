import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { ALL_PERMISSIONS } from '../src/common/permissions';
import { PRODUCT_MODE_DISPLAY_NAMES, defaultEnabledModules } from '../src/common/product-modes';

const prisma = new PrismaClient();

const PILOT_EMAIL = 'pilot@prioraflow.com';
const PILOT_PASSWORD = 'PrioraFlow2026!';
const PILOT_ROLE_NAME = 'pilot_demo_admin';
const STANDALONE_SLUG = 'prioraflow-pilot-workshop';
const CONNECT_SLUG = 'prioraflow-pilot-connect';

const pilotPermissions = ALL_PERMISSIONS.filter((permission) => !permission.startsWith('workshops:'));

const customers = [
  { name: 'Aisha Al Mansoori', email: 'aisha.pilot@example.com', phone: '+971501110001', preferred_contact: 'whatsapp', language: 'en' },
  { name: 'Omar Haddad', email: 'omar.pilot@example.com', phone: '+971501110002', preferred_contact: 'phone', language: 'en' },
  { name: 'Maya Fernandez', email: 'maya.pilot@example.com', phone: '+971501110003', preferred_contact: 'email', language: 'en' },
  { name: 'Karim Nasser', email: 'karim.pilot@example.com', phone: '+971501110004', preferred_contact: 'whatsapp', language: 'ar' },
  { name: 'Fatima Rahman', email: 'fatima.pilot@example.com', phone: '+971501110005', preferred_contact: 'phone', language: 'en' },
  { name: 'Nadia Petrova', email: 'nadia.pilot@example.com', phone: '+971501110006', preferred_contact: 'email', language: 'en' },
  { name: 'James Wilson', email: 'james.pilot@example.com', phone: '+971501110007', preferred_contact: 'whatsapp', language: 'en' },
  { name: 'Layla Khan', email: 'layla.pilot@example.com', phone: '+971501110008', preferred_contact: 'phone', language: 'en' },
  { name: 'Saeed Al Falasi', email: 'saeed.pilot@example.com', phone: '+971501110009', preferred_contact: 'whatsapp', language: 'ar' },
  { name: 'Elena Rossi', email: 'elena.pilot@example.com', phone: '+971501110010', preferred_contact: 'email', language: 'en' },
] as const;

const vehicles = [
  { vin: 'WDDZF4KB9JA100001', make: 'Mercedes-Benz', vehicle_model: 'E300', year: 2021, plate: 'DXB-P-1001', color: 'Obsidian Black', vehicle_type: 'sedan', engine: '2.0L Turbo', odometer_km: 68200 },
  { vin: 'WBA5R7C58KA100002', make: 'BMW', vehicle_model: '530i', year: 2020, plate: 'DXB-P-1002', color: 'Alpine White', vehicle_type: 'sedan', engine: '2.0L TwinPower', odometer_km: 74150 },
  { vin: 'WAUZZZF45MA100003', make: 'Audi', vehicle_model: 'A6', year: 2022, plate: 'DXB-P-1003', color: 'Daytona Grey', vehicle_type: 'sedan', engine: '2.0L TFSI', odometer_km: 38900 },
  { vin: 'JTJHY7AX7L4100004', make: 'Lexus', vehicle_model: 'LX570', year: 2019, plate: 'DXB-P-1004', color: 'Pearl White', vehicle_type: 'suv', engine: '5.7L V8', odometer_km: 91300 },
  { vin: 'SALGS2RU0MA100005', make: 'Range Rover', vehicle_model: 'Sport', year: 2021, plate: 'DXB-P-1005', color: 'Santorini Black', vehicle_type: 'suv', engine: '3.0L', odometer_km: 57600 },
  { vin: 'KM8K33AGXNU100006', make: 'Hyundai', vehicle_model: 'Kona EV', year: 2022, plate: 'DXB-P-1006', color: 'Blue Wave', vehicle_type: 'suv', engine: 'Electric', odometer_km: 32850 },
  { vin: 'JTMBAREV2ND100007', make: 'Toyota', vehicle_model: 'RAV4', year: 2022, plate: 'DXB-P-1007', color: 'Silver Sky', vehicle_type: 'suv', engine: '2.5L Hybrid', odometer_km: 46100 },
  { vin: 'WP1AA2AY5LDA10008', make: 'Porsche', vehicle_model: 'Cayenne', year: 2020, plate: 'DXB-P-1008', color: 'Moonlight Blue', vehicle_type: 'suv', engine: '3.0L V6', odometer_km: 63600 },
  { vin: 'YV4A22PK9L1100009', make: 'Volvo', vehicle_model: 'XC90', year: 2020, plate: 'DXB-P-1009', color: 'Onyx Black', vehicle_type: 'suv', engine: '2.0L T6', odometer_km: 70200 },
  { vin: '1N4BL4CV8LC100010', make: 'Nissan', vehicle_model: 'Altima', year: 2020, plate: 'DXB-P-1010', color: 'Gun Metallic', vehicle_type: 'sedan', engine: '2.5L', odometer_km: 84400 },
] as const;

type JobScenario = {
  n: number;
  c: number;
  status: string;
  stage: string;
  parts: string;
  concern: string;
  sensitivity: string;
  waiting: boolean;
  informed: boolean;
  promisedHours: number;
  arrivedHours: number;
  updatedHours: number;
  completedHours?: number;
  total: number;
  blocker?: {
    type: string;
    severity: string;
    description: string;
  };
};

const jobScenarios: JobScenario[] = [
  { n: 1, c: 0, status: 'booked', stage: 'waiting_technician', parts: 'no_parts', concern: 'New arrival for Service A and full check-in inspection', sensitivity: 'normal', waiting: false, informed: false, promisedHours: 36, arrivedHours: 1, updatedHours: 1, total: 1450 },
  { n: 2, c: 1, status: 'checking', stage: 'diagnosis', parts: 'no_parts', concern: 'Engine warning light diagnosis after intermittent misfire', sensitivity: 'vip', waiting: true, informed: false, promisedHours: 2, arrivedHours: 8, updatedHours: 7, total: 2400 },
  { n: 3, c: 2, status: 'estimate_sent', stage: 'customer_approval', parts: 'order_parts', concern: 'Coolant leak inspection, radiator hose and thermostat estimate sent', sensitivity: 'normal', waiting: false, informed: true, promisedHours: -4, arrivedHours: 30, updatedHours: 26, total: 3800, blocker: { type: 'customer_approval', severity: 'high', description: 'Waiting for customer approval on cooling system estimate' } },
  { n: 4, c: 3, status: 'waiting_parts', stage: 'work_in_progress', parts: 'backorder', concern: 'Brake noise complaint, front discs and pads on backorder', sensitivity: 'angry', waiting: false, informed: true, promisedHours: -18, arrivedHours: 54, updatedHours: 28, total: 5200, blocker: { type: 'parts', severity: 'critical', description: 'Front brake disc set delayed by supplier backorder' } },
  { n: 5, c: 4, status: 'in_progress', stage: 'work_in_progress', parts: 'issued', concern: 'AC not cooling, compressor replacement approved and underway', sensitivity: 'normal', waiting: false, informed: true, promisedHours: 5, arrivedHours: 22, updatedHours: 3, total: 7400 },
  { n: 6, c: 5, status: 'quality_check', stage: 'quality_check', parts: 'issued', concern: 'Battery replacement and charging system test in final quality check', sensitivity: 'normal', waiting: false, informed: false, promisedHours: 3, arrivedHours: 20, updatedHours: 8, total: 1800 },
  { n: 7, c: 6, status: 'ready', stage: 'ready_handover', parts: 'issued', concern: 'Service B completed, vehicle ready for delivery but customer not informed', sensitivity: 'normal', waiting: false, informed: false, promisedHours: 8, arrivedHours: 28, updatedHours: 5, total: 2600 },
  { n: 8, c: 7, status: 'closed', stage: 'ready_handover', parts: 'issued', concern: 'Completed tyre rotation and wheel alignment', sensitivity: 'normal', waiting: false, informed: true, promisedHours: -24, arrivedHours: 72, updatedHours: 18, completedHours: 12, total: 950 },
  { n: 9, c: 8, status: 'checking', stage: 'diagnosis', parts: 'no_parts', concern: 'Suspension noise over speed bumps, road test and lift inspection', sensitivity: 'comeback', waiting: false, informed: false, promisedHours: -2, arrivedHours: 18, updatedHours: 13, total: 3100 },
  { n: 10, c: 9, status: 'estimate_sent', stage: 'customer_approval', parts: 'no_parts', concern: 'Gearbox warning diagnosis, mechatronics estimate awaiting approval', sensitivity: 'vip', waiting: false, informed: true, promisedHours: 1, arrivedHours: 26, updatedHours: 25, total: 12500, blocker: { type: 'customer_approval', severity: 'critical', description: 'High-value gearbox repair waiting for customer decision' } },
  { n: 11, c: 0, status: 'waiting_parts', stage: 'work_in_progress', parts: 'waiting_warehouse', concern: 'Oil leak repair waiting for warehouse to issue gasket kit', sensitivity: 'normal', waiting: false, informed: true, promisedHours: 6, arrivedHours: 16, updatedHours: 12, total: 2900, blocker: { type: 'parts', severity: 'medium', description: 'Gasket kit reserved but not issued from warehouse' } },
  { n: 12, c: 1, status: 'in_progress', stage: 'work_in_progress', parts: 'parts_ready', concern: 'Urgent VIP customer job, brake fluid flush and safety inspection', sensitivity: 'vip', waiting: true, informed: false, promisedHours: 2, arrivedHours: 4, updatedHours: 2, total: 1700 },
  { n: 13, c: 2, status: 'approved', stage: 'estimate_prep', parts: 'parts_ready', concern: 'Customer approved engine mount replacement, awaiting workshop release', sensitivity: 'normal', waiting: false, informed: true, promisedHours: 20, arrivedHours: 14, updatedHours: 10, total: 3600 },
  { n: 14, c: 3, status: 'checking', stage: 'diagnosis', parts: 'no_parts', concern: 'Repeat repair comeback for coolant smell after previous visit', sensitivity: 'comeback', waiting: false, informed: false, promisedHours: 7, arrivedHours: 12, updatedHours: 7, total: 2200 },
  { n: 15, c: 4, status: 'ready', stage: 'ready_handover', parts: 'issued', concern: 'AC service completed, customer informed and collection booked', sensitivity: 'normal', waiting: false, informed: true, promisedHours: 12, arrivedHours: 30, updatedHours: 2, total: 1250 },
  { n: 16, c: 5, status: 'in_progress', stage: 'customer_approval', parts: 'order_parts', concern: 'Additional belt tensioner found during Service B, advisor approval needed', sensitivity: 'normal', waiting: false, informed: false, promisedHours: -6, arrivedHours: 36, updatedHours: 24, total: 4400, blocker: { type: 'customer_approval', severity: 'high', description: 'Advisor must confirm added belt tensioner work with customer' } },
  { n: 17, c: 6, status: 'booked', stage: 'waiting_technician', parts: 'no_parts', concern: 'Booked appointment for 80,000 km preventive maintenance', sensitivity: 'normal', waiting: false, informed: false, promisedHours: 60, arrivedHours: 0, updatedHours: 1, total: 2100 },
  { n: 18, c: 7, status: 'quality_check', stage: 'final_test', parts: 'issued', concern: 'Road test after suspension arm replacement', sensitivity: 'normal', waiting: false, informed: false, promisedHours: -1, arrivedHours: 24, updatedHours: 13, total: 6300 },
  { n: 19, c: 8, status: 'waiting_parts', stage: 'work_in_progress', parts: 'order_parts', concern: 'Alternator replacement waiting for parts order confirmation', sensitivity: 'normal', waiting: false, informed: true, promisedHours: 18, arrivedHours: 10, updatedHours: 6, total: 2800, blocker: { type: 'parts', severity: 'medium', description: 'Alternator supplier ETA not confirmed' } },
  { n: 20, c: 9, status: 'closed', stage: 'ready_handover', parts: 'issued', concern: 'Closed quick battery replacement and registration', sensitivity: 'normal', waiting: false, informed: true, promisedHours: -8, arrivedHours: 20, updatedHours: 6, completedHours: 4, total: 1150 },
  { n: 21, c: 0, status: 'estimate_sent', stage: 'customer_approval', parts: 'no_parts', concern: 'Customer waiting for approval on tyre and alignment package', sensitivity: 'normal', waiting: true, informed: true, promisedHours: 3, arrivedHours: 6, updatedHours: 6, total: 1950, blocker: { type: 'customer_approval', severity: 'medium', description: 'Customer at branch reviewing tyre replacement estimate' } },
  { n: 22, c: 1, status: 'in_progress', stage: 'work_in_progress', parts: 'issued', concern: 'Normal low-risk oil service and pollen filter replacement', sensitivity: 'normal', waiting: false, informed: false, promisedHours: 30, arrivedHours: 8, updatedHours: 1, total: 900 },
  { n: 23, c: 2, status: 'checking', stage: 'diagnosis', parts: 'no_parts', concern: 'Intermittent no-start complaint, battery and starter circuit diagnosis', sensitivity: 'angry', waiting: false, informed: false, promisedHours: -10, arrivedHours: 42, updatedHours: 30, total: 2600 },
  { n: 24, c: 3, status: 'in_progress', stage: 'work_in_progress', parts: 'backorder', concern: 'Delayed gearbox warning repair waiting for control module', sensitivity: 'vip', waiting: false, informed: true, promisedHours: -30, arrivedHours: 96, updatedHours: 36, total: 16500, blocker: { type: 'parts', severity: 'critical', description: 'Transmission control module on emergency backorder' } },
];

type WorkshopSeed = {
  id: string;
  slug: string;
  productMode: 'WORKSHOP' | 'CONNECT';
  jobPrefix: string;
  dms: boolean;
};

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function withCrmModule(productMode: 'WORKSHOP' | 'CONNECT') {
  const modules = [...defaultEnabledModules(productMode)] as string[];
  if (productMode === 'WORKSHOP' && !modules.includes('crm')) modules.push('crm');
  return modules;
}

async function ensurePlan() {
  await prisma.plans.upsert({
    where: { id: 'free_trial' },
    update: { name: 'Free Trial', is_active: true },
    create: {
      id: 'free_trial',
      name: 'Free Trial',
      description: 'Default trial plan for demo and pilot workspaces',
      price_monthly_cents: 0,
      currency: 'AED',
      max_users: 10,
      max_jobs_per_month: 500,
      max_workshops: 2,
      is_active: true,
    },
  });
}

async function ensureRole() {
  return prisma.roles.upsert({
    where: { name: PILOT_ROLE_NAME },
    update: {
      permissions: JSON.stringify(pilotPermissions),
      description: 'Pilot / Demo Admin / Workshop Manager - operational demo access without billing, destructive user, or tenant-management permissions',
    },
    create: {
      id: uuid(),
      name: PILOT_ROLE_NAME,
      permissions: JSON.stringify(pilotPermissions),
      description: 'Pilot / Demo Admin / Workshop Manager - operational demo access without billing, destructive user, or tenant-management permissions',
    },
  });
}

async function ensurePilotUser(roleId: string) {
  const passwordHash = await bcrypt.hash(PILOT_PASSWORD, 10);
  return prisma.users.upsert({
    where: { email: PILOT_EMAIL },
    update: {
      name: 'Pilot User',
      role_id: roleId,
      password_hash: passwordHash,
      is_active: true,
      failed_login_attempts: 0,
      locked_until: null,
    },
    create: {
      id: uuid(),
      name: 'Pilot User',
      email: PILOT_EMAIL,
      role_id: roleId,
      password_hash: passwordHash,
      is_active: true,
    },
  });
}

async function ensureWorkshop(input: {
  name: string;
  slug: string;
  code: string;
  productMode: 'WORKSHOP' | 'CONNECT';
  dms: boolean;
}) {
  const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const packageName = input.productMode === 'WORKSHOP'
    ? 'PrioraFlow Standalone'
    : PRODUCT_MODE_DISPLAY_NAMES.CONNECT;
  const enabledModules = JSON.stringify(withCrmModule(input.productMode));

  return prisma.workshops.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      code: input.code,
      address: 'Demo Branch, Dubai, UAE',
      phone: '+971501234567',
      email: PILOT_EMAIL,
      timezone: 'Asia/Dubai',
      region: 'gcc',
      is_active: true,
      plan_id: 'free_trial',
      product_mode: input.productMode,
      dms_integration_enabled: input.dms,
      enabled_modules: enabledModules,
      package_name: packageName,
      display_name: 'Demo Branch',
      trial_ends_at: trialEndsAt,
    },
    create: {
      id: uuid(),
      name: input.name,
      slug: input.slug,
      code: input.code,
      address: 'Demo Branch, Dubai, UAE',
      phone: '+971501234567',
      email: PILOT_EMAIL,
      timezone: 'Asia/Dubai',
      region: 'gcc',
      is_active: true,
      plan_id: 'free_trial',
      product_mode: input.productMode,
      dms_integration_enabled: input.dms,
      enabled_modules: enabledModules,
      package_name: packageName,
      display_name: 'Demo Branch',
      trial_ends_at: trialEndsAt,
    },
  });
}

async function ensureWorkshopAccess(userId: string, workshopId: string) {
  await prisma.user_workshop_access.upsert({
    where: { user_id_workshop_id: { user_id: userId, workshop_id: workshopId } },
    update: { assigned_at: new Date() },
    create: { id: uuid(), user_id: userId, workshop_id: workshopId, assigned_at: new Date() },
  });
}

async function ensureSubscription(workshopId: string) {
  const existing = await prisma.subscriptions.findFirst({ where: { workshop_id: workshopId, plan_id: 'free_trial' } });
  const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const data = {
    workshop_id: workshopId,
    plan_id: 'free_trial',
    region: 'gcc',
    status: 'trialing',
    trial_ends_at: trialEndsAt,
    current_period_starts_at: new Date(),
    current_period_ends_at: trialEndsAt,
    billing_email: PILOT_EMAIL,
  };
  if (existing) {
    await prisma.subscriptions.update({ where: { id: existing.id }, data });
    return;
  }
  await prisma.subscriptions.create({ data: { id: uuid(), ...data } });
}

async function ensureIntegration(workshop: WorkshopSeed) {
  if (!workshop.dms) return;
  const existing = await prisma.integrations.findFirst({ where: { workshop_id: workshop.id, name: 'mock-dms' } });
  const data = {
    type: 'dms' as const,
    is_enabled: true,
    config: JSON.stringify({ provider: 'mock', sync: 'pilot-demo', branch: 'Demo Branch' }),
    last_test_status: 'success' as const,
    last_tested_at: new Date(),
  };
  if (existing) {
    await prisma.integrations.update({ where: { id: existing.id }, data });
  } else {
    await prisma.integrations.create({
      data: { id: uuid(), name: 'mock-dms', workshops: { connect: { id: workshop.id } }, ...data },
    });
  }
}

async function ensureSettings(workshopId: string) {
  const settings = [
    { key: 'workshop_name', value: 'PrioraFlow Pilot Workshop', value_type: 'string' as const, description: 'Workshop display name' },
    { key: 'location', value: 'Demo Branch', value_type: 'string' as const, description: 'Pilot branch location' },
    { key: 'workshop_type', value: 'Automotive Service Workshop', value_type: 'string' as const, description: 'Pilot workshop type' },
    { key: 'currency', value: 'AED', value_type: 'string' as const, description: 'Default currency' },
    { key: 'tax_rate', value: '5', value_type: 'number' as const, description: 'Default VAT percent' },
  ];
  for (const item of settings) {
    await prisma.settings.upsert({
      where: { key_workshop_id: { key: item.key, workshop_id: workshopId } },
      update: item,
      create: { id: uuid(), workshop_id: workshopId, ...item },
    });
  }
}

async function seedWorkshopData(workshop: WorkshopSeed, pilotUserId: string) {
  await ensureSubscription(workshop.id);
  await ensureSettings(workshop.id);
  await ensureIntegration(workshop);

  const jobNumbers = jobScenarios.map((scenario) => `${workshop.jobPrefix}-${String(scenario.n).padStart(3, '0')}`);
  const existingJobs = await prisma.jobs.findMany({
    where: { workshop_id: workshop.id, job_number: { in: jobNumbers } },
    select: { id: true },
  });
  const existingJobIds = existingJobs.map((job) => job.id);
  if (existingJobIds.length) {
    await prisma.$transaction([
      prisma.blockers.deleteMany({ where: { workshop_id: workshop.id, job_id: { in: existingJobIds } } }),
      prisma.estimate_lines.deleteMany({ where: { workshop_id: workshop.id, job_id: { in: existingJobIds } } }),
      prisma.job_status_history.deleteMany({ where: { workshop_id: workshop.id, job_id: { in: existingJobIds } } }),
      prisma.jobs.deleteMany({ where: { workshop_id: workshop.id, id: { in: existingJobIds } } }),
    ]);
  }

  const customerEmails = customers.map((customer) => customer.email);
  const vehicleVins = vehicles.map((vehicle) => vehicle.vin);
  const existingVehicles = await prisma.vehicles.findMany({
    where: { workshop_id: workshop.id, vin: { in: vehicleVins } },
    select: { id: true },
  });
  const existingCustomers = await prisma.customers.findMany({
    where: { workshop_id: workshop.id, email: { in: customerEmails } },
    select: { id: true },
  });

  if (existingVehicles.length || existingCustomers.length) {
    await prisma.$transaction([
      prisma.vehicles.deleteMany({ where: { workshop_id: workshop.id, id: { in: existingVehicles.map((vehicle) => vehicle.id) } } }),
      prisma.customers.deleteMany({ where: { workshop_id: workshop.id, id: { in: existingCustomers.map((customer) => customer.id) } } }),
    ]);
  }

  const customerRows = customers.map((customer) => ({
    id: uuid(),
    ...customer,
    is_active: true,
    notes: 'Pilot demo customer',
    workshop_id: workshop.id,
  }));
  const vehicleRows = vehicles.map((vehicle, index) => ({
    id: uuid(),
    ...vehicle,
    customer_id: customerRows[index].id,
    workshop_id: workshop.id,
    is_deleted: false,
  }));

  const jobRows = jobScenarios.map((scenario) => {
    const jobNumber = `${workshop.jobPrefix}-${String(scenario.n).padStart(3, '0')}`;
    const vehicle = vehicleRows[scenario.c];
    const createdAt = hoursAgo(Math.max(scenario.arrivedHours || 2, scenario.updatedHours));
    const updatedAt = hoursAgo(scenario.updatedHours);
    return {
      id: uuid(),
      job_number: jobNumber,
      customer_id: customerRows[scenario.c].id,
      vehicle_id: vehicle.id,
      advisor_id: pilotUserId,
      technician_id: pilotUserId,
      status: scenario.status as any,
      workshop_stage: scenario.stage as any,
      workflow_stage_key: scenario.stage,
      parts_status: scenario.parts as any,
      workshop_id: workshop.id,
      customer_informed: scenario.informed,
      is_customer_waiting: scenario.waiting,
      customer_sensitivity: scenario.sensitivity,
      customer_concern: scenario.concern,
      internal_notes: `Pilot demo scenario: ${scenario.concern}`,
      odometer_in: vehicle.odometer_km,
      promised_at: hoursFromNow(scenario.promisedHours),
      arrived_at: scenario.arrivedHours ? hoursAgo(scenario.arrivedHours) : null,
      dms_ro_number: workshop.dms ? `DMS-${jobNumber}` : null,
      dms_synced_at: workshop.dms ? hoursAgo(Math.min(scenario.updatedHours, 12)) : null,
      completed_at: scenario.completedHours ? hoursAgo(scenario.completedHours) : null,
      archived_at: null,
      is_deleted: false,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  });

  const historyRows = jobRows.map((job, index) => ({
    id: uuid(),
    job_id: job.id,
    from_status: null,
    to_status: jobScenarios[index].status,
    changed_by: pilotUserId,
    workshop_id: workshop.id,
    reason: 'Pilot demo seed state',
    changed_at: job.updated_at,
  }));

  const estimateRows = jobRows.flatMap((job, index) => {
    const total = jobScenarios[index].total;
    const labourTotal = Math.round(total * 0.45);
    const partsTotal = Math.round(total * 0.55);
    return [
      {
        id: uuid(),
        job_id: job.id,
        type: 'labour' as const,
        description: 'Diagnostic and workshop labour',
        quantity: 1,
        unit_price: labourTotal,
        tax_rate_pct: 5,
        line_total: labourTotal,
        tax_amount: Math.round(labourTotal * 0.05),
        is_recommended: false,
        sort_order: 1,
        added_by: pilotUserId,
        workshop_id: workshop.id,
      },
      {
        id: uuid(),
        job_id: job.id,
        type: 'part' as const,
        description: 'Parts and consumables',
        quantity: 1,
        unit_price: partsTotal,
        tax_rate_pct: 5,
        line_total: partsTotal,
        tax_amount: Math.round(partsTotal * 0.05),
        is_recommended: true,
        sort_order: 2,
        added_by: pilotUserId,
        workshop_id: workshop.id,
      },
    ];
  });

  const blockerRows = jobScenarios.flatMap((scenario, index) => {
    if (!scenario.blocker) return [];
    return [{
      id: uuid(),
      job_id: jobRows[index].id,
      type: scenario.blocker.type as any,
      description: scenario.blocker.description,
      severity: scenario.blocker.severity as any,
      status: 'active' as const,
      blocked_by: pilotUserId,
      workshop_id: workshop.id,
      created_at: hoursAgo(scenario.updatedHours),
    }];
  });

  await prisma.$transaction([
    prisma.customers.createMany({ data: customerRows }),
    prisma.vehicles.createMany({ data: vehicleRows }),
    prisma.jobs.createMany({ data: jobRows }),
    prisma.job_status_history.createMany({ data: historyRows }),
    prisma.estimate_lines.createMany({ data: estimateRows }),
    prisma.blockers.createMany({ data: blockerRows }),
  ]);
}

async function main() {
  console.log('Seeding PrioraFlow pilot account...');

  await ensurePlan();
  const pilotRole = await ensureRole();
  const pilotUser = await ensurePilotUser(pilotRole.id);

  const standaloneWorkshop = await ensureWorkshop({
    name: 'PrioraFlow Pilot Workshop',
    slug: STANDALONE_SLUG,
    code: 'PILOTWORKSHOP',
    productMode: 'WORKSHOP',
    dms: false,
  });
  const connectWorkshop = await ensureWorkshop({
    name: 'PrioraFlow Pilot Workshop - Connect',
    slug: CONNECT_SLUG,
    code: 'PILOTCONNECT',
    productMode: 'CONNECT',
    dms: true,
  });

  await ensureWorkshopAccess(pilotUser.id, standaloneWorkshop.id);
  await ensureWorkshopAccess(pilotUser.id, connectWorkshop.id);

  await seedWorkshopData(
    { id: standaloneWorkshop.id, slug: standaloneWorkshop.slug, productMode: 'WORKSHOP', jobPrefix: 'PILOT-S', dms: false },
    pilotUser.id,
  );
  await seedWorkshopData(
    { id: connectWorkshop.id, slug: connectWorkshop.slug, productMode: 'CONNECT', jobPrefix: 'PILOT-C', dms: true },
    pilotUser.id,
  );

  console.log('');
  console.log('Pilot account created/updated:');
  console.log(`Email: ${PILOT_EMAIL}`);
  console.log(`Password: ${PILOT_PASSWORD}`);
  console.log('Tenant: PrioraFlow Pilot Workshop');
  console.log('Access: Connect + Standalone');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
