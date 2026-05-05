import { v4 as uuid } from 'uuid';
import { DEFAULT_ROLES } from '../src/common/permissions';

/**
 * Seed script: creates default roles with permissions.
 *
 * Run with: npx ts-node scripts/seed-roles.ts
 *
 * This script is idempotent — it will update existing roles
 * by name if they already exist.
 */
async function seedRoles() {
  // Dynamic import so the script can run standalone
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    console.log('Seeding default roles...');

    for (const [, roleData] of Object.entries(DEFAULT_ROLES)) {
      const existing = await prisma.roles.findFirst({ where: { name: roleData.name } });

      if (existing) {
        await prisma.roles.update({
          where: { id: existing.id },
          data: {
            permissions: JSON.stringify(roleData.permissions),
            description: roleData.description,
          },
        });
        console.log(`  Updated role: ${roleData.name} (${roleData.permissions.length} permissions)`);
      } else {
        await prisma.roles.create({
          data: {
            id: uuid(),
            name: roleData.name,
            permissions: JSON.stringify(roleData.permissions),
            description: roleData.description,
          },
        });
        console.log(`  Created role: ${roleData.name} (${roleData.permissions.length} permissions)`);
      }
    }

    console.log('Done.');
  } catch (error) {
    console.error('Failed to seed roles:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedRoles();