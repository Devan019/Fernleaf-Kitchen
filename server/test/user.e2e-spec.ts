import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { UserRole } from '../src/generated/prisma/enums.js';

describe('User Module (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminCookie: string[];
  let kitchenCookie: string[];
  const createdUserIds: string[] = [];

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

    // Obtain authentication session for Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Test@1234' });
    adminCookie = Array(adminLogin.headers['set-cookie']);

    // Obtain authentication session for Kitchen staff
    const kitchenLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'kitchen@test.com', password: 'Test@1234' });
    kitchenCookie = Array(kitchenLogin.headers['set-cookie']);
  });

  afterAll(async () => {
    // Clean up all users created during e2e testing
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }
    await app.close();
  });

  describe('AUTHORIZATION GUARDS', () => {
    it('rejects unauthenticated requests to any user endpoint with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).post('/users').send({}).expect(401);
      await request(app.getHttpServer()).get('/users').expect(401);
      await request(app.getHttpServer()).get('/users/any-id').expect(401);
      await request(app.getHttpServer())
        .patch('/users/any-id')
        .send({})
        .expect(401);
      await request(app.getHttpServer()).delete('/users/any-id').expect(401);
    });

    it('rejects non-admin (Kitchen) user requests (mutations and reads) with 403 Forbidden', async () => {
      // POST (create) forbidden for non-admin
      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', kitchenCookie)
        .send({
          name: 'Unauthorized User',
          email: 'unauthorized@example.com',
          password: 'Test@1234',
          role: UserRole.DRIVER,
        })
        .expect(403);

      // GET (readall) forbidden for non-admin
      await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', kitchenCookie)
        .expect(403);

      // GET (read) forbidden for non-admin
      await request(app.getHttpServer())
        .get('/users/any-id')
        .set('Cookie', kitchenCookie)
        .expect(403);

      // PATCH (update) forbidden for non-admin
      await request(app.getHttpServer())
        .patch('/users/any-id')
        .set('Cookie', kitchenCookie)
        .send({ name: 'Hacker Name' })
        .expect(403);

      // DELETE (deactivate) forbidden for non-admin
      await request(app.getHttpServer())
        .delete('/users/any-id')
        .set('Cookie', kitchenCookie)
        .expect(403);
    });

    it('allows Admin to perform read and readall operations', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', adminCookie)
        .expect(200);
    });
  });

  describe('VALIDATION', () => {
    it('27. Unknown fields are rejected with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Hacker',
          email: 'hacker@example.com',
          password: 'Test@1234',
          role: UserRole.ADMIN,
          passwordHash: 'fake-hash',
          admin: true,
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('should not exist')]),
      );
    });

    it('28. Invalid role is rejected with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Bad Role',
          email: 'badrole@example.com',
          password: 'Test@1234',
          role: 'SUPERADMIN',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Role must be one of'),
        ]),
      );
    });

    it('29. Invalid email is rejected with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'Test@1234',
          role: UserRole.KITCHEN,
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Must be a valid email address'),
        ]),
      );
    });

    it('5. Missing required fields are rejected with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', adminCookie)
        .send({})
        .expect(400);

      expect(response.body.message.length).toBeGreaterThanOrEqual(4);
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Short Pass',
          email: 'shortpass@example.com',
          password: 'short',
          role: UserRole.DRIVER,
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'Password must be at least 8 characters long',
          ),
        ]),
      );
    });
  });

  describe('CREATE', () => {
    let createdUser: Record<string, unknown>;
    const testEmail = `test-user-${Date.now()}@example.com`;

    it('1. Successfully creates a user and returns 201 Created', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Test Staff',
          email: testEmail,
          password: 'Test@1234',
          role: UserRole.KITCHEN,
        })
        .expect(201);

      createdUser = response.body;
      createdUserIds.push(createdUser.id as string);

      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe('Test Staff');
      expect(createdUser.email).toBe(testEmail);
      expect(createdUser.role).toBe(UserRole.KITCHEN);
      expect(createdUser.isActive).toBe(true);
      expect(createdUser.createdAt).toBeDefined();
      expect(createdUser.updatedAt).toBeDefined();
    });

    it('8. passwordHash is never returned in create response', () => {
      expect(createdUser.password).toBeUndefined();
      expect(createdUser.passwordHash).toBeUndefined();
    });

    it('2 & 3. Password is saved as Argon2 hash and plaintext password is never stored', async () => {
      const dbUser = await prisma.user.findUnique({
        where: { id: createdUser.id as string },
      });

      expect(dbUser).toBeDefined();
      expect((dbUser as Record<string, unknown>).password).toBeUndefined();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe('Test@1234');
      expect(dbUser?.passwordHash.startsWith('$argon2')).toBe(true);

      const isValid = await argon2.verify(dbUser!.passwordHash, 'Test@1234');
      expect(isValid).toBe(true);
    });

    it('7. Duplicate email returns 409 Conflict', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Duplicate Staff',
          email: testEmail,
          password: 'AnotherPassword@123',
          role: UserRole.DISPATCH,
        })
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });
  });

  describe('READ', () => {
    it('9 & 10. Returns paginated users with correct pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=2')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta).toEqual(
        expect.objectContaining({
          page: 1,
          limit: 2,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      );
      expect(response.body.meta.total).toBeGreaterThanOrEqual(4);
    });

    it('13. passwordHash is never returned in GET /users list', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', adminCookie)
        .expect(200);

      for (const user of response.body.data) {
        expect(user.password).toBeUndefined();
        expect(user.passwordHash).toBeUndefined();
      }
    });

    it('11. User can be fetched by ID', async () => {
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@test.com' },
      });
      expect(adminUser).toBeDefined();

      const response = await request(app.getHttpServer())
        .get(`/users/${adminUser!.id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body.id).toBe(adminUser!.id);
      expect(response.body.email).toBe('admin@test.com');
      expect(response.body.role).toBe(UserRole.ADMIN);
      expect(response.body.password).toBeUndefined();
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('12. Missing user returns 404 Not Found', async () => {
      await request(app.getHttpServer())
        .get('/users/non-existent-user-id-999')
        .set('Cookie', adminCookie)
        .expect(404);
    });
  });

  describe('UPDATE', () => {
    let updateUserId: string;
    const initialEmail = `update-test-${Date.now()}@example.com`;

    beforeAll(async () => {
      const hash = await argon2.hash('Initial@1234');
      const user = await prisma.user.create({
        data: {
          name: 'Before Update',
          email: initialEmail,
          passwordHash: hash,
          role: UserRole.DRIVER,
        },
      });
      updateUserId = user.id;
      createdUserIds.push(user.id);
    });

    it('14. User can update name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Cookie', adminCookie)
        .send({ name: 'After Update' })
        .expect(200);

      expect(response.body.name).toBe('After Update');
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('15. User can update email', async () => {
      const newEmail = `updated-email-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Cookie', adminCookie)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body.email).toBe(newEmail);
    });

    it('16. User can update role', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Cookie', adminCookie)
        .send({ role: UserRole.DISPATCH })
        .expect(200);

      expect(response.body.role).toBe(UserRole.DISPATCH);
    });

    it('17. User can update isActive', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Cookie', adminCookie)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);

      // Re-enable for subsequent tests
      await request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Cookie', adminCookie)
        .send({ isActive: true })
        .expect(200);
    });

    it('18 & 19. User can update password and updated password is saved as Argon2 hash', async () => {
      const newPlaintext = 'BrandNewPassword@4321';
      const response = await request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Cookie', adminCookie)
        .send({ password: newPlaintext })
        .expect(200);

      expect(response.body.password).toBeUndefined();
      expect(response.body.passwordHash).toBeUndefined();

      const userInDb = await prisma.user.findUnique({
        where: { id: updateUserId },
      });
      expect(userInDb?.passwordHash).not.toBe(newPlaintext);
      expect(userInDb?.passwordHash.startsWith('$argon2')).toBe(true);

      const isValid = await argon2.verify(userInDb!.passwordHash, newPlaintext);
      expect(isValid).toBe(true);
    });

    it('20. Duplicate email returns 409 Conflict', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Cookie', adminCookie)
        .send({ email: 'admin@test.com' })
        .expect(409);
    });

    it('21. Missing user returns 404 Not Found on update', async () => {
      await request(app.getHttpServer())
        .patch('/users/non-existent-user-id-999')
        .set('Cookie', adminCookie)
        .send({ name: 'Ghost' })
        .expect(404);
    });

    it('22. passwordHash cannot be supplied directly', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${updateUserId}`)
        .set('Cookie', adminCookie)
        .send({ passwordHash: 'injected-hash' })
        .expect(400);
    });
  });

  describe('DELETE', () => {
    let deleteUserId: string;

    beforeAll(async () => {
      const hash = await argon2.hash('Delete@1234');
      const user = await prisma.user.create({
        data: {
          name: 'To Be Deactivated',
          email: `deactivate-${Date.now()}@example.com`,
          passwordHash: hash,
          role: UserRole.DRIVER,
          isActive: true,
        },
      });
      deleteUserId = user.id;
      createdUserIds.push(user.id);
    });

    it('23 & 25. DELETE deactivates user with isActive=false and does not return passwordHash', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body.id).toBe(deleteUserId);
      expect(response.body.isActive).toBe(false);
      expect(response.body.password).toBeUndefined();
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('24. DELETE does not physically remove database record, GET /users/:id still finds it', async () => {
      // Direct database verification
      const dbUser = await prisma.user.findUnique({
        where: { id: deleteUserId },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.isActive).toBe(false);

      // API verification
      const apiResponse = await request(app.getHttpServer())
        .get(`/users/${deleteUserId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(apiResponse.body.id).toBe(deleteUserId);
      expect(apiResponse.body.isActive).toBe(false);
    });

    it('26. Missing user returns 404 Not Found on delete', async () => {
      await request(app.getHttpServer())
        .delete('/users/non-existent-user-id-999')
        .set('Cookie', adminCookie)
        .expect(404);
    });
  });
});
