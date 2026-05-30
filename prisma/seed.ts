import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { DEFAULT_ROLES, ALL_PERMISSIONS } from '../src/common/permissions';
import { PRODUCT_MODE_DISPLAY_NAMES, defaultEnabledModules } from '../src/common/product-modes';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  // 1. Roles — use DEFAULT_ROLES as the source of truth
  const workshopAdminRole = await prisma.roles.create({ data: { id: uuid(), name: 'workshop_admin', permissions: JSON.stringify(ALL_PERMISSIONS), description: 'Full system access — workshop administrator' } });

  for (const [, template] of Object.entries(DEFAULT_ROLES)) {
    if (template.name === 'admin') continue; // admin already covered by workshop_admin
    await prisma.roles.create({ data: { id: uuid(), name: template.name, permissions: JSON.stringify(template.permissions), description: template.description } });
  }

  // 2. Users
  const password = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.users.create({ data: { id: uuid(), name: 'Admin', email: 'admin@superflow.app', password_hash: password, role_id: workshopAdminRole.id, is_active: true } });
  const advisorRole = await prisma.roles.findFirst({ where: { name: 'service_advisor' } });
  const techRole = await prisma.roles.findFirst({ where: { name: 'technician' } });
  const receptionRole = await prisma.roles.findFirst({ where: { name: 'receptionist' } });
  const managerRole = await prisma.roles.findFirst({ where: { name: 'workshop_manager' } });
  const gmRole = await prisma.roles.findFirst({ where: { name: 'general_manager' } });

  const advisor = await prisma.users.create({ data: { id: uuid(), name: 'Ahmed Advisor', email: 'ahmed@superflow.app', password_hash: password, role_id: advisorRole!.id, is_active: true } });
  const tech = await prisma.users.create({ data: { id: uuid(), name: 'Omar Tech', email: 'omar@superflow.app', password_hash: password, role_id: techRole!.id, is_active: true } });
  await prisma.users.create({ data: { id: uuid(), name: 'Sara Reception', email: 'sara@superflow.app', password_hash: password, role_id: receptionRole!.id, is_active: true } });
  const connectAdvisor = await prisma.users.create({ data: { id: uuid(), name: 'Maya Advisor', email: 'maya.connect@superflow.app', password_hash: password, role_id: advisorRole!.id, is_active: true } });
  const connectManager = await prisma.users.create({ data: { id: uuid(), name: 'Layla Workshop Manager', email: 'manager.connect@superflow.app', password_hash: password, role_id: managerRole!.id, is_active: true } });
  const connectGm = await prisma.users.create({ data: { id: uuid(), name: 'Hassan General Manager', email: 'gm.connect@superflow.app', password_hash: password, role_id: gmRole!.id, is_active: true } });

  // 3. Workshop
  const workshopId = uuid();
  const slug = 'prioraflow-workshop';
  await prisma.workshops.create({ data: { id: workshopId, name: 'PrioraFlow Workshop Demo', slug, phone: '+971501234567', email: 'admin@superflow.app', region: 'gcc', is_active: true, plan_id: 'free_trial', product_mode: 'WORKSHOP', dms_integration_enabled: false, enabled_modules: JSON.stringify(defaultEnabledModules('WORKSHOP')), package_name: PRODUCT_MODE_DISPLAY_NAMES.WORKSHOP, trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) } });
  await prisma.user_workshop_access.create({ data: { id: uuid(), user_id: admin.id, workshop_id: workshopId, assigned_at: new Date() } });
  await prisma.user_workshop_access.create({ data: { id: uuid(), user_id: advisor.id, workshop_id: workshopId, assigned_at: new Date() } });
  await prisma.user_workshop_access.create({ data: { id: uuid(), user_id: tech.id, workshop_id: workshopId, assigned_at: new Date() } });

  const connectWorkshopId = uuid();
  await prisma.workshops.create({
    data: {
      id: connectWorkshopId,
      name: 'PrioraFlow Connect Demo',
      slug: 'prioraflow-connect',
      phone: '+971509876543',
      email: 'connect@superflow.app',
      region: 'gcc',
      is_active: true,
      plan_id: 'free_trial',
      product_mode: 'CONNECT',
      dms_integration_enabled: true,
      enabled_modules: JSON.stringify(defaultEnabledModules('CONNECT')),
      package_name: PRODUCT_MODE_DISPLAY_NAMES.CONNECT,
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  for (const user of [connectAdvisor, connectManager, connectGm]) {
    await prisma.user_workshop_access.create({ data: { id: uuid(), user_id: user.id, workshop_id: connectWorkshopId, assigned_at: new Date() } });
  }
  await prisma.integrations.create({
    data: {
      id: uuid(),
      name: 'mock-dms',
      type: 'dms',
      is_enabled: true,
      workshop_id: connectWorkshopId,
      config: JSON.stringify({ provider: 'mock', sync: 'placeholder' }),
    },
  });

  // 4. Labour rates
  await prisma.labour_rates.createMany({ data: [
    { id: uuid(), name: 'Standard', rate_per_hour: 350, currency: 'AED', is_active: true },
    { id: uuid(), name: 'Diagnostic', rate_per_hour: 450, currency: 'AED', is_active: true },
    { id: uuid(), name: 'Specialist', rate_per_hour: 550, currency: 'AED', is_active: true },
    { id: uuid(), name: 'Body Shop', rate_per_hour: 300, currency: 'AED', is_active: true },
  ] });

  // 5. Settings
  await prisma.settings.createMany({ data: [
    { id: uuid(), key: 'workshop_name', value: 'PrioraFlow Workshop', value_type: 'string', description: 'Workshop display name' },
    { id: uuid(), key: 'currency', value: 'AED', value_type: 'string', description: 'Default currency' },
    { id: uuid(), key: 'tax_rate', value: '5', value_type: 'number', description: 'Default VAT %' },
    { id: uuid(), key: 'token_expiry_days', value: '7', value_type: 'number', description: 'Approval token expiry in days' },
  ] });

  // 6. Inspection template
  const template = await prisma.inspection_templates.create({ data: { id: uuid(), name: 'Multi-Point Inspection', vehicle_type: 'sedan', is_default: true, is_active: true, created_by: admin.id } });
  const sections = [
    { name: 'Engine', icon: '🔧', items: ['Oil Level', 'Coolant Level', 'Belt Condition', 'Battery Voltage'] },
    { name: 'Brakes', icon: '🛑', items: ['Front Pad Thickness', 'Rear Pad Thickness', 'Brake Fluid Level', 'Rotor Condition'] },
    { name: 'Tyres', icon: '🛞', items: ['Front Left Tread', 'Front Right Tread', 'Rear Left Tread', 'Rear Right Tread', 'Spare Tyre'] },
    { name: 'Exterior', icon: '🚗', items: ['Body Damage', 'Windscreen', 'Headlights', 'Taillights', 'Wipers'] },
    { name: 'Interior', icon: '💺', items: ['AC Function', 'Dashboard Warning Lights', 'Seatbelt Function', 'Horn'] },
  ];

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    const section = await prisma.inspection_sections.create({ data: { id: uuid(), template_id: template.id, name: sec.name, icon: sec.icon, sort_order: si + 1, is_active: true } });
    for (let ii = 0; ii < sec.items.length; ii++) {
      await prisma.inspection_items.create({ data: { id: uuid(), section_id: section.id, label: sec.items[ii], input_type: 'ok_warn_fail', requires_photo: false, sort_order: ii + 1, is_active: true } });
    }
  }

  // 7. QC checklist template
  const qcTemplate = await prisma.qc_checklist_templates.create({ data: { id: uuid(), name: 'Final Quality Control', description: 'Standard quality control checklist for completed work', is_default: true, is_active: true, created_by: admin.id } });
  const qcSections = [
    { name: 'Work Completion', icon: '✅', items: [
      { label: 'All work per estimate completed', input_type: 'yes_no', requires_photo: false, requires_note_on_fail: true },
      { label: 'No loose fasteners or missing clips', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
      { label: 'Fluid levels checked and topped up', input_type: 'yes_no', requires_photo: false, requires_note_on_fail: false },
      { label: 'No fluid leaks visible', input_type: 'pass_fail', requires_photo: true, requires_note_on_fail: true },
    ]},
    { name: 'Workmanship Quality', icon: '🔧', items: [
      { label: 'Paint/panel fit and finish', input_type: 'pass_fail', requires_photo: true, requires_note_on_fail: true },
      { label: 'No scratches or marks on work area', input_type: 'pass_fail', requires_photo: true, requires_note_on_fail: false },
      { label: 'All parts properly torqued', input_type: 'yes_no', requires_photo: false, requires_note_on_fail: true },
      { label: 'Wiring and hoses properly routed', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
    ]},
    { name: 'Safety Verification', icon: '⚠️', items: [
      { label: 'Brake system verified', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
      { label: 'Steering system checked', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
      { label: 'No warning lights on dashboard', input_type: 'yes_no', requires_photo: true, requires_note_on_fail: true },
      { label: 'Tyre condition and pressures confirmed', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: false },
      { label: 'Seatbelt and airbag systems OK', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
    ]},
    { name: 'Customer-Facing Readiness', icon: '🚗', items: [
      { label: 'Vehicle cleaned and presentable', input_type: 'yes_no', requires_photo: true, requires_note_on_fail: false },
      { label: 'Interior left tidy', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: false },
      { label: 'Odometer reading recorded', input_type: 'text', requires_photo: false, requires_note_on_fail: false },
      { label: 'Final test drive completed', input_type: 'yes_no', requires_photo: false, requires_note_on_fail: true },
    ]},
  ];

  for (let si = 0; si < qcSections.length; si++) {
    const sec = qcSections[si];
    const section = await prisma.qc_checklist_sections.create({ data: { id: uuid(), template_id: qcTemplate.id, name: sec.name, icon: sec.icon, sort_order: si + 1, is_active: true } });
    for (let ii = 0; ii < sec.items.length; ii++) {
      const item = sec.items[ii];
      await prisma.qc_checklist_items.create({ data: { id: uuid(), section_id: section.id, label: item.label, input_type: item.input_type as any, requires_photo: item.requires_photo, requires_note_on_fail: item.requires_note_on_fail, sort_order: ii + 1, is_active: true } });
    }
  }

  // 8. Sample customer + vehicle + job
  const customer = await prisma.customers.create({ data: { id: uuid(), name: 'Mohammed Al Maktoum', email: 'mohammed@example.com', phone: '+971501234567', preferred_contact: 'whatsapp', language: 'ar', is_active: true } });
  const vehicle = await prisma.vehicles.create({ data: { id: uuid(), customer_id: customer.id, vin: 'WDDGF4HB1EA123456', make: 'Mercedes-Benz', vehicle_model: 'C200', year: 2022, plate: 'DXB-A-12345', color: 'Obsidian Black', vehicle_type: 'sedan', engine: '2.0L Turbo' } });
  const job = await prisma.jobs.create({ data: { id: uuid(), job_number: 'SF-001', customer_id: customer.id, vehicle_id: vehicle.id, advisor_id: advisor.id, technician_id: tech.id, status: 'booked', customer_concern: 'Strange noise from front left when braking', odometer_in: 45000, promised_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) } });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   admin@superflow.app / Admin@123');
  console.log('   ahmed@superflow.app / Admin@123');
  console.log('   omar@superflow.app / Admin@123');
  console.log('   sara@superflow.app / Admin@123');
  console.log('   maya.connect@superflow.app / Admin@123');
  console.log('   manager.connect@superflow.app / Admin@123');
  console.log('   gm.connect@superflow.app / Admin@123');
  console.log('');
  console.log(`📋 Sample job: SF-001 (${job.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
