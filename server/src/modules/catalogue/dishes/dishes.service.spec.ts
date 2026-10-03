import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DishesService } from './dishes.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { StorageService } from '../../../common/storage/storage.service.js';
import { DishTemperature } from '../../../generated/prisma/enums.js';
import { Prisma } from '../../../generated/prisma/client.js';

describe('DishesService', () => {
  let service: DishesService;
  let prisma: {
    dish: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    kitchenStation: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let storage: {
    upload: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    extractKeyFromUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      dish: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      kitchenStation: {
        findUnique: vi.fn(),
      },
    };

    storage = {
      upload: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      extractKeyFromUrl: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DishesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: StorageService,
          useValue: storage,
        },
      ],
    }).compile();

    service = module.get<DishesService>(DishesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creating dish with negative cost price', async () => {
    await expect(
      service.create({
        name: 'Dish',
        sku: 'DISH-1',
        temperature: DishTemperature.HOT,
        costPrice: -2.5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject creating dish with minimumOrderQuantity <= 0', async () => {
    await expect(
      service.create({
        name: 'Dish',
        sku: 'DISH-1',
        temperature: DishTemperature.HOT,
        costPrice: 4.5,
        minimumOrderQuantity: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject creating dish with non-existent kitchen station', async () => {
    prisma.kitchenStation.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'Dish',
        sku: 'DISH-1',
        temperature: DishTemperature.HOT,
        costPrice: 4.5,
        kitchenStationId: 'non-existent',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject duplicate SKU with ConflictException', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.10.0' },
    );
    prisma.dish.create.mockRejectedValueOnce(p2002);

    await expect(
      service.create({
        name: 'Dish',
        sku: 'DISH-1',
        temperature: DishTemperature.HOT,
        costPrice: 4.5,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should create a dish successfully', async () => {
    const mockDish = {
      id: 'dish-1',
      name: 'Paneer Bowl',
      description: 'Yummy',
      imageUrl: null,
      sku: 'DISH-1',
      temperature: DishTemperature.HOT,
      costPrice: new Prisma.Decimal('4.50'),
      minimumOrderQuantity: 5,
      kitchenStationId: null,
      kitchenStation: null,
      allergens: [],
      dietaryTags: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.dish.create.mockResolvedValueOnce(mockDish);

    const result = await service.create({
      name: 'Paneer Bowl',
      sku: 'DISH-1',
      temperature: DishTemperature.HOT,
      costPrice: 4.5,
      minimumOrderQuantity: 5,
    });

    expect(result.id).toBe('dish-1');
    expect(result.sku).toBe('DISH-1');
    expect(result.costPrice).toBe('4.50');
  });

  it('should deactivate a dish (soft delete)', async () => {
    const mockDish = {
      id: 'dish-1',
      name: 'Paneer Bowl',
      description: null,
      imageUrl: null,
      sku: 'DISH-1',
      temperature: DishTemperature.HOT,
      costPrice: new Prisma.Decimal('4.50'),
      minimumOrderQuantity: null,
      kitchenStationId: null,
      kitchenStation: null,
      allergens: [],
      dietaryTags: [],
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.dish.update.mockResolvedValueOnce(mockDish);

    const result = await service.deactivate('dish-1');
    expect(result.isActive).toBe(false);
    expect(prisma.dish.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dish-1' },
        data: { isActive: false },
      }),
    );
  });

  describe('Image Handling', () => {
    it('should reject upload without file', async () => {
      await expect(service.uploadImage('dish-1', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid image mime type', async () => {
      // @ts-expect-error test payload
      const badFile: Express.Multer.File = {
        mimetype: 'application/pdf',
        size: 1024,
      };

      await expect(service.uploadImage('dish-1', badFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject oversized image', async () => {
      // @ts-expect-error test payload
      const hugeFile: Express.Multer.File = {
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB
      };

      await expect(service.uploadImage('dish-1', hugeFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload valid image and safely replace old image', async () => {
      prisma.dish.findUnique.mockResolvedValueOnce({
        id: 'dish-1',
        imageUrl: 'https://pub.dev/catalogue/dishes/dish-1/old.webp',
      });
      storage.upload.mockResolvedValueOnce({
        key: 'catalogue/dishes/dish-1/new.webp',
        url: 'https://pub.dev/catalogue/dishes/dish-1/new.webp',
      });
      storage.extractKeyFromUrl.mockReturnValueOnce(
        'catalogue/dishes/dish-1/old.webp',
      );
      prisma.dish.update.mockResolvedValueOnce({});

      // @ts-expect-error test payload
      const file: Express.Multer.File = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/webp',
        size: 1000,
        originalname: 'new.webp',
      };

      const result = await service.uploadImage('dish-1', file);
      expect(result.imageUrl).toBe(
        'https://pub.dev/catalogue/dishes/dish-1/new.webp',
      );
      expect(storage.delete).toHaveBeenCalledWith(
        'catalogue/dishes/dish-1/old.webp',
      );
    });
  });
});
