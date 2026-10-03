import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OptionsService } from './options.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

describe('OptionsService', () => {
  let service: OptionsService;
  let prisma: {
    option: {
      findUnique: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    portionSize: {
      findMany: ReturnType<typeof vi.fn>;
    };
    optionPortion: {
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      option: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      portionSize: {
        findMany: vi.fn(),
      },
      optionPortion: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OptionsService>(OptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creating an option with negative cost', async () => {
    await expect(
      service.create({ name: 'Invalid Option', costPrice: -1 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject creating an option with invalid portionSizeId', async () => {
    prisma.portionSize.findMany.mockResolvedValueOnce([]); // No matching portion

    await expect(
      service.create({
        name: 'Invalid Portion Option',
        costPrice: 2.0,
        portions: [{ portionSizeId: 'non-existent', extraCharge: 1.0 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create an option successfully', async () => {
    const mockOption = {
      id: 'opt-1',
      name: 'Paneer',
      costPrice: new Prisma.Decimal('2.00'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      allergens: [],
      dietaryTags: [],
      optionPortions: [],
    };
    prisma.option.create.mockResolvedValueOnce(mockOption);
    prisma.option.findUniqueOrThrow.mockResolvedValueOnce(mockOption);

    const result = await service.create({
      name: 'Paneer',
      costPrice: 2.0,
    });

    expect(result.id).toBe('opt-1');
    expect(result.costPrice).toBe('2.00');
    expect(result.name).toBe('Paneer');
  });

  it('should find option by ID', async () => {
    const mockOption = {
      id: 'opt-1',
      name: 'Paneer',
      costPrice: new Prisma.Decimal('2.00'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      allergens: [],
      dietaryTags: [],
      optionPortions: [],
    };
    prisma.option.findUnique.mockResolvedValueOnce(mockOption);

    const result = await service.findOne('opt-1');
    expect(result.id).toBe('opt-1');
    expect(result.name).toBe('Paneer');
  });

  it('should throw NotFoundException when option not found', async () => {
    prisma.option.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should deactivate an option', async () => {
    const mockOption = {
      id: 'opt-1',
      name: 'Paneer',
      costPrice: new Prisma.Decimal('2.00'),
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      allergens: [],
      dietaryTags: [],
      optionPortions: [],
    };
    prisma.option.update.mockResolvedValueOnce(mockOption);

    const result = await service.deactivate('opt-1');
    expect(result.isActive).toBe(false);
  });
});
