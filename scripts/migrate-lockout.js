const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Add account lockout columns
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0');
    await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until DATETIME(0) DEFAULT NULL');
    console.log('Added lockout columns');
  } catch (e) {
    console.log('Lockout error:', e.message ? e.message.substring(0, 120) : 'unknown');
  }

  // Verify Mercedes workshop subscription
  const sub = await prisma.subscriptions.findFirst({
    where: { workshop_id: 'wsp_default_mercedes_test' },
    orderBy: { created_at: 'desc' }
  });
  console.log('Mercedes sub:', sub?.status, sub?.plan_id, sub?.region);

  // Check all workshops have subscriptions
  const workshops = await prisma.workshops.findMany({ where: { is_active: true }, include: { subscriptions: true } });
  for (const w of workshops) {
    const activeSub = w.subscriptions.find(s => ['active', 'paid', 'manual_active', 'trialing'].includes(s.status));
    console.log('Workshop:', w.name, '| plan:', w.plan_id, '| sub:', activeSub ? activeSub.status + ' ' + activeSub.plan_id : 'NONE');
  }
}

main().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });