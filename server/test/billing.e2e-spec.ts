import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import {
  BillingAdjustmentType,
  InvoiceStatus,
  OrderStatus,
} from '../src/generated/prisma/enums.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { randomUUID } from 'node:crypto';

describe('Company Billing Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  let testCompanyAId: string;
  let testCompanyBId: string;
  let testEmployeeAId: string;
  let testEmployeeBId: string;
  let testDishId: string;

  const testOrderIds: string[] = [];
  const testInvoiceIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // 1. Authenticate users
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Test@1234' });
    adminCookie = Array(adminLogin.headers['set-cookie']);

    const kitchenLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'kitchen@test.com', password: 'Test@1234' });
    kitchenCookie = Array(kitchenLogin.headers['set-cookie']);

    const dispatchLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'dispatch@test.com', password: 'Test@1234' });
    dispatchCookie = Array(dispatchLogin.headers['set-cookie']);

    const driverLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'driver@test.com', password: 'Test@1234' });
    driverCookie = Array(driverLogin.headers['set-cookie']);

    // 2. Fetch or create test companies & employee entities
    let compA = await prisma.company.findUnique({
      where: { name: 'Google' },
      include: { employees: true },
    });
    if (!compA) {
      compA = await prisma.company.create({
        data: {
          name: 'Google',
          billingContactName: 'Sundar Pichai',
          billingContactEmail: 'billing@google.com',
        },
        include: { employees: true },
      });
    }
    testCompanyAId = compA.id;

    if (compA.employees.length > 0) {
      testEmployeeAId = compA.employees[0].id;
    } else {
      const emp = await prisma.employee.create({
        data: {
          name: 'E2E Emp A',
          companyId: testCompanyAId,
        },
      });
      testEmployeeAId = emp.id;
    }

    let compB = await prisma.company.findUnique({
      where: { name: 'Microsoft' },
      include: { employees: true },
    });
    if (!compB) {
      compB = await prisma.company.create({
        data: {
          name: 'Microsoft',
          billingContactName: 'Satya Nadella',
          billingContactEmail: 'billing@microsoft.com',
        },
        include: { employees: true },
      });
    }
    testCompanyBId = compB.id;

    if (compB.employees.length > 0) {
      testEmployeeBId = compB.employees[0].id;
    } else {
      const emp = await prisma.employee.create({
        data: {
          name: 'E2E Emp B',
          companyId: testCompanyBId,
        },
      });
      testEmployeeBId = emp.id;
    }

    const dish = await prisma.dish.findFirst();
    testDishId = dish!.id;
  });

  afterAll(async () => {
    // Clean up created test billing records
    if (testInvoiceIds.length > 0) {
      await prisma.billingAdjustment.deleteMany({
        where: { invoiceId: { in: testInvoiceIds } },
      });
      await prisma.invoiceLine.deleteMany({
        where: { invoiceId: { in: testInvoiceIds } },
      });
      await prisma.invoice.deleteMany({
        where: { id: { in: testInvoiceIds } },
      });
    }

    if (testOrderIds.length > 0) {
      await prisma.orderLine.deleteMany({
        where: { orderId: { in: testOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: testOrderIds } },
      });
    }

    await app.close();
  });

  // Helper to create an order directly in DB for testing
  async function createTestOrder(
    companyId: string,
    employeeId: string,
    status: OrderStatus,
    total: string,
    isInvoiced = false,
  ) {
    const orderId = randomUUID();
    const orderNumber = `E2E-ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();

    const order = await prisma.order.create({
      data: {
        id: orderId,
        orderNumber,
        companyId,
        employeeId,
        deliveryDate: new Date('2026-10-20T00:00:00.000Z'),
        deliveryTime: '12:30',
        status,
        packagingType: 'ECO_BOX',
        deliveryStreet: '100 Test St',
        deliveryCity: 'London',
        deliveryPostcode: 'EC1A 1BB',
        subtotal: new Prisma.Decimal(total),
        total: new Prisma.Decimal(total),
        isInvoiced,
        confirmedAt: status === OrderStatus.CONFIRMED ? now : null,
        createdAt: now,
        updatedAt: now,
        OrderLine: {
          create: {
            id: randomUUID(),
            dishId: testDishId,
            dishNameSnapshot: 'Test Dish',
            unitPrice: new Prisma.Decimal(total),
            quantity: 1,
            lineTotal: new Prisma.Decimal(total),
            updatedAt: now,
          },
        },
      },
    });

    testOrderIds.push(order.id);
    return order;
  }

  describe('Authorization / RBAC (Requirement 37)', () => {
    it('allows ADMIN to access billing endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get(`/billing/companies/${testCompanyAId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('uninvoicedOrderCount');
    });

    it('forbids KITCHEN role from accessing billing endpoints (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/billing/companies/${testCompanyAId}`)
        .set('Cookie', kitchenCookie);

      expect(res.status).toBe(403);
    });

    it('forbids DISPATCH role from accessing billing endpoints (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/billing/companies/${testCompanyAId}`)
        .set('Cookie', dispatchCookie);

      expect(res.status).toBe(403);
    });

    it('forbids DRIVER role from accessing billing endpoints (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/billing/companies/${testCompanyAId}`)
        .set('Cookie', driverCookie);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /billing/companies (Company Summaries)', () => {
    it('returns paginated company billing summaries', async () => {
      const res = await request(app.getHttpServer())
        .get('/billing/companies?page=1&limit=10')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /billing/companies/:companyId/uninvoiced-orders', () => {
    it('only returns CONFIRMED uninvoiced orders belonging to the specified company', async () => {
      // 1. Confirmed uninvoiced order for Company A -> MUST appear
      const confirmedOrdA = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '30.00',
        false,
      );

      // 2. Draft order for Company A -> must NOT appear
      await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.DRAFT,
        '40.00',
        false,
      );

      // 3. Placed order for Company A -> must NOT appear
      await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.PLACED,
        '50.00',
        false,
      );

      // 4. Cancelled uninvoiced order -> must NOT appear
      await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CANCELLED,
        '60.00',
        false,
      );

      // 5. Confirmed order for Company B -> must NOT appear for Company A
      await createTestOrder(
        testCompanyBId,
        testEmployeeBId,
        OrderStatus.CONFIRMED,
        '70.00',
        false,
      );

      const res = await request(app.getHttpServer())
        .get(`/billing/companies/${testCompanyAId}/uninvoiced-orders`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.company.id).toBe(testCompanyAId);

      const returnedOrderIds = res.body.orders.map((o: any) => o.id);
      expect(returnedOrderIds).toContain(confirmedOrdA.id);

      // Every returned order must be CONFIRMED
      for (const ord of res.body.orders) {
        expect(ord.status).toBe(OrderStatus.CONFIRMED);
      }
    });
  });

  describe('POST /billing/companies/:companyId/invoices (Create Invoice)', () => {
    it('creates an invoice from selected confirmed orders and calculates exact Decimal totals', async () => {
      const ord1 = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '35.50',
        false,
      );
      const ord2 = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '64.50',
        false,
      );

      const res = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({
          orderIds: [ord1.id, ord2.id],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
      expect(res.body.status).toBe(InvoiceStatus.OPEN);
      expect(res.body.subtotal).toBe('100.00');
      expect(res.body.adjustmentTotal).toBe('0.00');
      expect(res.body.total).toBe('100.00');
      expect(res.body.lines).toHaveLength(2);

      testInvoiceIds.push(res.body.id);

      // Verify orders are now marked isInvoiced = true
      const updatedOrd1 = await prisma.order.findUnique({ where: { id: ord1.id } });
      const updatedOrd2 = await prisma.order.findUnique({ where: { id: ord2.id } });
      expect(updatedOrd1!.isInvoiced).toBe(true);
      expect(updatedOrd2!.isInvoiced).toBe(true);
    });

    it('rejects attempt to invoice the same order twice (409 Conflict)', async () => {
      const ord = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '50.00',
        false,
      );

      // First invoice creation succeeds
      const firstRes = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [ord.id] });

      expect(firstRes.status).toBe(201);
      testInvoiceIds.push(firstRes.body.id);

      // Second attempt with same order must fail with 409
      const secondRes = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [ord.id] });

      expect(secondRes.status).toBe(409);
    });

    it('rejects adding an order belonging to another company (400 Bad Request)', async () => {
      // Order belongs to Company B
      const ordB = await createTestOrder(
        testCompanyBId,
        testEmployeeBId,
        OrderStatus.CONFIRMED,
        '25.00',
        false,
      );

      // Attempt to invoice under Company A
      const res = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [ordB.id] });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not belong to company');
    });

    it('rejects empty order list (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [] });

      expect(res.status).toBe(400);
    });

    it('rejects duplicate order IDs in payload (400 Bad Request)', async () => {
      const ord = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '20.00',
        false,
      );

      const res = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [ord.id, ord.id] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /billing/invoices and GET /billing/invoices/:id', () => {
    it('retrieves invoice list and individual invoice details with line items', async () => {
      const ord = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '42.00',
        false,
      );

      const createRes = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [ord.id] });

      const invoiceId = createRes.body.id;
      testInvoiceIds.push(invoiceId);

      // 1. List invoices
      const listRes = await request(app.getHttpServer())
        .get(`/billing/invoices?companyId=${testCompanyAId}`)
        .set('Cookie', adminCookie);

      expect(listRes.status).toBe(200);
      const foundInList = listRes.body.data.find((i: any) => i.id === invoiceId);
      expect(foundInList).toBeDefined();

      // 2. Get invoice detail
      const detailRes = await request(app.getHttpServer())
        .get(`/billing/invoices/${invoiceId}`)
        .set('Cookie', adminCookie);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.id).toBe(invoiceId);
      expect(detailRes.body.lines).toHaveLength(1);
      expect(detailRes.body.lines[0].orderId).toBe(ord.id);
      expect(detailRes.body.lines[0].amount).toBe('42.00');
    });
  });

  describe('POST /billing/invoices/:invoiceId/pay (Mark Invoice Paid)', () => {
    it('marks an OPEN invoice as PAID and sets paidAt timestamp', async () => {
      const ord = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '55.00',
        false,
      );

      const createRes = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [ord.id] });

      const invoiceId = createRes.body.id;
      testInvoiceIds.push(invoiceId);

      const payRes = await request(app.getHttpServer())
        .post(`/billing/invoices/${invoiceId}/pay`)
        .set('Cookie', adminCookie);

      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe(InvoiceStatus.PAID);
      expect(payRes.body.paidAt).not.toBeNull();

      // Attempting to pay again returns 409 Conflict
      const secondPayRes = await request(app.getHttpServer())
        .post(`/billing/invoices/${invoiceId}/pay`)
        .set('Cookie', adminCookie);

      expect(secondPayRes.status).toBe(409);
    });
  });

  describe('POST /billing/invoices/:invoiceId/adjustments (Post-Invoice Adjustments)', () => {
    it('records a CREDIT adjustment for short delivery and updates invoice total without mutating original invoice line', async () => {
      const ord = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '100.00',
        false,
      );

      // Create invoice for $100.00
      const createRes = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [ord.id] });

      const invoiceId = createRes.body.id;
      testInvoiceIds.push(invoiceId);

      // Order turns out short: 8 meals delivered instead of 10 -> $20.00 credit adjustment
      const adjRes = await request(app.getHttpServer())
        .post(`/billing/invoices/${invoiceId}/adjustments`)
        .set('Cookie', adminCookie)
        .send({
          orderId: ord.id,
          reason: 'Short delivery of 2 meals',
          type: BillingAdjustmentType.CREDIT,
          amount: '20.00',
        });

      expect(adjRes.status).toBe(201);
      expect(adjRes.body.type).toBe(BillingAdjustmentType.CREDIT);
      expect(adjRes.body.amount).toBe('20.00');

      // Fetch invoice details to verify snapshot line and new total
      const detailRes = await request(app.getHttpServer())
        .get(`/billing/invoices/${invoiceId}`)
        .set('Cookie', adminCookie);

      expect(detailRes.status).toBe(200);
      // Original invoice line remains untouched at $100.00
      expect(detailRes.body.lines[0].amount).toBe('100.00');
      // Subtotal remains $100.00
      expect(detailRes.body.subtotal).toBe('100.00');
      // Adjustment total is -$20.00
      expect(detailRes.body.adjustmentTotal).toBe('-20.00');
      // Net total is $80.00
      expect(detailRes.body.total).toBe('80.00');
      // Adjustments list contains the record
      expect(detailRes.body.adjustments).toHaveLength(1);
      expect(detailRes.body.adjustments[0].reason).toBe('Short delivery of 2 meals');
    });

    it('supports newBillableAmount reconciliation and prevents duplicate adjustments', async () => {
      const ord = await createTestOrder(
        testCompanyAId,
        testEmployeeAId,
        OrderStatus.CONFIRMED,
        '100.00',
        false,
      );

      const createRes = await request(app.getHttpServer())
        .post(`/billing/companies/${testCompanyAId}/invoices`)
        .set('Cookie', adminCookie)
        .send({ orderIds: [ord.id] });

      const invoiceId = createRes.body.id;
      testInvoiceIds.push(invoiceId);

      // 1. Reconcile to $85.00 billable amount (should create $15.00 CREDIT)
      const adj1 = await request(app.getHttpServer())
        .post(`/billing/invoices/${invoiceId}/adjustments`)
        .set('Cookie', adminCookie)
        .send({
          orderId: ord.id,
          reason: 'Dispute correction',
          newBillableAmount: '85.00',
        });

      expect(adj1.status).toBe(201);
      expect(adj1.body.type).toBe(BillingAdjustmentType.CREDIT);
      expect(adj1.body.amount).toBe('15.00');

      // 2. Reconcile again to same $85.00 -> should reject because delta is 0 (idempotent duplicate prevention)
      const adj2 = await request(app.getHttpServer())
        .post(`/billing/invoices/${invoiceId}/adjustments`)
        .set('Cookie', adminCookie)
        .send({
          orderId: ord.id,
          reason: 'Duplicate dispute correction',
          newBillableAmount: '85.00',
        });

      expect(adj2.status).toBe(400);
      expect(adj2.body.message).toContain('No financial adjustment required');
    });
  });
});
