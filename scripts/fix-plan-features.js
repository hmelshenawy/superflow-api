const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Correct feature matrix based on the plan design
const FEATURES = {
  free_trial: {
    job_board: { is_included: true, ceiling: null },
    stages: { is_included: true, ceiling: null },
    customer_approval: { is_included: true, ceiling: null },
    dvi_reports: { is_included: true, ceiling: 200 },
    estimates: { is_included: true, ceiling: null },
    ai_scored_jobs: { is_included: true, ceiling: 500 },
    customer_approval_sms: { is_included: true, ceiling: 100 },
    priority_engine: { is_included: false, ceiling: null },
    nba: { is_included: false, ceiling: null },
    delivery_risk: { is_included: false, ceiling: null },
    multi_shop: { is_included: false, ceiling: null },
    advisor_workload: { is_included: false, ceiling: null },
    ai_message_drafts: { is_included: false, ceiling: null },
    analytics: { is_included: false, ceiling: null },
    max_users: { is_included: true, ceiling: 5 },
    max_locations: { is_included: true, ceiling: 1 },
  },
  starter: {
    job_board: { is_included: true, ceiling: null },
    stages: { is_included: true, ceiling: null },
    customer_approval: { is_included: true, ceiling: null },
    dvi_reports: { is_included: true, ceiling: 200 },
    estimates: { is_included: true, ceiling: null },
    ai_scored_jobs: { is_included: true, ceiling: 500 },
    customer_approval_sms: { is_included: true, ceiling: 100 },
    priority_engine: { is_included: false, ceiling: null },
    nba: { is_included: false, ceiling: null },
    delivery_risk: { is_included: false, ceiling: null },
    multi_shop: { is_included: false, ceiling: null },
    advisor_workload: { is_included: false, ceiling: null },
    ai_message_drafts: { is_included: false, ceiling: null },
    analytics: { is_included: false, ceiling: null },
    max_users: { is_included: true, ceiling: 5 },
    max_locations: { is_included: true, ceiling: 1 },
  },
  professional: {
    job_board: { is_included: true, ceiling: null },
    stages: { is_included: true, ceiling: null },
    customer_approval: { is_included: true, ceiling: null },
    dvi_reports: { is_included: true, ceiling: 1000 },
    estimates: { is_included: true, ceiling: null },
    ai_scored_jobs: { is_included: true, ceiling: 1500 },
    customer_approval_sms: { is_included: true, ceiling: 500 },
    priority_engine: { is_included: true, ceiling: null },
    nba: { is_included: true, ceiling: null },
    delivery_risk: { is_included: true, ceiling: null },
    multi_shop: { is_included: false, ceiling: null },
    advisor_workload: { is_included: false, ceiling: null },
    ai_message_drafts: { is_included: false, ceiling: null },
    analytics: { is_included: false, ceiling: null },
    max_users: { is_included: true, ceiling: 20 },
    max_locations: { is_included: true, ceiling: 1 },
  },
  enterprise: {
    job_board: { is_included: true, ceiling: null },
    stages: { is_included: true, ceiling: null },
    customer_approval: { is_included: true, ceiling: null },
    dvi_reports: { is_included: true, ceiling: null },
    estimates: { is_included: true, ceiling: null },
    ai_scored_jobs: { is_included: true, ceiling: null },
    customer_approval_sms: { is_included: true, ceiling: null },
    priority_engine: { is_included: true, ceiling: null },
    nba: { is_included: true, ceiling: null },
    delivery_risk: { is_included: true, ceiling: null },
    multi_shop: { is_included: true, ceiling: 1 },
    advisor_workload: { is_included: true, ceiling: null },
    ai_message_drafts: { is_included: true, ceiling: null },
    analytics: { is_included: true, ceiling: null },
    max_users: { is_included: true, ceiling: 100 },
    max_locations: { is_included: true, ceiling: 3 },
  },
};

async function main() {
  let updated = 0;
  for (const [planId, features] of Object.entries(FEATURES)) {
    for (const [featureKey, config] of Object.entries(features)) {
      const result = await prisma.plan_features.updateMany({
        where: { plan_id: planId, feature_key: featureKey },
        data: {
          is_included: config.is_included,
          ceiling: config.ceiling,
        },
      });
      updated += result.count;
    }
  }
  console.log('Updated', updated, 'plan_features rows');

  // Verify
  for (const planId of ['free_trial', 'starter', 'professional', 'enterprise']) {
    const feats = await prisma.plan_features.findMany({
      where: { plan_id: planId },
      orderBy: { feature_key: 'asc' }
    });
    const included = feats.filter(f => f.is_included).map(f => f.feature_key);
    const excluded = feats.filter(f => !f.is_included).map(f => f.feature_key);
    console.log(`\n${planId}:`);
    console.log('  INCLUDED:', included.join(', '));
    console.log('  EXCLUDED:', excluded.join(', '));
  }
}

main().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });