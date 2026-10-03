import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PricingController } from './pricing.controller.js';
import { PricingService } from './pricing.service.js';
import { PriceResolutionService } from './price-resolution.service.js';
import { PriceDerivationType } from '../../generated/prisma/enums.js';
import { PricingSource } from './types/pricing.types.js';

describe('PricingController', () => {
  let controller: PricingController;
  let pricingService: Partial<PricingService>;
  let resolutionService: Partial<PriceResolutionService>;

  beforeEach(async () => {
    pricingService = {
      createTier: (dto: any) =>
        Promise.resolve({
          id: 'tier-1',
          name: dto.name,
          description: dto.description ?? null,
          derivationType: dto.derivationType,
          baseTierId: dto.baseTierId ?? null,
          multiplier: null,
          percentage: null,
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      findAllTiers: () =>
        Promise.resolve({
          data: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      findTierById: (id: string) =>
        Promise.resolve({
          id,
          name: 'Standard',
          description: null,
          derivationType: PriceDerivationType.MANUAL,
          baseTierId: null,
          multiplier: null,
          percentage: null,
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      updateTier: (id: string, dto: any) =>
        Promise.resolve({
          id,
          name: dto.name ?? 'Standard',
          description: null,
          derivationType: PriceDerivationType.MANUAL,
          baseTierId: null,
          multiplier: null,
          percentage: null,
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      deleteTier: (id: string) =>
        Promise.resolve({
          success: true,
          message: `Tier ${id} deleted`,
        }),
      setDefaultTier: (id: string) =>
        Promise.resolve({
          id,
          name: 'Standard',
          description: null,
          derivationType: PriceDerivationType.MANUAL,
          baseTierId: null,
          multiplier: null,
          percentage: null,
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      getTierDishes: () =>
        Promise.resolve({
          data: [],
          meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
        }),
      getTierOptions: () =>
        Promise.resolve({
          data: [],
          meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
        }),
      setDishPrice: (tierId: string, dishId: string, dto: any) =>
        Promise.resolve({
          dishId,
          name: 'Paneer Bowl',
          sku: 'DISH-PNR-001',
          costPrice: '4.50',
          price: dto.price.toFixed(2),
          source: PricingSource.OVERRIDE,
          overridden: true,
          derived: false,
          missing: false,
        }),
      removeDishPrice: (tierId: string, dishId: string) =>
        Promise.resolve({
          dishId,
          name: 'Paneer Bowl',
          sku: 'DISH-PNR-001',
          costPrice: '4.50',
          price: '11.50',
          source: PricingSource.DERIVED,
          overridden: false,
          derived: true,
          missing: false,
        }),
      bulkUpdateDishPrices: (tierId: string, dto: any) =>
        Promise.resolve({
          tierId,
          updatedCount: dto.prices.length,
          dishPrices: dto.prices.map((p: any) => ({
            dishId: p.dishId,
            price: p.price.toFixed(2),
          })),
        }),
    };

    resolutionService = {
      resolveEmployeeDishPrice: (_empId: string, _dishId: string) =>
        Promise.resolve({
          status: 'RESOLVED',
          price: null,
          source: PricingSource.MANUAL,
          isOverridden: false,
          isDerived: false,
          missing: false,
          tierId: 'tier-1',
          tierName: 'Standard',
        }),
      resolveEmployeeOptionPrice: (_empId: string, _optionId: string) =>
        Promise.resolve({
          status: 'RESOLVED',
          price: null,
          source: PricingSource.MANUAL,
          isOverridden: false,
          isDerived: false,
          missing: false,
          tierId: 'tier-1',
          tierName: 'Standard',
        }),
      getEffectivePricingContext: (empId: string) =>
        Promise.resolve({
          employeeId: empId,
          employeeName: 'Alice',
          companyId: 'comp-1',
          companyName: 'Acme',
          priceTierId: 'tier-1',
          priceTierName: 'Standard',
          isDefaultTier: true,
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricingController],
      providers: [
        { provide: PricingService, useValue: pricingService },
        { provide: PriceResolutionService, useValue: resolutionService },
      ],
    }).compile();

    controller = module.get<PricingController>(PricingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates createTier to service', async () => {
    const result = await controller.createTier({
      name: 'Standard',
      derivationType: PriceDerivationType.MANUAL,
    });
    expect(result.name).toBe('Standard');
  });

  it('delegates findTierById to service', async () => {
    const result = await controller.findTierById('tier-1');
    expect(result.id).toBe('tier-1');
  });

  it('delegates setDefaultTier to service', async () => {
    const result = await controller.setDefaultTier('tier-1');
    expect(result.isDefault).toBe(true);
  });

  it('delegates setDishPrice to service', async () => {
    const result = await controller.setDishPrice('tier-1', 'dish-1', {
      price: 12.5,
    });
    expect(result.price).toBe('12.50');
  });

  it('delegates removeDishPrice to service', async () => {
    const result = await controller.removeDishPrice('tier-1', 'dish-1');
    expect(result.source).toBe(PricingSource.DERIVED);
  });

  it('delegates resolveEmployeeDishPrice to resolution service', async () => {
    const result = await controller.resolveEmployeeDishPrice('emp-1', 'dish-1');
    expect(result.status).toBe('RESOLVED');
  });
});
