import {
  Controller,
  Get,
  INestApplication,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import {
  CurrentUser,
  JwtAuthGuard,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  Roles,
  RolesGuard,
} from '../src/modules/auth/index.js';
import type { AuthenticatedUser } from '../src/modules/auth/index.js';

@Controller('test-access')
class TestAccessController {
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminOnly(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, user };
  }

  @Get('kitchen-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KITCHEN)
  kitchenOnly(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, user };
  }

  @Get('kitchen-permission')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.KITCHEN_READ)
  kitchenPermission(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, user };
  }

  @Get('user-create-permission')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.USER_CREATE)
  userCreatePermission(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, user };
  }
}

describe('Auth Module (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestAccessController],
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Seed Accounts Login', () => {
    it('allows Admin to log in and sets HTTP-only cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Test@1234',
        })
        .expect(200);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('admin@test.com');
      expect(res.body.user.role).toBe(UserRole.ADMIN);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);
    });

    it('allows Kitchen staff to log in', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'kitchen@test.com',
          password: 'Test@1234',
        })
        .expect(200);

      expect(res.body.user.email).toBe('kitchen@test.com');
      expect(res.body.user.role).toBe(UserRole.KITCHEN);
    });

    it('allows Dispatch staff to log in', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'dispatch@test.com',
          password: 'Test@1234',
        })
        .expect(200);

      expect(res.body.user.email).toBe('dispatch@test.com');
      expect(res.body.user.role).toBe(UserRole.DISPATCH);
    });

    it('allows Driver staff to log in', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'driver@test.com',
          password: 'Test@1234',
        })
        .expect(200);

      expect(res.body.user.email).toBe('driver@test.com');
      expect(res.body.user.role).toBe(UserRole.DRIVER);
    });
  });

  describe('2. Login Rejection and Generic Errors', () => {
    it('returns generic 401 when email does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Test@1234',
        })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns generic 401 when password is incorrect', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'WrongPassword!123',
        })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects malformed email with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'Test@1234',
        })
        .expect(400);
    });

    it('rejects missing password with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
        })
        .expect(400);
    });
  });

  describe('3. Current User GET /auth/me', () => {
    it('returns current user profile when authenticated with cookie', async () => {
      // 1. Log in to get cookie
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Test@1234',
        })
        .expect(200);

      const cookie = loginRes.headers['set-cookie'];

      // 2. Call /auth/me with cookie
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(meRes.body.email).toBe('admin@test.com');
      expect(meRes.body.role).toBe(UserRole.ADMIN);
      expect(meRes.body.password).toBeUndefined();
      expect(meRes.body.passwordHash).toBeUndefined();
    });

    it('rejects unauthenticated requests to /auth/me with 401', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('rejects /auth/me with invalid or expired token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', ['token=invalid-garbage-token'])
        .expect(401);
    });
  });

  describe('4. Logout POST /auth/logout', () => {
    it('clears auth cookie and returns success', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(res.body.message).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=;/);
    });

    it('logout is idempotent and does not require authentication', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);
      const res2 = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(res1.body.message).toBe('Logged out successfully');
      expect(res2.body.message).toBe('Logged out successfully');
    });
  });

  describe('5. Server-Side Authorization (Roles & Centralized Permissions)', () => {
    let adminCookie: string[];
    let kitchenCookie: string[];
    let driverCookie: string[];

    beforeAll(async () => {
      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'Test@1234' });
      adminCookie = Array(adminLogin.headers['set-cookie']);

      const kitchenLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'kitchen@test.com', password: 'Test@1234' });
      kitchenCookie = Array(kitchenLogin.headers['set-cookie']);

      const driverLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'driver@test.com', password: 'Test@1234' });
      driverCookie = Array(driverLogin.headers['set-cookie']);
    });

    it('unauthenticated request to protected route is rejected with 401', async () => {
      await request(app.getHttpServer())
        .get('/test-access/admin-only')
        .expect(401);
    });

    it('admin user can access @Roles(ADMIN) route', async () => {
      const res = await request(app.getHttpServer())
        .get('/test-access/admin-only')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.user.role).toBe(UserRole.ADMIN);
    });

    it('non-admin user (Kitchen) receives 403 Forbidden on @Roles(ADMIN) route', async () => {
      await request(app.getHttpServer())
        .get('/test-access/admin-only')
        .set('Cookie', kitchenCookie)
        .expect(403);
    });

    it('kitchen user can access @Roles(KITCHEN) route', async () => {
      const res = await request(app.getHttpServer())
        .get('/test-access/kitchen-only')
        .set('Cookie', kitchenCookie)
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('driver user receives 403 Forbidden on @Roles(KITCHEN) route', async () => {
      await request(app.getHttpServer())
        .get('/test-access/kitchen-only')
        .set('Cookie', driverCookie)
        .expect(403);
    });

    it('both Admin and Kitchen can access @RequirePermissions(KITCHEN_READ)', async () => {
      // Admin has all permissions
      await request(app.getHttpServer())
        .get('/test-access/kitchen-permission')
        .set('Cookie', adminCookie)
        .expect(200);

      // Kitchen has KITCHEN_READ permission
      await request(app.getHttpServer())
        .get('/test-access/kitchen-permission')
        .set('Cookie', kitchenCookie)
        .expect(200);
    });

    it('driver lacks KITCHEN_READ and receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/test-access/kitchen-permission')
        .set('Cookie', driverCookie)
        .expect(403);
    });

    it('kitchen lacks USER_CREATE and receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/test-access/user-create-permission')
        .set('Cookie', kitchenCookie)
        .expect(403);
    });

    it('admin has USER_CREATE and receives 200 OK', async () => {
      await request(app.getHttpServer())
        .get('/test-access/user-create-permission')
        .set('Cookie', adminCookie)
        .expect(200);
    });
  });
});
