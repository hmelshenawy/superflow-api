/**
 * SuperFlow Parts & Stock Seed Script
 *
 * Creates demo data: warehouses, suppliers, parts, inventory, and sample stock movements.
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/seed-parts.ts
 */

import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { workshopTenantExtension } from '../src/prisma/prisma-tenant.extension';
import { workshopContext } from '../src/prisma/workshop-context';

const raw = new PrismaClient();
const tenant = raw.$extends(workshopTenantExtension);

// Helper to run operations in a workshop context
async function runAs(workshopId: string, fn: () => Promise<any>) {
  return workshopContext.run({ workshopId, isPlatformAdmin: false }, fn);
}

async function main() {
  console.log('🌱 Seeding Parts & Stock data...\n');

  // Find the first workshop
  const workshop = await raw.workshops.findFirst({ where: { is_active: true } });
  if (!workshop) {
    console.log('❌ No active workshop found. Run the main seed first.');
    process.exit(1);
  }
  const wid = workshop.id;
  console.log(`Using workshop: ${workshop.name} (${wid})`);

  // Find a user for created_by
  const adminUser = await raw.users.findFirst();
  const userId = adminUser?.id || uuidv4();

  await runAs(wid, async () => {
    // ─── Warehouses ─────────────────────────────────────────────
    console.log('Creating warehouses...');
    const whMain = await tenant.warehouses.create({
      data: { id: uuidv4(), name: 'Main Warehouse', location: 'Building A', is_default: true },
    });
    const whSecondary = await tenant.warehouses.create({
      data: { id: uuidv4(), name: 'Secondary Store', location: 'Building B', is_default: false },
    });
    console.log(`  ✓ ${whMain.name}, ${whSecondary.name}`);

    // ─── Suppliers ───────────────────────────────────────────────
    console.log('Creating suppliers...');
    const suppliers = [
      { name: 'Al-Futtaim Auto Parts', phone: '+971-4-123-4567', email: 'orders@alfuttaim.ae', payment_terms: 'Net 30' },
      { name: 'Gulf Brake Industries', phone: '+971-4-234-5678', email: 'sales@gulfbrake.ae', payment_terms: 'Net 15' },
      { name: 'Emirates Filter Co.', phone: '+971-4-345-6789', email: 'info@emiratesfilter.ae', payment_terms: 'COD' },
      { name: 'Auto Battery World', phone: '+971-4-456-7890', email: 'orders@autobattery.ae', payment_terms: 'Net 30' },
      { name: 'Saeed & Mohammed Al Naboodah', phone: '+971-4-567-8901', email: 'parts@naboodah.ae', payment_terms: 'Net 60' },
    ];
    const supplierRecords = [];
    for (const s of suppliers) {
      const supplier = await tenant.suppliers.create({ data: { id: uuidv4(), ...s } });
      supplierRecords.push(supplier);
    }
    console.log(`  ✓ ${supplierRecords.length} suppliers`);

    // ─── Parts ───────────────────────────────────────────────────
    console.log('Creating parts...');
    const partsData = [
      { name: 'Oil Filter - Standard', part_number: 'OF-100', brand: 'Mann', category: 'Filters', unit: 'piece', cost_price: 12.50, selling_price: 25.00, barcode: '5012345678901', supplier_id: supplierRecords[2].id, min_stock: 20 },
      { name: 'Air Filter - Standard', part_number: 'AF-200', brand: 'Mann', category: 'Filters', unit: 'piece', cost_price: 18.00, selling_price: 35.00, barcode: '5012345678902', supplier_id: supplierRecords[2].id, min_stock: 15 },
      { name: 'Cabin Filter - Premium', part_number: 'CF-300', brand: 'Mann', category: 'Filters', unit: 'piece', cost_price: 28.00, selling_price: 55.00, barcode: '5012345678903', supplier_id: supplierRecords[2].id, min_stock: 10 },
      { name: 'Brake Pad Set - Front', part_number: 'BP-F100', brand: 'Brembo', category: 'Brakes', unit: 'set', cost_price: 120.00, selling_price: 220.00, barcode: '5012345678904', supplier_id: supplierRecords[1].id, min_stock: 8 },
      { name: 'Brake Pad Set - Rear', part_number: 'BP-R100', brand: 'Brembo', category: 'Brakes', unit: 'set', cost_price: 95.00, selling_price: 185.00, barcode: '5012345678905', supplier_id: supplierRecords[1].id, min_stock: 8 },
      { name: 'Brake Disc - Front', part_number: 'BD-F200', brand: 'Brembo', category: 'Brakes', unit: 'piece', cost_price: 180.00, selling_price: 320.00, barcode: '5012345678906', supplier_id: supplierRecords[1].id, min_stock: 4 },
      { name: 'Engine Oil 5W-30 (4L)', part_number: 'EO-5W30', brand: 'Castrol', category: 'Engine', unit: 'bottle', cost_price: 45.00, selling_price: 85.00, barcode: '5012345678907', supplier_id: supplierRecords[0].id, min_stock: 30 },
      { name: 'Engine Oil 10W-40 (4L)', part_number: 'EO-10W40', brand: 'Castrol', category: 'Engine', unit: 'bottle', cost_price: 38.00, selling_price: 75.00, barcode: '5012345678908', supplier_id: supplierRecords[0].id, min_stock: 25 },
      { name: 'Coolant 50/50 (5L)', part_number: 'CL-5050', brand: 'Prestone', category: 'Engine', unit: 'bottle', cost_price: 22.00, selling_price: 45.00, barcode: '5012345678909', supplier_id: supplierRecords[0].id, min_stock: 15 },
      { name: 'Car Battery 70Ah', part_number: 'BAT-70', brand: 'ACDelco', category: 'Electrical', unit: 'piece', cost_price: 280.00, selling_price: 450.00, barcode: '5012345678910', supplier_id: supplierRecords[3].id, min_stock: 5 },
      { name: 'Headlight Bulb H7', part_number: 'HL-H7', brand: 'Philips', category: 'Electrical', unit: 'pair', cost_price: 35.00, selling_price: 65.00, barcode: '5012345678911', supplier_id: supplierRecords[0].id, min_stock: 20 },
      { name: 'Wiper Blade Set', part_number: 'WB-SET', brand: 'Bosch', category: 'Body', unit: 'set', cost_price: 40.00, selling_price: 75.00, barcode: '5012345678912', supplier_id: supplierRecords[4].id, min_stock: 10 },
      { name: 'Timing Belt Kit', part_number: 'TB-KIT1', brand: 'Gates', category: 'Engine', unit: 'kit', cost_price: 250.00, selling_price: 450.00, barcode: '5012345678913', supplier_id: supplierRecords[4].id, min_stock: 3 },
      { name: 'Spark Plug (set of 4)', part_number: 'SP-SET4', brand: 'NGK', category: 'Engine', unit: 'set', cost_price: 55.00, selling_price: 110.00, barcode: '5012345678914', supplier_id: supplierRecords[0].id, min_stock: 12 },
      { name: 'Transmission Oil ATF (4L)', part_number: 'TO-ATF4', brand: 'Castrol', category: 'Engine', unit: 'bottle', cost_price: 65.00, selling_price: 120.00, barcode: '5012345678915', supplier_id: supplierRecords[0].id, min_stock: 8 },
    ];

    const partRecords = [];
    for (const p of partsData) {
      const part = await tenant.parts.create({ data: { id: uuidv4(), ...p } });
      partRecords.push(part);
    }
    console.log(`  ✓ ${partRecords.length} parts`);

    // ─── Inventory ──────────────────────────────────────────────
    console.log('Creating inventory...');
    for (const part of partRecords) {
      // Main warehouse - larger quantities
      const mainQty = Math.floor(Math.random() * 30) + 10;
      const mainReserved = Math.floor(Math.random() * 5);
      await tenant.inventory.create({
        data: {
          id: uuidv4(),
          part_id: part.id,
          warehouse_id: whMain.id,
          quantity_on_hand: mainQty,
          reserved_quantity: mainReserved,
          available_quantity: mainQty - mainReserved,
        },
      });

      // Secondary warehouse - smaller quantities
      const secQty = Math.floor(Math.random() * 15) + 3;
      await tenant.inventory.create({
        data: {
          id: uuidv4(),
          part_id: part.id,
          warehouse_id: whSecondary.id,
          quantity_on_hand: secQty,
          reserved_quantity: 0,
          available_quantity: secQty,
        },
      });
    }
    console.log(`  ✓ ${partRecords.length * 2} inventory rows`);

    // ─── Stock Movements ─────────────────────────────────────────
    console.log('Creating sample stock movements...');
    const movementTypes = ['purchase_in', 'adjustment_in', 'adjustment_out'] as const;
    let movementCount = 0;
    for (const part of partRecords.slice(0, 8)) {
      for (const wh of [whMain, whSecondary]) {
        const qty = Math.floor(Math.random() * 10) + 5;
        await tenant.stock_movements.create({
          data: {
            id: uuidv4(),
            part_id: part.id,
            warehouse_id: wh.id,
            type: 'purchase_in',
            quantity: qty,
            unit_cost: Number(part.cost_price),
            reference_type: 'seed',
            reference_id: 'seed-data',
            notes: 'Initial stock from seed',
            created_by: userId,
          },
        });
        movementCount++;
      }
    }
    console.log(`  ✓ ${movementCount} stock movements`);

    // ─── Sample Purchase Order ───────────────────────────────────
    console.log('Creating sample purchase order...');
    const po = await tenant.purchase_orders.create({
      data: {
        id: uuidv4(),
        supplier_id: supplierRecords[0].id,
        status: 'ordered',
        total_cost: 375.00,
        purchase_order_items: {
          create: [
            { id: uuidv4(), part_id: partRecords[0].id, ordered_qty: 50, received_qty: 0, unit_cost: 12.50 },
            { id: uuidv4(), part_id: partRecords[6].id, ordered_qty: 30, received_qty: 0, unit_cost: 45.00 },
            { id: uuidv4(), part_id: partRecords[13].id, ordered_qty: 10, received_qty: 0, unit_cost: 55.00 },
          ],
        },
      },
    });
    console.log(`  ✓ PO ${po.id.slice(0, 8)}... (ordered, 3 items)`);
  });

  console.log('\n✅ Parts & Stock seed complete!');
  await raw.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});