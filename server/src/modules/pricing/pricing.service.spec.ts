import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { PricingService } from './pricing.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PriceDerivationType } from '../../generated/prisma/enums.js';

describe('PricingService', () => {
  let service: PricingService;
  let mockPrisma: any;
  let mockResolutionService: any;
  let tiers: Map<string, any>;
  let dishes: Map<string, any>;
  let dishPrices: Map<string, any>;

  beforeEach(() => {
    tiers = new Map();
    dishes = new Map();
    dishPrices = new Map();

    const standardTier = {
      id: 'tier-1',
      name: 'Standard',
      description: 'Default tier',
      derivationType: PriceDerivationType.MANUAL,
      baseTierId: null,
      multiplier: null,
      percentage: null,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { dishPrices: 1, optionPrices: 0, companies: 1, derivedTiers: 0 },
    };
    tiers.set('tier-1', standardTier);

    dishes.set('dish-1', {
      id: 'dish-1',
      name: 'Paneer Bowl',
      sku: 'DISH-PNR-001',
      costPrice: new Prisma.Decimal('4.50'),
      isActive: true,
    });

    mockPrisma = {
      $transaction: async (cb: any) => cb(mockPrisma),
      priceTier: {
        findUnique: ({ where }: any) => {
          return Promise.resolve(tiers.get(where.id) ?? null);
        },
        findFirst: ({ where }: any) => {
          for (const t of tiers.values()) {
            if (where?.isDefault && t.isDefault) return Promise.resolve(t);
            if (where?.name && t.name === where.name) return Promise.resolve(t);
          }
          return Promise.resolve(null);
        },
        findMany: () => Promise.resolve(Array.from(tiers.values())),
        count: () => Promise.resolve(tiers.size),
        create: ({ data }: any) => {
          for (const t of tiers.values()) {
            if (t.name === data.name) {
              const err = new Prisma.PrismaClientKnownRequestError(
                'Unique constraint',
                {
                  code: 'P2002',
                  clientVersion: '7.0.0',
                },
              );
              return Promise.reject(err);
            }
          }
          const newTier = {
            id: `tier-${tiers.size + 1}`,
            ...data,
            _count: { dishPrices: 0, optionPrices: 0, companies: 0 },
          };
          tiers.set(newTier.id, newTier);
          return Promise.resolve(newTier);
        },
        update: ({ where, data }: any) => {
          const existing = tiers.get(where.id);
          if (!existing) return Promise.resolve(null);
          const updated = { ...existing, ...data };
          tiers.set(where.id, updated);
          return Promise.resolve(updated);
        },
        updateMany: ({ data }: any) => {
          for (const [k, v] of tiers.entries()) {
            tiers.set(k, { ...v, ...data });
          }
          return Promise.resolve({ count: tiers.size });
        },
        delete: ({ where }: any) => {
          tiers.delete(where.id);
          return Promise.resolve();
        },
      },
      dish: {
        findUnique: ({ where }: any) =>
          Promise.resolve(dishes.get(where.id) ?? null),
        findMany: () => Promise.resolve(Array.from(dishes.values())),
        count: () => Promise.resolve(dishes.size),
      },
      dishPrice: {
        upsert: ({ where, update, create }: any) => {
          const key = `${where.tierId_dishId.tierId}:${where.tierId_dishId.dishId}`;
          const existing = dishPrices.get(key);
          const saved = existing
            ? { ...existing, ...update }
            : { id: `dp-${key}`, ...create };
          dishPrices.set(key, saved);
          return Promise.resolve(saved);
        },
        deleteMany: ({ where }: any) => {
          const key = `${where.tierId}:${where.dishId}`;
          dishPrices.delete(key);
          return Promise.resolve({ count: 1 });
        },
      },
      company: {
        count: () => Promise.resolve(0),
      },
    };

    mockResolutionService = {
      resolveDishPrice: (_dishId: string, _tierId: string) => {
        return Promise.resolve({
          status: 'RESOLVED',
          price: new Prisma.Decimal('10.00'),
          source: 'MANUAL',
          isOverridden: false,
          isDerived: false,
          missing: false,
        });
      },
    };

    service = new PricingService(
      mockPrisma as any,
      mockResolutionService as any,
    );
  });

  describe('Tier Creation & Uniqueness', () => {
    it('1. Creates a price tier successfully', async () => {
      const result = await service.createTier({
        name: 'Partner',
        derivationType: PriceDerivationType.COST_MULTIPLIER,
        multiplier: 2.4,
      });

      expect(result.name).toBe('Partner');
      expect(result.derivationType).toBe(PriceDerivationType.COST_MULTIPLIER);
    });

    it('2. Tier names are unique', async () => {
      await expect(
        service.createTier({
          name: 'Standard',
          derivationType: PriceDerivationType.MANUAL,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('3. Invalid multiplier is rejected', async () => {
      await expect(
        service.createTier({
          name: 'Bad Tier',
          derivationType: PriceDerivationType.COST_MULTIPLIER,
          multiplier: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4. Invalid percentage configuration is rejected (missing percentage or base tier)', async () => {
      await expect(
        service.createTier({
          name: 'Bad Percentage Tier',
          derivationType: PriceDerivationType.TIER_PERCENTAGE,
          baseTierId: 'tier-1',
          percentage: undefined,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createTier({
          name: 'Bad Base Tier',
          derivationType: PriceDerivationType.TIER_PERCENTAGE,
          baseTierId: undefined,
          percentage: 15,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Default Tier Management', () => {
    it('5. Setting a new default safely changes the previous default', async () => {
      const tier2 = await service.createTier({
        name: 'Enterprise',
        derivationType: PriceDerivationType.TIER_PERCENTAGE,
        baseTierId: 'tier-1',
        percentage: 15,
      });

      const updated = await service.setDefaultTier(tier2.id);
      expect(updated.isDefault).toBe(true);

      const oldTier = await service.findTierById('tier-1');
      expect(oldTier.isDefault).toBe(false);
    });
  });

  describe('Circular Dependency Protection', () => {
    it('6. Self-referencing tier is rejected', async () => {
      await expect(
        service.updateTier('tier-1', {
          derivationType: PriceDerivationType.TIER_PERCENTAGE,
          baseTierId: 'tier-1',
          percentage: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('7. Circular tier dependencies are rejected (A -> B -> A)', async () => {
      // Tier 1 is Standard
      // Tier 2 derives from Tier 1
      const tier2 = await service.createTier({
        name: 'Tier 2',
        derivationType: PriceDerivationType.TIER_PERCENTAGE,
        baseTierId: 'tier-1',
        percentage: 10,
      });

      // Attempting to make Tier 1 derive from Tier 2 forms cycle Tier 1 -> Tier 2 -> Tier 1
      await expect(
        service.updateTier('tier-1', {
          derivationType: PriceDerivationType.TIER_PERCENTAGE,
          baseTierId: tier2.id,
          percentage: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Dish Price Overrides and Bulk Updates', () => {
    it('8. Sets explicit dish price override', async () => {
      const result = await service.setDishPrice('tier-1', 'dish-1', {
        price: 12.5,
      });
      expect(result.dishId).toBe('dish-1');
    });

    it('9. Bulk updates multiple dish prices transactionally', async () => {
      const result = await service.bulkUpdateDishPrices('tier-1', {
        prices: [{ dishId: 'dish-1', price: 13.0 }],
      });
      expect(result.updatedCount).toBe(1);
      expect(result.dishPrices[0].price).toBe('13.00');
    });

    it('10. Deleting default tier is rejected', async () => {
      await expect(service.deleteTier('tier-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
