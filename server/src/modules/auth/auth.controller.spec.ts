import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthenticatedUser } from './types/authenticated-user.type.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: ReturnType<typeof vi.fn>;
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  let cookieSpy: ReturnType<typeof vi.fn>;
  let clearCookieSpy: ReturnType<typeof vi.fn>;

  const mockRes = () => {
    cookieSpy = vi.fn().mockReturnThis();
    clearCookieSpy = vi.fn().mockReturnThis();
    const res = {
      cookie: cookieSpy,
      clearCookie: clearCookieSpy,
    };
    return res as unknown as Response;
  };

  beforeEach(async () => {
    authService = {
      login: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'COOKIE_SECURE') return undefined;
        if (key === 'COOKIE_SAME_SITE') return undefined;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('authenticates user, sets HTTP-only cookie, and returns safe user data', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-cuid-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        name: 'Admin User',
      };

      authService.login.mockResolvedValue({
        user: mockUser,
        token: 'signed.jwt.token',
      });

      const res = mockRes();
      const result = await controller.login(
        { email: 'admin@test.com', password: 'Test@1234' },
        res,
      );

      expect(authService.login).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'Test@1234',
      });

      expect(cookieSpy).toHaveBeenCalledWith('token', 'signed.jwt.token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });

      expect(result).toEqual({ user: mockUser });
    });
  });

  describe('getMe', () => {
    it('returns the current authenticated user passed by @CurrentUser()', () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-cuid-2',
        email: 'kitchen@test.com',
        role: UserRole.KITCHEN,
        name: 'Kitchen Staff',
      };

      const result = controller.getMe(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('clears the authentication cookie and returns success message', () => {
      const res = mockRes();
      const result = controller.logout(res);

      expect(clearCookieSpy).toHaveBeenCalledWith('token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });

    it('is idempotent when called multiple times', () => {
      const res = mockRes();
      const result1 = controller.logout(res);
      const result2 = controller.logout(res);

      expect(result1).toEqual({ message: 'Logged out successfully' });
      expect(result2).toEqual({ message: 'Logged out successfully' });
      expect(clearCookieSpy).toHaveBeenCalledTimes(2);
    });
  });
});
