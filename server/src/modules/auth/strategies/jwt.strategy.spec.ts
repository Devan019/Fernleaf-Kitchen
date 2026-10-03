import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../generated/prisma/enums.js';
import { UserService } from '../../user/user.service.js';
import { cookieExtractor, JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userService: {
    findOne: ReturnType<typeof vi.fn>;
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    userService = {
      findOne: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        return undefined;
      }),
    };

    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      userService as unknown as UserService,
    );
  });

  describe('cookieExtractor', () => {
    it('extracts token from req.cookies if available', () => {
      const req = {
        cookies: { token: 'cookie-jwt-token' },
      } as any;

      expect(cookieExtractor(req)).toBe('cookie-jwt-token');
    });

    it('extracts token from req.headers.cookie if req.cookies is not parsed', () => {
      const req = {
        headers: {
          cookie: 'session=123; token=raw-cookie-token; other=abc',
        },
      } as any;

      expect(cookieExtractor(req)).toBe('raw-cookie-token');
    });

    it('returns null if neither is available', () => {
      const req = {
        headers: {},
      } as any;

      expect(cookieExtractor(req)).toBeNull();
    });
  });

  describe('validate', () => {
    it('returns safe authenticated user when user exists and is active', async () => {
      userService.findOne.mockResolvedValue({
        id: 'user-id-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        name: 'Admin User',
        isActive: true,
      });

      const result = await strategy.validate({
        sub: 'user-id-1',
        role: UserRole.ADMIN,
      });

      expect(result).toEqual({
        id: 'user-id-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        name: 'Admin User',
      });
      expect(userService.findOne).toHaveBeenCalledWith('user-id-1');
    });

    it('throws UnauthorizedException if sub is missing in payload', async () => {
      await expect(
        strategy.validate({ sub: '', role: UserRole.ADMIN }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if user is deactivated (isActive = false)', async () => {
      userService.findOne.mockResolvedValue({
        id: 'user-id-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        isActive: false,
      });

      await expect(
        strategy.validate({ sub: 'user-id-1', role: UserRole.ADMIN }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if user does not exist in database', async () => {
      userService.findOne.mockRejectedValue(new Error('User not found'));

      await expect(
        strategy.validate({ sub: 'non-existent', role: UserRole.ADMIN }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
