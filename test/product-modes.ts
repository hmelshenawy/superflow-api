import assert from 'assert';
import {
  MODULE_KEYS,
  PRODUCT_MODE_MODULES,
  defaultEnabledModules,
  isModuleEnabled,
  parseEnabledModules,
} from '../src/common/product-modes';
import { MockDmsAdapter } from '../src/dms/mock-dms.adapter';

async function main() {
  const workshopModules = defaultEnabledModules('WORKSHOP');
  assert(workshopModules.includes(MODULE_KEYS.STOCK), 'Workshop should include stock');
  assert(workshopModules.includes(MODULE_KEYS.INVOICING), 'Workshop should include invoicing');
  assert(!workshopModules.includes(MODULE_KEYS.DMS_INTEGRATION), 'Workshop should not include DMS integration by default');

  const connectModules = defaultEnabledModules('CONNECT');
  assert(connectModules.includes(MODULE_KEYS.DMS_INTEGRATION), 'Connect should include DMS integration');
  assert(connectModules.includes(MODULE_KEYS.PRIORITY_ENGINE), 'Connect should include priority engine');
  assert(!connectModules.includes(MODULE_KEYS.STOCK), 'Connect should not include native stock');
  assert(!connectModules.includes(MODULE_KEYS.INVOICING), 'Connect should not include native invoicing');

  assert(isModuleEnabled('WORKSHOP', workshopModules, MODULE_KEYS.ESTIMATES), 'Workshop estimates should be enabled');
  assert(!isModuleEnabled('CONNECT', connectModules, MODULE_KEYS.INVOICING), 'Connect invoicing should be blocked');
  assert.deepStrictEqual(parseEnabledModules(JSON.stringify(PRODUCT_MODE_MODULES.CONNECT), 'CONNECT'), PRODUCT_MODE_MODULES.CONNECT);

  const dms = new MockDmsAdapter();
  const [openRepairOrders, advisors, technicians, revenue, parts] = await Promise.all([
    dms.fetchOpenRepairOrders(),
    dms.fetchAdvisorData(),
    dms.fetchTechnicianData(),
    dms.fetchRevenueData(),
    dms.fetchPartsData(),
  ]);

  assert(openRepairOrders.length > 0, 'Mock DMS sync should return imported jobs');
  assert(advisors.length > 0, 'Mock DMS sync should return advisor data');
  assert(technicians.length > 0, 'Mock DMS sync should return technician data');
  assert(revenue?.revenue, 'Mock DMS sync should return optional revenue data');
  assert(parts.length > 0, 'Mock DMS sync should return parts data');

  console.log('Product mode tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
