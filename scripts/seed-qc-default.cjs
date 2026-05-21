const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

// We need to run inside the api container where prisma is available
const { PrismaClient } = require('/app/node_modules/.prisma/client');
const prisma = new PrismaClient();

const QC_SECTIONS = [
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

async function main() {
  const workshops = await prisma.workshops.findMany({ where: { is_active: true }, select: { id: true } });
  console.log('Found ' + workshops.length + ' active workshop(s)');

  for (const ws of workshops) {
    const existing = await prisma.qc_checklist_templates.findFirst({ where: { workshop_id: ws.id, is_default: true } });
    if (existing) { console.log('Workshop ' + ws.id + ' already has default QC template, skipping'); continue; }

    const template = await prisma.qc_checklist_templates.create({
      data: { id: uuid(), name: 'Final Quality Control', description: 'Standard quality control checklist for completed work', is_default: true, is_active: true, workshop_id: ws.id }
    });

    for (let si = 0; si < QC_SECTIONS.length; si++) {
      const sec = QC_SECTIONS[si];
      const section = await prisma.qc_checklist_sections.create({
        data: { id: uuid(), template_id: template.id, name: sec.name, icon: sec.icon, sort_order: si + 1, is_active: true, workshop_id: ws.id }
      });
      for (let ii = 0; ii < sec.items.length; ii++) {
        const item = sec.items[ii];
        await prisma.qc_checklist_items.create({
          data: { id: uuid(), section_id: section.id, label: item.label, input_type: item.input_type, requires_photo: item.requires_photo, requires_note_on_fail: item.requires_note_on_fail, sort_order: ii + 1, is_active: true, workshop_id: ws.id }
        });
      }
    }
    console.log('Created default QC template for workshop ' + ws.id);
  }
  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });