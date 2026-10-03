import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { DayOfWeek } from '../src/generated/prisma/enums.js';

describe('Companies Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  let standardTierId: string;
  let enterpriseTierId: string;
  let bowlsCategoryId: string;
  let paneerDishId: string;

  const createdCompanyIds: string[] = [];
  const createdEmployeeIds: string[] = [];

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

    // 2. Fetch seeded price tiers and catalogue entities
    const standardTier = await prisma.priceTier.findUnique({
      where: { name: 'Standard' },
    });
    const enterpriseTier = await prisma.priceTier.findUnique({
      where: { name: 'Enterprise' },
    });
    standardTierId = standardTier!.id;
    enterpriseTierId = enterpriseTier!.id;

    const category = await prisma.menuCategory.findFirst({
      where: { name: 'Bowls' },
    });
    bowlsCategoryId = category!.id;

    const dish = await prisma.dish.findFirst({
      where: { sku: 'DISH-PNR-001' },
    });
    paneerDishId = dish!.id;
  });

  afterAll(async () => {
    // Cleanup any companies created during tests
    if (createdCompanyIds.length > 0) {
      await prisma.deliveryAddress.deleteMany({
        where: { companyId: { in: createdCompanyIds } },
      });
      await prisma.companyEmailDomain.deleteMany({
        where: { companyId: { in: createdCompanyIds } },
      });
      await prisma.companyHoliday.deleteMany({
        where: { companyId: { in: createdCompanyIds } },
      });
      await prisma.companyHiddenCategory.deleteMany({
        where: { companyId: { in: createdCompanyIds } },
      });
      await prisma.companyHiddenDish.deleteMany({
        where: { companyId: { in: createdCompanyIds } },
      });
      await prisma.employee.deleteMany({
        where: { companyId: { in: createdCompanyIds } },
      });
      await prisma.company.deleteMany({
        where: { id: { in: createdCompanyIds } },
      });
    }

    if (createdEmployeeIds.length > 0) {
      await prisma.employee.deleteMany({
        where: { id: { in: createdEmployeeIds } },
      });
    }

    await app.close();
  });

  describe('RBAC Authorization', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer()).get('/companies').expect(401);
      await request(app.getHttpServer())
        .post('/companies')
        .send({ name: 'Unauth Co' })
        .expect(401);
    });

    it('DRIVER is forbidden (403) from accessing company endpoints', async () => {
      await request(app.getHttpServer())
        .get('/companies')
        .set('Cookie', driverCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post('/companies')
        .set('Cookie', driverCookie)
        .send({ name: 'Driver Co' })
        .expect(403);
    });

    it('KITCHEN and DISPATCH have read-only access (200 on GET, 403 on mutations)', async () => {
      // Kitchen read
      const kitchenRes = await request(app.getHttpServer())
        .get('/companies')
        .set('Cookie', kitchenCookie)
        .expect(200);
      expect(Array.isArray(kitchenRes.body.data)).toBe(true);

      // Kitchen mutation forbidden
      await request(app.getHttpServer())
        .post('/companies')
        .set('Cookie', kitchenCookie)
        .send({ name: 'Kitchen Mut Co' })
        .expect(403);

      // Dispatch read
      const dispatchRes = await request(app.getHttpServer())
        .get('/companies')
        .set('Cookie', dispatchCookie)
        .expect(200);
      expect(Array.isArray(dispatchRes.body.data)).toBe(true);

      // Dispatch mutation forbidden
      await request(app.getHttpServer())
        .post('/companies')
        .set('Cookie', dispatchCookie)
        .send({ name: 'Dispatch Mut Co' })
        .expect(403);
    });
  });

  describe('Company Business Rules', () => {
    let testCompanyId: string;
    let testCompanyBId: string;
    let testEmployeeId: string;
    let foreignEmployeeId: string;
    let firstAddressId: string;

    it('1. Create company with initial domain and defaults', async () => {
      const res = await request(app.getHttpServer())
        .post('/companies')
        .set('Cookie', adminCookie)
        .send({
          name: 'Stark Industries',
          domains: ['starkindustries.com'],
          billingContactName: 'Pepper Potts',
          billingContactEmail: 'pepper@starkindustries.com',
          billingContactPhone: '+1-555-0999',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Stark Industries');
      expect(res.body.emailDomains).toHaveLength(1);
      expect(res.body.emailDomains[0].domain).toBe('starkindustries.com');
      expect(res.body.billingContact.name).toBe('Pepper Potts');

      testCompanyId = res.body.id;
      createdCompanyIds.push(testCompanyId);
    });

    it('2. Update company details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}`)
        .set('Cookie', adminCookie)
        .send({
          name: 'Stark Industries Global',
        })
        .expect(200);

      expect(res.body.name).toBe('Stark Industries Global');
    });

    it('3. Company requires valid domains (rejects invalid domain format)', async () => {
      await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/domains`)
        .set('Cookie', adminCookie)
        .send({ domain: 'not a domain name' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/domains`)
        .set('Cookie', adminCookie)
        .send({ domain: 'invalid@format..com' })
        .expect(400);
    });

    it('4. Duplicate domain between companies is rejected', async () => {
      // Create a second company
      const resB = await request(app.getHttpServer())
        .post('/companies')
        .set('Cookie', adminCookie)
        .send({
          name: 'Wayne Enterprises',
          domains: ['wayneenterprises.com'],
        })
        .expect(201);

      testCompanyBId = resB.body.id;
      createdCompanyIds.push(testCompanyBId);

      // Attempt to claim starkindustries.com for Wayne Enterprises -> 409
      await request(app.getHttpServer())
        .post(`/companies/${testCompanyBId}/domains`)
        .set('Cookie', adminCookie)
        .send({ domain: 'starkindustries.com' })
        .expect(409);
    });

    it('5. Public email domain is rejected (gmail.com, yahoo.com, outlook.com)', async () => {
      await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/domains`)
        .set('Cookie', adminCookie)
        .send({ domain: 'gmail.com' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/domains`)
        .set('Cookie', adminCookie)
        .send({ domain: 'outlook.com' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/domains`)
        .set('Cookie', adminCookie)
        .send({ domain: 'yahoo.com' })
        .expect(400);
    });

    it('6. Company can have multiple domains', async () => {
      const res = await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/domains`)
        .set('Cookie', adminCookie)
        .send({ domain: 'stark.org' })
        .expect(201);

      expect(res.body.domain).toBe('stark.org');

      const detail = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(detail.body.emailDomains).toHaveLength(2);
      expect(detail.body.emailDomains.map((d: any) => d.domain)).toContain(
        'stark.org',
      );
    });

    it('7. Company can have multiple delivery addresses', async () => {
      // Add first address (becomes default automatically)
      const res1 = await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/addresses`)
        .set('Cookie', adminCookie)
        .send({
          label: 'Tower HQ',
          street: '890 5th Avenue',
          city: 'New York',
          postcode: 'NY 10021',
          deliveryInstructions: 'Roof helipad reception',
        })
        .expect(201);

      firstAddressId = res1.body.id;
      expect(res1.body.isDefault).toBe(true);

      // Add second address
      const res2 = await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/addresses`)
        .set('Cookie', adminCookie)
        .send({
          label: 'R&D Facility',
          street: '10880 Wilshire Blvd',
          city: 'Los Angeles',
          postcode: 'CA 90024',
          isDefault: false,
        })
        .expect(201);

      expect(res2.body.isDefault).toBe(false);

      const listRes = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}/addresses`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(listRes.body).toHaveLength(2);
    });

    it('8. Cannot delete the last required delivery address', async () => {
      const addressesRes = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}/addresses`)
        .set('Cookie', adminCookie)
        .expect(200);

      // Delete one of the addresses
      const secondAddr = addressesRes.body.find(
        (a: any) => a.id !== firstAddressId,
      );
      await request(app.getHttpServer())
        .delete(`/companies/${testCompanyId}/addresses/${secondAddr.id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      // Now only firstAddressId remains. Attempting to delete it must fail with 400
      await request(app.getHttpServer())
        .delete(`/companies/${testCompanyId}/addresses/${firstAddressId}`)
        .set('Cookie', adminCookie)
        .expect(400);
    });

    it('9. Billing contact can be updated', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/billing-contact`)
        .set('Cookie', adminCookie)
        .send({
          name: 'Virginia Potts',
          email: 'vpotts@starkindustries.com',
          phone: '+1-555-8888',
        })
        .expect(200);

      expect(res.body.billingContact.name).toBe('Virginia Potts');
      expect(res.body.billingContact.email).toBe('vpotts@starkindustries.com');
      expect(res.body.billingContact.phone).toBe('+1-555-8888');
    });

    it('10 & 11. Company owner must be an Employee of the SAME Company; employee of another company cannot become owner', async () => {
      // Create employee for Stark Industries
      const empRes = await request(app.getHttpServer())
        .post('/employees')
        .set('Cookie', adminCookie)
        .send({
          name: 'Tony Stark',
          email: 'tony@starkindustries.com',
          companyId: testCompanyId,
        })
        .expect(201);
      testEmployeeId = empRes.body.id;
      createdEmployeeIds.push(testEmployeeId);

      // Create employee for Wayne Enterprises
      const foreignEmpRes = await request(app.getHttpServer())
        .post('/employees')
        .set('Cookie', adminCookie)
        .send({
          name: 'Bruce Wayne',
          email: 'bruce@wayneenterprises.com',
          companyId: testCompanyBId,
        })
        .expect(201);
      foreignEmployeeId = foreignEmpRes.body.id;
      createdEmployeeIds.push(foreignEmployeeId);

      // 11. Attempt to set Bruce Wayne (from Wayne Enterprises) as owner of Stark Industries -> 400
      await request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/owner`)
        .set('Cookie', adminCookie)
        .send({ employeeId: foreignEmployeeId })
        .expect(400);

      // 10. Set Tony Stark (from Stark Industries) as owner of Stark Industries -> 200
      const ownerRes = await request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/owner`)
        .set('Cookie', adminCookie)
        .send({ employeeId: testEmployeeId })
        .expect(200);

      expect(ownerRes.body.ownerId).toBe(testEmployeeId);
      expect(ownerRes.body.owner.name).toBe('Tony Stark');
    });

    it('12. Default working days are Monday-Friday', async () => {
      const company = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(company.body.workingDays).toEqual([
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ]);
    });

    it('13 & 14. Company holiday prevents company delivery availability; duplicate holiday rejected', async () => {
      // 14. Add holiday
      const holRes = await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/holidays`)
        .set('Cookie', adminCookie)
        .send({
          date: '2026-12-25',
          name: 'Founder Day',
          description: 'Factory closed',
        })
        .expect(201);

      expect(holRes.body.name).toBe('Founder Day');

      // 14. Duplicate holiday on same date rejected with 409
      await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/holidays`)
        .set('Cookie', adminCookie)
        .send({
          date: '2026-12-25',
          name: 'Another Founder Day',
        })
        .expect(409);

      // 13. Check delivery availability on holiday date (2026-12-25 is Friday, a working day, but is a company holiday)
      const availHoliday = await request(app.getHttpServer())
        .get(
          `/companies/${testCompanyId}/delivery-availability?date=2026-12-25`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      expect(availHoliday.body.allowed).toBe(false);
      expect(availHoliday.body.reason).toContain('holiday');

      // Check delivery availability on a Sunday (2026-10-04 is Sunday -> non-working day)
      const availSunday = await request(app.getHttpServer())
        .get(
          `/companies/${testCompanyId}/delivery-availability?date=2026-10-04`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      expect(availSunday.body.allowed).toBe(false);
      expect(availSunday.body.reason).toContain('non-working');

      // Check delivery availability on a normal working Friday (2026-10-09 is Friday)
      const availNormal = await request(app.getHttpServer())
        .get(
          `/companies/${testCompanyId}/delivery-availability?date=2026-10-09`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      expect(availNormal.body.allowed).toBe(true);
    });

    it('15. Delivery default is 60 minutes when applicable', async () => {
      const company = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(company.body.deliveryDefaults.leaveKitchenMinutes).toBe(60);

      // Can update delivery defaults
      const updated = await request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/delivery-defaults`)
        .set('Cookie', adminCookie)
        .send({
          defaultDeliveryTime: '13:00',
          leaveKitchenMinutes: 45,
          defaultPackagingType: 'INDIVIDUAL',
        })
        .expect(200);

      expect(updated.body.deliveryDefaults.defaultDeliveryTime).toBe('13:00');
      expect(updated.body.deliveryDefaults.leaveKitchenMinutes).toBe(45);
      expect(updated.body.deliveryDefaults.defaultPackagingType).toBe(
        'INDIVIDUAL',
      );
    });

    it('16. Company can be assigned a PriceTier', async () => {
      // Assign Enterprise tier
      const assigned = await request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/price-tier`)
        .set('Cookie', adminCookie)
        .send({ priceTierId: enterpriseTierId })
        .expect(200);

      expect(assigned.body.priceTierId).toBe(enterpriseTierId);
      expect(assigned.body.priceTier.name).toBe('Enterprise');

      // Reassign to Standard tier
      const standardAssigned = await request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/price-tier`)
        .set('Cookie', adminCookie)
        .send({ priceTierId: standardTierId })
        .expect(200);

      expect(standardAssigned.body.priceTierId).toBe(standardTierId);
      expect(standardAssigned.body.priceTier.name).toBe('Standard');

      // Remove explicit tier (null) -> falls back to default
      const removed = await request(app.getHttpServer())
        .patch(`/companies/${testCompanyId}/price-tier`)
        .set('Cookie', adminCookie)
        .send({ priceTierId: null })
        .expect(200);

      expect(removed.body.priceTierId).toBeNull();
      expect(removed.body.priceTier).toBeNull();
    });

    it('17. Company can hide a category', async () => {
      // Hide category
      await request(app.getHttpServer())
        .post(
          `/companies/${testCompanyId}/hidden-categories/${bowlsCategoryId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      // Verify category is in hidden list
      const company = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(company.body.hiddenCategoryIds).toContain(bowlsCategoryId);

      // Duplicate hide returns 409
      await request(app.getHttpServer())
        .post(
          `/companies/${testCompanyId}/hidden-categories/${bowlsCategoryId}`,
        )
        .set('Cookie', adminCookie)
        .expect(409);

      // Unhide category
      await request(app.getHttpServer())
        .delete(
          `/companies/${testCompanyId}/hidden-categories/${bowlsCategoryId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      const companyAfter = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(companyAfter.body.hiddenCategoryIds).not.toContain(
        bowlsCategoryId,
      );
    });

    it('18. Company can hide a dish', async () => {
      // Hide dish
      await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/hidden-dishes/${paneerDishId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      // Verify dish is in hidden list
      const company = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(company.body.hiddenDishIds).toContain(paneerDishId);

      // Duplicate hide returns 409
      await request(app.getHttpServer())
        .post(`/companies/${testCompanyId}/hidden-dishes/${paneerDishId}`)
        .set('Cookie', adminCookie)
        .expect(409);

      // Unhide dish
      await request(app.getHttpServer())
        .delete(`/companies/${testCompanyId}/hidden-dishes/${paneerDishId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      const companyAfter = await request(app.getHttpServer())
        .get(`/companies/${testCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(companyAfter.body.hiddenDishIds).not.toContain(paneerDishId);
    });
  });
});
