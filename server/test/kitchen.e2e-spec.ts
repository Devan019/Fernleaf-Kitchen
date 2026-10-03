import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { KitchenUnitStatus, OrderStatus } from '../src/generated/prisma/enums.js';

describe('Kitchen Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  let testOrderId: string;
  let testOrderLineId: string;
  let testCombinationId1: string;
  let testCombinationId2: string;
  let testUnitId1: string;
  let testUnitId2: string;

  const testDeliveryDate = '2026-10-25';

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

    // 2. Fetch seeded data for order creation
    const company = await prisma.company.findFirst({
      include: { deliveryAddresses: true, employees: true },
    });
    const dish = await prisma.dish.findFirst();

    // 3. Create a test confirmed order with two combinations
    testOrderId = randomUUID();
    testOrderLineId = randomUUID();
    testCombinationId1 = randomUUID();
    testCombinationId2 = randomUUID();
    const now = new Date();

    await prisma.order.create({
      data: {
        id: testOrderId,
        orderNumber: `ORD-TEST-${Date.now().toString().slice(-6)}`,
        companyId: company!.id,
        employeeId: company!.employees[0]!.id,
        deliveryDate: new Date(`${testDeliveryDate}T00:00:00.000Z`),
        deliveryTime: '12:30',
        status: OrderStatus.CONFIRMED,
        packagingType: 'Standard',
        deliveryStreet: '123 Test St',
        deliveryCity: 'London',
        deliveryPostcode: 'SW1A 1AA',
        subtotal: 30,
        total: 30,
        plannedDispatchReadyAt: new Date(`${testDeliveryDate}T11:30:00.000Z`),
        plannedKitchenReadyAt: new Date(`${testDeliveryDate}T11:00:00.000Z`),
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.orderLine.create({
      data: {
        id: testOrderLineId,
        orderId: testOrderId,
        dishId: dish!.id,
        dishNameSnapshot: dish!.name,
        dishSkuSnapshot: dish!.sku,
        unitPrice: 15,
        quantity: 5,
        lineTotal: 30,
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.orderLineCombination.createMany({
      data: [
        {
          id: testCombinationId1,
          orderLineId: testOrderLineId,
          quantity: 3,
          unitPrice: 15,
          combinationTotal: 15,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: testCombinationId2,
          orderLineId: testOrderLineId,
          quantity: 2,
          unitPrice: 15,
          combinationTotal: 15,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.kitchenUnit.deleteMany({
      where: { orderId: testOrderId },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: testOrderId },
    });
    await prisma.orderLineCombination.deleteMany({
      where: { orderLineId: testOrderLineId },
    });
    await prisma.orderLine.deleteMany({
      where: { orderId: testOrderId },
    });
    await prisma.order.deleteMany({
      where: { id: testOrderId },
    });

    await app.close();
  });

  describe('GET /kitchen/board', () => {
    it('returns 401 when unauthorized', async () => {
      await request(app.getHttpServer())
        .get(`/kitchen/board?deliveryDate=${testDeliveryDate}`)
        .expect(401);
    });

    it('returns 403 for DRIVER role', async () => {
      await request(app.getHttpServer())
        .get(`/kitchen/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', driverCookie)
        .expect(403);
    });

    it('allows KITCHEN, DISPATCH, and ADMIN roles to view the board', async () => {
      // 1. Kitchen
      const resKitchen = await request(app.getHttpServer())
        .get(`/kitchen/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', kitchenCookie)
        .expect(200);

      expect(resKitchen.body.deliveryDate).toBe(testDeliveryDate);
      expect(resKitchen.body.totalUnits).toBeGreaterThanOrEqual(2);

      // Extract the unit IDs for the rest of tests
      const allUnits = resKitchen.body.stations.flatMap((s: any) => s.units);
      const unit1 = allUnits.find((u: any) => u.orderId === testOrderId && u.quantity === 3);
      const unit2 = allUnits.find((u: any) => u.orderId === testOrderId && u.quantity === 2);
      expect(unit1).toBeDefined();
      expect(unit2).toBeDefined();
      testUnitId1 = unit1.unitId;
      testUnitId2 = unit2.unitId;

      // 2. Dispatch (read-only view)
      await request(app.getHttpServer())
        .get(`/kitchen/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', dispatchCookie)
        .expect(200);

      // 3. Admin
      await request(app.getHttpServer())
        .get(`/kitchen/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', adminCookie)
        .expect(200);
    });
  });

  describe('POST /kitchen/units/:unitId/start', () => {
    it('returns 403 for DRIVER and DISPATCH roles', async () => {
      await request(app.getHttpServer())
        .post(`/kitchen/units/${testUnitId1}/start`)
        .set('Cookie', driverCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/kitchen/units/${testUnitId1}/start`)
        .set('Cookie', dispatchCookie)
        .expect(403);
    });

    it('allows KITCHEN staff to start a PENDING unit and sets order.kitchenStartedAt', async () => {
      const res = await request(app.getHttpServer())
        .post(`/kitchen/units/${testUnitId1}/start`)
        .set('Cookie', kitchenCookie)
        .expect(200);

      expect(res.body.unitId).toBe(testUnitId1);
      expect(res.body.status).toBe(KitchenUnitStatus.STARTED);
      expect(res.body.startedAt).toBeDefined();
      expect(res.body.startedByUser).toBeDefined();

      // Verify order kitchenStartedAt was set
      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(order?.kitchenStartedAt).not.toBeNull();
    });

    it('returns 409 Conflict when attempting to start an already STARTED unit', async () => {
      await request(app.getHttpServer())
        .post(`/kitchen/units/${testUnitId1}/start`)
        .set('Cookie', kitchenCookie)
        .expect(409);
    });
  });

  describe('POST /kitchen/units/:unitId/complete', () => {
    it('returns 403 for DISPATCH and DRIVER', async () => {
      await request(app.getHttpServer())
        .post(`/kitchen/units/${testUnitId1}/complete`)
        .set('Cookie', dispatchCookie)
        .expect(403);
    });

    it('completes the started unit, but order.kitchenReadyAt remains null while unit 2 is pending', async () => {
      const res = await request(app.getHttpServer())
        .post(`/kitchen/units/${testUnitId1}/complete`)
        .set('Cookie', kitchenCookie)
        .expect(200);

      expect(res.body.unitId).toBe(testUnitId1);
      expect(res.body.status).toBe(KitchenUnitStatus.DONE);
      expect(res.body.completedAt).toBeDefined();

      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      // Order not kitchen-ready yet because unit 2 is still pending!
      expect(order?.kitchenReadyAt).toBeNull();
    });

    it('returns 409 Conflict when attempting to complete an already DONE unit', async () => {
      await request(app.getHttpServer())
        .post(`/kitchen/units/${testUnitId1}/complete`)
        .set('Cookie', kitchenCookie)
        .expect(409);
    });

    it('completes the second unit directly from PENDING and marks order kitchenReadyAt', async () => {
      const res = await request(app.getHttpServer())
        .post(`/kitchen/units/${testUnitId2}/complete`)
        .set('Cookie', kitchenCookie)
        .expect(200);

      expect(res.body.unitId).toBe(testUnitId2);
      expect(res.body.status).toBe(KitchenUnitStatus.DONE);
      expect(res.body.startedAt).toBeDefined(); // Recorded start
      expect(res.body.completedAt).toBeDefined();

      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      // All units are now DONE, so kitchenReadyAt must be set!
      expect(order?.kitchenReadyAt).not.toBeNull();
    });
  });

  describe('POST /kitchen/orders/:orderId/force-complete', () => {
    it('returns 403 for KITCHEN, DISPATCH, and DRIVER roles', async () => {
      await request(app.getHttpServer())
        .post(`/kitchen/orders/${testOrderId}/force-complete`)
        .set('Cookie', kitchenCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/kitchen/orders/${testOrderId}/force-complete`)
        .set('Cookie', dispatchCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/kitchen/orders/${testOrderId}/force-complete`)
        .set('Cookie', driverCookie)
        .expect(403);
    });

    it('allows ADMIN to force-complete and is idempotent', async () => {
      const res = await request(app.getHttpServer())
        .post(`/kitchen/orders/${testOrderId}/force-complete`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.orderId).toBe(testOrderId);
      expect(res.body.status).toBe(OrderStatus.CONFIRMED);
      expect(res.body.kitchenReadyAt).not.toBeNull();
      expect(res.body.units).toHaveLength(2);
      expect(res.body.units.every((u: any) => u.status === KitchenUnitStatus.DONE)).toBe(true);

      // Calling again is completely idempotent
      const res2 = await request(app.getHttpServer())
        .post(`/kitchen/orders/${testOrderId}/force-complete`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res2.body.orderId).toBe(testOrderId);
    });
  });
});
