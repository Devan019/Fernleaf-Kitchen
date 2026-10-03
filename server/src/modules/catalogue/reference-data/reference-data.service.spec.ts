import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReferenceDataService } from './reference-data.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

describe('ReferenceDataService', () => {
  let service: ReferenceDataService;
  let prisma: {
    allergen: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    dietaryTag: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    kitchenStation: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    portionSize: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      allergen: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      dietaryTag: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      kitchenStation: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      portionSize: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceDataService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ReferenceDataService>(ReferenceDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Allergens', () => {
    it('should create an allergen', async () => {
      const mock = {
        id: '1',
        name: 'Peanuts',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.allergen.create.mockResolvedValueOnce(mock);

      const result = await service.createAllergen({ name: 'Peanuts' });
      expect(result).toEqual(mock);
      expect(prisma.allergen.create).toHaveBeenCalledWith({
        data: { name: 'Peanuts' },
      });
    });

    it('should reject duplicate allergen with ConflictException', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.10.0' },
      );
      prisma.allergen.create.mockRejectedValueOnce(p2002Error);

      await expect(service.createAllergen({ name: 'Peanuts' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should list allergens with pagination', async () => {
      prisma.allergen.count.mockResolvedValueOnce(1);
      prisma.allergen.findMany.mockResolvedValueOnce([
        {
          id: '1',
          name: 'Peanuts',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.listAllergens({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should deactivate an allergen', async () => {
      const mock = {
        id: '1',
        name: 'Peanuts',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.allergen.update.mockResolvedValueOnce(mock);

      const result = await service.deactivateAllergen('1');
      expect(result.isActive).toBe(false);
      expect(prisma.allergen.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException on non-existent allergen update', async () => {
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '7.10.0' },
      );
      prisma.allergen.update.mockRejectedValueOnce(p2025Error);

      await expect(
        service.updateAllergen('999', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Portion Sizes', () => {
    it('should create portion size', async () => {
      const mock = {
        id: 'p1',
        name: 'Large',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.portionSize.create.mockResolvedValueOnce(mock);

      const result = await service.createPortionSize({ name: 'Large' });
      expect(result.name).toBe('Large');
    });

    it('should list portion sizes', async () => {
      prisma.portionSize.count.mockResolvedValueOnce(2);
      prisma.portionSize.findMany.mockResolvedValueOnce([
        { id: '1', name: 'Regular', isActive: true },
        { id: '2', name: 'Large', isActive: true },
      ]);

      const result = await service.listPortionSizes({});
      expect(result.data).toHaveLength(2);
    });
  });
});
