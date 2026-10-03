import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { hashPassword } from '../../common/utils/index.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { UserService } from '../user/user.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let userService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    sign: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  let validPasswordHash: string;

  beforeAll(async () => {
    validPasswordHash = await hashPassword('Test@1234');
  });

  beforeEach(async () => {
    userService = {
      findByEmail: vi.fn(),
      findOne: vi.fn(),
    };

    jwtService = {
      sign: vi.fn().mockReturnValue('mocked.jwt.token'),
      verify: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('1. login succeeds with valid credentials', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 'user-id-123',
        name: 'Admin User',
        email: 'admin@test.com',
        passwordHash: validPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login({
        email: 'admin@test.com',
        password: 'Test@1234',
      });

      expect(result).toBeDefined();
      expect(result.user).toEqual({
        id: 'user-id-123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      });
      expect(result.token).toBe('mocked.jwt.token');
    });

    it('2. login fails for unknown email', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@test.com',
          password: 'Test@1234',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('3. login fails for incorrect password', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 'user-id-123',
        name: 'Admin User',
        email: 'admin@test.com',
        passwordHash: validPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
      });

      await expect(
        service.login({
          email: 'admin@test.com',
          password: 'WrongPassword!999',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('4. password and passwordHash are never returned', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 'user-id-123',
        name: 'Admin User',
        email: 'admin@test.com',
        passwordHash: validPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
      });

      const result = await service.login({
        email: 'admin@test.com',
        password: 'Test@1234',
      });

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect((result as any).password).toBeUndefined();
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('5. JWT is generated for valid login with minimal payload (sub, role)', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 'user-id-456',
        name: 'Kitchen Staff',
        email: 'kitchen@test.com',
        passwordHash: validPasswordHash,
        role: UserRole.KITCHEN,
        isActive: true,
      });

      const result = await service.login({
        email: 'kitchen@test.com',
        password: 'Test@1234',
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id-456',
        role: UserRole.KITCHEN,
      });
      expect(result.token).toBe('mocked.jwt.token');
    });

    it('6. login fails if user account is deactivated (isActive = false)', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 'user-id-inactive',
        name: 'Disabled User',
        email: 'disabled@test.com',
        passwordHash: validPasswordHash,
        role: UserRole.DRIVER,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'disabled@test.com',
          password: 'Test@1234',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('calls jwtService.verify and returns payload', () => {
      const mockPayload = { sub: 'user-id-123', role: UserRole.ADMIN };
      jwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyToken('valid.token');
      expect(jwtService.verify).toHaveBeenCalledWith('valid.token');
      expect(result).toBe(mockPayload);
    });
  });
});
