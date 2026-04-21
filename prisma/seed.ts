import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  // 1. Roles
  const adminRole = await prisma.roles.create({ data: { id: uuid(), name: 'admin', permissions: JSON.stringify(['*']), description: 'Full system access' } });
  const advisorRole = await prisma.roles.create({ data: { id: uuid(), name: 'service_advisor', permissions: JSON.stringify(['jobs:read','jobs:write','customers:read','customers:write','estimates:read','estimates:write','inspections:read','inspections:write']), description: 'Service advisor' } });
  const techRole = await prisma.roles.create({ data: { id: uuid(), name: 'technician', permissions: JSON.stringify(['inspections:read','inspections:write','jobs:read','media:write']), description: 'Technician' } });
  const receptionRole = await prisma.roles.create({ data: { id: uuid(), name: 'receptionist', permissions: JSON.stringify(['customers:read','customers:write','jobs:read','jobs:write']), description: 'Receptionist' } });
  const managerRole = await prisma.roles.create({ data: { id: uuid(), name: 'manager', permissions: JSON.stringify(['jobs:read','jobs:write','customers:read','estimates:read','estimates:write','reports:read','settings:read','settings:write']), description: 'Manager' } });

  // 2. Users
  const password = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.users.create({ data: { id: uuid(), name: 'Admin', email: 'admin@superflow.app', password_hash: password, role_id: adminRole.id, is_active: true } });
  const advisor = await prisma.users.create({ data: { id: uuid(), name: 'Ahmed Advisor', email: 'ahmed@superflow.app', password_hash: password, role_id: advisorRole.id, is_active: true } });
  const tech = await prisma.users.create({ data: { id: uuid(), name: 'Omar Tech', email: 'omar@superflow.app', password_hash: password, role_id: techRole.id, is_active: true } });
  const reception = await prisma.users.create({ data: { id: uuid(), name: 'Sara Reception', email: 'sara@superflow.app', password_hash: password, role_id: receptionRole.id, is_active: true } });

  // 3. Labour rates
  await prisma.labour_rates.createMany({ data: [
    { id: uuid(), name: 'Standard', rate_per_hour: 350, currency: 'AED', is_active: true },
    { id: uuid(), name: 'Diagnostic', rate_per_hour: 450, currency: 'AED', is_active: true },
    { id: uuid(), name: 'Specialist', rate_per_hour: 550, currency: 'AED', is_active: true },
    { id: uuid(), name: 'Body Shop', rate_per_hour: 300, currency: 'AED', is_active: true },
  ] });

  // 4. Settings
  await prisma.settings.createMany({ data: [
    { id: uuid(), key: 'workshop_name', value: 'SuperFlow Workshop', value_type: 'string', description: 'Workshop display name' },
    { id: uuid(), key: 'currency', value: 'AED', value_type: 'string', description: 'Default currency' },
    { id: uuid(), key: 'tax_rate', value: '5', value_type: 'number', description: 'Default VAT %' },
    { id: uuid(), key: 'token_expiry_days', value: '7', value_type: 'number', description: 'Approval token expiry in days' },
  ] });

  // 5. Inspection template
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

  // 6. Sample customer + vehicle + job
  const customer = await prisma.customers.create({ data: { id: uuid(), name: 'Mohammed Al Maktoum', email: 'mohammed@example.com', phone: '+971501234567', preferred_contact: 'whatsapp', language: 'ar', is_active: true } });
  const vehicle = await prisma.vehicles.create({ data: { id: uuid(), customer_id: customer.id, vin: 'WDDGF4HB1EA123456', make: 'Mercedes-Benz', model: 'C200', year: 2022, plate: 'DXB-A-12345', color: 'Obsidian Black', vehicle_type: 'sedan', engine: '2.0L Turbo' } });
  const job = await prisma.jobs.create({ data: { id: uuid(), job_number: 'SF-001', customer_id: customer.id, vehicle_id: vehicle.id, advisor_id: advisor.id, technician_id: tech.id, status: 'booked', customer_concern: 'Strange noise from front left when braking', odometer_in: 45000, promised_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) } });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   admin@superflow.app / Admin@123');
  console.log('   ahmed@superflow.app / Admin@123');
  console.log('   omar@superflow.app / Admin@123');
  console.log('   sara@superflow.app / Admin@123');
  console.log('');
  console.log(`📋 Sample job: SF-001 (${job.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });