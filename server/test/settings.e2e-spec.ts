import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { DayOfWeek, OrderStatus } from '../src/generated/prisma/enums.js';
import { OrderCutoffService } from '../src/modules/order/services/order-cutoff.service.js';
import { SettingsService } from '../src/modules/settings/settings.service.js';
import { randomUUID } from 'node:crypto';

describe('Settings & Kitchen Calendar Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cutoffService: OrderCutoffService;
  let settingsService: SettingsService;

  let adminCookie: string[];
  let kitchenCookie: string[];
  let dispatchCookie: string[];
  let driverCookie: string[];

  const createdHolidayIds: string[] = [];
  const createdCompanyHolidayIds: string[] = [];
  const testOrderIds: string[] = [];
  let testCompanyId: string;
  let testEmployeeId: string;

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
    cutoffService = app.get<OrderCutoffService>(OrderCutoffService);
    settingsService = app.get<SettingsService>(SettingsService);

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

    // 2. Fetch or create a test company & employee for calendar isolation tests
    let comp = await prisma.company.findFirst({
      where: { isActive: true },
      include: { employees: true },
    });
    if (!comp) {
      comp = await prisma.company.create({
        data: {
          name: 'Settings E2E Test Company',
          deliveryAddress: '100 Settings Way, London',
          billingContactName: 'Test Admin',
          billingContactEmail: 'admin@settingstest.com',
        },
        include: { employees: true },
      });
    }
    testCompanyId = comp.id;

    if (comp.employees.length > 0) {
      testEmployeeId = comp.employees[0].id;
    } else {
      const emp = await prisma.employee.create({
        data: {
          companyId: comp.id,
          firstName: 'E2E',
          lastName: 'Tester',
          email: `e2e-${Date.now()}@settingstest.com`,
          isActive: true,
        },
      });
      testEmployeeId = emp.id;
    }
  });

  afterAll(async () => {
    // Clean up created test orders
    if (testOrderIds.length > 0) {
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: testOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: testOrderIds } },
      });
    }

    // Clean up created holidays
    if (createdHolidayIds.length > 0) {
      await prisma.kitchenHoliday.deleteMany({
        where: { id: { in: createdHolidayIds } },
      });
    }
    if (createdCompanyHolidayIds.length > 0) {
      await prisma.companyHoliday.deleteMany({
        where: { id: { in: createdCompanyHolidayIds } },
      });
    }

    // Reset default settings
    await prisma.kitchenSetting.upsert({
      where: { key: 'CUTOFF_TIME' },
      update: { value: '16:00', updatedAt: new Date() },
      create: {
        id: randomUUID(),
        key: 'CUTOFF_TIME',
        value: '16:00',
        updatedAt: new Date(),
      },
    });
    await prisma.kitchenSetting.upsert({
      where: { key: 'CUTOFF_WORKING_DAYS' },
      update: { value: '2', updatedAt: new Date() },
      create: {
        id: randomUUID(),
        key: 'CUTOFF_WORKING_DAYS',
        value: '2',
        updatedAt: new Date(),
      },
    });
    await prisma.kitchenSetting.upsert({
      where: { key: 'KITCHEN_WORKING_DAYS' },
      update: {
        value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        key: 'KITCHEN_WORKING_DAYS',
        value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
        updatedAt: new Date(),
      },
    });
    await prisma.kitchenSetting.upsert({
      where: { key: 'KITCHEN_TIMEZONE' },
      update: { value: 'UTC', updatedAt: new Date() },
      create: {
        id: randomUUID(),
        key: 'KITCHEN_TIMEZONE',
        value: 'UTC',
        updatedAt: new Date(),
      },
    });

    settingsService.invalidateCache();
    await app.close();
  });

  // ====================================================
  // 1. GET & PATCH Kitchen Settings
  // ====================================================

  describe('Kitchen Settings API', () => {
    it('1. GET /settings/kitchen returns current platform settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/kitchen')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body).toHaveProperty('workingDays');
      expect(Array.isArray(res.body.workingDays)).toBe(true);
      expect(res.body).toHaveProperty('cutOffTime');
      expect(res.body).toHaveProperty('cutOffWorkingDays');
      expect(res.body).toHaveProperty('timezone');
      expect(res.body).toHaveProperty('holidays');
      expect(Array.isArray(res.body.holidays)).toBe(true);
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('2. PATCH /settings/kitchen updates settings atomically and persists', async () => {
      const updatePayload = {
        workingDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        cutOffTime: '17:30',
        cutOffWorkingDays: 3,
        timezone: 'Europe/London',
      };

      const res = await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send(updatePayload)
        .expect(200);

      expect(res.body.cutOffTime).toBe('17:30');
      expect(res.body.cutOffWorkingDays).toBe(3);
      expect(res.body.timezone).toBe('Europe/London');

      // Verify GET returns the persisted update
      const getRes = await request(app.getHttpServer())
        .get('/settings/kitchen')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(getRes.body.cutOffTime).toBe('17:30');
      expect(getRes.body.cutOffWorkingDays).toBe(3);
      expect(getRes.body.timezone).toBe('Europe/London');
    });

    it('3. PATCH /settings/kitchen supports partial updates', async () => {
      const res = await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ cutOffTime: '16:00', cutOffWorkingDays: 2 })
        .expect(200);

      expect(res.body.cutOffTime).toBe('16:00');
      expect(res.body.cutOffWorkingDays).toBe(2);
      expect(res.body.timezone).toBe('Europe/London'); // Preserved from previous test
    });
  });

  // ====================================================
  // 2. Validation Rejection Tests
  // ====================================================

  describe('Settings Validation', () => {
    it('4. Rejects invalid weekday name', async () => {
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ workingDays: ['NOT_A_DAY'] })
        .expect(400);
    });

    it('5. Rejects duplicate weekdays', async () => {
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ workingDays: [DayOfWeek.MONDAY, DayOfWeek.MONDAY] })
        .expect(400);
    });

    it('6. Rejects empty working days array', async () => {
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ workingDays: [] })
        .expect(400);
    });

    it('7. Rejects invalid cutOffTime format (25:00, 16:70, hello)', async () => {
      for (const invalidTime of ['25:00', '16:70', 'hello', '9:00', '16:0']) {
        await request(app.getHttpServer())
          .patch('/settings/kitchen')
          .set('Cookie', adminCookie)
          .send({ cutOffTime: invalidTime })
          .expect(400);
      }
    });

    it('8. Rejects negative cutOffWorkingDays', async () => {
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ cutOffWorkingDays: -1 })
        .expect(400);
    });

    it('9. Rejects invalid IANA timezone', async () => {
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ timezone: 'Invalid/City_Timezone' })
        .expect(400);
    });
  });

  // ====================================================
  // 3. Kitchen Holidays CRUD API
  // ====================================================

  describe('Kitchen Holidays CRUD', () => {
    let createdHolidayId: string;
    const testDate = '2028-12-25';

    it('10. POST /settings/kitchen/holidays creates a new holiday', async () => {
      const res = await request(app.getHttpServer())
        .post('/settings/kitchen/holidays')
        .set('Cookie', adminCookie)
        .send({
          date: testDate,
          name: 'Future Christmas Day',
          description: 'Special annual kitchen shutdown',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.date).toBe(testDate);
      expect(res.body.name).toBe('Future Christmas Day');
      createdHolidayId = res.body.id;
      createdHolidayIds.push(createdHolidayId);
    });

    it('11. POST /settings/kitchen/holidays rejects duplicate holiday date with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/settings/kitchen/holidays')
        .set('Cookie', adminCookie)
        .send({
          date: testDate,
          name: 'Duplicate Christmas',
        })
        .expect(409);

      expect(res.body.message).toContain('already exists');
    });

    it('12. GET /settings/kitchen/holidays lists all holidays', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/kitchen/holidays')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((h: any) => h.id === createdHolidayId);
      expect(found).toBeDefined();
      expect(found.date).toBe(testDate);
    });

    it('13. GET /settings/kitchen/holidays/:id returns single holiday', async () => {
      const res = await request(app.getHttpServer())
        .get(`/settings/kitchen/holidays/${createdHolidayId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.id).toBe(createdHolidayId);
      expect(res.body.name).toBe('Future Christmas Day');
    });

    it('14. GET /settings/kitchen/holidays/:id returns 404 for non-existent ID', async () => {
      await request(app.getHttpServer())
        .get('/settings/kitchen/holidays/non-existent-id-999')
        .set('Cookie', adminCookie)
        .expect(404);
    });

    it('15. PATCH /settings/kitchen/holidays/:id updates holiday name/description', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/settings/kitchen/holidays/${createdHolidayId}`)
        .set('Cookie', adminCookie)
        .send({
          name: 'Updated Christmas Name',
          description: 'Updated holiday description',
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Christmas Name');
      expect(res.body.description).toBe('Updated holiday description');
    });

    it('16. DELETE /settings/kitchen/holidays/:id removes holiday successfully', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/settings/kitchen/holidays/${createdHolidayId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify subsequent GET returns 404
      await request(app.getHttpServer())
        .get(`/settings/kitchen/holidays/${createdHolidayId}`)
        .set('Cookie', adminCookie)
        .expect(404);
    });
  });

  // ====================================================
  // 4. RBAC & Access Control
  // ====================================================

  describe('RBAC & Role-Based Permissions', () => {
    it('17. Unauthenticated requests are rejected with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/settings/kitchen').expect(401);
      await request(app.getHttpServer()).patch('/settings/kitchen').expect(401);
      await request(app.getHttpServer())
        .get('/settings/kitchen/holidays')
        .expect(401);
      await request(app.getHttpServer())
        .post('/settings/kitchen/holidays')
        .expect(401);
    });

    it('18. KITCHEN role can read settings but cannot mutate (403 Forbidden)', async () => {
      // Read allowed
      await request(app.getHttpServer())
        .get('/settings/kitchen')
        .set('Cookie', kitchenCookie)
        .expect(200);
      await request(app.getHttpServer())
        .get('/settings/kitchen/holidays')
        .set('Cookie', kitchenCookie)
        .expect(200);

      // Mutations forbidden
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', kitchenCookie)
        .send({ cutOffTime: '15:00' })
        .expect(403);
      await request(app.getHttpServer())
        .post('/settings/kitchen/holidays')
        .set('Cookie', kitchenCookie)
        .send({ date: '2029-01-01', name: 'Kitchen Holiday' })
        .expect(403);
    });

    it('19. DISPATCH role can read settings but cannot mutate (403 Forbidden)', async () => {
      // Read allowed
      await request(app.getHttpServer())
        .get('/settings/kitchen')
        .set('Cookie', dispatchCookie)
        .expect(200);

      // Mutations forbidden
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', dispatchCookie)
        .send({ cutOffTime: '15:00' })
        .expect(403);
    });

    it('20. DRIVER role cannot access settings at all (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/settings/kitchen')
        .set('Cookie', driverCookie)
        .expect(403);
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', driverCookie)
        .send({ cutOffTime: '15:00' })
        .expect(403);
      await request(app.getHttpServer())
        .get('/settings/kitchen/holidays')
        .set('Cookie', driverCookie)
        .expect(403);
    });
  });

  // ====================================================
  // 5. Integration with Order Cutoff Calculation
  // ====================================================

  describe('Cutoff Integration & Calendar Isolation', () => {
    it('21. Order cut-off calculation reflects SettingsService changes immediately', async () => {
      // Set baseline: Mon-Fri, 16:00, 2 working days, UTC
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({
          workingDays: [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          cutOffTime: '16:00',
          cutOffWorkingDays: 2,
          timezone: 'UTC',
        })
        .expect(200);

      // Wednesday 2026-10-14 delivery -> 2 working days back = Monday 2026-10-12 at 16:00 UTC
      const cutoff1 = await cutoffService.calculateCutoff('2026-10-14');
      expect(cutoff1.cutoffDateTime.toISOString()).toBe(
        '2026-10-12T16:00:00.000Z',
      );

      // Update cutOffTime to 14:00 via API
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ cutOffTime: '14:00' })
        .expect(200);

      const cutoff2 = await cutoffService.calculateCutoff('2026-10-14');
      expect(cutoff2.cutoffDateTime.toISOString()).toBe(
        '2026-10-12T14:00:00.000Z',
      );

      // Update cutOffWorkingDays to 3 via API
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ cutOffWorkingDays: 3 })
        .expect(200);

      // 3 working days back from Wednesday 2026-10-14 -> Tuesday, Monday, Friday 2026-10-09 at 14:00 UTC
      const cutoff3 = await cutoffService.calculateCutoff('2026-10-14');
      expect(cutoff3.cutoffDateTime.toISOString()).toBe(
        '2026-10-09T14:00:00.000Z',
      );
    });

    it('22. Kitchen holiday is skipped during cutoff calculation', async () => {
      // Reset to 2 working days, 16:00
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ cutOffTime: '16:00', cutOffWorkingDays: 2 })
        .expect(200);

      // Add kitchen holiday on Monday 2026-10-12
      const holidayRes = await request(app.getHttpServer())
        .post('/settings/kitchen/holidays')
        .set('Cookie', adminCookie)
        .send({
          date: '2026-10-12',
          name: 'Kitchen Renovation Holiday',
        })
        .expect(201);
      createdHolidayIds.push(holidayRes.body.id);

      // Wednesday 2026-10-14 delivery:
      // Tuesday 2026-10-13 = 1 working day back
      // Monday 2026-10-12 = Kitchen Holiday (skipped!)
      // Sunday, Saturday = weekends (skipped)
      // Friday 2026-10-09 = 2nd working day back -> Cutoff is Friday 2026-10-09 at 16:00 UTC
      const cutoff = await cutoffService.calculateCutoff('2026-10-14');
      expect(cutoff.cutoffDateTime.toISOString()).toBe(
        '2026-10-09T16:00:00.000Z',
      );

      // Clean up the test holiday
      await request(app.getHttpServer())
        .delete(`/settings/kitchen/holidays/${holidayRes.body.id}`)
        .set('Cookie', adminCookie)
        .expect(200);
    });

    it('23. Company holiday does NOT affect kitchen cutoff calculation (Domain Calendar Segregation)', async () => {
      // Normal 2 working days back from Wednesday 2026-10-14 is Monday 2026-10-12 16:00
      // Create a COMPANY holiday on Monday 2026-10-12
      const compHoliday = await prisma.companyHoliday.create({
        data: {
          id: randomUUID(),
          companyId: testCompanyId,
          date: new Date('2026-10-12T00:00:00.000Z'),
          name: 'Company Foundation Day',
          updatedAt: new Date(),
        },
      });
      createdCompanyHolidayIds.push(compHoliday.id);

      // Cutoff calculation is governed strictly by the Kitchen Calendar, NOT Company Calendar
      const cutoff = await cutoffService.calculateCutoff('2026-10-14');
      expect(cutoff.cutoffDateTime.toISOString()).toBe(
        '2026-10-12T16:00:00.000Z',
      );
    });

    it('24. Changing settings does NOT retroactively alter historical orders', async () => {
      // Create a historical order that was already CONFIRMED
      const pastDeliveryDate = new Date('2026-09-01T00:00:00.000Z');
      const confirmedTime = new Date('2026-08-28T16:00:00.000Z');

      const historicalOrder = await prisma.order.create({
        data: {
          id: randomUUID(),
          orderNumber: `ORD-HIST-${Date.now()}`,
          companyId: testCompanyId,
          employeeId: testEmployeeId,
          deliveryDate: pastDeliveryDate,
          deliveryTime: '12:00',
          packagingType: 'INDIVIDUAL',
          deliveryStreet: '100 Settings Way',
          deliveryCity: 'London',
          deliveryPostcode: 'EC1A 1BB',
          subtotal: new Prisma.Decimal('25.00'),
          total: new Prisma.Decimal('25.00'),
          status: OrderStatus.CONFIRMED,
          confirmedAt: confirmedTime,
          updatedAt: confirmedTime,
        },
      });
      testOrderIds.push(historicalOrder.id);

      // Update settings
      await request(app.getHttpServer())
        .patch('/settings/kitchen')
        .set('Cookie', adminCookie)
        .send({ cutOffTime: '12:00', cutOffWorkingDays: 5 })
        .expect(200);

      // Verify the historical order remains untouched
      const fetchedOrder = await prisma.order.findUnique({
        where: { id: historicalOrder.id },
      });

      expect(fetchedOrder?.status).toBe(OrderStatus.CONFIRMED);
      expect(fetchedOrder?.confirmedAt?.toISOString()).toBe(
        confirmedTime.toISOString(),
      );
    });
  });

  // ====================================================
  // 6. Concurrency Safety
  // ====================================================

  describe('Concurrency Safety', () => {
    it('25. Concurrent holiday creation on the same date rejects duplicate safely', async () => {
      const concurrencyDate = '2030-05-15';

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/settings/kitchen/holidays')
          .set('Cookie', adminCookie)
          .send({ date: concurrencyDate, name: 'Concurrent Holiday A' }),
        request(app.getHttpServer())
          .post('/settings/kitchen/holidays')
          .set('Cookie', adminCookie)
          .send({ date: concurrencyDate, name: 'Concurrent Holiday B' }),
      ]);

      const statuses = [res1.status, res2.status].sort((a, b) => a - b);
      // Exactly one must succeed (201) and one must be rejected (409 Conflict)
      expect(statuses).toEqual([201, 409]);

      if (res1.status === 201) createdHolidayIds.push(res1.body.id);
      if (res2.status === 201) createdHolidayIds.push(res2.body.id);
    });

    it('26. Concurrent settings updates leave a valid singleton configuration', async () => {
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .patch('/settings/kitchen')
          .set('Cookie', adminCookie)
          .send({ cutOffTime: '15:30' }),
        request(app.getHttpServer())
          .patch('/settings/kitchen')
          .set('Cookie', adminCookie)
          .send({ cutOffTime: '16:30' }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Check current setting is one of the valid values
      const finalRes = await request(app.getHttpServer())
        .get('/settings/kitchen')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(['15:30', '16:30']).toContain(finalRes.body.cutOffTime);
    });
  });
});
