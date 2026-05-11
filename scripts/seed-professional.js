const { PrismaClient } = require('@prisma/client');
const { v4: uuid } = require('uuid');
const prisma = new PrismaClient();

const PROFESSIONAL_FEATURES = [
  { feature_key: 'job_board', is_included: true, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'stages', is_included: true, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'customer_approval', is_included: true, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'dvi_reports', is_included: true, ceiling: 1000, overage_unit_cents: 25 },
  { feature_key: 'estimates', is_included: true, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'ai_scored_jobs', is_included: true, ceiling: 1500, overage_unit_cents: 5 },
  { feature_key: 'customer_approval_sms', is_included: true, ceiling: 500, overage_unit_cents: 3 },
  { feature_key: 'priority_engine', is_included: true, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'nba', is_included: true, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'delivery_risk', is_included: true, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'multi_shop', is_included: false, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'advisor_workload', is_included: false, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'ai_message_drafts', is_included: false, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'analytics', is_included: false, ceiling: null, overage_unit_cents: 0 },
  { feature_key: 'max_users', is_included: true, ceiling: 20, overage_unit_cents: 0 },
  { feature_key: 'max_locations', is_included: true, ceiling: 1, overage_unit_cents: 0 },
];

async function main() {
  for (const f of PROFESSIONAL_FEATURES) {
    await prisma.plan_features.upsert({
      where: { plan_id_feature_key: { plan_id: 'professional', feature_key: f.feature_key } },
      update: { is_included: f.is_included, ceiling: f.ceiling, overage_unit_cents: f.overage_unit_cents },
      create: { id: uuid(), plan_id: 'professional', ...f },
    });
  }
  console.log('Professional features seeded');

  // Verify professional
  const feats = await prisma.plan_features.findMany({
    where: { plan_id: 'professional' },
    orderBy: { feature_key: 'asc' }
  });
  const included = feats.filter(f => f.is_included).map(f => f.feature_key);
  const excluded = feats.filter(f => !f.is_included).map(f => f.feature_key);
  console.log('professional:');
  console.log('  INCLUDED:', included.join(', '));
  console.log('  EXCLUDED:', excluded.join(', '));
}

main().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });