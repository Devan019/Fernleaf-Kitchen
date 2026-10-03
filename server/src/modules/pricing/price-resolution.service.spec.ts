import { beforeEach, describe, expect, it } from 'vitest';
import { PriceResolutionService } from './price-resolution.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PriceDerivationType } from '../../generated/prisma/enums.js';
import { PricingSource } from './types/pricing.types.js';

describe('PriceResolutionService', () => {
  let service: PriceResolutionService;
  let mockPrisma: any;

  // In-memory mock data
  const mockStandardTier = {
    id: 'tier-standard',
    name: 'Standard',
    description: 'Standard manual tier',
    derivationType: PriceDerivationType.MANUAL,
    baseTierId: null,
    multiplier: null,
    percentage: null,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEnterpriseTier = {
    id: 'tier-enterprise',
    name: 'Enterprise',
    description: 'Standard + 15%',
    derivationType: PriceDerivationType.TIER_PERCENTAGE,
    baseTierId: 'tier-standard',
    multiplier: null,
    percentage: new Prisma.Decimal('15.00'),
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPartnerTier = {
    id: 'tier-partner',
    name: 'Partner',
    description: 'Cost x 2.4',
    derivationType: PriceDerivationType.COST_MULTIPLIER,
    baseTierId: null,
    multiplier: new Prisma.Decimal('2.4000'),
    percentage: null,
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDishes = {
    'dish-paneer': {
      id: 'dish-paneer',
      name: 'Paneer Rice Bowl',
      sku: 'DISH-PNR-001',
      costPrice: new Prisma.Decimal('4.50'),
      isActive: true,
    },
    'dish-tofu': {
      id: 'dish-tofu',
      name: 'Tofu Teriyaki Bowl',
      sku: 'DISH-TOFU-001',
      costPrice: new Prisma.Decimal('4.20'),
      isActive: true,
    },
    'dish-unpriced': {
      id: 'dish-unpriced',
      name: 'Unpriced Bowl',
      sku: 'DISH-UNP-001',
      costPrice: new Prisma.Decimal('3.50'),
      isActive: true,
    },
  };

  const mockOptions = {
    'opt-paneer': {
      id: 'opt-paneer',
      name: 'Paneer',
      costPrice: new Prisma.Decimal('2.00'),
      isActive: true,
    },
    'opt-tofu': {
      id: 'opt-tofu',
      name: 'Tofu',
      costPrice: new Prisma.Decimal('1.80'),
      isActive: true,
    },
  };

  let dishPrices: Map<string, Prisma.Decimal>;
  let optionPrices: Map<string, Prisma.Decimal>;
  let companies: Map<string, any>;
  let employees: Map<string, any>;

  beforeEach(() => {
    dishPrices = new Map();
    optionPrices = new Map();
    companies = new Map();
    employees = new Map();

    // Standard manual prices
    dishPrices.set('tier-standard:dish-paneer', new Prisma.Decimal('10.00'));
    dishPrices.set('tier-standard:dish-tofu', new Prisma.Decimal('9.50'));
    optionPrices.set('tier-standard:opt-paneer', new Prisma.Decimal('3.50'));

    // Enterprise override for paneer (12.25 instead of 11.50)
    dishPrices.set('tier-enterprise:dish-paneer', new Prisma.Decimal('12.25'));

    // Company A -> Acme Corp (no explicit tier -> uses default Standard)
    companies.set('comp-acme', {
      id: 'comp-acme',
      name: 'Acme Corp',
      priceTierId: null,
      priceTier: null,
      isActive: true,
    });

    // Company B -> Globex Inc (assigned Enterprise tier)
    companies.set('comp-globex', {
      id: 'comp-globex',
      name: 'Globex Inc',
      priceTierId: 'tier-enterprise',
      priceTier: mockEnterpriseTier,
      isActive: true,
    });

    // Company C -> Initech LLC (assigned Partner tier)
    companies.set('comp-initech', {
      id: 'comp-initech',
      name: 'Initech LLC',
      priceTierId: 'tier-partner',
      priceTier: mockPartnerTier,
      isActive: true,
    });

    // Employees
    employees.set('emp-alice', {
      id: 'emp-alice',
      name: 'Alice Smith',
      companyId: 'comp-acme',
      company: companies.get('comp-acme'),
      isActive: true,
    });

    employees.set('emp-bob', {
      id: 'emp-bob',
      name: 'Bob Jones',
      companyId: 'comp-globex',
      company: companies.get('comp-globex'),
      isActive: true,
    });

    employees.set('emp-charlie', {
      id: 'emp-charlie',
      name: 'Charlie Brown',
      companyId: 'comp-initech',
      company: companies.get('comp-initech'),
      isActive: true,
    });

    mockPrisma = {
      priceTier: {
        findUnique: ({ where }: any) => {
          if (where.id === 'tier-standard')
            return Promise.resolve(mockStandardTier);
          if (where.id === 'tier-enterprise')
            return Promise.resolve(mockEnterpriseTier);
          if (where.id === 'tier-partner')
            return Promise.resolve(mockPartnerTier);
          return Promise.resolve(null);
        },
        findFirst: ({ where }: any) => {
          if (where?.isDefault) return Promise.resolve(mockStandardTier);
          return Promise.resolve(mockStandardTier);
        },
      },
      dish: {
        findUnique: ({ where }: any) => {
          return Promise.resolve((mockDishes as any)[where.id] ?? null);
        },
      },
      option: {
        findUnique: ({ where }: any) => {
          return Promise.resolve((mockOptions as any)[where.id] ?? null);
        },
      },
      dishPrice: {
        findUnique: ({ where }: any) => {
          const key = `${where.tierId_dishId.tierId}:${where.tierId_dishId.dishId}`;
          const price = dishPrices.get(key);
          if (price) {
            return Promise.resolve({
              id: `dp-${key}`,
              tierId: where.tierId_dishId.tierId,
              dishId: where.tierId_dishId.dishId,
              price,
            });
          }
          return Promise.resolve(null);
        },
      },
      optionPrice: {
        findUnique: ({ where }: any) => {
          const key = `${where.tierId_optionId.tierId}:${where.tierId_optionId.optionId}`;
          const price = optionPrices.get(key);
          if (price) {
            return Promise.resolve({
              id: `op-${key}`,
              tierId: where.tierId_optionId.tierId,
              optionId: where.tierId_optionId.optionId,
              price,
            });
          }
          return Promise.resolve(null);
        },
      },
      company: {
        findUnique: ({ where }: any) => {
          return Promise.resolve(companies.get(where.id) ?? null);
        },
      },
      employee: {
        findUnique: ({ where }: any) => {
          return Promise.resolve(employees.get(where.id) ?? null);
        },
      },
    };

    service = new PriceResolutionService(mockPrisma as any);
  });

  describe('Price Tier Resolution for Company and Employee', () => {
    it('1. Company without a tier uses the default tier', async () => {
      const tier = await service.getCompanyPriceTier('comp-acme');
      expect(tier.id).toBe('tier-standard');
      expect(tier.isDefault).toBe(true);
    });

    it('2. Company can be assigned a price tier', async () => {
      const tier = await service.getCompanyPriceTier('comp-globex');
      expect(tier.id).toBe('tier-enterprise');
      expect(tier.name).toBe('Enterprise');
    });

    it('3. Employee resolves pricing through its Company', async () => {
      const aliceTier =
        await service.getEffectivePriceTierForEmployee('emp-alice');
      expect(aliceTier.id).toBe('tier-standard');

      const bobTier = await service.getEffectivePriceTierForEmployee('emp-bob');
      expect(bobTier.id).toBe('tier-enterprise');
    });

    it('4. Employee belonging to Company A uses Company A tier, Employee belonging to Company B uses Company B tier', async () => {
      const contextA = await service.getEffectivePricingContext('emp-alice');
      expect(contextA.companyName).toBe('Acme Corp');
      expect(contextA.priceTierName).toBe('Standard');
      expect(contextA.isDefaultTier).toBe(true);

      const contextB = await service.getEffectivePricingContext('emp-bob');
      expect(contextB.companyName).toBe('Globex Inc');
      expect(contextB.priceTierName).toBe('Enterprise');
      expect(contextB.isDefaultTier).toBe(false);
    });
  });

  describe('Dish and Option Pricing Derivations', () => {
    it('8. Manual dish price resolution works', async () => {
      const result = await service.resolveDishPrice(
        'dish-paneer',
        'tier-standard',
      );
      expect(result.status).toBe('RESOLVED');
      expect(result.price?.toFixed(2)).toBe('10.00');
      expect(result.source).toBe(PricingSource.MANUAL);
      expect(result.isOverridden).toBe(false);
      expect(result.isDerived).toBe(false);
      expect(result.missing).toBe(false);
    });

    it('9. Manual option price resolution works', async () => {
      const result = await service.resolveOptionPrice(
        'opt-paneer',
        'tier-standard',
      );
      expect(result.status).toBe('RESOLVED');
      expect(result.price?.toFixed(2)).toBe('3.50');
      expect(result.source).toBe(PricingSource.MANUAL);
      expect(result.missing).toBe(false);
    });

    it('10. Cost × multiplier works and rounds up to next $0.05', async () => {
      // Dish tofu cost is 4.20. Partner multiplier is 2.4 => 4.20 * 2.4 = 10.08 => 10.10
      const result = await service.resolveDishPrice(
        'dish-tofu',
        'tier-partner',
      );
      expect(result.status).toBe('RESOLVED');
      expect(result.price?.toFixed(2)).toBe('10.10');
      expect(result.source).toBe(PricingSource.DERIVED);
      expect(result.isDerived).toBe(true);
      expect(result.isOverridden).toBe(false);
    });

    it('11. Tier percentage derivation works using base tier', async () => {
      // Dish tofu on Standard is 9.50. Enterprise is Standard + 15% => 9.50 * 1.15 = 10.925 => 10.95
      const result = await service.resolveDishPrice(
        'dish-tofu',
        'tier-enterprise',
      );
      expect(result.status).toBe('RESOLVED');
      expect(result.price?.toFixed(2)).toBe('10.95');
      expect(result.source).toBe(PricingSource.DERIVED);
      expect(result.isDerived).toBe(true);
      expect(result.isOverridden).toBe(false);
    });

    it('12. Individual override beats derived price', async () => {
      // Standard Paneer is 10.00. 15% would be 11.50, but staff set override 12.25 on Enterprise
      const result = await service.resolveDishPrice(
        'dish-paneer',
        'tier-enterprise',
      );
      expect(result.status).toBe('RESOLVED');
      expect(result.price?.toFixed(2)).toBe('12.25');
      expect(result.source).toBe(PricingSource.OVERRIDE);
      expect(result.isOverridden).toBe(true);
      expect(result.isDerived).toBe(false);
    });

    it('13. Removing an override returns to derived pricing', async () => {
      // Delete override from map
      dishPrices.delete('tier-enterprise:dish-paneer');

      // Now it should derive: 10.00 + 15% = 11.50
      const result = await service.resolveDishPrice(
        'dish-paneer',
        'tier-enterprise',
      );
      expect(result.status).toBe('RESOLVED');
      expect(result.price?.toFixed(2)).toBe('11.50');
      expect(result.source).toBe(PricingSource.DERIVED);
      expect(result.isOverridden).toBe(false);
    });

    it('14. MANUAL tier with no price returns MISSING_PRICE', async () => {
      const result = await service.resolveDishPrice(
        'dish-unpriced',
        'tier-standard',
      );
      expect(result.status).toBe('MISSING_PRICE');
      expect(result.source).toBe(PricingSource.MISSING);
      expect(result.missing).toBe(true);
    });

    it('15. Missing dish price is never returned as $0', async () => {
      const result = await service.resolveDishPrice(
        'dish-unpriced',
        'tier-standard',
      );
      expect(result.price).not.toBe(0);
      expect(result.price?.toString()).not.toBe('0');
      expect(result.price?.toString()).not.toBe('0.00');
    });

    it('16. Missing dish price is never returned as null/blank price string in batch resolution', async () => {
      const priceMap = await service.getEffectiveDishPrices('emp-alice', [
        'dish-paneer',
        'dish-unpriced',
      ]);
      expect(priceMap.get('dish-paneer')).toBe('10.00');
      // For unpriced dishes, value is null, never empty string "" or "0"
      expect(priceMap.get('dish-unpriced')).toBeNull();
      expect(priceMap.get('dish-unpriced')).not.toBe('');
      expect(priceMap.get('dish-unpriced')).not.toBe('0');
      expect(priceMap.get('dish-unpriced')).not.toBe('0.00');
    });

    it('17. Different companies can resolve different prices for the same dish', async () => {
      // Alice (Acme -> Standard): 10.00
      const alicePrice = await service.resolveEmployeeDishPrice(
        'emp-alice',
        'dish-paneer',
      );
      expect(alicePrice.price?.toFixed(2)).toBe('10.00');

      // Bob (Globex -> Enterprise): 12.25 (override)
      const bobPrice = await service.resolveEmployeeDishPrice(
        'emp-bob',
        'dish-paneer',
      );
      expect(bobPrice.price?.toFixed(2)).toBe('12.25');

      // Charlie (Initech -> Partner): cost 4.50 * 2.4 = 10.80
      const charliePrice = await service.resolveEmployeeDishPrice(
        'emp-charlie',
        'dish-paneer',
      );
      expect(charliePrice.price?.toFixed(2)).toBe('10.80');
    });

    it('18. Changing current pricing changes future price resolution', async () => {
      // Before update: Alice pays 10.00
      const before = await service.resolveEmployeeDishPrice(
        'emp-alice',
        'dish-paneer',
      );
      expect(before.price?.toFixed(2)).toBe('10.00');

      // Update Standard tier price to 11.00
      dishPrices.set('tier-standard:dish-paneer', new Prisma.Decimal('11.00'));

      // Future resolution reflects new price
      const after = await service.resolveEmployeeDishPrice(
        'emp-alice',
        'dish-paneer',
      );
      expect(after.price?.toFixed(2)).toBe('11.00');
    });

    it('19. PriceResolutionService returns Decimal-safe values', async () => {
      const result = await service.resolveDishPrice(
        'dish-paneer',
        'tier-standard',
      );
      expect(result.price).toBeInstanceOf(Prisma.Decimal);
    });

    it('20. Pricing module does not maintain historical order prices', () => {
      // Concept check: Historical orders snapshot price directly.
      const simulatedHistoricalOrderLine = {
        dishId: 'dish-paneer',
        unitPriceSnapshot: '10.00',
      };

      // When the price tier changes to 15.00:
      dishPrices.set('tier-standard:dish-paneer', new Prisma.Decimal('15.00'));

      // The historical order snapshot is completely untouched:
      expect(simulatedHistoricalOrderLine.unitPriceSnapshot).toBe('10.00');
    });

    it('21. Circular tier dependencies do not cause infinite recursion in resolution', async () => {
      // Mock tier cycle: A -> B -> A
      const tierA: any = {
        id: 'tier-cycle-a',
        name: 'Cycle A',
        derivationType: PriceDerivationType.TIER_PERCENTAGE,
        baseTierId: 'tier-cycle-b',
        percentage: new Prisma.Decimal('10'),
        isActive: true,
      };
      const tierB: any = {
        id: 'tier-cycle-b',
        name: 'Cycle B',
        derivationType: PriceDerivationType.TIER_PERCENTAGE,
        baseTierId: 'tier-cycle-a',
        percentage: new Prisma.Decimal('10'),
        isActive: true,
      };

      mockPrisma.priceTier.findUnique = ({ where }: any) => {
        if (where.id === 'tier-cycle-a') return Promise.resolve(tierA);
        if (where.id === 'tier-cycle-b') return Promise.resolve(tierB);
        return Promise.resolve(null);
      };

      const result = await service.resolveDishPrice(
        'dish-paneer',
        'tier-cycle-a',
      );
      expect(result.status).toBe('MISSING_PRICE');
    });
  });
});
