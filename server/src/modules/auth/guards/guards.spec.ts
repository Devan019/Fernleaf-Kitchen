import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../generated/prisma/enums.js';
import { Permission } from '../types/permission.enum.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { PermissionsGuard } from './permissions.guard.js';

describe('Auth Guards', () => {
  let reflector: Reflector;

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;

    beforeEach(() => {
      guard = new JwtAuthGuard();
    });

    it('returns user if authentication succeeds', () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        role: UserRole.ADMIN,
      };
      const result = guard.handleRequest(null, mockUser, null);
      expect(result).toBe(mockUser);
    });

    it('throws UnauthorizedException if user is missing', () => {
      expect(() =>
        guard.handleRequest(null, false, { message: 'jwt expired' }),
      ).toThrow(UnauthorizedException);
    });

    it('throws custom error if error occurred', () => {
      const err = new Error('Custom error');
      expect(() => guard.handleRequest(err, null, null)).toThrow(err);
    });
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;

    beforeEach(() => {
      guard = new RolesGuard(reflector);
    });

    it('allows access if no roles are defined on handler/class', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = createMockContext({ role: UserRole.DRIVER });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows access if user has the required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.ADMIN,
        UserRole.KITCHEN,
      ]);
      const ctx = createMockContext({ role: UserRole.KITCHEN });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException if user has a different role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.ADMIN,
      ]);
      const ctx = createMockContext({ role: UserRole.DRIVER });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if request has no user or role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.ADMIN,
      ]);
      const ctx = createMockContext(undefined);

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;

    beforeEach(() => {
      guard = new PermissionsGuard(reflector);
    });

    it('allows access if no permissions are required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = createMockContext({ role: UserRole.DRIVER });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows Admin access to any required permission', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Permission.USER_CREATE,
      ]);
      const ctx = createMockContext({ role: UserRole.ADMIN });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows Kitchen access to kitchen operations and user read', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Permission.KITCHEN_READ,
        Permission.USER_READ,
      ]);
      const ctx = createMockContext({ role: UserRole.KITCHEN });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('denies Kitchen access to user creation (throws ForbiddenException)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Permission.USER_CREATE,
      ]);
      const ctx = createMockContext({ role: UserRole.KITCHEN });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('denies Driver access to dispatch operations (throws ForbiddenException)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Permission.DISPATCH_ASSIGN_DRIVER,
      ]);
      const ctx = createMockContext({ role: UserRole.DRIVER });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows Driver access to own delivery updates', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Permission.DELIVERY_READ_OWN,
        Permission.DELIVERY_UPDATE_OWN,
      ]);
      const ctx = createMockContext({ role: UserRole.DRIVER });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
