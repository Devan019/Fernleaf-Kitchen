import { randomUUID } from 'node:crypto';
import {
  OrderStatus,
  InvoiceStatus,
  BillingAdjustmentType,
} from '../src/generated/prisma/enums.js';
import { prisma, Prisma } from './utils.js';

export async function seedBilling() {
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
  const googleComp = await prisma.company.findUnique({
    where: { name: 'Google' },
    include: { employees: true, deliveryAddresses: true },
  });
  const msftComp = await prisma.company.findUnique({
    where: { name: 'Microsoft' },
    include: { employees: true, deliveryAddresses: true },
  });
  const globexComp = await prisma.company.findUnique({
    where: { name: 'Globex Inc' },
    include: { employees: true, deliveryAddresses: true },
  });

  const anyDish = await prisma.dish.findFirst();

  if (googleComp && msftComp && globexComp && anyDish && adminUser) {
    const now = new Date();
    const addrGoogle = googleComp.deliveryAddresses[0];
    const addrMsft = msftComp.deliveryAddresses[0];
    const addrGlobex = globexComp.deliveryAddresses[0];

    const ensureBillingOrder = async (
      orderNumber: string,
      company: typeof googleComp,
      employee: (typeof googleComp)['employees'][0],
      total: string,
      isInvoiced: boolean,
      deliveryDateStr = '2026-10-15',
    ) => {
      let order = await prisma.order.findUnique({
        where: { orderNumber },
      });
      if (!order) {
        const orderId = randomUUID();
        order = await prisma.order.create({
          data: {
            id: orderId,
            orderNumber,
            employeeId: employee.id,
            companyId: company.id,
            deliveryDate: new Date(`${deliveryDateStr}T00:00:00.000Z`),
            deliveryTime: '12:30',
            status: OrderStatus.CONFIRMED,
            packagingType: 'ECO_BOX',
            deliveryAddressId: addrGoogle ? addrGoogle.id : null,
            deliveryStreet: addrGoogle ? addrGoogle.street : '100 Main St',
            deliveryCity: addrGoogle ? addrGoogle.city : 'Mountain View',
            deliveryPostcode: addrGoogle ? addrGoogle.postcode : 'CA 94043',
            subtotal: new Prisma.Decimal(total),
            total: new Prisma.Decimal(total),
            isInvoiced,
            confirmedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        });

        const lineId = randomUUID();
        await prisma.orderLine.create({
          data: {
            id: lineId,
            orderId,
            dishId: anyDish.id,
            dishNameSnapshot: anyDish.name,
            dishSkuSnapshot: anyDish.sku,
            unitPrice: new Prisma.Decimal(total),
            quantity: 1,
            lineTotal: new Prisma.Decimal(total),
            createdAt: now,
            updatedAt: now,
          },
        });
      }
      return order;
    };

    // 1. Google Uninvoiced Confirmed Orders
    await ensureBillingOrder('SEED-BILL-GOOG-01', googleComp, googleComp.employees[0], '45.00', false);
    await ensureBillingOrder('SEED-BILL-GOOG-02', googleComp, googleComp.employees[1] ?? googleComp.employees[0], '35.00', false);
    await ensureBillingOrder('SEED-BILL-GOOG-05', googleComp, googleComp.employees[2] ?? googleComp.employees[0], '85.00', false);

    // 2. Google: One Open Invoice with Credit Adjustment ($100 subtotal, -$20 credit => $80 total)
    const orderForOpenInvoice = await ensureBillingOrder(
      'SEED-BILL-GOOG-03',
      googleComp,
      googleComp.employees[0],
      '100.00',
      true,
    );

    let openInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: 'INV-2026-000001' },
    });

    if (!openInvoice) {
      await prisma.invoice.create({
        data: {
          id: randomUUID(),
          invoiceNumber: 'INV-2026-000001',
          companyId: googleComp.id,
          status: InvoiceStatus.OPEN,
          issuedAt: now,
          subtotal: new Prisma.Decimal('100.00'),
          adjustmentTotal: new Prisma.Decimal('-20.00'),
          total: new Prisma.Decimal('80.00'),
          lines: {
            create: {
              orderId: orderForOpenInvoice.id,
              description: `Order ${orderForOpenInvoice.orderNumber}`,
              quantity: 1,
              unitAmount: new Prisma.Decimal('100.00'),
              amount: new Prisma.Decimal('100.00'),
            },
          },
          adjustments: {
            create: {
              orderId: orderForOpenInvoice.id,
              type: BillingAdjustmentType.CREDIT,
              amount: new Prisma.Decimal('20.00'),
              reason: 'Short delivery adjustment',
              createdByUserId: adminUser.id,
            },
          },
        },
      });
    }

    // 3. Google: One Paid Invoice
    const orderForPaidInvoice = await ensureBillingOrder(
      'SEED-BILL-GOOG-04',
      googleComp,
      googleComp.employees[1] ?? googleComp.employees[0],
      '60.00',
      true,
    );

    let paidInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: 'INV-2026-000002' },
    });

    if (!paidInvoice) {
      await prisma.invoice.create({
        data: {
          id: randomUUID(),
          invoiceNumber: 'INV-2026-000002',
          companyId: googleComp.id,
          status: InvoiceStatus.PAID,
          issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          paidAt: now,
          subtotal: new Prisma.Decimal('60.00'),
          adjustmentTotal: new Prisma.Decimal('0.00'),
          total: new Prisma.Decimal('60.00'),
          lines: {
            create: {
              orderId: orderForPaidInvoice.id,
              description: `Order ${orderForPaidInvoice.orderNumber}`,
              quantity: 1,
              unitAmount: new Prisma.Decimal('60.00'),
              amount: new Prisma.Decimal('60.00'),
            },
          },
        },
      });
    }

    // 4. Microsoft: Confirmed Uninvoiced Orders & One Paid Invoice
    await ensureBillingOrder('SEED-BILL-MSFT-01', msftComp, msftComp.employees[0], '55.00', false);
    await ensureBillingOrder('SEED-BILL-MSFT-02', msftComp, msftComp.employees[1] ?? msftComp.employees[0], '40.00', false);

    const orderMsftPaid = await ensureBillingOrder('SEED-BILL-MSFT-03', msftComp, msftComp.employees[0], '120.00', true);
    let msftPaidInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: 'INV-2026-000003' },
    });
    if (!msftPaidInvoice) {
      await prisma.invoice.create({
        data: {
          id: randomUUID(),
          invoiceNumber: 'INV-2026-000003',
          companyId: msftComp.id,
          status: InvoiceStatus.PAID,
          issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          paidAt: now,
          subtotal: new Prisma.Decimal('120.00'),
          adjustmentTotal: new Prisma.Decimal('0.00'),
          total: new Prisma.Decimal('120.00'),
          lines: {
            create: {
              orderId: orderMsftPaid.id,
              description: `Order ${orderMsftPaid.orderNumber}`,
              quantity: 1,
              unitAmount: new Prisma.Decimal('120.00'),
              amount: new Prisma.Decimal('120.00'),
            },
          },
        },
      });
    }

    // 5. Globex: One Open Invoice
    const orderGlobexOpen = await ensureBillingOrder('SEED-BILL-GLBX-01', globexComp, globexComp.employees[0], '95.00', true);
    let globexOpenInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: 'INV-2026-000004' },
    });
    if (!globexOpenInvoice) {
      await prisma.invoice.create({
        data: {
          id: randomUUID(),
          invoiceNumber: 'INV-2026-000004',
          companyId: globexComp.id,
          status: InvoiceStatus.OPEN,
          issuedAt: now,
          subtotal: new Prisma.Decimal('95.00'),
          adjustmentTotal: new Prisma.Decimal('0.00'),
          total: new Prisma.Decimal('95.00'),
          lines: {
            create: {
              orderId: orderGlobexOpen.id,
              description: `Order ${orderGlobexOpen.orderNumber}`,
              quantity: 1,
              unitAmount: new Prisma.Decimal('95.00'),
              amount: new Prisma.Decimal('95.00'),
            },
          },
        },
      });
    }
  }

  const invoiceCount = await prisma.invoice.count();
  return { count: invoiceCount };
}
