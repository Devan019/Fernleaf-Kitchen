import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import {
  DeliveryDropStatus,
  FulfillmentStatus,
  KitchenUnitStatus,
  OrderStatus,
  UserRole,
} from '../src/generated/prisma/enums.js';

describe('Dispatch & Driver Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let dispatchCookie: string[];
  let driver1Cookie: string[];
  let driver2Cookie: string[];
  let kitchenCookie: string[];

  let driver1User: any;
  let _driver2User: any;

  let companyA: any;
  let companyB: any;
  let dish: any;

  const testDeliveryDate = '2026-11-20';
  const createdOrderIds: string[] = [];
  const createdDropIds: string[] = [];

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

    const dispatchLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'dispatch@test.com', password: 'Test@1234' });
    dispatchCookie = Array(dispatchLogin.headers['set-cookie']);

    const kitchenLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'kitchen@test.com', password: 'Test@1234' });
    kitchenCookie = Array(kitchenLogin.headers['set-cookie']);

    const driver1Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'driver@test.com', password: 'Test@1234' });
    driver1Cookie = Array(driver1Login.headers['set-cookie']);

    driver1User = await prisma.user.findUnique({
      where: { email: 'driver@test.com' },
    });

    // Create a second driver user for isolation testing
    _driver2User = await prisma.user.upsert({
      where: { email: 'driver2@test.com' },
      update: { isActive: true },
      create: {
        id: randomUUID(),
        name: 'Driver Two',
        email: 'driver2@test.com',
        passwordHash: driver1User.passwordHash,
        role: UserRole.DRIVER,
        isActive: true,
      },
    });

    const driver2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'driver2@test.com', password: 'Test@1234' });
    driver2Cookie = Array(driver2Login.headers['set-cookie']);

    // 2. Fetch or create companies for grouping tests
    const companies = await prisma.company.findMany({
      take: 2,
      include: { employees: true },
    });

    companyA = companies[0];
    companyB = companies[1] || companies[0];
    dish = await prisma.dish.findFirst();
  });

  afterAll(async () => {
    // Cleanup created orders and drops
    if (createdOrderIds.length > 0) {
      await prisma.kitchenUnit.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.orderLineCombination.deleteMany({
        where: { OrderLine: { orderId: { in: createdOrderIds } } },
      });
      await prisma.orderLine.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }

    if (createdDropIds.length > 0) {
      await prisma.dropStatusHistory.deleteMany({
        where: { dropId: { in: createdDropIds } },
      });
      await prisma.deliveryDrop.deleteMany({
        where: { id: { in: createdDropIds } },
      });
    }

    await prisma.user.deleteMany({
      where: { email: 'driver2@test.com' },
    });

    await app.close();
  });

  describe('1. Authentication & RBAC Authorization (Section 24, 25)', () => {
    it('rejects unauthenticated requests to /dispatch/board with 401', async () => {
      await request(app.getHttpServer())
        .get(`/dispatch/board?deliveryDate=${testDeliveryDate}`)
        .expect(401);
    });

    it('rejects driver access to /dispatch/board with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/dispatch/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', driver1Cookie)
        .expect(403);
    });

    it('rejects non-driver access to /driver/drops/today with 403 Forbidden (Section 38, Test 23)', async () => {
      await request(app.getHttpServer())
        .get('/driver/drops/today')
        .set('Cookie', adminCookie)
        .expect(403);

      await request(app.getHttpServer())
        .get('/driver/drops/today')
        .set('Cookie', dispatchCookie)
        .expect(403);

      await request(app.getHttpServer())
        .get('/driver/drops/today')
        .set('Cookie', kitchenCookie)
        .expect(403);
    });

    it('allows DISPATCH and ADMIN to view /dispatch/board', async () => {
      const res = await request(app.getHttpServer())
        .get(`/dispatch/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', dispatchCookie)
        .expect(200);

      expect(res.body).toHaveProperty('deliveryDate', testDeliveryDate);
      expect(res.body).toHaveProperty('drops');
      expect(Array.isArray(res.body.drops)).toBe(true);
    });
  });

  describe('2. Deterministic Drop Grouping & Reconciliation (Section 8-11)', () => {
    let orderA1Id: string;
    let orderA2Id: string;
    let orderA3DiffTimeId: string;
    let orderB1Id: string;

    it('reconciles orders into drops based on same company + same address snapshot + same delivery time', async () => {
      const now = new Date();

      // Order A1: Company A, 123 Main St, 12:30
      orderA1Id = randomUUID();
      createdOrderIds.push(orderA1Id);
      await prisma.order.create({
        data: {
          id: orderA1Id,
          orderNumber: `ORD-A1-${Date.now().toString().slice(-5)}`,
          companyId: companyA.id,
          employeeId: companyA.employees[0].id,
          deliveryDate: new Date(`${testDeliveryDate}T00:00:00.000Z`),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          packagingType: 'Standard',
          deliveryStreet: '123 Main St',
          deliveryCity: 'London',
          deliveryPostcode: 'SW1A 1AA',
          subtotal: 20,
          total: 20,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Order A2: Company A, 123 Main St, 12:30 (SAME DROP AS A1)
      orderA2Id = randomUUID();
      createdOrderIds.push(orderA2Id);
      await prisma.order.create({
        data: {
          id: orderA2Id,
          orderNumber: `ORD-A2-${Date.now().toString().slice(-5)}`,
          companyId: companyA.id,
          employeeId: companyA.employees[0].id,
          deliveryDate: new Date(`${testDeliveryDate}T00:00:00.000Z`),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          packagingType: 'Eco Box',
          deliveryStreet: '123 Main St',
          deliveryCity: 'London',
          deliveryPostcode: 'SW1A 1AA',
          subtotal: 25,
          total: 25,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Order A3: Company A, 123 Main St, 12:45 (DIFFERENT TIME -> DIFFERENT DROP)
      orderA3DiffTimeId = randomUUID();
      createdOrderIds.push(orderA3DiffTimeId);
      await prisma.order.create({
        data: {
          id: orderA3DiffTimeId,
          orderNumber: `ORD-A3-${Date.now().toString().slice(-5)}`,
          companyId: companyA.id,
          employeeId: companyA.employees[0].id,
          deliveryDate: new Date(`${testDeliveryDate}T00:00:00.000Z`),
          deliveryTime: '12:45',
          status: OrderStatus.CONFIRMED,
          packagingType: 'Standard',
          deliveryStreet: '123 Main St',
          deliveryCity: 'London',
          deliveryPostcode: 'SW1A 1AA',
          subtotal: 15,
          total: 15,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Order B1: Company B, 123 Main St, 12:30 (DIFFERENT COMPANY -> DIFFERENT DROP)
      if (companyB.id !== companyA.id) {
        orderB1Id = randomUUID();
        createdOrderIds.push(orderB1Id);
        await prisma.order.create({
          data: {
            id: orderB1Id,
            orderNumber: `ORD-B1-${Date.now().toString().slice(-5)}`,
            companyId: companyB.id,
            employeeId: companyB.employees[0].id,
            deliveryDate: new Date(`${testDeliveryDate}T00:00:00.000Z`),
            deliveryTime: '12:30',
            status: OrderStatus.CONFIRMED,
            packagingType: 'Standard',
            deliveryStreet: '123 Main St',
            deliveryCity: 'London',
            deliveryPostcode: 'SW1A 1AA',
            subtotal: 18,
            total: 18,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      // Query board, which auto-reconciles
      const res = await request(app.getHttpServer())
        .get(`/dispatch/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', dispatchCookie)
        .expect(200);

      // Track created drops for cleanup
      for (const d of res.body.drops) {
        createdDropIds.push(d.id);
      }

      // Find the drop containing Order A1 and A2
      const dropA12 = res.body.drops.find(
        (d: any) => d.company.id === companyA.id && d.deliveryTime === '12:30',
      );

      expect(dropA12).toBeDefined();
      expect(dropA12.ordersCount).toBe(2);

      // Find drop for Order A3 (12:45)
      const dropA3 = res.body.drops.find(
        (d: any) => d.company.id === companyA.id && d.deliveryTime === '12:45',
      );
      expect(dropA3).toBeDefined();
      expect(dropA3.ordersCount).toBe(1);
      expect(dropA3.id).not.toBe(dropA12.id);

      // Re-querying should be completely idempotent without creating duplicates
      const res2 = await request(app.getHttpServer())
        .get(`/dispatch/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', dispatchCookie)
        .expect(200);

      expect(res2.body.drops.length).toBe(res.body.drops.length);
    });
  });

  describe('3. Driver Assignment & Status Lifecycle (Section 4-7, 12, 14, 16, 21)', () => {
    let targetDropId: string;
    let targetOrderId: string;

    beforeAll(async () => {
      // Create dedicated order for full status flow
      targetOrderId = randomUUID();
      createdOrderIds.push(targetOrderId);
      const now = new Date();

      await prisma.order.create({
        data: {
          id: targetOrderId,
          orderNumber: `ORD-FLOW-${Date.now().toString().slice(-5)}`,
          companyId: companyA.id,
          employeeId: companyA.employees[0].id,
          deliveryDate: new Date(`${testDeliveryDate}T00:00:00.000Z`),
          deliveryTime: '13:00',
          status: OrderStatus.CONFIRMED,
          packagingType: 'Bag',
          deliveryStreet: '999 Delivery Lane',
          deliveryCity: 'London',
          deliveryPostcode: 'EC1A 1BB',
          subtotal: 50,
          total: 50,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Add an order line and combination to test kitchen-ready prerequisite enforcement
      const orderLineId = randomUUID();
      const combId = randomUUID();
      await prisma.orderLine.create({
        data: {
          id: orderLineId,
          orderId: targetOrderId,
          dishId: dish.id,
          dishNameSnapshot: dish.name,
          unitPrice: 50,
          quantity: 1,
          lineTotal: 50,
          createdAt: now,
          updatedAt: now,
        },
      });

      await prisma.orderLineCombination.create({
        data: {
          id: combId,
          orderLineId,
          quantity: 1,
          unitPrice: 50,
          combinationTotal: 50,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Trigger kitchen board to automatically generate the kitchen unit in PENDING status
      await request(app.getHttpServer())
        .get(`/kitchen/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', kitchenCookie);

      // Reconcile board
      const res = await request(app.getHttpServer())
        .get(`/dispatch/board?deliveryDate=${testDeliveryDate}`)
        .set('Cookie', dispatchCookie);

      const targetDrop = res.body.drops.find(
        (d: any) => d.deliveryTime === '13:00',
      );
      targetDropId = targetDrop.id;
      createdDropIds.push(targetDropId);
    });

    it('rejects DISPATCH_READY when kitchen work is incomplete (Section 4)', async () => {
      await request(app.getHttpServer())
        .post(`/dispatch/drops/${targetDropId}/ready`)
        .set('Cookie', dispatchCookie)
        .expect(400);
    });

    it('completes kitchen work and transitions to DISPATCH_READY', async () => {
      // Mark kitchen units DONE and order kitchenReadyAt set
      await prisma.kitchenUnit.updateMany({
        where: { orderId: targetOrderId },
        data: { status: KitchenUnitStatus.DONE },
      });
      await prisma.order.update({
        where: { id: targetOrderId },
        data: { kitchenReadyAt: new Date() },
      });

      const res = await request(app.getHttpServer())
        .post(`/dispatch/drops/${targetDropId}/ready`)
        .set('Cookie', dispatchCookie)
        .expect(200);

      expect(res.body.status).toBe(DeliveryDropStatus.DISPATCH_READY);

      // Verify order fulfillmentStatus was also updated
      const order = await prisma.order.findUnique({
        where: { id: targetOrderId },
      });
      expect(order?.fulfillmentStatus).toBe(FulfillmentStatus.DISPATCH_READY);
    });

    it('rejects OUT_FOR_DELIVERY when no driver is assigned (Section 6)', async () => {
      // Ensure drop currently has no driver
      await prisma.deliveryDrop.update({
        where: { id: targetDropId },
        data: { driverId: null },
      });

      await request(app.getHttpServer())
        .post(`/dispatch/drops/${targetDropId}/out-for-delivery`)
        .set('Cookie', dispatchCookie)
        .expect(400);
    });

    it('assigns driver to the drop via POST /dispatch/drops/:dropId/driver', async () => {
      const res = await request(app.getHttpServer())
        .post(`/dispatch/drops/${targetDropId}/driver`)
        .set('Cookie', dispatchCookie)
        .send({ driverId: driver1User.id })
        .expect(200);

      expect(res.body.driverId).toBe(driver1User.id);
    });

    it('transitions to OUT_FOR_DELIVERY once driver is assigned', async () => {
      const res = await request(app.getHttpServer())
        .post(`/dispatch/drops/${targetDropId}/out-for-delivery`)
        .set('Cookie', dispatchCookie)
        .expect(200);

      expect(res.body.status).toBe(DeliveryDropStatus.OUT_FOR_DELIVERY);

      const order = await prisma.order.findUnique({
        where: { id: targetOrderId },
      });
      expect(order?.fulfillmentStatus).toBe(FulfillmentStatus.OUT_FOR_DELIVERY);
    });

    it('enforces driver isolation: Driver 2 cannot access or deliver Driver 1 drop (Section 25)', async () => {
      // Driver 2 trying to view Driver 1's drop details
      await request(app.getHttpServer())
        .get(`/driver/drops/${targetDropId}`)
        .set('Cookie', driver2Cookie)
        .expect(403);

      // Driver 2 trying to deliver Driver 1's drop
      await request(app.getHttpServer())
        .post(`/driver/drops/${targetDropId}/deliver`)
        .set('Cookie', driver2Cookie)
        .send({ note: 'Attempt by wrong driver' })
        .expect(403);
    });

    it('allows assigned Driver 1 to view details and mark drop DELIVERED', async () => {
      // View details
      const detailRes = await request(app.getHttpServer())
        .get(`/driver/drops/${targetDropId}`)
        .set('Cookie', driver1Cookie)
        .expect(200);

      expect(detailRes.body.id).toBe(targetDropId);
      expect(detailRes.body.status).toBe(DeliveryDropStatus.OUT_FOR_DELIVERY);
      expect(detailRes.body.canDeliver).toBe(true);

      // Deliver drop
      const deliverRes = await request(app.getHttpServer())
        .post(`/driver/drops/${targetDropId}/deliver`)
        .set('Cookie', driver1Cookie)
        .send({
          note: 'Handed directly to reception staff',
          photoUrl: 'https://storage.local/proof-delivery.webp',
        })
        .expect(200);

      expect(deliverRes.body.status).toBe(DeliveryDropStatus.DELIVERED);

      // Verify drop in database
      const deliveredDrop = await prisma.deliveryDrop.findUnique({
        where: { id: targetDropId },
      });
      expect(deliveredDrop?.status).toBe(DeliveryDropStatus.DELIVERED);
      expect(deliveredDrop?.deliveredNote).toBe('Handed directly to reception staff');
      expect(deliveredDrop?.deliveredPhotoUrl).toBe('https://storage.local/proof-delivery.webp');
      expect(deliveredDrop?.isOnTime).toBeDefined();

      // Verify order status moved to DELIVERED
      const deliveredOrder = await prisma.order.findUnique({
        where: { id: targetOrderId },
      });
      expect(deliveredOrder?.status).toBe(OrderStatus.DELIVERED);
      expect(deliveredOrder?.fulfillmentStatus).toBe(FulfillmentStatus.DELIVERED);
    });

    it('rejects duplicate delivery attempts (cannot deliver twice)', async () => {
      await request(app.getHttpServer())
        .post(`/driver/drops/${targetDropId}/deliver`)
        .set('Cookie', driver1Cookie)
        .send({ note: 'Repeat delivery' })
        .expect(409);
    });
  });
});
