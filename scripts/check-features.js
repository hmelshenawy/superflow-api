const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const ftPe = await prisma.plan_features.findMany({ where: { plan_id: 'free_trial', feature_key: 'priority_engine' } });
  console.log('free_trial priority_engine:', JSON.stringify(ftPe));
  const entPe = await prisma.plan_features.findMany({ where: { plan_id: 'enterprise', feature_key: 'priority_engine' } });
  console.log('enterprise priority_engine:', JSON.stringify(entPe));
  const ftCount = await prisma.plan_features.findMany({ where: { plan_id: 'free_trial' } });
  console.log('free_trial features count:', ftCount.length);
  console.log('Sample:', ftCount.slice(0, 3).map(f => f.feature_key + '=' + f.is_included).join(', '));
  const entCount = await prisma.plan_features.findMany({ where: { plan_id: 'enterprise' } });
  console.log('enterprise features count:', entCount.length);
  console.log('Sample:', entCount.slice(0, 3).map(f => f.feature_key + '=' + f.is_included).join(', '));
}
main().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });