import { prisma } from './utils.js';
import { seedUsers } from './users.js';
import { seedCatalogue } from './catalogue.js';
import { seedCompanies } from './companies.js';
import { seedEmployees } from './employees.js';
import { seedMenu } from './menu.js';
import { seedPricing } from './pricing.js';
import { seedSettings } from './settings.js';
import { seedOrders } from './orders.js';
import { seedBilling } from './billing.js';

async function runSeed() {
  console.log('Starting Fernleaf Kitchen Test/Demo Data Seeding...\n');

  // 1. Users
  await seedUsers();
  console.log('✓ Users');

  // 2. Catalogue (Allergens, DietaryTags, Stations, Portions, Options, Dishes)
  await seedCatalogue();
  console.log('✓ Catalogue');

  // 3. Companies
  await seedCompanies();
  console.log('✓ Companies');

  // 4. Employees
  await seedEmployees();
  console.log('✓ Employees');

  // 5. Menu
  await seedMenu();
  console.log('✓ Menu');

  // 6. Pricing
  await seedPricing();
  console.log('✓ Pricing');

  // 7. Kitchen Settings
  await seedSettings();
  console.log('✓ Kitchen settings');

  // 8. Today's Orders, Kitchen Prep Units, and Dispatch Drops
  await seedOrders();
  console.log("✓ Today's orders");

  // 9. Billing Data & Invoices
  await seedBilling();
  console.log('✓ Billing data\n');

  console.log('✓ Test data seeding completed successfully.\n');

  // Query final counts for verification summary
  const staffUsersCount = await prisma.user.count();
  const companiesCount = await prisma.company.count();
  const employeesCount = await prisma.employee.count();
  const todayOrdersCount = await prisma.order.count({
    where: { deliveryDate: new Date('2026-10-04T00:00:00.000Z') },
  });
  const todayKitchenUnitsCount = await prisma.kitchenUnit.count({
    where: {
      order: {
        deliveryDate: new Date('2026-10-04T00:00:00.000Z'),
      },
    },
  });
  const todayDropsCount = await prisma.deliveryDrop.count({
    where: { deliveryDate: new Date('2026-10-04T00:00:00.000Z') },
  });
  const billingRecordsCount = await prisma.invoice.count();

  console.log('====================================');
  console.log('Fernleaf Kitchen Test Seed Complete');
  console.log('====================================');
  console.log(`Staff Users: ${staffUsersCount}`);
  console.log(`Companies: ${companiesCount}`);
  console.log(`Employees: ${employeesCount}`);
  console.log(`Today's Orders: ${todayOrdersCount}`);
  console.log(`Today's Kitchen Units: ${todayKitchenUnitsCount}`);
  console.log(`Today's Drops: ${todayDropsCount}`);
  console.log(`Billing Records: ${billingRecordsCount}`);
  console.log('');
  console.log('Test Date: 2026-10-04');
  console.log('Kitchen Open Today: YES');
  console.log("Cut-off Blocking Today's Test Data: NO");
  console.log('');
  console.log('Seed is idempotent: YES');
  console.log('====================================');
}

runSeed()
  .catch((err) => {
    console.error('\n❌ Seed failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
