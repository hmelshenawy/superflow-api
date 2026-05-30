import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

const templates = [
  ['Routine', 'Minor service', 90, '#378ADD'],
  ['Routine', 'Major service', 180, '#185FA5'],
  ['Routine', 'Oil & filter change', 45, '#85B7EB'],
  ['Routine', 'Pre-purchase inspection', 60, '#B5D4F4'],
  ['Diagnosis', 'Engine diagnostics', 60, '#EF9F27'],
  ['Diagnosis', 'Electrical fault diagnosis', 90, '#BA7517'],
  ['Diagnosis', 'AC diagnosis', 45, '#FAC775'],
  ['Brakes', 'Brake inspection', 30, '#F09595'],
  ['Brakes', 'Front brake service', 90, '#E24B4A'],
  ['Brakes', 'Full brake service', 150, '#A32D2D'],
  ['Tyres', 'Tyre change x4', 60, '#5DCAA5'],
  ['Tyres', 'Wheel alignment', 45, '#1D9E75'],
  ['Tyres', 'Wheel balancing', 30, '#9FE1CB'],
  ['Suspension', 'Suspension inspection', 60, '#AFA9EC'],
  ['Suspension', 'Shock absorber replacement', 120, '#7F77DD'],
  ['AC & Cooling', 'AC regas & service', 90, '#5DCAA5'],
  ['AC & Cooling', 'Radiator flush', 60, '#1D9E75'],
  ['Electrical', 'Battery test & replacement', 30, '#FAC775'],
  ['Electrical', 'Starter / alternator check', 60, '#EF9F27'],
  ['Body & Glass', 'Windscreen replacement', 120, '#F5C4B3'],
  ['Body & Glass', 'Minor dent repair', 90, '#F0997B'],
  ['Transmission', 'Gearbox service', 120, '#CECBF6'],
  ['Transmission', 'Clutch replacement', 240, '#7F77DD'],
  ['Other', 'Custom job', 60, '#B4B2A9'],
] as const;

async function main() {
  for (const [category, name, default_duration_min, color_hex] of templates) {
    const existing = await (prisma as any).job_type_templates.findFirst({ where: { category, name } });
    if (existing) {
      await (prisma as any).job_type_templates.update({ where: { id: existing.id }, data: { default_duration_min, color_hex, is_active: true } });
      continue;
    }
    await (prisma as any).job_type_templates.create({ data: { id: uuid(), category, name, default_duration_min, color_hex } });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
