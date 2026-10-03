import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { UserService } from './user.service.js';

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    user: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  const mockSafeUser = {
    id: 'user-cuid-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.KITCHEN,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('successfully creates a user and returns safe response without passwordHash', async () => {
      prisma.user.create.mockResolvedValue(mockSafeUser);

      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Test@1234',
        role: UserRole.KITCHEN,
      };

      const result = await service.create(dto);

      expect(result).toEqual(mockSafeUser);
      expect((result as unknown as Record<string, unknown>).password).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('hashes the password before storing in database and never stores plaintext', async () => {
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockSafeUser,
          id: 'new-id',
          name: data.name,
          email: data.email,
          role: data.role,
        }),
      );

      const plaintextPassword = 'Test@1234';
      await service.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: plaintextPassword,
        role: UserRole.ADMIN,
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      const callArgs = prisma.user.create.mock.calls[0][0];

      // Plaintext password is never sent to Prisma
      expect(callArgs.data.password).toBeUndefined();
      expect(callArgs.data.passwordHash).toBeDefined();
      expect(callArgs.data.passwordHash).not.toEqual(plaintextPassword);
      // Valid Argon2 hash starts with $argon2
      expect(callArgs.data.passwordHash.startsWith('$argon2')).toBe(true);

      // Verify argon2 hash matches plaintext
      const isMatch = await argon2.verify(callArgs.data.passwordHash, plaintextPassword);
      expect(isMatch).toBe(true);
    });

    it('throws ConflictException (409) if email already exists', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      await expect(
        service.create({
          name: 'Duplicate User',
          email: 'admin@test.com',
          password: 'Test@1234',
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated users with correct pagination metadata and ordering', async () => {
      prisma.user.count.mockResolvedValue(45);
      prisma.user.findMany.mockResolvedValue([mockSafeUser]);

      const result = await service.findAll(2, 20);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });

      expect(result).toEqual({
        data: [mockSafeUser],
        meta: {
          page: 2,
          limit: 20,
          total: 45,
          totalPages: 3,
        },
      });

      expect((result.data[0] as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('handles default pagination when no params are given', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('findOne', () => {
    it('fetches a user by ID without returning passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(mockSafeUser);

      const result = await service.findOne('user-cuid-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-cuid-1' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockSafeUser);
      expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('throws NotFoundException (404) if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates name and role without changing password', async () => {
      const updatedUser = {
        ...mockSafeUser,
        name: 'Updated Name',
        role: UserRole.DISPATCH,
      };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-cuid-1', {
        name: 'Updated Name',
        role: UserRole.DISPATCH,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-cuid-1' },
        data: { name: 'Updated Name', role: UserRole.DISPATCH },
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
      expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('updates email and isActive status', async () => {
      const updatedUser = {
        ...mockSafeUser,
        email: 'newemail@example.com',
        isActive: false,
      };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-cuid-1', {
        email: 'newemail@example.com',
        isActive: false,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-cuid-1' },
        data: { email: 'newemail@example.com', isActive: false },
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
    });

    it('hashes updated password before saving to database', async () => {
      prisma.user.update.mockResolvedValue(mockSafeUser);

      const newPassword = 'NewSecretPassword@123';
      await service.update('user-cuid-1', {
        password: newPassword,
      });

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const updateData = prisma.user.update.mock.calls[0][0].data;

      expect(updateData.password).toBeUndefined();
      expect(updateData.passwordHash).toBeDefined();
      expect(updateData.passwordHash.startsWith('$argon2')).toBe(true);

      const isMatch = await argon2.verify(updateData.passwordHash, newPassword);
      expect(isMatch).toBe(true);
    });

    it('throws ConflictException (409) if updated email already exists', async () => {
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      await expect(
        service.update('user-cuid-1', {
          email: 'admin@test.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException (404) if user to update does not exist', async () => {
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
          code: 'P2025',
          clientVersion: '7.10.0',
        }),
      );

      await expect(
        service.update('non-existent-id', {
          name: 'Non Existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (soft-delete / deactivate)', () => {
    it('deactivates the user with isActive=false and never calls prisma.user.delete', async () => {
      const deactivatedUser = {
        ...mockSafeUser,
        isActive: false,
      };
      prisma.user.update.mockResolvedValue(deactivatedUser);

      const result = await service.remove('user-cuid-1');

      // Verify soft deletion
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-cuid-1' },
        data: { isActive: false },
        select: expect.any(Object),
      });
      // Physical delete must never be invoked
      expect(prisma.user.delete).not.toHaveBeenCalled();
      expect(result.isActive).toBe(false);
      expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('throws NotFoundException (404) if user to deactivate does not exist', async () => {
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
          code: 'P2025',
          clientVersion: '7.10.0',
        }),
      );

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
