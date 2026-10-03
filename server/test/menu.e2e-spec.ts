import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { Prisma } from '../src/generated/prisma/client.js';

describe('Menu Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  // Test data IDs
  let acmeCompanyId: string;
  let globexCompanyId: string;
  let aliceEmployeeId: string;
  let bobEmployeeId: string;
  let charlieEmployeeId: string;
  let paneerDishId: string;
  let brownieDishId: string;

  const testCategoryIds: string[] = [];

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

    // Fetch seeded companies and employees
    const acme = await prisma.company.findUnique({
      where: { name: 'Acme Corp' },
    });
    const globex = await prisma.company.findUnique({
      where: { name: 'Globex Inc' },
    });
    acmeCompanyId = acme!.id;
    globexCompanyId = globex!.id;

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

    const paneer = await prisma.dish.findUnique({
      where: { sku: 'DISH-PNR-001' },
    });
    const brownie = await prisma.dish.findUnique({
      where: { sku: 'DISH-BRW-001' },
    });
    paneerDishId = paneer!.id;
    brownieDishId = brownie!.id;
  });

  afterAll(async () => {
    // Clean up categories created during tests
    if (testCategoryIds.length > 0) {
      await prisma.menuCategory.deleteMany({
        where: { id: { in: testCategoryIds } },
      });
    }
    await app.close();
  });

  // ----------------------------------------------------
  // Category Management Tests
  // ----------------------------------------------------
  describe('Category Management', () => {
    let createdCategoryId: string;

    it('POST /menu/categories - Admin creates a new category', async () => {
      const res = await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Cookie', adminCookie)
        .send({
          name: `E2E Salads ${Date.now()}`,
          displayOrder: 99,
          isSecret: false,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.displayOrder).toBe(99);
      expect(res.body.isActive).toBe(true);
      expect(res.body.isSecret).toBe(false);

      createdCategoryId = res.body.id;
      testCategoryIds.push(createdCategoryId);
    });

    it('POST /menu/categories - Rejects duplicate category name', async () => {
      await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Cookie', adminCookie)
        .send({
          name: 'Bowls', // Already exists in seed
          displayOrder: 10,
        })
        .expect(409);
    });

    it('GET /menu/categories - Lists categories with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/menu/categories?page=1&limit=10')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /menu/categories/:id - Fetches category details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/menu/categories/${createdCategoryId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.id).toBe(createdCategoryId);
      expect(res.body.items).toBeInstanceOf(Array);
    });

    it('PATCH /menu/categories/:id - Updates category fields', async () => {
      const updatedName = `Updated Salads ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .patch(`/menu/categories/${createdCategoryId}`)
        .set('Cookie', adminCookie)
        .send({
          name: updatedName,
          displayOrder: 50,
        })
        .expect(200);

      expect(res.body.name).toBe(updatedName);
      expect(res.body.displayOrder).toBe(50);
    });

    it('PATCH /menu/categories/:id/status - Toggles category active status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/menu/categories/${createdCategoryId}/status`)
        .set('Cookie', adminCookie)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.isActive).toBe(false);

      // Reactivate
      await request(app.getHttpServer())
        .patch(`/menu/categories/${createdCategoryId}/status`)
        .set('Cookie', adminCookie)
        .send({ isActive: true })
        .expect(200);
    });
  });

  // ----------------------------------------------------
  // Category Dish Management Tests
  // ----------------------------------------------------
  describe('Category Dish Management', () => {
    let testCatId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Cookie', adminCookie)
        .send({
          name: `Dish Test Cat ${Date.now()}`,
          displayOrder: 88,
        });
      testCatId = res.body.id;
      testCategoryIds.push(testCatId);
    });

    it('POST /menu/categories/:id/dishes - Adds dish to category', async () => {
      const res = await request(app.getHttpServer())
        .post(`/menu/categories/${testCatId}/dishes`)
        .set('Cookie', adminCookie)
        .send({
          dishId: paneerDishId,
          displayOrder: 1,
        })
        .expect(201);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].dishId).toBe(paneerDishId);
    });

    it('POST /menu/categories/:id/dishes - Rejects duplicate dish assignment', async () => {
      await request(app.getHttpServer())
        .post(`/menu/categories/${testCatId}/dishes`)
        .set('Cookie', adminCookie)
        .send({
          dishId: paneerDishId,
          displayOrder: 2,
        })
        .expect(409);
    });

    it('PATCH /menu/categories/:id/dishes/reorder - Reorders dishes in category', async () => {
      // Add second dish first
      await request(app.getHttpServer())
        .post(`/menu/categories/${testCatId}/dishes`)
        .set('Cookie', adminCookie)
        .send({
          dishId: brownieDishId,
          displayOrder: 2,
        })
        .expect(201);

      // Reorder so brownie is 1 and paneer is 2
      const res = await request(app.getHttpServer())
        .patch(`/menu/categories/${testCatId}/dishes/reorder`)
        .set('Cookie', adminCookie)
        .send({
          items: [
            { dishId: brownieDishId, displayOrder: 1 },
            { dishId: paneerDishId, displayOrder: 2 },
          ],
        })
        .expect(200);

      expect(res.body.items[0].dishId).toBe(brownieDishId);
      expect(res.body.items[0].displayOrder).toBe(1);
      expect(res.body.items[1].dishId).toBe(paneerDishId);
      expect(res.body.items[1].displayOrder).toBe(2);
    });

    it('DELETE /menu/categories/:id/dishes/:dishId - Removes dish from category', async () => {
      await request(app.getHttpServer())
        .delete(`/menu/categories/${testCatId}/dishes/${brownieDishId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      const check = await request(app.getHttpServer())
        .get(`/menu/categories/${testCatId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(check.body.items).toHaveLength(1);
      expect(check.body.items[0].dishId).toBe(paneerDishId);
    });
  });

  // ----------------------------------------------------
  // Company Hiding Tests
  // ----------------------------------------------------
  describe('Company Hiding Rules', () => {
    let hidingCatId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Cookie', adminCookie)
        .send({
          name: `Hiding Test Cat ${Date.now()}`,
          displayOrder: 80,
        });
      hidingCatId = res.body.id;
      testCategoryIds.push(hidingCatId);
    });

    it('POST & DELETE /menu/categories/:id/hidden-companies/:companyId - Hides and unhides category', async () => {
      // Hide
      await request(app.getHttpServer())
        .post(
          `/menu/categories/${hidingCatId}/hidden-companies/${acmeCompanyId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      // Duplicate hide returns 409
      await request(app.getHttpServer())
        .post(
          `/menu/categories/${hidingCatId}/hidden-companies/${acmeCompanyId}`,
        )
        .set('Cookie', adminCookie)
        .expect(409);

      // Unhide
      await request(app.getHttpServer())
        .delete(
          `/menu/categories/${hidingCatId}/hidden-companies/${acmeCompanyId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      // Duplicate unhide returns 404
      await request(app.getHttpServer())
        .delete(
          `/menu/categories/${hidingCatId}/hidden-companies/${acmeCompanyId}`,
        )
        .set('Cookie', adminCookie)
        .expect(404);
    });

    it('POST & DELETE /menu/dishes/:id/hidden-companies/:companyId - Hides and unhides dish', async () => {
      // Hide dish
      await request(app.getHttpServer())
        .post(
          `/menu/dishes/${paneerDishId}/hidden-companies/${globexCompanyId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      // Duplicate hide returns 409
      await request(app.getHttpServer())
        .post(
          `/menu/dishes/${paneerDishId}/hidden-companies/${globexCompanyId}`,
        )
        .set('Cookie', adminCookie)
        .expect(409);

      // Unhide dish
      await request(app.getHttpServer())
        .delete(
          `/menu/dishes/${paneerDishId}/hidden-companies/${globexCompanyId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);
    });
  });

  // ----------------------------------------------------
  // Employee Menu & Preview Effective Resolution Tests
  // ----------------------------------------------------
  describe('Effective Employee Menu and Preview', () => {
    it('Preview for Acme employee: Desserts category is hidden, secret categories excluded', async () => {
      const res = await request(app.getHttpServer())
        .get(`/menu/preview/employees/${aliceEmployeeId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      const categoryNames = res.body.categories.map(
        (c: { name: string }) => c.name,
      );

      // Desserts was hidden for Acme Corp in seed
      expect(categoryNames).not.toContain('Desserts');
      // Secret category must be excluded from normal listing
      expect(categoryNames).not.toContain('Secret Desserts');
      // Bowls should be present
      expect(categoryNames).toContain('Bowls');
    });

    it('Preview for Globex employee: Chocolate Brownie dish is hidden from Globex', async () => {
      const res = await request(app.getHttpServer())
        .get(`/menu/preview/employees/${bobEmployeeId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      // In seed, Desserts category has only Chocolate Brownie.
      // Since Chocolate Brownie is hidden from Globex, Desserts has 0 items and is excluded!
      const dessertsCat = res.body.categories.find(
        (c: { name: string }) => c.name === 'Desserts',
      );
      expect(dessertsCat).toBeUndefined();

      // All dishes in any category should NOT contain Chocolate Brownie
      for (const cat of res.body.categories) {
        const dishIds = cat.items.map((i: { id: string }) => i.id);
        expect(dishIds).not.toContain(brownieDishId);
      }
    });

    it('Admin Preview matches GET /menu/employee/:employeeId exactly', async () => {
      const empRes = await request(app.getHttpServer())
        .get(`/menu/employee/${charlieEmployeeId}`)
        .expect(200);

      const previewRes = await request(app.getHttpServer())
        .get(`/menu/preview/employees/${charlieEmployeeId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(empRes.body).toEqual(previewRes.body);
    });

    it('Excludes dishes with missing prices', async () => {
      const standardTier = await prisma.priceTier.findFirst({
        where: { isDefault: true },
      });

      // Temporarily remove price for Paneer dish from Standard tier
      await prisma.dishPrice.delete({
        where: {
          tierId_dishId: {
            tierId: standardTier!.id,
            dishId: paneerDishId,
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/menu/preview/employees/${aliceEmployeeId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      const bowlsCat = res.body.categories.find(
        (c: { name: string }) => c.name === 'Bowls',
      );
      if (bowlsCat) {
        const dishIds = bowlsCat.items.map((i: { id: string }) => i.id);
        expect(dishIds).not.toContain(paneerDishId);
      }

      // Restore price for Paneer dish on Standard tier
      await prisma.dishPrice.create({
        data: {
          tierId: standardTier!.id,
          dishId: paneerDishId,
          price: new Prisma.Decimal('10.00'),
        },
      });
    });

    it('Secret category is accessible via direct access endpoint', async () => {
      const secretCat = await prisma.menuCategory.findUnique({
        where: { name: 'Secret Desserts' },
      });

      const res = await request(app.getHttpServer())
        .get(
          `/menu/preview/employees/${charlieEmployeeId}/categories/${secretCat!.id}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.id).toBe(secretCat!.id);
      expect(res.body.name).toBe('Secret Desserts');
      expect(res.body.items.length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------
  // Role-Based Access Control (RBAC) Tests
  // ----------------------------------------------------
  describe('Authorization Matrix', () => {
    it('Kitchen staff: can read categories but cannot create or modify (403 Forbidden)', async () => {
      // Read categories -> allowed
      await request(app.getHttpServer())
        .get('/menu/categories')
        .set('Cookie', kitchenCookie)
        .expect(200);

      // Create category -> forbidden
      await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Cookie', kitchenCookie)
        .send({ name: 'Kitchen Forbidden', displayOrder: 1 })
        .expect(403);

      // Hide category -> forbidden
      await request(app.getHttpServer())
        .post(`/menu/categories/some-id/hidden-companies/${acmeCompanyId}`)
        .set('Cookie', kitchenCookie)
        .expect(403);

      // Preview -> forbidden
      await request(app.getHttpServer())
        .get(`/menu/preview/employees/${aliceEmployeeId}`)
        .set('Cookie', kitchenCookie)
        .expect(403);
    });

    it('Dispatch staff: can read categories but cannot modify (403 Forbidden)', async () => {
      // Read categories -> allowed
      await request(app.getHttpServer())
        .get('/menu/categories')
        .set('Cookie', dispatchCookie)
        .expect(200);

      // Create category -> forbidden
      await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Cookie', dispatchCookie)
        .send({ name: 'Dispatch Forbidden', displayOrder: 1 })
        .expect(403);
    });

    it('Driver staff: cannot access menu management at all (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/menu/categories')
        .set('Cookie', driverCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Cookie', driverCookie)
        .send({ name: 'Driver Forbidden', displayOrder: 1 })
        .expect(403);
    });

    it('Unauthenticated requests to staff endpoints return 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/menu/categories').expect(401);
      await request(app.getHttpServer())
        .get(`/menu/preview/employees/${charlieEmployeeId}`)
        .expect(401);
    });
  });
});
