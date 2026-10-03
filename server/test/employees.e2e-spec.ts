import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';

describe('Employees Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  let googleCompanyId: string;
  let tcsCompanyId: string;
  let milkAllergenId: string;
  let veganDietaryTagId: string;
  let vegetarianDietaryTagId: string;

  const createdEmployeeIds: string[] = [];
  const createdCompanyIds: string[] = [];

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

    // 2. Fetch seeded companies and reference data
    const google = await prisma.company.findUnique({ where: { name: 'Google' } });
    const tcs = await prisma.company.findUnique({ where: { name: 'TCS' } });
    googleCompanyId = google!.id;
    tcsCompanyId = tcs!.id;

    const milk = await prisma.allergen.findFirst({ where: { name: 'Milk' } });
    const vegan = await prisma.dietaryTag.findFirst({ where: { name: 'Vegan' } });
    const veg = await prisma.dietaryTag.findFirst({ where: { name: 'Vegetarian' } });
    milkAllergenId = milk!.id;
    veganDietaryTagId = vegan!.id;
    vegetarianDietaryTagId = veg!.id;
  });

  afterAll(async () => {
    if (createdEmployeeIds.length > 0) {
      await prisma.employee.deleteMany({
        where: { id: { in: createdEmployeeIds } },
      });
    }

    if (createdCompanyIds.length > 0) {
      await prisma.employee.deleteMany({
        where: { companyId: { in: createdCompanyIds } },
      });
      await prisma.companyEmailDomain.deleteMany({
        where: { companyId: { in: createdCompanyIds } },
      });
      await prisma.company.deleteMany({
        where: { id: { in: createdCompanyIds } },
      });
    }

    await app.close();
  });

  describe('RBAC Authorization', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer()).get('/employees').expect(401);
      await request(app.getHttpServer())
        .post('/employees')
        .send({ name: 'Unauth Emp', companyId: googleCompanyId })
        .expect(401);
    });

    it('DRIVER is forbidden (403) from accessing employee endpoints', async () => {
      await request(app.getHttpServer())
        .get('/employees')
        .set('Cookie', driverCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post('/employees')
        .set('Cookie', driverCookie)
        .send({ name: 'Driver Emp', companyId: googleCompanyId })
        .expect(403);
    });

    it('KITCHEN and DISPATCH have read-only access (200 on GET, 403 on mutations)', async () => {
      // Kitchen read
      const kitchenRes = await request(app.getHttpServer())
        .get('/employees')
        .set('Cookie', kitchenCookie)
        .expect(200);
      expect(Array.isArray(kitchenRes.body.data)).toBe(true);

      // Kitchen mutation forbidden
      await request(app.getHttpServer())
        .post('/employees')
        .set('Cookie', kitchenCookie)
        .send({ name: 'Kitchen Mut Emp', companyId: googleCompanyId })
        .expect(403);

      // Dispatch read
      const dispatchRes = await request(app.getHttpServer())
        .get('/employees')
        .set('Cookie', dispatchCookie)
        .expect(200);
      expect(Array.isArray(dispatchRes.body.data)).toBe(true);

      // Dispatch mutation forbidden
      await request(app.getHttpServer())
        .post('/employees')
        .set('Cookie', dispatchCookie)
        .send({ name: 'Dispatch Mut Emp', companyId: googleCompanyId })
        .expect(403);
    });
  });

  describe('Employee Business Rules', () => {
    let testEmpId: string;

    it('19. Employee must belong to exactly one Company', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees')
        .set('Cookie', adminCookie)
        .send({
          name: 'Kavita Reddy',
          email: 'kavita@google.com',
          companyId: googleCompanyId,
          canChooseDeliveryAddress: true,
          canChangeDeliveryTime: false,
          canChangePackaging: true,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Kavita Reddy');
      expect(res.body.companyId).toBe(googleCompanyId);
      expect(res.body.company.name).toBe('Google');

      testEmpId = res.body.id;
      createdEmployeeIds.push(testEmpId);
    });

    it('20. Employee cannot be created without a valid Company', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Cookie', adminCookie)
        .send({
          name: 'No Company Employee',
          email: 'nocompany@test.com',
          companyId: 'cmNonExistentCompanyId999',
        })
        .expect(404);
    });

    it('21 & 22. Employee can be moved to another Company; changes company reference only and does not duplicate company configuration', async () => {
      // Move Kavita from Google to TCS
      const movedRes = await request(app.getHttpServer())
        .patch(`/employees/${testEmpId}`)
        .set('Cookie', adminCookie)
        .send({
          companyId: tcsCompanyId,
        })
        .expect(200);

      expect(movedRes.body.companyId).toBe(tcsCompanyId);
      expect(movedRes.body.company.name).toBe('TCS');

      // Verify the employee record itself did not duplicate company-level settings
      expect((movedRes.body as any).priceTierId).toBeUndefined();
      expect((movedRes.body as any).hiddenCategories).toBeUndefined();
      expect((movedRes.body as any).deliveryAddresses).toBeUndefined();
      expect((movedRes.body as any).workingDays).toBeUndefined();
    });

    it('23. Employee permission flags can be updated', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/employees/${testEmpId}/permissions`)
        .set('Cookie', adminCookie)
        .send({
          canChooseDeliveryAddress: false,
          canChangeDeliveryTime: true,
          canChangePackaging: false,
        })
        .expect(200);

      expect(res.body.canChooseDeliveryAddress).toBe(false);
      expect(res.body.canChangeDeliveryTime).toBe(true);
      expect(res.body.canChangePackaging).toBe(false);
    });

    it('24. Employee allergies can be updated', async () => {
      const res = await request(app.getHttpServer())
        .put(`/employees/${testEmpId}/allergies`)
        .set('Cookie', adminCookie)
        .send({
          allergenIds: [milkAllergenId],
        })
        .expect(200);

      expect(res.body.allergens).toHaveLength(1);
      expect(res.body.allergens[0].id).toBe(milkAllergenId);
    });

    it('25. Employee dietary preferences can be updated', async () => {
      const res = await request(app.getHttpServer())
        .put(`/employees/${testEmpId}/dietary-preferences`)
        .set('Cookie', adminCookie)
        .send({
          dietaryTagIds: [veganDietaryTagId, vegetarianDietaryTagId],
        })
        .expect(200);

      expect(res.body.dietaryTags).toHaveLength(2);
      const tagNames = res.body.dietaryTags.map((t: any) => t.name);
      expect(tagNames).toContain('Vegan');
      expect(tagNames).toContain('Vegetarian');
    });

    it('26. Employee list can be filtered by Company', async () => {
      const res = await request(app.getHttpServer())
        .get(`/employees?companyId=${googleCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      for (const emp of res.body.data) {
        expect(emp.companyId).toBe(googleCompanyId);
      }
    });

    it('27. Employee list can search by name or email', async () => {
      // Search by name
      const nameRes = await request(app.getHttpServer())
        .get('/employees?search=Kavita')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(nameRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(nameRes.body.data[0].name).toContain('Kavita');

      // Search by email
      const emailRes = await request(app.getHttpServer())
        .get('/employees?search=kavita@google.com')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(emailRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(emailRes.body.data[0].email).toBe('kavita@google.com');
    });

    it('28. Inactive Employee behavior works correctly (soft deactivation)', async () => {
      // Soft deactivate
      const deactRes = await request(app.getHttpServer())
        .delete(`/employees/${testEmpId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(deactRes.body.isActive).toBe(false);

      // Verify active filter excludes deactivated employee
      const activeList = await request(app.getHttpServer())
        .get(`/employees?companyId=${tcsCompanyId}&isActive=true`)
        .set('Cookie', adminCookie)
        .expect(200);

      const found = activeList.body.data.some((e: any) => e.id === testEmpId);
      expect(found).toBe(false);

      // Verify inactive filter includes deactivated employee
      const inactiveList = await request(app.getHttpServer())
        .get(`/employees?companyId=${tcsCompanyId}&isActive=false`)
        .set('Cookie', adminCookie)
        .expect(200);

      const foundInactive = inactiveList.body.data.some(
        (e: any) => e.id === testEmpId,
      );
      expect(foundInactive).toBe(true);
    });
  });

  describe('Bulk CSV Import (Requirements 29, 30, 31)', () => {
    let importCompanyId: string;

    beforeAll(async () => {
      // Create dedicated company for CSV testing
      const comp = await request(app.getHttpServer())
        .post('/companies')
        .set('Cookie', adminCookie)
        .send({
          name: 'CSV Test Corp',
          domains: ['csvtestcorp.com'],
        })
        .expect(201);

      importCompanyId = comp.body.id;
      createdCompanyIds.push(importCompanyId);
    });

    it('29, 30, 31. Imports valid rows, reports invalid rows individually, and does not reject the entire file on error', async () => {
      const csvData = [
        'name,email,canChooseDeliveryAddress,canChangeDeliveryTime,canChangePackaging',
        'Valid Employee One,valid1@csvtestcorp.com,true,false,true',
        ',invalid-no-name@csvtestcorp.com,false,false,false', // Missing name -> row error
        'Valid Employee Two,valid2@csvtestcorp.com,false,true,false',
        'Invalid Email Employee,not-an-email,true,true,true', // Malformed email -> row error
        'Valid Employee Three,valid3@csvtestcorp.com,true,true,false',
      ].join('\n');

      const res = await request(app.getHttpServer())
        .post(`/companies/${importCompanyId}/employees/import`)
        .set('Cookie', adminCookie)
        .send({ csvContent: csvData })
        .expect(200);

      expect(res.body.totalRows).toBe(5);
      expect(res.body.imported).toBe(3);
      expect(res.body.failed).toBe(2);
      expect(res.body.errors).toHaveLength(2);

      // Verify row 3 (second data row) reported name error
      const row3Error = res.body.errors.find((e: any) => e.row === 3);
      expect(row3Error).toBeDefined();
      expect(row3Error.errors[0]).toContain('Name is required');

      // Verify row 5 (fourth data row) reported email error
      const row5Error = res.body.errors.find((e: any) => e.row === 5);
      expect(row5Error).toBeDefined();
      expect(row5Error.errors[0]).toContain('Invalid email format');

      // Verify valid employees were indeed saved to the database
      const empList = await request(app.getHttpServer())
        .get(`/employees?companyId=${importCompanyId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(empList.body.data).toHaveLength(3);
      const emails = empList.body.data.map((e: any) => e.email);
      expect(emails).toContain('valid1@csvtestcorp.com');
      expect(emails).toContain('valid2@csvtestcorp.com');
      expect(emails).toContain('valid3@csvtestcorp.com');
    });
  });
});
