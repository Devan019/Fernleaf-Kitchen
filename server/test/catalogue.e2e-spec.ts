import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { DishTemperature } from '../src/generated/prisma/enums.js';

describe('Catalogue Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  // Tracking IDs for clean-up
  const createdDishIds: string[] = [];
  const createdOptionIds: string[] = [];
  const createdAllergenIds: string[] = [];
  const createdTagIds: string[] = [];
  const createdStationIds: string[] = [];
  const createdPortionIds: string[] = [];

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

    // Login Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Test@1234' });
    adminCookie = Array(adminLogin.headers['set-cookie']);

    // Login Kitchen
    const kitchenLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'kitchen@test.com', password: 'Test@1234' });
    kitchenCookie = Array(kitchenLogin.headers['set-cookie']);

    // Login Dispatch
    const dispatchLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'dispatch@test.com', password: 'Test@1234' });
    dispatchCookie = Array(dispatchLogin.headers['set-cookie']);

    // Login Driver
    const driverLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'driver@test.com', password: 'Test@1234' });
    driverCookie = Array(driverLogin.headers['set-cookie']);
  });

  afterAll(async () => {
    // Clean up created test entities safely
    if (createdDishIds.length > 0) {
      await prisma.dish.deleteMany({
        where: { id: { in: createdDishIds } },
      });
    }
    if (createdOptionIds.length > 0) {
      await prisma.option.deleteMany({
        where: { id: { in: createdOptionIds } },
      });
    }
    if (createdAllergenIds.length > 0) {
      await prisma.allergen.deleteMany({
        where: { id: { in: createdAllergenIds } },
      });
    }
    if (createdTagIds.length > 0) {
      await prisma.dietaryTag.deleteMany({
        where: { id: { in: createdTagIds } },
      });
    }
    if (createdStationIds.length > 0) {
      await prisma.kitchenStation.deleteMany({
        where: { id: { in: createdStationIds } },
      });
    }
    if (createdPortionIds.length > 0) {
      await prisma.portionSize.deleteMany({
        where: { id: { in: createdPortionIds } },
      });
    }

    await app.close();
  });

  // =========================================================================
  // 1. AUTHORIZATION MATRIX
  // =========================================================================

  describe('Authorization Matrix', () => {
    it('should reject unauthenticated request to catalogue (401)', async () => {
      await request(app.getHttpServer()).get('/catalogue/dishes').expect(401);
    });

    it('should forbid Driver from viewing catalogue dishes (403)', async () => {
      await request(app.getHttpServer())
        .get('/catalogue/dishes')
        .set('Cookie', driverCookie)
        .expect(403);
    });

    it('should allow Kitchen to read catalogue dishes (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/catalogue/dishes')
        .set('Cookie', kitchenCookie)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should allow Dispatch to read catalogue dishes (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/catalogue/dishes')
        .set('Cookie', dispatchCookie)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should forbid Kitchen from creating a dish (403)', async () => {
      await request(app.getHttpServer())
        .post('/catalogue/dishes')
        .set('Cookie', kitchenCookie)
        .send({
          name: 'Forbidden Dish',
          sku: 'FORBIDDEN-01',
          temperature: DishTemperature.HOT,
          costPrice: 5.0,
        })
        .expect(403);
    });

    it('should forbid Dispatch from creating a dish (403)', async () => {
      await request(app.getHttpServer())
        .post('/catalogue/dishes')
        .set('Cookie', dispatchCookie)
        .send({
          name: 'Forbidden Dish',
          sku: 'FORBIDDEN-02',
          temperature: DishTemperature.HOT,
          costPrice: 5.0,
        })
        .expect(403);
    });

    it('should forbid Kitchen from modifying reference data (403)', async () => {
      await request(app.getHttpServer())
        .post('/catalogue/allergens')
        .set('Cookie', kitchenCookie)
        .send({ name: 'Forbidden Allergen' })
        .expect(403);
    });
  });

  // =========================================================================
  // 2. REFERENCE DATA MANAGEMENT
  // =========================================================================

  describe('Reference Data Management', () => {
    let allergenId: string;
    let dietaryTagId: string;
    let stationId: string;
    let portionSizeId: string;

    it('Admin creates an allergen', async () => {
      const res = await request(app.getHttpServer())
        .post('/catalogue/allergens')
        .set('Cookie', adminCookie)
        .send({ name: 'Mustard E2E' })
        .expect(201);

      allergenId = res.body.id;
      createdAllergenIds.push(allergenId);
      expect(res.body.name).toBe('Mustard E2E');
    });

    it('Admin rejects duplicate allergen name (409)', async () => {
      await request(app.getHttpServer())
        .post('/catalogue/allergens')
        .set('Cookie', adminCookie)
        .send({ name: 'Mustard E2E' })
        .expect(409);
    });

    it('Admin deactivates an allergen', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/catalogue/allergens/${allergenId}`)
        .set('Cookie', adminCookie)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });

    it('Admin creates dietary tag, kitchen station, and portion size', async () => {
      const tagRes = await request(app.getHttpServer())
        .post('/catalogue/dietary-tags')
        .set('Cookie', adminCookie)
        .send({ name: 'Keto E2E' })
        .expect(201);
      dietaryTagId = tagRes.body.id;
      createdTagIds.push(dietaryTagId);

      const stationRes = await request(app.getHttpServer())
        .post('/catalogue/kitchen-stations')
        .set('Cookie', adminCookie)
        .send({ name: 'Wok Station E2E' })
        .expect(201);
      stationId = stationRes.body.id;
      createdStationIds.push(stationId);

      const portionRes = await request(app.getHttpServer())
        .post('/catalogue/portion-sizes')
        .set('Cookie', adminCookie)
        .send({ name: 'Family Size E2E' })
        .expect(201);
      portionSizeId = portionRes.body.id;
      createdPortionIds.push(portionSizeId);

      expect(dietaryTagId).toBeDefined();
      expect(stationId).toBeDefined();
      expect(portionSizeId).toBeDefined();
    });
  });

  // =========================================================================
  // 3. DISH LIFECYCLE & IMAGE STORAGE
  // =========================================================================

  describe('Dish Lifecycle and Safe Deactivation', () => {
    let testDishId: string;
    const testSku = `DISH-E2E-${Date.now()}`;

    it('Admin creates a new dish with full configuration', async () => {
      const res = await request(app.getHttpServer())
        .post('/catalogue/dishes')
        .set('Cookie', adminCookie)
        .send({
          name: 'Butter Chicken Rice Bowl',
          description: 'Authentic butter chicken served with rice.',
          sku: testSku,
          temperature: DishTemperature.HOT,
          costPrice: 5.5,
          minimumOrderQuantity: 5,
        })
        .expect(201);

      testDishId = res.body.id;
      createdDishIds.push(testDishId);
      expect(res.body.sku).toBe(testSku);
      expect(res.body.costPrice).toBe('5.50');
      expect(res.body.isActive).toBe(true);
    });

    it('Reject creating dish with negative cost price (400)', async () => {
      await request(app.getHttpServer())
        .post('/catalogue/dishes')
        .set('Cookie', adminCookie)
        .send({
          name: 'Invalid Cost Dish',
          sku: `BAD-COST-${Date.now()}`,
          temperature: DishTemperature.HOT,
          costPrice: -1.0,
        })
        .expect(400);
    });

    it('Reject creating dish with duplicate SKU (409)', async () => {
      await request(app.getHttpServer())
        .post('/catalogue/dishes')
        .set('Cookie', adminCookie)
        .send({
          name: 'Duplicate SKU Dish',
          sku: testSku,
          temperature: DishTemperature.HOT,
          costPrice: 6.0,
        })
        .expect(409);
    });

    it('Admin updates dish details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/catalogue/dishes/${testDishId}`)
        .set('Cookie', adminCookie)
        .send({
          costPrice: 5.75,
          minimumOrderQuantity: 10,
        })
        .expect(200);

      expect(res.body.costPrice).toBe('5.75');
      expect(res.body.minimumOrderQuantity).toBe(10);
    });

    it('Admin uploads food image for dish', async () => {
      const res = await request(app.getHttpServer())
        .post(`/catalogue/dishes/${testDishId}/image`)
        .set('Cookie', adminCookie)
        .attach('file', Buffer.from('fake-image-bytes'), 'dish.webp')
        .expect(200);

      expect(res.body.imageUrl).toBeDefined();
    });

    it('Admin removes food image from dish', async () => {
      await request(app.getHttpServer())
        .delete(`/catalogue/dishes/${testDishId}/image`)
        .set('Cookie', adminCookie)
        .expect(200);

      const dishRes = await request(app.getHttpServer())
        .get(`/catalogue/dishes/${testDishId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(dishRes.body.imageUrl).toBeNull();
    });

    it('Dish is deactivated (NEVER hard-deleted)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/catalogue/dishes/${testDishId}/status`)
        .set('Cookie', adminCookie)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.isActive).toBe(false);

      // Verify the dish still exists in DB
      const getRes = await request(app.getHttpServer())
        .get(`/catalogue/dishes/${testDishId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(getRes.body.id).toBe(testDishId);
      expect(getRes.body.isActive).toBe(false);
    });
  });

  // =========================================================================
  // 4. OPTIONS, OPTION GROUPS & PORTION BUSINESS RULE
  // =========================================================================

  describe('Options, Option Groups & Critical Portion Validation', () => {
    let dishId: string;
    let groupId: string;
    let regularPortionId: string;
    let largePortionId: string;
    let tofuOptionId: string;
    let paneerOptionId: string;

    beforeAll(async () => {
      // Create test dish
      const dishRes = await request(app.getHttpServer())
        .post('/catalogue/dishes')
        .set('Cookie', adminCookie)
        .send({
          name: 'Portion Test Bowl',
          sku: `DISH-PORTION-${Date.now()}`,
          temperature: DishTemperature.HOT,
          costPrice: 4.0,
        });
      dishId = dishRes.body.id;
      createdDishIds.push(dishId);

      // Find or create Regular and Large portions
      const regRes = await request(app.getHttpServer())
        .get('/catalogue/portion-sizes?search=Regular')
        .set('Cookie', adminCookie);
      regularPortionId = regRes.body.data[0].id;

      const largeRes = await request(app.getHttpServer())
        .get('/catalogue/portion-sizes?search=Large')
        .set('Cookie', adminCookie);
      largePortionId = largeRes.body.data[0].id;
    });

    it('Admin creates Paneer option with full portion support (Regular & Large)', async () => {
      const res = await request(app.getHttpServer())
        .post('/catalogue/options')
        .set('Cookie', adminCookie)
        .send({
          name: `Paneer E2E ${Date.now()}`,
          costPrice: 2.0,
          portions: [
            { portionSizeId: regularPortionId, extraCharge: 0.0 },
            { portionSizeId: largePortionId, extraCharge: 1.5 },
          ],
        })
        .expect(201);

      paneerOptionId = res.body.id;
      createdOptionIds.push(paneerOptionId);
      expect(res.body.portions).toHaveLength(2);
    });

    it('Admin creates Tofu option with partial portion support (Regular only)', async () => {
      const res = await request(app.getHttpServer())
        .post('/catalogue/options')
        .set('Cookie', adminCookie)
        .send({
          name: `Tofu E2E ${Date.now()}`,
          costPrice: 1.8,
          portions: [{ portionSizeId: regularPortionId, extraCharge: 0.0 }],
        })
        .expect(201);

      tofuOptionId = res.body.id;
      createdOptionIds.push(tofuOptionId);
      expect(res.body.portions).toHaveLength(1);
    });

    it('Admin creates an Option Group using portions', async () => {
      const res = await request(app.getHttpServer())
        .post(`/catalogue/dishes/${dishId}/option-groups`)
        .set('Cookie', adminCookie)
        .send({
          name: 'Choose Protein',
          isRequired: true,
          displayOrder: 1,
          usesPortions: true,
        })
        .expect(201);

      groupId = res.body.id;
      expect(res.body.usesPortions).toBe(true);
    });

    it('Admin attaches Regular portion to the group', async () => {
      const res = await request(app.getHttpServer())
        .post(`/catalogue/option-groups/${groupId}/portions`)
        .set('Cookie', adminCookie)
        .send({ portionSizeId: regularPortionId, displayOrder: 1 })
        .expect(201);

      expect(res.body.portions).toHaveLength(1);
    });

    it('Admin attaches Large portion to the group', async () => {
      const res = await request(app.getHttpServer())
        .post(`/catalogue/option-groups/${groupId}/portions`)
        .set('Cookie', adminCookie)
        .send({ portionSizeId: largePortionId, displayOrder: 2 })
        .expect(201);

      expect(res.body.portions).toHaveLength(2);
    });

    it('CRITICAL RULE: Reject attaching Tofu because it does NOT support Large portion (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/catalogue/option-groups/${groupId}/options`)
        .set('Cookie', adminCookie)
        .send({ optionId: tofuOptionId })
        .expect(400);

      expect(res.body.message).toMatch(/does not support all portion sizes/);
    });

    it('CRITICAL RULE: Allow attaching Paneer because it supports all required portions (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/catalogue/option-groups/${groupId}/options`)
        .set('Cookie', adminCookie)
        .send({ optionId: paneerOptionId })
        .expect(201);

      expect(res.body.options).toHaveLength(1);
      expect(res.body.options[0].optionId).toBe(paneerOptionId);
    });

    it('Admin reorders portions in group', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/catalogue/option-groups/${groupId}/portions/reorder`)
        .set('Cookie', adminCookie)
        .send({
          orderedPortionSizeIds: [largePortionId, regularPortionId],
        })
        .expect(200);

      expect(res.body.portions[0].portionSizeId).toBe(largePortionId);
      expect(res.body.portions[1].portionSizeId).toBe(regularPortionId);
    });

    it('Admin removes an option from the group', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/catalogue/option-groups/${groupId}/options/${paneerOptionId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.options).toHaveLength(0);
    });
  });
});
