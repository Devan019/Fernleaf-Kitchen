import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MenuService } from './menu.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PricingIntegrationService } from './pricing/pricing-integration.service.js';
import { DishTemperature } from '../../generated/prisma/enums.js';

describe('MenuService', () => {
  let service: MenuService;
  let pricingService: PricingIntegrationService;

  let prismaMock: {
    menuCategory: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    categoryDish: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    dish: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    company: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    employee: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    companyHiddenCategory: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    companyHiddenDish: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = {
      menuCategory: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      categoryDish: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
      dish: {
        findUnique: vi.fn(),
      },
      company: {
        findUnique: vi.fn(),
      },
      employee: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      companyHiddenCategory: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      companyHiddenDish: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => Promise<unknown>)(prismaMock);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    pricingService = new PricingIntegrationService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: PricingIntegrationService,
          useValue: pricingService,
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Category Management', () => {
    it('creates a category successfully', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue(null);
      prismaMock.menuCategory.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
        displayOrder: 1,
        isActive: true,
        isSecret: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createCategory({
        name: 'Bowls',
        displayOrder: 1,
      });

      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Bowls');
      expect(result.isSecret).toBe(false);
    });

    it('rejects duplicate category name on create', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
      });

      await expect(
        service.createCategory({
          name: 'Bowls',
          displayOrder: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates category fields', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Bowls',
      });
      prismaMock.menuCategory.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Rice Bowls',
        displayOrder: 2,
        isActive: true,
        isSecret: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { categoryDishes: 0 },
      });

      const updated = await service.updateCategory('cat-1', {
        name: 'Rice Bowls',
        displayOrder: 2,
      });

      expect(updated.name).toBe('Rice Bowls');
      expect(updated.displayOrder).toBe(2);
    });

    it('updates category status (soft activation/deactivation)', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
      });
      prismaMock.menuCategory.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
        displayOrder: 1,
        isActive: false,
        isSecret: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { categoryDishes: 0 },
      });

      const result = await service.updateCategoryStatus('cat-1', {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it('reorders categories in bulk transactionally', async () => {
      prismaMock.menuCategory.findMany
        .mockResolvedValueOnce([{ id: 'cat-1' }, { id: 'cat-2' }])
        .mockResolvedValueOnce([
          {
            id: 'cat-2',
            name: 'Breakfast',
            displayOrder: 1,
            isActive: true,
            isSecret: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { categoryDishes: 1 },
          },
          {
            id: 'cat-1',
            name: 'Bowls',
            displayOrder: 2,
            isActive: true,
            isSecret: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { categoryDishes: 2 },
          },
        ]);

      const result = await service.reorderCategories({
        categories: [
          { categoryId: 'cat-2', displayOrder: 1 },
          { categoryId: 'cat-1', displayOrder: 2 },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cat-2');
      expect(result[1].id).toBe('cat-1');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('Category Dish Management', () => {
    it('adds an active dish to a category successfully', async () => {
      const mockCategoryData = {
        id: 'cat-1',
        name: 'Bowls',
        displayOrder: 1,
        isActive: true,
        isSecret: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryDishes: [
          {
            id: 'cd-1',
            dishId: 'dish-1',
            displayOrder: 1,
            dish: {
              id: 'dish-1',
              name: 'Paneer Rice Bowl',
              sku: 'DISH-1',
              temperature: DishTemperature.HOT,
              isActive: true,
              imageUrl: null,
            },
          },
        ],
        companyHiddenCategories: [],
      };

      prismaMock.menuCategory.findUnique.mockResolvedValue(mockCategoryData);
      prismaMock.dish.findUnique.mockResolvedValue({
        id: 'dish-1',
        name: 'Paneer Rice Bowl',
        isActive: true,
      });
      prismaMock.categoryDish.findUnique.mockResolvedValue(null);
      prismaMock.categoryDish.create.mockResolvedValue({
        id: 'cd-1',
        categoryId: 'cat-1',
        dishId: 'dish-1',
        displayOrder: 1,
      });

      const result = await service.addDishToCategory('cat-1', {
        dishId: 'dish-1',
        displayOrder: 1,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].dishId).toBe('dish-1');
    });

    it('rejects adding an inactive dish to a category', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
      });
      prismaMock.dish.findUnique.mockResolvedValue({
        id: 'dish-1',
        name: 'Paneer Rice Bowl',
        isActive: false, // inactive dish!
      });

      await expect(
        service.addDishToCategory('cat-1', {
          dishId: 'dish-1',
          displayOrder: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate dish assignment in the same category', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Bowls',
      });
      prismaMock.dish.findUnique.mockResolvedValue({
        id: 'dish-1',
        name: 'Paneer Rice Bowl',
        isActive: true,
      });
      prismaMock.categoryDish.findUnique.mockResolvedValueOnce({
        id: 'cd-1',
        categoryId: 'cat-1',
        dishId: 'dish-1',
      });

      await expect(
        service.addDishToCategory('cat-1', {
          dishId: 'dish-1',
          displayOrder: 2,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Company Visibility Hiding', () => {
    it('hides a category for a company', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Desserts',
      });
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Acme Corp',
      });
      prismaMock.companyHiddenCategory.findUnique.mockResolvedValue(null);
      prismaMock.companyHiddenCategory.create.mockResolvedValue({
        id: 'chc-1',
        companyId: 'comp-1',
        categoryId: 'cat-1',
      });

      const result = await service.hideCategoryForCompany('cat-1', 'comp-1');
      expect(result.success).toBe(true);
    });

    it('rejects duplicate hide operation with ConflictException', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Desserts',
      });
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Acme Corp',
      });
      prismaMock.companyHiddenCategory.findUnique.mockResolvedValue({
        id: 'chc-1',
        companyId: 'comp-1',
        categoryId: 'cat-1',
      });

      await expect(
        service.hideCategoryForCompany('cat-1', 'comp-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('unhides a category successfully', async () => {
      prismaMock.companyHiddenCategory.findUnique.mockResolvedValue({
        id: 'chc-1',
        companyId: 'comp-1',
        categoryId: 'cat-1',
      });
      prismaMock.companyHiddenCategory.delete.mockResolvedValue({});

      const result = await service.unhideCategoryForCompany('cat-1', 'comp-1');
      expect(result.success).toBe(true);
    });
  });

  describe('Single Source of Truth: Effective Menu Resolution', () => {
    it('resolves effective menu applying all visibility and pricing rules', async () => {
      // Setup Employee & Company
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        name: 'Alice',
        companyId: 'comp-1',
        isActive: true,
        company: {
          id: 'comp-1',
          name: 'Acme Corp',
          isActive: true,
        },
      });

      // Company hidden rules: category 'cat-desserts' is hidden, dish 'dish-hidden' is hidden
      prismaMock.companyHiddenCategory.findMany.mockResolvedValue([
        { categoryId: 'cat-desserts' },
      ]);
      prismaMock.companyHiddenDish.findMany.mockResolvedValue([
        { dishId: 'dish-hidden' },
      ]);

      // Category with dishes
      prismaMock.menuCategory.findMany.mockResolvedValue([
        {
          id: 'cat-bowls',
          name: 'Bowls',
          displayOrder: 1,
          categoryDishes: [
            {
              displayOrder: 1,
              dish: {
                id: 'dish-paneer',
                name: 'Paneer Rice Bowl',
                description: 'Tasty',
                imageUrl: null,
                sku: 'DISH-1',
                temperature: DishTemperature.HOT,
                optionGroups: [],
              },
            },
            {
              displayOrder: 2,
              dish: {
                id: 'dish-unpriced',
                name: 'Unpriced Bowl',
                description: 'No price set',
                imageUrl: null,
                sku: 'DISH-2',
                temperature: DishTemperature.HOT,
                optionGroups: [],
              },
            },
          ],
        },
      ]);

      // Pricing: dish-paneer has valid price, dish-unpriced has NO price
      pricingService.setDishPrice('dish-paneer', '9.50', 'emp-1');
      pricingService.setDishPrice('dish-unpriced', null, 'emp-1');

      const menu = await service.getEffectiveMenuForEmployee('emp-1');

      // Assertions:
      // 1. Bowls category is returned
      expect(menu.categories).toHaveLength(1);
      expect(menu.categories[0].name).toBe('Bowls');

      // 2. Only priced dish is returned (unpriced dish excluded)
      expect(menu.categories[0].items).toHaveLength(1);
      expect(menu.categories[0].items[0].id).toBe('dish-paneer');
      expect(menu.categories[0].items[0].price).toBe('9.50');
      // No internal costPrice leaked!
      expect(
        (menu.categories[0].items[0] as unknown as { costPrice?: unknown })
          .costPrice,
      ).toBeUndefined();
    });

    it('excludes empty categories when all its dishes are unpriced or hidden', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        name: 'Alice',
        companyId: 'comp-1',
        isActive: true,
        company: { id: 'comp-1', name: 'Acme', isActive: true },
      });

      prismaMock.companyHiddenCategory.findMany.mockResolvedValue([]);
      prismaMock.companyHiddenDish.findMany.mockResolvedValue([]);

      prismaMock.menuCategory.findMany.mockResolvedValue([
        {
          id: 'cat-breakfast',
          name: 'Breakfast',
          displayOrder: 1,
          categoryDishes: [
            {
              displayOrder: 1,
              dish: {
                id: 'dish-unpriced',
                name: 'Egg Sandwich',
                description: null,
                imageUrl: null,
                sku: 'EGG-1',
                temperature: DishTemperature.HOT,
                optionGroups: [],
              },
            },
          ],
        },
      ]);

      pricingService.setDishPrice('dish-unpriced', null);

      const menu = await service.getEffectiveMenuForEmployee('emp-1');

      // Category Breakfast had all dishes removed due to missing price -> omitted entirely!
      expect(menu.categories).toHaveLength(0);
    });

    it('excludes secret categories from normal menu listing', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        companyId: 'comp-1',
        isActive: true,
        company: { id: 'comp-1', isActive: true },
      });

      prismaMock.companyHiddenCategory.findMany.mockResolvedValue([]);
      prismaMock.companyHiddenDish.findMany.mockResolvedValue([]);

      // In findMany, where includes `isSecret: false`
      prismaMock.menuCategory.findMany.mockImplementation(
        (args: { where: { isSecret?: boolean } }) => {
          if (args.where.isSecret === false) {
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        },
      );

      const menu = await service.getEffectiveMenuForEmployee('emp-1');
      expect(menu.categories).toHaveLength(0);
      expect(prismaMock.menuCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isSecret: false }),
        }),
      );
    });
  });

  describe('Secret Category Direct Access', () => {
    it('allows direct category access even if isSecret=true', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        companyId: 'comp-1',
        isActive: true,
        company: { id: 'comp-1', isActive: true },
      });

      prismaMock.companyHiddenCategory.findUnique.mockResolvedValue(null);
      prismaMock.companyHiddenDish.findMany.mockResolvedValue([]);

      prismaMock.menuCategory.findUnique.mockResolvedValue({
        id: 'cat-secret',
        name: 'Secret Desserts',
        displayOrder: 4,
        isActive: true,
        isSecret: true,
        categoryDishes: [
          {
            dishId: 'dish-secret-cake',
            displayOrder: 1,
            dish: {
              id: 'dish-secret-cake',
              name: 'Secret Lava Cake',
              description: 'Chocolate',
              imageUrl: null,
              sku: 'CAKE-1',
              temperature: DishTemperature.HOT,
              isActive: true,
              optionGroups: [],
            },
          },
        ],
      });

      pricingService.setDishPrice('dish-secret-cake', '14.00', 'emp-1');

      const directCategory = await service.getCategoryForEmployee(
        'cat-secret',
        'emp-1',
      );

      expect(directCategory.id).toBe('cat-secret');
      expect(directCategory.items).toHaveLength(1);
      expect(directCategory.items[0].price).toBe('14.00');
    });

    it('rejects direct category access if category is hidden for company', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        companyId: 'comp-1',
        isActive: true,
        company: { id: 'comp-1', isActive: true },
      });

      // Category is hidden for employee's company
      prismaMock.companyHiddenCategory.findUnique.mockResolvedValue({
        id: 'chc-1',
        companyId: 'comp-1',
        categoryId: 'cat-secret',
      });

      await expect(
        service.getCategoryForEmployee('cat-secret', 'emp-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
