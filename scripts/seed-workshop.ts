import { v4 as uuid } from 'uuid';

/**
 * Seed script: creates the default workshop and assigns all existing users to it.
 *
 * Run with: npx ts-node scripts/seed-workshop.ts
 *
 * This is a one-time migration script for multi-tenant support.
 * It creates the "Mercedes-Benz Test" workshop and assigns all active users to it.
 */
async function seedWorkshop() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // 1. Create the default workshop
    const defaultWorkshopId = 'wsp_default_mercedes_test';
    const existing = await prisma.workshops.findUnique({ where: { id: defaultWorkshopId } });

    if (existing) {
      console.log(`Workshop already exists: ${existing.name} (${existing.id})`);
    } else {
      await prisma.workshops.create({
        data: {
          id: defaultWorkshopId,
          name: 'Mercedes-Benz Test',
          slug: 'mercedes-benz-test',
          is_active: true,
        },
      });
      console.log(`Created workshop: Mercedes-Benz Test (${defaultWorkshopId})`);
    }

    // 2. Backfill all data tables with the default workshop_id
    const dataTables = [
      'jobs', 'customers', 'vehicles', 'estimate_lines', 'estimate_line_history',
      'quote_groups', 'inspections', 'inspection_sections', 'inspection_items',
      'inspection_responses', 'inspection_templates', 'media_files', 'deferred_work',
      'deferred_work_reminders', 'notifications', 'notification_templates', 'audit_logs',
      'booking_import_templates', 'settings', 'labour_rates', 'job_status_history',
      'vehicle_service_history', 'approval_tokens', 'authorisation_decisions',
      'integrations', 'integration_events',
    ];

    for (const table of dataTables) {
      try {
        const result = await prisma.$executeRawUnsafe(
          `UPDATE \`${table}\` SET workshop_id = ? WHERE workshop_id IS NULL`,
          defaultWorkshopId,
        );
        if (result > 0) {
          console.log(`  Backfilled ${result} rows in ${table}`);
        }
      } catch (err: any) {
        if (err?.code === 'ER_BAD_FIELD_ERROR' || err?.message?.includes('Unknown column')) {
          console.log(`  Skipped ${table} (workshop_id column not yet added)`);
        } else {
          console.log(`  Warning: ${table}: ${err?.message || err}`);
        }
      }
    }

    // 3. Assign all active users to the default workshop
    const users = await prisma.users.findMany({ where: { is_active: true }, select: { id: true } });
    let assigned = 0;
    for (const user of users) {
      const existingAccess = await prisma.user_workshop_access.findUnique({
        where: { user_id_workshop_id: { user_id: user.id, workshop_id: defaultWorkshopId } },
      });
      if (!existingAccess) {
        await prisma.user_workshop_access.create({
          data: {
            id: uuid(),
            user_id: user.id,
            workshop_id: defaultWorkshopId,
            assigned_at: new Date(),
          },
        });
        assigned++;
      }
    }
    console.log(`Assigned ${assigned} users to default workshop`);

    // 4. Backfill refresh tokens with the default workshop_id
    try {
      const tokenResult = await prisma.$executeRawUnsafe(
        `UPDATE refresh_tokens SET workshop_id = ? WHERE workshop_id IS NULL`,
        defaultWorkshopId,
      );
      if (tokenResult > 0) {
        console.log(`  Backfilled ${tokenResult} refresh tokens`);
      }
    } catch (err: any) {
      console.log(`  Warning: refresh_tokens: ${err?.message || err}`);
    }

    console.log('Workshop seeding complete.');
  } catch (error) {
    console.error('Failed to seed workshop:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedWorkshop();