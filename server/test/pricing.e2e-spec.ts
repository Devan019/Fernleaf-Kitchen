import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { PriceDerivationType } from '../src/generated/prisma/enums.js';

describe('Pricing Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  let paneerDishId: string;
  let tofuDishId: string;
  let vegDishId: string;
  let paneerOptionId: string;
  let aliceEmployeeId: string;
  let bobEmployeeId: string;
  let charlieEmployeeId: string;

  const createdTierIds: string[] = [];

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

    // 2. Fetch seeded dishes, options, and employees
    const pnr = await prisma.dish.findUnique({
      where: { sku: 'DISH-PNR-001' },
    });
    const tofu = await prisma.dish.findUnique({
      where: { sku: 'DISH-TOFU-001' },
    });
    const veg = await prisma.dish.findUnique({
      where: { sku: 'DISH-VEG-001' },
    });
    paneerDishId = pnr!.id;
    tofuDishId = tofu!.id;
    vegDishId = veg!.id;

    const opt = await prisma.option.findFirst({ where: { name: 'Paneer' } });
    paneerOptionId = opt!.id;

    const alice = await prisma.employee.findUnique({
      where: { email: 'alice@acme.com' },
    });
    const bob = await prisma.employee.findUnique({
      where: { email: 'bob@globex.com' },
    });
    const charlie = await prisma.employee.findUnique({
      where: { email: 'charlie@initech.com' },
    });
    aliceEmployeeId = alice!.id;
    bobEmployeeId = bob!.id;
    charlieEmployeeId = charlie!.id;
  });

  afterAll(async () => {
    // Cleanup any extra test tiers created during e2e tests
    if (createdTierIds.length > 0) {
      await prisma.dishPrice.deleteMany({
        where: { tierId: { in: createdTierIds } },
      });
      await prisma.optionPrice.deleteMany({
        where: { tierId: { in: createdTierIds } },
      });
      await prisma.priceTier.deleteMany({
        where: { id: { in: createdTierIds } },
      });
    }
    await app.close();
  });

  describe('RBAC and Permissions Security', () => {
    it('rejects unauthenticated requests to pricing endpoints with 401', async () => {
      await request(app.getHttpServer()).get('/pricing/tiers').expect(401);

      await request(app.getHttpServer())
        .post('/pricing/tiers')
        .send({ name: 'Unauthorized Tier', derivationType: 'MANUAL' })
        .expect(401);
    });

    it('DRIVER is forbidden (403) from accessing pricing endpoints', async () => {
      await request(app.getHttpServer())
        .get('/pricing/tiers')
        .set('Cookie', driverCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', driverCookie)
        .send({ name: 'Driver Tier', derivationType: 'MANUAL' })
        .expect(403);
    });

    it('KITCHEN and DISPATCH have read-only access (200 for GET, 403 for mutations)', async () => {
      // Read access allowed
      await request(app.getHttpServer())
        .get('/pricing/tiers')
        .set('Cookie', kitchenCookie)
        .expect(200);

      await request(app.getHttpServer())
        .get('/pricing/tiers')
        .set('Cookie', dispatchCookie)
        .expect(200);

      // Mutation forbidden
      await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', kitchenCookie)
        .send({ name: 'Kitchen Tier', derivationType: 'MANUAL' })
        .expect(403);

      await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', dispatchCookie)
        .send({ name: 'Dispatch Tier', derivationType: 'MANUAL' })
        .expect(403);
    });

    it('ADMIN has full management access (200/201)', async () => {
      const res = await request(app.getHttpServer())
        .get('/pricing/tiers')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Price Tier Management & Derivations', () => {
    let createdManualTierId: string;
    let createdPercentageTierId: string;

    it('creates a MANUAL price tier', async () => {
      const res = await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', adminCookie)
        .send({
          name: 'E2E Manual Tier',
          description: 'Created during E2E test',
          derivationType: PriceDerivationType.MANUAL,
        })
        .expect(201);

      expect(res.body.name).toBe('E2E Manual Tier');
      expect(res.body.derivationType).toBe(PriceDerivationType.MANUAL);
      expect(res.body.isDefault).toBe(false);

      createdManualTierId = res.body.id;
      createdTierIds.push(createdManualTierId);
    });

    it('rejects duplicate tier name with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', adminCookie)
        .send({
          name: 'E2E Manual Tier',
          derivationType: PriceDerivationType.MANUAL,
        })
        .expect(409);
    });

    it('creates a TIER_PERCENTAGE price tier deriving from base tier', async () => {
      const res = await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', adminCookie)
        .send({
          name: 'E2E Derived Tier',
          derivationType: PriceDerivationType.TIER_PERCENTAGE,
          baseTierId: createdManualTierId,
          percentage: 20.0,
        })
        .expect(201);

      expect(res.body.name).toBe('E2E Derived Tier');
      expect(res.body.percentage).toBe('20.00');
      expect(res.body.baseTierId).toBe(createdManualTierId);

      createdPercentageTierId = res.body.id;
      createdTierIds.push(createdPercentageTierId);
    });

    it('rejects self-referencing tier with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch(`/pricing/tiers/${createdManualTierId}`)
        .set('Cookie', adminCookie)
        .send({
          derivationType: PriceDerivationType.TIER_PERCENTAGE,
          baseTierId: createdManualTierId,
          percentage: 10,
        })
        .expect(400);
    });

    it('rejects circular tier dependencies (A -> B -> A) with 400 Bad Request', async () => {
      // Attempt to make createdManualTier derive from createdPercentageTier
      await request(app.getHttpServer())
        .patch(`/pricing/tiers/${createdManualTierId}`)
        .set('Cookie', adminCookie)
        .send({
          derivationType: PriceDerivationType.TIER_PERCENTAGE,
          baseTierId: createdPercentageTierId,
          percentage: 10,
        })
        .expect(400);
    });

    it('rejects invalid multiplier (<= 0) with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', adminCookie)
        .send({
          name: 'E2E Invalid Multiplier',
          derivationType: PriceDerivationType.COST_MULTIPLIER,
          multiplier: -1.5,
        })
        .expect(400);
    });
  });

  describe('Dish Prices, Overrides & Bulk Updates', () => {
    let testTierId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', adminCookie)
        .send({
          name: 'E2E Dish Testing Tier',
          derivationType: PriceDerivationType.MANUAL,
        });
      testTierId = res.body.id;
      createdTierIds.push(testTierId);
    });

    it('sets an explicit dish price override', async () => {
      const res = await request(app.getHttpServer())
        .put(`/pricing/tiers/${testTierId}/dishes/${paneerDishId}`)
        .set('Cookie', adminCookie)
        .send({ price: 12.5 })
        .expect(200);

      expect(res.body.dishId).toBe(paneerDishId);
      expect(res.body.price).toBe('12.50');
      expect(res.body.source).toBe('MANUAL');
      expect(res.body.missing).toBe(false);
    });

    it('inspects tier dishes and identifies priced and missing dishes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pricing/tiers/${testTierId}/dishes`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.data).toBeDefined();
      const paneer = res.body.data.find((d: any) => d.dishId === paneerDishId);
      expect(paneer).toBeDefined();
      expect(paneer.price).toBe('12.50');
      expect(paneer.missing).toBe(false);

      const unpriced = res.body.data.find((d: any) => d.dishId === vegDishId);
      expect(unpriced).toBeDefined();
      expect(unpriced.price).toBeNull();
      expect(unpriced.missing).toBe(true);
      expect(unpriced.source).toBe('MISSING');
    });

    it('queries missing dishes endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pricing/tiers/${testTierId}/missing-dishes`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(
        res.body.data.every((d: any) => d.missing === true && d.price === null),
      ).toBe(true);
    });

    it('bulk updates dish prices in a single request', async () => {
      const res = await request(app.getHttpServer())
        .put(`/pricing/tiers/${testTierId}/dishes/bulk`)
        .set('Cookie', adminCookie)
        .send({
          prices: [
            { dishId: paneerDishId, price: 14.0 },
            { dishId: tofuDishId, price: 13.5 },
          ],
        })
        .expect(200);

      expect(res.body.updatedCount).toBe(2);

      // Verify updated prices in tier
      const verifyRes = await request(app.getHttpServer())
        .get(`/pricing/tiers/${testTierId}/dishes`)
        .set('Cookie', adminCookie)
        .expect(200);

      const pnr = verifyRes.body.data.find(
        (d: any) => d.dishId === paneerDishId,
      );
      expect(pnr.price).toBe('14.00');

      const tf = verifyRes.body.data.find((d: any) => d.dishId === tofuDishId);
      expect(tf.price).toBe('13.50');
    });

    it('removes explicit dish price override and updates status', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/pricing/tiers/${testTierId}/dishes/${paneerDishId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      // On manual tier, removing price makes it MISSING
      expect(res.body.price).toBeNull();
      expect(res.body.missing).toBe(true);
      expect(res.body.source).toBe('MISSING');
    });
  });

  describe('Option Pricing and Overrides', () => {
    let testTierId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/pricing/tiers')
        .set('Cookie', adminCookie)
        .send({
          name: 'E2E Option Testing Tier',
          derivationType: PriceDerivationType.MANUAL,
        });
      testTierId = res.body.id;
      createdTierIds.push(testTierId);
    });

    it('sets explicit option price and removes it', async () => {
      // Set option price
      const setRes = await request(app.getHttpServer())
        .put(`/pricing/tiers/${testTierId}/options/${paneerOptionId}`)
        .set('Cookie', adminCookie)
        .send({ price: 3.75 })
        .expect(200);

      expect(setRes.body.optionId).toBe(paneerOptionId);
      expect(setRes.body.price).toBe('3.75');

      // Get tier options
      const getRes = await request(app.getHttpServer())
        .get(`/pricing/tiers/${testTierId}/options`)
        .set('Cookie', adminCookie)
        .expect(200);

      const opt = getRes.body.data.find(
        (o: any) => o.optionId === paneerOptionId,
      );
      expect(opt.price).toBe('3.75');

      // Remove option price
      const delRes = await request(app.getHttpServer())
        .delete(`/pricing/tiers/${testTierId}/options/${paneerOptionId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(delRes.body.price).toBeNull();
      expect(delRes.body.missing).toBe(true);
    });
  });

  describe('Company and Employee Pricing Resolution Endpoints', () => {
    it('resolves price for Alice (Acme Corp -> Standard default tier)', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/pricing/resolve/employee/${aliceEmployeeId}/dish/${paneerDishId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.tierName).toBe('Standard');
      // Standard paneer price seeded as 10.00
      expect(res.body.price).toBe('10');
    });

    it('resolves price for Bob (Globex Inc -> Enterprise tier with override)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pricing/resolve/employee/${bobEmployeeId}/dish/${paneerDishId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.tierName).toBe('Enterprise');
      // Enterprise paneer override seeded as 12.25
      expect(res.body.price).toBe('12.25');
      expect(res.body.source).toBe('OVERRIDE');
      expect(res.body.isOverridden).toBe(true);
    });

    it('resolves price for Charlie (Initech LLC -> Partner tier cost x 2.4)', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/pricing/resolve/employee/${charlieEmployeeId}/dish/${paneerDishId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.tierName).toBe('Partner');
      // Paneer cost is 4.50 * 2.4 = 10.80
      expect(res.body.price).toBe('10.8');
      expect(res.body.source).toBe('DERIVED');
      expect(res.body.isDerived).toBe(true);
    });

    it('returns MISSING_PRICE for unpriced dish and never $0 or blank', async () => {
      // Vegetable bowl was intentionally left unpriced on Standard
      const res = await request(app.getHttpServer())
        .get(`/pricing/resolve/employee/${aliceEmployeeId}/dish/${vegDishId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.status).toBe('MISSING_PRICE');
      expect(res.body.price).toBeNull();
      expect(res.body.missing).toBe(true);
      expect(res.body.source).toBe('MISSING');
    });

    it('provides complete employee pricing context', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pricing/resolve/employee/${aliceEmployeeId}/context`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.employeeName).toBe('Alice Smith');
      expect(res.body.companyName).toBe('Acme Corp');
      expect(res.body.priceTierName).toBe('Standard');
      expect(res.body.isDefaultTier).toBe(true);
    });
  });

  describe('Default Tier and Safe Deletion Constraints', () => {
    it('cannot delete the default price tier (400)', async () => {
      const standardTier = await prisma.priceTier.findUnique({
        where: { name: 'Standard' },
      });
      await request(app.getHttpServer())
        .delete(`/pricing/tiers/${standardTier!.id}`)
        .set('Cookie', adminCookie)
        .expect(400);
    });

    it('cannot delete a tier that is the baseTier for other derived tiers (400)', async () => {
      // Enterprise derives from Standard
      const standardTier = await prisma.priceTier.findUnique({
        where: { name: 'Standard' },
      });
      await request(app.getHttpServer())
        .delete(`/pricing/tiers/${standardTier!.id}`)
        .set('Cookie', adminCookie)
        .expect(400);
    });

    it('cannot delete a tier currently assigned to customer companies (400)', async () => {
      const enterpriseTier = await prisma.priceTier.findUnique({
        where: { name: 'Enterprise' },
      });
      await request(app.getHttpServer())
        .delete(`/pricing/tiers/${enterpriseTier!.id}`)
        .set('Cookie', adminCookie)
        .expect(400);
    });
  });
});
