import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { OrderStatus } from '../src/generated/prisma/enums.js';

describe('Order Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  // Entities
  let googleCompanyId: string;
  let tcsCompanyId: string;
  let rahulEmployeeId: string;
  let paneerDishId: string;
  let vegDishId: string;
  let googleAddressId: string;

  // Options
  let proteinGroupId: string;
  let riceGroupId: string;
  let paneerOptionId: string;
  let brownRiceOptionId: string;
  let jeeraRiceOptionId: string;
  let regularPortionId: string;

  const createdOrderIds: string[] = [];

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

    // 2. Fetch seeded companies & employees
    const google = await prisma.company.findUnique({
      where: { name: 'Google' },
      include: { deliveryAddresses: true, employees: true },
    });
    googleCompanyId = google!.id;
    googleAddressId = google!.deliveryAddresses[0]?.id;
    rahulEmployeeId = google!.employees.find((e) => e.email === 'rahul@google.com')!.id;

    const tcs = await prisma.company.findUnique({
      where: { name: 'TCS' },
    });
    tcsCompanyId = tcs!.id;

    // 3. Fetch dishes, option groups, and options
    const pnr = await prisma.dish.findUnique({
      where: { sku: 'DISH-PNR-001' },
      include: {
        optionGroups: {
          include: {
            optionGroupOptions: { include: { option: true } },
            optionGroupPortions: { include: { portionSize: true } },
          },
        },
      },
    });
    paneerDishId = pnr!.id;
    const proteinGrp = (pnr!.optionGroups.find((g) => g.name === 'Choose your protein') ?? pnr!.optionGroups[0])!;
    proteinGroupId = proteinGrp.id;
    paneerOptionId = proteinGrp.optionGroupOptions.find((o) => o.option.name === 'Paneer')!.optionId;
    regularPortionId = proteinGrp.optionGroupPortions.find((p) => p.portionSize.name === 'Regular')!.portionSizeId;

    const riceGrp = (pnr!.optionGroups.find((g) => g.name === 'Choose rice base') ?? pnr!.optionGroups[1])!;
    riceGroupId = riceGrp.id;
    brownRiceOptionId = riceGrp.optionGroupOptions.find((o) => o.option.name === 'Brown Rice')!.optionId;
    jeeraRiceOptionId = riceGrp.optionGroupOptions.find((o) => o.option.name === 'Jeera Rice')!.optionId;

    const veg = await prisma.dish.findUnique({ where: { sku: 'DISH-VEG-001' } });
    vegDishId = veg!.id;
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.orderLine.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }
    await app.close();
  });

  // ====================================================
  // 1. RBAC & Access Control
  // ====================================================
  describe('RBAC & Permissions', () => {
    it('allows Admin to list orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/order')
        .set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('allows Kitchen staff to view orders (ORDER_READ)', async () => {
      const res = await request(app.getHttpServer())
        .get('/order')
        .set('Cookie', kitchenCookie);
      expect(res.status).toBe(200);
    });

    it('allows Dispatch staff to view orders (ORDER_READ)', async () => {
      const res = await request(app.getHttpServer())
        .get('/order')
        .set('Cookie', dispatchCookie);
      expect(res.status).toBe(200);
    });

    it('forbids Driver from viewing orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/order')
        .set('Cookie', driverCookie);
      expect(res.status).toBe(403);
    });

    it('forbids Kitchen staff from creating orders', async () => {
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', kitchenCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          lines: [],
        });
      expect(res.status).toBe(403);
    });

    it('forbids Driver from creating orders', async () => {
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', driverCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          lines: [],
        });
      expect(res.status).toBe(403);
    });
  });

  // ====================================================
  // 2. Order Creation & Business Validations
  // ====================================================
  describe('Order Creation & Validation', () => {
    it('creates a valid DRAFT order with multiple combinations', async () => {
      // 10 Paneer Bowls: 6 Brown Rice, 4 Jeera Rice (Sum: 10)
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14', // Wednesday
          deliveryTime: '12:30',
          deliveryAddressId: googleAddressId,
          packagingType: 'ECO_BOX',
          status: OrderStatus.DRAFT,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 10,
              combinations: [
                {
                  quantity: 6,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId, portionSizeId: regularPortionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
                {
                  quantity: 4,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId, portionSizeId: regularPortionId },
                    { optionGroupId: riceGroupId, optionId: jeeraRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe(OrderStatus.DRAFT);
      expect(res.body.lines).toHaveLength(1);
      expect(res.body.lines[0].combinations).toHaveLength(2);
      createdOrderIds.push(res.body.id);
    });

    it('rejects order if employee does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: 'nonexistent-emp-id',
          deliveryDate: '2026-10-14',
          lines: [{ dishId: paneerDishId, quantity: 1, combinations: [{ quantity: 1, options: [] }] }],
        });
      expect(res.status).toBe(404);
    });

    it('rejects order if delivery date is on a company non-working day (Sunday)', async () => {
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-11', // Sunday
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Company does not accept deliveries on SUNDAY');
    });

    it('rejects order if delivery date is a company holiday', async () => {
      // Create a temporary company holiday
      const holDate = new Date('2026-10-15T00:00:00.000Z'); // Thursday
      await prisma.companyHoliday.upsert({
        where: { companyId_date: { companyId: googleCompanyId, date: holDate } },
        update: { name: 'Google Founders Day' },
        create: { companyId: googleCompanyId, date: holDate, name: 'Google Founders Day' },
      });

      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-15',
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('company holiday');

      // Cleanup holiday
      await prisma.companyHoliday.delete({
        where: { companyId_date: { companyId: googleCompanyId, date: holDate } },
      });
    });

    it('rejects dish if combination quantities do not equal line quantity', async () => {
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          lines: [
            {
              dishId: paneerDishId,
              quantity: 10,
              combinations: [
                {
                  quantity: 6,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
                // Sum is 6 != 10
              ],
            },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Sum of combination quantities');
    });

    it('rejects dish if a required option group is omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          lines: [
            {
              dishId: paneerDishId,
              quantity: 2,
              combinations: [
                {
                  quantity: 2,
                  // Missing required Protein and Rice options
                  options: [],
                },
              ],
            },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Required option group');
    });

    it('rejects option that does not belong to the selected dish', async () => {
      // Pass a non-existent option or option from another dish
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: 'invalid-option-id' },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not belong to group');
    });

    it('rejects delivery address belonging to a different company', async () => {
      // Fetch TCS address
      const tcsAddr = await prisma.deliveryAddress.findFirst({
        where: { companyId: tcsCompanyId },
      });

      if (tcsAddr) {
        const res = await request(app.getHttpServer())
          .post('/order')
          .set('Cookie', adminCookie)
          .send({
            employeeId: rahulEmployeeId,
            deliveryDate: '2026-10-14',
            deliveryAddressId: tcsAddr.id, // Address from another company!
            lines: [
              {
                dishId: paneerDishId,
                quantity: 1,
                combinations: [
                  {
                    quantity: 1,
                    options: [
                      { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                      { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                    ],
                  },
                ],
              },
            ],
          });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('does not belong to this company');
      }
    });

    it('rejects dish with missing selling price', async () => {
      // Vegetable Breakfast Bowl is unpriced on Standard tier (and Google uses Enterprise, which derives from Standard)
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          lines: [
            {
              dishId: vegDishId,
              quantity: 1,
              combinations: [{ quantity: 1, options: [] }],
            },
          ],
        });
      expect(res.status).toBe(400);
    });
  });

  // ====================================================
  // 3. Price Snapshots & Historical Stability
  // ====================================================
  describe('Price Snapshots & Historical Stability', () => {
    it('snapshots dish price and option price at order creation', async () => {
      // Google has Enterprise tier with explicit override: Paneer Bowl = 12.25
      const createRes = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          status: OrderStatus.PLACED,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 2,
              combinations: [
                {
                  quantity: 2,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId, portionSizeId: regularPortionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      expect(createRes.status).toBe(201);
      const order = createRes.body;
      createdOrderIds.push(order.id);

      expect(order.lines[0].unitPrice).toBe('12.25');
      expect(order.total).toBe('37.20');

      // Now alter the pricing tier override for Paneer Bowl in the database
      const googleTier = await prisma.company.findUnique({
        where: { id: googleCompanyId },
        select: { priceTierId: true },
      });

      if (googleTier?.priceTierId) {
        await prisma.dishPrice.update({
          where: { tierId_dishId: { tierId: googleTier.priceTierId, dishId: paneerDishId } },
          data: { price: new Prisma.Decimal('20.00') },
        });

        // Fetch the historical order again
        const fetchRes = await request(app.getHttpServer())
          .get(`/order/${order.id}`)
          .set('Cookie', adminCookie);

        expect(fetchRes.status).toBe(200);
        // HISTORICAL PRICE MUST REMAIN $12.25, NOT $20.00!
        expect(fetchRes.body.lines[0].unitPrice).toBe('12.25');
        expect(fetchRes.body.total).toBe('37.20');

        // Restore original price override
        await prisma.dishPrice.update({
          where: { tierId_dishId: { tierId: googleTier.priceTierId, dishId: paneerDishId } },
          data: { price: new Prisma.Decimal('12.25') },
        });
      }
    });

    it('snapshots dish name preventing future Catalogue rename from modifying history', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          status: OrderStatus.PLACED,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      expect(createRes.status).toBe(201);
      const order = createRes.body;
      createdOrderIds.push(order.id);
      expect(order.lines[0].dishName).toBe('Paneer Rice Bowl');

      // Temporarily rename the catalogue dish
      await prisma.dish.update({
        where: { id: paneerDishId },
        data: { name: 'Super Paneer Deluxe 2027' },
      });

      // View historical order
      const viewRes = await request(app.getHttpServer())
        .get(`/order/${order.id}`)
        .set('Cookie', adminCookie);

      expect(viewRes.status).toBe(200);
      // Historical dish snapshot must remain 'Paneer Rice Bowl'
      expect(viewRes.body.lines[0].dishName).toBe('Paneer Rice Bowl');

      // Restore original dish name
      await prisma.dish.update({
        where: { id: paneerDishId },
        data: { name: 'Paneer Rice Bowl' },
      });
    });
  });

  // ====================================================
  // 4. Employee Movement Safety
  // ====================================================
  describe('Employee Movement Safety', () => {
    it('preserves historical companyId on order when employee moves company', async () => {
      // Create order for Rahul under Google
      const createRes = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          status: OrderStatus.PLACED,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      expect(createRes.status).toBe(201);
      const orderId = createRes.body.id;
      createdOrderIds.push(orderId);
      expect(createRes.body.companyId).toBe(googleCompanyId);

      // Move Rahul from Google to TCS
      await prisma.employee.update({
        where: { id: rahulEmployeeId },
        data: { companyId: tcsCompanyId },
      });

      // Fetch order
      const getRes = await request(app.getHttpServer())
        .get(`/order/${orderId}`)
        .set('Cookie', adminCookie);

      expect(getRes.status).toBe(200);
      // Order historical company MUST STILL BE GOOGLE!
      expect(getRes.body.companyId).toBe(googleCompanyId);
      expect(getRes.body.companyName).toBe('Google');

      // Move Rahul back to Google
      await prisma.employee.update({
        where: { id: rahulEmployeeId },
        data: { companyId: googleCompanyId },
      });
    });
  });

  // ====================================================
  // 5. Cut-off Processing & Idempotency
  // ====================================================
  describe('Cut-off Processing', () => {
    it('manually processes cut-off for a delivery date idempotently', async () => {
      // 1. Create a draft order for 2026-10-21
      const draftRes = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-21',
          status: OrderStatus.DRAFT,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });
      expect(draftRes.status).toBe(201);
      const draftId = draftRes.body.id;
      createdOrderIds.push(draftId);

      // 2. Create a placed order for 2026-10-21
      const placedRes = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-21',
          status: OrderStatus.PLACED,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });
      expect(placedRes.status).toBe(201);
      const placedId = placedRes.body.id;
      createdOrderIds.push(placedId);

      // 3. Process cutoff for 2026-10-21
      const cutoffRes = await request(app.getHttpServer())
        .post('/order/cutoff/process')
        .set('Cookie', adminCookie)
        .send({ deliveryDate: '2026-10-21' });

      expect(cutoffRes.status).toBe(200);
      expect(cutoffRes.body.cancelledDrafts).toBeGreaterThanOrEqual(1);
      expect(cutoffRes.body.confirmedPlaced).toBeGreaterThanOrEqual(1);

      // Verify states transitioned
      const draftAfter = await request(app.getHttpServer())
        .get(`/order/${draftId}`)
        .set('Cookie', adminCookie);
      expect(draftAfter.body.status).toBe(OrderStatus.CANCELLED);

      const placedAfter = await request(app.getHttpServer())
        .get(`/order/${placedId}`)
        .set('Cookie', adminCookie);
      expect(placedAfter.body.status).toBe(OrderStatus.CONFIRMED);

      // 4. Run cutoff a second time: must be idempotent!
      const cutoffSecondRes = await request(app.getHttpServer())
        .post('/order/cutoff/process')
        .set('Cookie', adminCookie)
        .send({ deliveryDate: '2026-10-21' });

      expect(cutoffSecondRes.status).toBe(200);
      expect(cutoffSecondRes.body.cancelledDrafts).toBe(0);
      expect(cutoffSecondRes.body.confirmedPlaced).toBe(0);
    });

    it('forbids non-admin users from processing cut-off', async () => {
      const res = await request(app.getHttpServer())
        .post('/order/cutoff/process')
        .set('Cookie', kitchenCookie)
        .send({ deliveryDate: '2026-10-21' });

      expect(res.status).toBe(403);
    });

    it('checks cut-off date calculations via GET /order/cutoff/check', async () => {
      const res = await request(app.getHttpServer())
        .get('/order/cutoff/check?deliveryDate=2026-10-14')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('cutoffDateTime');
      expect(res.body).toHaveProperty('isPastCutoff');
      expect(res.body).toHaveProperty('kitchenWorkingDays');
    });
  });

  // ====================================================
  // 6. State Machine & Order Transitions
  // ====================================================
  describe('Status Transitions & State Machine', () => {
    it('places a DRAFT order transitioning to PLACED', async () => {
      const draftRes = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          status: OrderStatus.DRAFT,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      const orderId = draftRes.body.id;
      createdOrderIds.push(orderId);

      const placeRes = await request(app.getHttpServer())
        .post(`/order/${orderId}/place`)
        .set('Cookie', adminCookie);

      expect(placeRes.status).toBe(200);
      expect(placeRes.body.status).toBe(OrderStatus.PLACED);
      expect(placeRes.body.placedAt).not.toBeNull();
    });

    it('cancels a DRAFT or PLACED order before cut-off', async () => {
      const draftRes = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          status: OrderStatus.DRAFT,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 1,
              combinations: [
                {
                  quantity: 1,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      const orderId = draftRes.body.id;
      createdOrderIds.push(orderId);

      const cancelRes = await request(app.getHttpServer())
        .post(`/order/${orderId}/cancel`)
        .set('Cookie', adminCookie)
        .send({ reason: 'Customer changed plans' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe(OrderStatus.CANCELLED);
    });

    it('rejects placing an already CANCELLED order', async () => {
      const order = await prisma.order.create({
        data: {
          id: 'test-cancelled-ord',
          orderNumber: 'TEST-ORD-CANC',
          employeeId: rahulEmployeeId,
          companyId: googleCompanyId,
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CANCELLED,
          packagingType: 'STANDARD',
          deliveryStreet: '123 Main St',
          deliveryCity: 'London',
          deliveryPostcode: 'EC1A 1BB',
          subtotal: new Prisma.Decimal('10.00'),
          total: new Prisma.Decimal('10.00'),
          updatedAt: new Date(),
        },
      });
      createdOrderIds.push(order.id);

      const res = await request(app.getHttpServer())
        .post(`/order/${order.id}/place`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only DRAFT orders can be placed');
    });
  });

  // ====================================================
  // 7. Order Editing & Admin Overrides
  // ====================================================
  describe('Editing & Admin Overrides', () => {
    it('allows editing order items before cut-off', async () => {
      const draftRes = await request(app.getHttpServer())
        .post('/order')
        .set('Cookie', adminCookie)
        .send({
          employeeId: rahulEmployeeId,
          deliveryDate: '2026-10-14',
          status: OrderStatus.DRAFT,
          lines: [
            {
              dishId: paneerDishId,
              quantity: 2,
              combinations: [
                {
                  quantity: 2,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      const orderId = draftRes.body.id;
      createdOrderIds.push(orderId);

      // Edit order to quantity 4
      const editRes = await request(app.getHttpServer())
        .patch(`/order/${orderId}`)
        .set('Cookie', adminCookie)
        .send({
          lines: [
            {
              dishId: paneerDishId,
              quantity: 4,
              combinations: [
                {
                  quantity: 4,
                  options: [
                    { optionGroupId: proteinGroupId, optionId: paneerOptionId },
                    { optionGroupId: riceGroupId, optionId: brownRiceOptionId },
                  ],
                },
              ],
            },
          ],
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.lines[0].quantity).toBe(4);
      expect(editRes.body.total).toBe('74.40');
    });

    it('allows Admin to override delivery details after confirmation preserving price snapshots', async () => {
      // 1. Create a confirmed order in DB
      const order = await prisma.order.create({
        data: {
          id: 'test-confirmed-ord',
          orderNumber: 'TEST-ORD-CONF',
          employeeId: rahulEmployeeId,
          companyId: googleCompanyId,
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:00',
          status: OrderStatus.CONFIRMED,
          packagingType: 'STANDARD',
          deliveryStreet: 'Original Street',
          deliveryCity: 'London',
          deliveryPostcode: 'EC1A 1BB',
          subtotal: new Prisma.Decimal('12.25'),
          total: new Prisma.Decimal('12.25'),
          confirmedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      createdOrderIds.push(order.id);

      // Admin updates delivery time and instructions
      const overrideRes = await request(app.getHttpServer())
        .patch(`/order/${order.id}/delivery`)
        .set('Cookie', adminCookie)
        .send({
          deliveryTime: '14:30',
          deliveryInstructions: 'Urgent meeting, deliver to 5th floor boardroom',
        });

      expect(overrideRes.status).toBe(200);
      expect(overrideRes.body.deliveryTime).toBe('14:30');
      expect(overrideRes.body.deliveryAddress.deliveryInstructions).toBe(
        'Urgent meeting, deliver to 5th floor boardroom',
      );
      // Historical price remains intact
      expect(overrideRes.body.total).toBe('12.25');
    });
  });

  // ====================================================
  // 8. Order Listing, Pagination & Filters
  // ====================================================
  describe('Listing & Filtering', () => {
    it('filters orders by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/order?status=DELIVERED')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.status).toBe(OrderStatus.DELIVERED);
      }
    });

    it('filters orders by companyId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/order?companyId=${googleCompanyId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.companyId).toBe(googleCompanyId);
      }
    });

    it('filters orders by isInvoiced flag', async () => {
      const res = await request(app.getHttpServer())
        .get('/order?isInvoiced=false')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.isInvoiced).toBe(false);
      }
    });

    it('searches orders by order number or customer name', async () => {
      const res = await request(app.getHttpServer())
        .get('/order?search=SEED-ORD-001')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].orderNumber).toBe('SEED-ORD-001');
    });
  });
});
