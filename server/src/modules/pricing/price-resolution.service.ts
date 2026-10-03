import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PriceDerivationType } from '../../generated/prisma/enums.js';
import {
  calculateMultiplierPrice,
  calculatePercentagePrice,
  formatMoney,
  isPositivePrice,
} from './utils/money.utils.js';
import {
  EffectivePricingContext,
  PricingSource,
  ResolvedPriceResult,
} from './types/pricing.types.js';

export interface PriceTierRecord {
  id: string;
  name: string;
  description: string | null;
  derivationType: PriceDerivationType;
  baseTierId: string | null;
  multiplier: Prisma.Decimal | null;
  percentage: Prisma.Decimal | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PriceResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the default active price tier in the system.
   */
  async getDefaultPriceTier(): Promise<PriceTierRecord> {
    const defaultTier = await this.prisma.priceTier.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
    });

    if (defaultTier) {
      return defaultTier;
    }

    // Fallback if no tier is explicitly marked default yet
    const anyActiveTier = await this.prisma.priceTier.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!anyActiveTier) {
      throw new NotFoundException(
        'No active price tier configured in the system',
      );
    }

    return anyActiveTier;
  }

  /**
   * Resolves the effective tier assigned to a company, falling back to the default tier.
   */
  async getCompanyPriceTier(companyId: string): Promise<PriceTierRecord> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { priceTier: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    if (company.priceTier && company.priceTier.isActive) {
      return company.priceTier;
    }

    return this.getDefaultPriceTier();
  }

  /**
   * Resolves the effective price tier for an employee.
   * Traversal rule: Employee -> Company -> Company's Tier (or Default Tier).
   */
  async getEffectivePriceTierForEmployee(
    employeeId: string,
  ): Promise<PriceTierRecord> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: { priceTier: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID '${employeeId}' not found`);
    }

    if (!employee.company) {
      throw new NotFoundException(
        `Employee '${employeeId}' does not belong to any company`,
      );
    }

    if (employee.company.priceTier && employee.company.priceTier.isActive) {
      return employee.company.priceTier;
    }

    return this.getDefaultPriceTier();
  }

  /**
   * Retrieves the effective pricing context summary for an employee.
   */
  async getEffectivePricingContext(
    employeeId: string,
  ): Promise<EffectivePricingContext> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: { priceTier: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID '${employeeId}' not found`);
    }

    let effectiveTier = employee.company?.priceTier;
    let isDefaultTier = false;

    if (!effectiveTier || !effectiveTier.isActive) {
      effectiveTier = await this.getDefaultPriceTier();
      isDefaultTier = true;
    } else {
      isDefaultTier = effectiveTier.isDefault;
    }

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      companyId: employee.companyId,
      companyName: employee.company.name,
      priceTierId: effectiveTier.id,
      priceTierName: effectiveTier.name,
      isDefaultTier,
    };
  }

  /**
   * Resolves the effective selling price for a dish on a specific price tier.
   * Handles overrides, cost multipliers, tier percentages, and missing prices.
   */
  async resolveDishPrice(
    dishId: string,
    priceTierId: string,
    visitedTiers = new Set<string>(),
  ): Promise<ResolvedPriceResult> {
    // 1. Circular dependency guard
    if (visitedTiers.has(priceTierId) || visitedTiers.size > 20) {
      return this.createMissingResult(priceTierId, 'Unknown');
    }

    // 2. Fetch the target tier
    const tier = await this.prisma.priceTier.findUnique({
      where: { id: priceTierId },
    });

    if (!tier || !tier.isActive) {
      return this.createMissingResult(priceTierId, tier?.name ?? 'Unknown');
    }

    // 3. Check for an explicit DishPrice override on this tier
    const explicitPrice = await this.prisma.dishPrice.findUnique({
      where: {
        tierId_dishId: {
          tierId: priceTierId,
          dishId,
        },
      },
    });

    if (explicitPrice && isPositivePrice(explicitPrice.price)) {
      const isManual = tier.derivationType === PriceDerivationType.MANUAL;
      return {
        status: 'RESOLVED',
        price: explicitPrice.price,
        source: isManual ? PricingSource.MANUAL : PricingSource.OVERRIDE,
        isOverridden: !isManual,
        isDerived: false,
        missing: false,
        tierId: tier.id,
        tierName: tier.name,
      };
    }

    // 4. If no explicit price, apply derivation rule
    if (tier.derivationType === PriceDerivationType.MANUAL) {
      // Manual tiers require explicit prices. Absence means unpriced.
      return this.createMissingResult(tier.id, tier.name);
    }

    if (tier.derivationType === PriceDerivationType.COST_MULTIPLIER) {
      if (!tier.multiplier || !isPositivePrice(tier.multiplier)) {
        return this.createMissingResult(tier.id, tier.name);
      }

      const dish = await this.prisma.dish.findUnique({
        where: { id: dishId },
        select: { costPrice: true, isActive: true },
      });

      if (!dish || !dish.isActive || !isPositivePrice(dish.costPrice)) {
        return this.createMissingResult(tier.id, tier.name);
      }

      const derivedPrice = calculateMultiplierPrice(
        dish.costPrice,
        tier.multiplier,
      );

      if (!isPositivePrice(derivedPrice)) {
        return this.createMissingResult(tier.id, tier.name);
      }

      return {
        status: 'RESOLVED',
        price: derivedPrice,
        source: PricingSource.DERIVED,
        isOverridden: false,
        isDerived: true,
        missing: false,
        tierId: tier.id,
        tierName: tier.name,
      };
    }

    if (tier.derivationType === PriceDerivationType.TIER_PERCENTAGE) {
      if (
        !tier.baseTierId ||
        tier.percentage === null ||
        tier.percentage === undefined
      ) {
        return this.createMissingResult(tier.id, tier.name);
      }

      const nextVisited = new Set(visitedTiers).add(priceTierId);
      const baseResolution = await this.resolveDishPrice(
        dishId,
        tier.baseTierId,
        nextVisited,
      );

      if (
        baseResolution.status !== 'RESOLVED' ||
        !baseResolution.price ||
        !isPositivePrice(baseResolution.price)
      ) {
        return this.createMissingResult(tier.id, tier.name);
      }

      const derivedPrice = calculatePercentagePrice(
        baseResolution.price,
        tier.percentage,
      );

      if (!isPositivePrice(derivedPrice)) {
        return this.createMissingResult(tier.id, tier.name);
      }

      return {
        status: 'RESOLVED',
        price: derivedPrice,
        source: PricingSource.DERIVED,
        isOverridden: false,
        isDerived: true,
        missing: false,
        tierId: tier.id,
        tierName: tier.name,
      };
    }

    return this.createMissingResult(tier.id, tier.name);
  }

  /**
   * Resolves the effective selling price for an option on a specific price tier.
   * Handles overrides, cost multipliers, tier percentages, and missing prices.
   */
  async resolveOptionPrice(
    optionId: string,
    priceTierId: string,
    visitedTiers = new Set<string>(),
  ): Promise<ResolvedPriceResult> {
    // 1. Circular dependency guard
    if (visitedTiers.has(priceTierId) || visitedTiers.size > 20) {
      return this.createMissingResult(priceTierId, 'Unknown');
    }

    // 2. Fetch the target tier
    const tier = await this.prisma.priceTier.findUnique({
      where: { id: priceTierId },
    });

    if (!tier || !tier.isActive) {
      return this.createMissingResult(priceTierId, tier?.name ?? 'Unknown');
    }

    // 3. Check for an explicit OptionPrice override on this tier
    const explicitPrice = await this.prisma.optionPrice.findUnique({
      where: {
        tierId_optionId: {
          tierId: priceTierId,
          optionId,
        },
      },
    });

    if (explicitPrice && isPositivePrice(explicitPrice.price)) {
      const isManual = tier.derivationType === PriceDerivationType.MANUAL;
      return {
        status: 'RESOLVED',
        price: explicitPrice.price,
        source: isManual ? PricingSource.MANUAL : PricingSource.OVERRIDE,
        isOverridden: !isManual,
        isDerived: false,
        missing: false,
        tierId: tier.id,
        tierName: tier.name,
      };
    }

    // 4. If no explicit price, apply derivation rule
    if (tier.derivationType === PriceDerivationType.MANUAL) {
      return this.createMissingResult(tier.id, tier.name);
    }

    if (tier.derivationType === PriceDerivationType.COST_MULTIPLIER) {
      if (!tier.multiplier || !isPositivePrice(tier.multiplier)) {
        return this.createMissingResult(tier.id, tier.name);
      }

      const option = await this.prisma.option.findUnique({
        where: { id: optionId },
        select: { costPrice: true, isActive: true },
      });

      if (!option || !option.isActive || !isPositivePrice(option.costPrice)) {
        return this.createMissingResult(tier.id, tier.name);
      }

      const derivedPrice = calculateMultiplierPrice(
        option.costPrice,
        tier.multiplier,
      );

      if (!isPositivePrice(derivedPrice)) {
        return this.createMissingResult(tier.id, tier.name);
      }

      return {
        status: 'RESOLVED',
        price: derivedPrice,
        source: PricingSource.DERIVED,
        isOverridden: false,
        isDerived: true,
        missing: false,
        tierId: tier.id,
        tierName: tier.name,
      };
    }

    if (tier.derivationType === PriceDerivationType.TIER_PERCENTAGE) {
      if (
        !tier.baseTierId ||
        tier.percentage === null ||
        tier.percentage === undefined
      ) {
        return this.createMissingResult(tier.id, tier.name);
      }

      const nextVisited = new Set(visitedTiers).add(priceTierId);
      const baseResolution = await this.resolveOptionPrice(
        optionId,
        tier.baseTierId,
        nextVisited,
      );

      if (
        baseResolution.status !== 'RESOLVED' ||
        !baseResolution.price ||
        !isPositivePrice(baseResolution.price)
      ) {
        return this.createMissingResult(tier.id, tier.name);
      }

      const derivedPrice = calculatePercentagePrice(
        baseResolution.price,
        tier.percentage,
      );

      if (!isPositivePrice(derivedPrice)) {
        return this.createMissingResult(tier.id, tier.name);
      }

      return {
        status: 'RESOLVED',
        price: derivedPrice,
        source: PricingSource.DERIVED,
        isOverridden: false,
        isDerived: true,
        missing: false,
        tierId: tier.id,
        tierName: tier.name,
      };
    }

    return this.createMissingResult(tier.id, tier.name);
  }

  /**
   * Resolves a dish price for an employee through their effective company tier.
   */
  async resolveEmployeeDishPrice(
    employeeId: string,
    dishId: string,
  ): Promise<ResolvedPriceResult> {
    const tier = await this.getEffectivePriceTierForEmployee(employeeId);
    return this.resolveDishPrice(dishId, tier.id);
  }

  /**
   * Resolves an option price for an employee through their effective company tier.
   */
  async resolveEmployeeOptionPrice(
    employeeId: string,
    optionId: string,
  ): Promise<ResolvedPriceResult> {
    const tier = await this.getEffectivePriceTierForEmployee(employeeId);
    return this.resolveOptionPrice(optionId, tier.id);
  }

  /**
   * Batch resolves effective prices for an array of dishes for a given employee.
   * Returns a map of dishId -> formatted price string (e.g. '12.50') or null if unpriced.
   * Used as the high-performance contract for Menu module integration.
   */
  async getEffectiveDishPrices(
    employeeId: string,
    dishIds: string[],
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    if (!dishIds || dishIds.length === 0) {
      return result;
    }

    const tier = await this.getEffectivePriceTierForEmployee(employeeId);

    // Resolve each dish price using the effective tier
    for (const dishId of dishIds) {
      const resolution = await this.resolveDishPrice(dishId, tier.id);
      if (resolution.status === 'RESOLVED' && resolution.price) {
        result.set(dishId, formatMoney(resolution.price));
      } else {
        result.set(dishId, null);
      }
    }

    return result;
  }

  /**
   * Builds a standardized MISSING_PRICE result.
   */
  private createMissingResult(
    tierId: string,
    tierName: string,
  ): ResolvedPriceResult {
    return {
      status: 'MISSING_PRICE',
      price: null,
      source: PricingSource.MISSING,
      isOverridden: false,
      isDerived: false,
      missing: true,
      tierId,
      tierName,
    };
  }
}
