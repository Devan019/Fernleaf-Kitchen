import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PriceDerivationType } from '../../generated/prisma/enums.js';
import {
  calculatePagination,
  createPaginatedResponse,
} from '../../common/utils/pagination/pagination.js';
import { isPrismaError } from '../../common/utils/prisma/prisma-error.js';
import { formatMoney, toDecimal } from './utils/money.utils.js';
import {
  BulkUpdateTierPricesDto,
  CreatePriceTierDto,
  SetDishPriceDto,
  SetOptionPriceDto,
  TierDishesQueryDto,
  TierQueryDto,
  UpdatePriceTierDto,
} from './dto/index.js';
import {
  BulkUpdateTierPricesResult,
  PaginatedPriceTiersResponse,
  PaginatedTierDishesResponse,
  PaginatedTierOptionsResponse,
  PriceTierResponse,
  ResolvedPriceResult,
  TierDishPriceItem,
  TierOptionPriceItem,
} from './types/pricing.types.js';
import { PriceResolutionService } from './price-resolution.service.js';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolutionService: PriceResolutionService,
  ) {}

  /**
   * Resolves effective selling prices for dishes for a given employee in batch.
   * Primary pricing integration contract for MenuModule.
   */
  async getEffectiveDishPrices(
    employeeId: string,
    dishIds: string[],
  ): Promise<Map<string, string | null>> {
    return this.resolutionService.getEffectiveDishPrices(employeeId, dishIds);
  }

  /**
   * Resolves a dish price for an employee through their effective company tier.
   */
  async resolveEmployeeDishPrice(
    employeeId: string,
    dishId: string,
  ): Promise<ResolvedPriceResult> {
    return this.resolutionService.resolveEmployeeDishPrice(employeeId, dishId);
  }

  /**
   * Resolves an option price for an employee through their effective company tier.
   */
  async resolveEmployeeOptionPrice(
    employeeId: string,
    optionId: string,
  ): Promise<ResolvedPriceResult> {
    return this.resolutionService.resolveEmployeeOptionPrice(
      employeeId,
      optionId,
    );
  }

  /**
   * Creates a new price tier with validations for derivation logic and cycle detection.
   */
  async createTier(dto: CreatePriceTierDto): Promise<PriceTierResponse> {
    // 1. Validation for tier derivation types
    await this.validateDerivationConfiguration(
      null,
      dto.derivationType,
      dto.baseTierId,
      dto.multiplier,
      dto.percentage,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // If this tier is marked as default, unset any existing default
          if (dto.isDefault) {
            await tx.priceTier.updateMany({
              where: { isDefault: true },
              data: { isDefault: false },
            });
          }

          const tier = await tx.priceTier.create({
            data: {
              name: dto.name,
              description: dto.description,
              derivationType: dto.derivationType,
              baseTierId:
                dto.derivationType === PriceDerivationType.TIER_PERCENTAGE
                  ? dto.baseTierId
                  : null,
              multiplier:
                dto.derivationType === PriceDerivationType.COST_MULTIPLIER &&
                dto.multiplier !== undefined
                  ? new Prisma.Decimal(dto.multiplier)
                  : null,
              percentage:
                dto.derivationType === PriceDerivationType.TIER_PERCENTAGE &&
                dto.percentage !== undefined
                  ? new Prisma.Decimal(dto.percentage)
                  : null,
              isDefault: dto.isDefault ?? false,
              isActive: dto.isActive ?? true,
            },
            include: {
              baseTier: { select: { name: true } },
              _count: {
                select: {
                  dishPrices: true,
                  optionPrices: true,
                  companies: true,
                },
              },
            },
          });

          return this.mapTierToResponse(tier);
        },
        { timeout: 15000, maxWait: 10000 },
      );
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Price tier with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Retrieves a paginated list of price tiers.
   */
  async findAllTiers(
    query: TierQueryDto,
  ): Promise<PaginatedPriceTiersResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.PriceTierWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.derivationType ? { derivationType: query.derivationType } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [tiers, total] = await Promise.all([
      this.prisma.priceTier.findMany({
        where,
        skip,
        take,
        include: {
          baseTier: { select: { name: true } },
          _count: {
            select: {
              dishPrices: true,
              optionPrices: true,
              companies: true,
            },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.priceTier.count({ where }),
    ]);

    const mapped = tiers.map((tier) => this.mapTierToResponse(tier));
    return createPaginatedResponse(mapped, total, safePage, safeLimit);
  }

  /**
   * Retrieves a single price tier by ID.
   */
  async findTierById(id: string): Promise<PriceTierResponse> {
    const tier = await this.prisma.priceTier.findUnique({
      where: { id },
      include: {
        baseTier: { select: { name: true } },
        _count: {
          select: {
            dishPrices: true,
            optionPrices: true,
            companies: true,
          },
        },
      },
    });

    if (!tier) {
      throw new NotFoundException(`Price tier with ID '${id}' not found`);
    }

    return this.mapTierToResponse(tier);
  }

  /**
   * Updates an existing price tier.
   */
  async updateTier(
    id: string,
    dto: UpdatePriceTierDto,
  ): Promise<PriceTierResponse> {
    const existing = await this.prisma.priceTier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Price tier with ID '${id}' not found`);
    }

    const effectiveDerivationType =
      dto.derivationType ?? existing.derivationType;
    const effectiveBaseTierId =
      dto.baseTierId !== undefined ? dto.baseTierId : existing.baseTierId;
    const effectiveMultiplier =
      dto.multiplier !== undefined
        ? dto.multiplier
        : existing.multiplier
          ? Number(existing.multiplier)
          : undefined;
    const effectivePercentage =
      dto.percentage !== undefined
        ? dto.percentage
        : existing.percentage
          ? Number(existing.percentage)
          : undefined;

    // Validate derivation configuration and check for circular hierarchy
    await this.validateDerivationConfiguration(
      id,
      effectiveDerivationType,
      effectiveBaseTierId,
      effectiveMultiplier,
      effectivePercentage,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.priceTier.updateMany({
            where: { isDefault: true, id: { not: id } },
            data: { isDefault: false },
          });
        }

        const updated = await tx.priceTier.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.description !== undefined
              ? { description: dto.description }
              : {}),
            ...(dto.derivationType !== undefined
              ? { derivationType: dto.derivationType }
              : {}),
            ...(dto.baseTierId !== undefined
              ? {
                  baseTierId:
                    effectiveDerivationType ===
                    PriceDerivationType.TIER_PERCENTAGE
                      ? dto.baseTierId
                      : null,
                }
              : {}),
            ...(dto.multiplier !== undefined
              ? {
                  multiplier:
                    effectiveDerivationType ===
                      PriceDerivationType.COST_MULTIPLIER &&
                    dto.multiplier !== null
                      ? new Prisma.Decimal(dto.multiplier)
                      : null,
                }
              : {}),
            ...(dto.percentage !== undefined
              ? {
                  percentage:
                    effectiveDerivationType ===
                      PriceDerivationType.TIER_PERCENTAGE &&
                    dto.percentage !== null
                      ? new Prisma.Decimal(dto.percentage)
                      : null,
                }
              : {}),
            ...(dto.isDefault !== undefined
              ? { isDefault: dto.isDefault }
              : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
          include: {
            baseTier: { select: { name: true } },
            _count: {
              select: {
                dishPrices: true,
                optionPrices: true,
                companies: true,
              },
            },
          },
        });

        return this.mapTierToResponse(updated);
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Price tier with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Deletes a price tier safely.
   */
  async deleteTier(id: string): Promise<{ success: boolean; message: string }> {
    const tier = await this.prisma.priceTier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            derivedTiers: true,
            companies: true,
          },
        },
      },
    });

    if (!tier) {
      throw new NotFoundException(`Price tier with ID '${id}' not found`);
    }

    if (tier.isDefault) {
      throw new BadRequestException(
        'Cannot delete the default price tier. Please assign another tier as default first.',
      );
    }

    if (tier._count.derivedTiers > 0) {
      throw new BadRequestException(
        'Cannot delete price tier because other tiers derive their prices from it.',
      );
    }

    if (tier._count.companies > 0) {
      throw new BadRequestException(
        'Cannot delete price tier because customer companies are currently assigned to it.',
      );
    }

    await this.prisma.priceTier.delete({ where: { id } });
    return {
      success: true,
      message: `Price tier '${tier.name}' deleted successfully`,
    };
  }

  /**
   * Designates a tier as the system default in an atomic transaction.
   */
  async setDefaultTier(id: string): Promise<PriceTierResponse> {
    const tier = await this.prisma.priceTier.findUnique({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`Price tier with ID '${id}' not found`);
    }

    if (!tier.isActive) {
      throw new BadRequestException(
        'Cannot set an inactive price tier as the system default.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.priceTier.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      return tx.priceTier.update({
        where: { id },
        data: { isDefault: true },
        include: {
          baseTier: { select: { name: true } },
          _count: {
            select: {
              dishPrices: true,
              optionPrices: true,
              companies: true,
            },
          },
        },
      });
    });

    return this.mapTierToResponse(updated);
  }

  /**
   * Inspects all dishes on a tier with resolved selling prices, sources, and missing statuses.
   * Paginated on the server and optimized without N+1 queries.
   */
  async getTierDishes(
    tierId: string,
    query: TierDishesQueryDto,
  ): Promise<PaginatedTierDishesResponse> {
    await this.ensureTierExists(tierId);

    const where: Prisma.DishWhereInput = {
      isActive: true,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (query.missingOnly) {
      // Load all candidate dishes, resolve, filter missing, then paginate
      const allDishes = await this.prisma.dish.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          costPrice: true,
        },
      });

      const missingItems: TierDishPriceItem[] = [];
      for (const dish of allDishes) {
        const resolved = await this.resolutionService.resolveDishPrice(
          dish.id,
          tierId,
        );
        if (resolved.missing) {
          missingItems.push({
            dishId: dish.id,
            name: dish.name,
            sku: dish.sku,
            costPrice: formatMoney(dish.costPrice) ?? '0.00',
            price: null,
            source: resolved.source,
            overridden: resolved.isOverridden,
            derived: resolved.isDerived,
            missing: true,
          });
        }
      }

      const { skip, take, safePage, safeLimit } = calculatePagination(
        query.page,
        query.limit,
      );
      const paginatedData = missingItems.slice(skip, skip + take);
      return createPaginatedResponse(
        paginatedData,
        missingItems.length,
        safePage,
        safeLimit,
      );
    }

    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const [dishes, total] = await Promise.all([
      this.prisma.dish.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          costPrice: true,
        },
      }),
      this.prisma.dish.count({ where }),
    ]);

    const items: TierDishPriceItem[] = [];
    for (const dish of dishes) {
      const resolved = await this.resolutionService.resolveDishPrice(
        dish.id,
        tierId,
      );
      items.push({
        dishId: dish.id,
        name: dish.name,
        sku: dish.sku,
        costPrice: formatMoney(dish.costPrice) ?? '0.00',
        price: resolved.price ? formatMoney(resolved.price) : null,
        source: resolved.source,
        overridden: resolved.isOverridden,
        derived: resolved.isDerived,
        missing: resolved.missing,
      });
    }

    return createPaginatedResponse(items, total, safePage, safeLimit);
  }

  /**
   * Inspects all options on a tier with resolved selling prices, sources, and missing statuses.
   * Paginated on the server and optimized without N+1 queries.
   */
  async getTierOptions(
    tierId: string,
    query: TierDishesQueryDto,
  ): Promise<PaginatedTierOptionsResponse> {
    await this.ensureTierExists(tierId);

    const where: Prisma.OptionWhereInput = {
      isActive: true,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    if (query.missingOnly) {
      const allOptions = await this.prisma.option.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          costPrice: true,
        },
      });

      const missingItems: TierOptionPriceItem[] = [];
      for (const opt of allOptions) {
        const resolved = await this.resolutionService.resolveOptionPrice(
          opt.id,
          tierId,
        );
        if (resolved.missing) {
          missingItems.push({
            optionId: opt.id,
            name: opt.name,
            costPrice: formatMoney(opt.costPrice) ?? '0.00',
            price: null,
            source: resolved.source,
            overridden: resolved.isOverridden,
            derived: resolved.isDerived,
            missing: true,
          });
        }
      }

      const { skip, take, safePage, safeLimit } = calculatePagination(
        query.page,
        query.limit,
      );
      const paginatedData = missingItems.slice(skip, skip + take);
      return createPaginatedResponse(
        paginatedData,
        missingItems.length,
        safePage,
        safeLimit,
      );
    }

    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const [options, total] = await Promise.all([
      this.prisma.option.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          costPrice: true,
        },
      }),
      this.prisma.option.count({ where }),
    ]);

    const items: TierOptionPriceItem[] = [];
    for (const opt of options) {
      const resolved = await this.resolutionService.resolveOptionPrice(
        opt.id,
        tierId,
      );
      items.push({
        optionId: opt.id,
        name: opt.name,
        costPrice: formatMoney(opt.costPrice) ?? '0.00',
        price: resolved.price ? formatMoney(resolved.price) : null,
        source: resolved.source,
        overridden: resolved.isOverridden,
        derived: resolved.isDerived,
        missing: resolved.missing,
      });
    }

    return createPaginatedResponse(items, total, safePage, safeLimit);
  }

  /**
   * Sets or overrides a dish price on a tier.
   */
  async setDishPrice(
    tierId: string,
    dishId: string,
    dto: SetDishPriceDto,
  ): Promise<TierDishPriceItem> {
    await this.ensureTierExists(tierId);

    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true, name: true, sku: true, costPrice: true },
    });

    if (!dish) {
      throw new NotFoundException(`Dish with ID '${dishId}' not found`);
    }

    const priceDec = toDecimal(dto.price.toFixed(2));

    await this.prisma.dishPrice.upsert({
      where: {
        tierId_dishId: {
          tierId,
          dishId,
        },
      },
      update: { price: priceDec },
      create: {
        tierId,
        dishId,
        price: priceDec,
      },
    });

    const resolved = await this.resolutionService.resolveDishPrice(
      dishId,
      tierId,
    );

    return {
      dishId: dish.id,
      name: dish.name,
      sku: dish.sku,
      costPrice: formatMoney(dish.costPrice) ?? '0.00',
      price: resolved.price ? formatMoney(resolved.price) : null,
      source: resolved.source,
      overridden: resolved.isOverridden,
      derived: resolved.isDerived,
      missing: resolved.missing,
    };
  }

  /**
   * Removes an explicit dish price override from a tier.
   * If derived, returns to derived pricing. If manual, becomes missing.
   */
  async removeDishPrice(
    tierId: string,
    dishId: string,
  ): Promise<TierDishPriceItem> {
    await this.ensureTierExists(tierId);

    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true, name: true, sku: true, costPrice: true },
    });

    if (!dish) {
      throw new NotFoundException(`Dish with ID '${dishId}' not found`);
    }

    await this.prisma.dishPrice.deleteMany({
      where: { tierId, dishId },
    });

    const resolved = await this.resolutionService.resolveDishPrice(
      dishId,
      tierId,
    );

    return {
      dishId: dish.id,
      name: dish.name,
      sku: dish.sku,
      costPrice: formatMoney(dish.costPrice) ?? '0.00',
      price: resolved.price ? formatMoney(resolved.price) : null,
      source: resolved.source,
      overridden: resolved.isOverridden,
      derived: resolved.isDerived,
      missing: resolved.missing,
    };
  }

  /**
   * Sets or overrides an option price on a tier.
   */
  async setOptionPrice(
    tierId: string,
    optionId: string,
    dto: SetOptionPriceDto,
  ): Promise<TierOptionPriceItem> {
    await this.ensureTierExists(tierId);

    const option = await this.prisma.option.findUnique({
      where: { id: optionId },
      select: { id: true, name: true, costPrice: true },
    });

    if (!option) {
      throw new NotFoundException(`Option with ID '${optionId}' not found`);
    }

    const priceDec = toDecimal(dto.price.toFixed(2));

    await this.prisma.optionPrice.upsert({
      where: {
        tierId_optionId: {
          tierId,
          optionId,
        },
      },
      update: { price: priceDec },
      create: {
        tierId,
        optionId,
        price: priceDec,
      },
    });

    const resolved = await this.resolutionService.resolveOptionPrice(
      optionId,
      tierId,
    );

    return {
      optionId: option.id,
      name: option.name,
      costPrice: formatMoney(option.costPrice) ?? '0.00',
      price: resolved.price ? formatMoney(resolved.price) : null,
      source: resolved.source,
      overridden: resolved.isOverridden,
      derived: resolved.isDerived,
      missing: resolved.missing,
    };
  }

  /**
   * Removes an explicit option price override from a tier.
   */
  async removeOptionPrice(
    tierId: string,
    optionId: string,
  ): Promise<TierOptionPriceItem> {
    await this.ensureTierExists(tierId);

    const option = await this.prisma.option.findUnique({
      where: { id: optionId },
      select: { id: true, name: true, costPrice: true },
    });

    if (!option) {
      throw new NotFoundException(`Option with ID '${optionId}' not found`);
    }

    await this.prisma.optionPrice.deleteMany({
      where: { tierId, optionId },
    });

    const resolved = await this.resolutionService.resolveOptionPrice(
      optionId,
      tierId,
    );

    return {
      optionId: option.id,
      name: option.name,
      costPrice: formatMoney(option.costPrice) ?? '0.00',
      price: resolved.price ? formatMoney(resolved.price) : null,
      source: resolved.source,
      overridden: resolved.isOverridden,
      derived: resolved.isDerived,
      missing: resolved.missing,
    };
  }

  /**
   * Bulk updates dish prices on a tier in an atomic database transaction.
   */
  async bulkUpdateDishPrices(
    tierId: string,
    dto: BulkUpdateTierPricesDto,
  ): Promise<BulkUpdateTierPricesResult> {
    await this.ensureTierExists(tierId);

    // Validate that all dishes exist
    const dishIds = dto.prices.map((p) => p.dishId);
    const existingDishes = await this.prisma.dish.findMany({
      where: { id: { in: dishIds } },
      select: { id: true },
    });

    const existingDishIdSet = new Set(existingDishes.map((d) => d.id));
    const missingDishIds = dishIds.filter((id) => !existingDishIdSet.has(id));

    if (missingDishIds.length > 0) {
      throw new NotFoundException(
        `Dishes not found: ${missingDishIds.join(', ')}`,
      );
    }

    const appliedPrices = await this.prisma.$transaction(async (tx) => {
      const results: Array<{ dishId: string; price: string }> = [];

      for (const item of dto.prices) {
        const priceDec = toDecimal(item.price.toFixed(2));
        await tx.dishPrice.upsert({
          where: {
            tierId_dishId: {
              tierId,
              dishId: item.dishId,
            },
          },
          update: { price: priceDec },
          create: {
            tierId,
            dishId: item.dishId,
            price: priceDec,
          },
        });

        results.push({
          dishId: item.dishId,
          price: priceDec.toFixed(2),
        });
      }

      return results;
    });

    return {
      tierId,
      updatedCount: appliedPrices.length,
      dishPrices: appliedPrices,
    };
  }

  /**
   * Detects whether introducing baseTierId into tierId's hierarchy forms a cycle.
   */
  async detectCycle(
    tierId: string,
    candidateBaseTierId: string,
  ): Promise<boolean> {
    if (tierId === candidateBaseTierId) {
      return true;
    }

    let currentId: string | null = candidateBaseTierId;
    const seen = new Set<string>();

    while (currentId) {
      if (currentId === tierId || seen.has(currentId)) {
        return true;
      }
      seen.add(currentId);

      const parent: any = await this.prisma.priceTier.findUnique({
        where: { id: currentId },
        select: { baseTierId: true },
      });

      currentId = parent?.baseTierId ?? null;
    }

    return false;
  }

  /**
   * Validates derivation strategies, required fields, and circular references.
   */
  private async validateDerivationConfiguration(
    tierId: string | null,
    derivationType: PriceDerivationType,
    baseTierId?: string | null,
    multiplier?: number | null,
    percentage?: number | null,
  ): Promise<void> {
    if (derivationType === PriceDerivationType.COST_MULTIPLIER) {
      if (multiplier === undefined || multiplier === null || multiplier <= 0) {
        throw new BadRequestException(
          'A multiplier greater than 0 is required for COST_MULTIPLIER price tiers.',
        );
      }
    } else if (derivationType === PriceDerivationType.TIER_PERCENTAGE) {
      if (!baseTierId) {
        throw new BadRequestException(
          'A base price tier ID is required for TIER_PERCENTAGE price tiers.',
        );
      }

      if (percentage === undefined || percentage === null) {
        throw new BadRequestException(
          'A percentage markup is required for TIER_PERCENTAGE price tiers.',
        );
      }

      if (tierId && tierId === baseTierId) {
        throw new BadRequestException(
          'A price tier cannot derive from itself (self-referencing tier is rejected).',
        );
      }

      // Check base tier exists and is active
      const baseTier = await this.prisma.priceTier.findUnique({
        where: { id: baseTierId },
      });

      if (!baseTier) {
        throw new NotFoundException(
          `Base price tier with ID '${baseTierId}' not found.`,
        );
      }

      if (!baseTier.isActive) {
        throw new BadRequestException(
          `Base price tier '${baseTier.name}' is inactive and cannot be used as a derivation base.`,
        );
      }

      // Check for cycles in hierarchy
      if (tierId) {
        const hasCycle = await this.detectCycle(tierId, baseTierId);
        if (hasCycle) {
          throw new BadRequestException(
            'Circular dependency detected in price tiers. A tier cannot directly or indirectly derive from itself.',
          );
        }
      }
    }
  }

  private async ensureTierExists(tierId: string): Promise<void> {
    const exists = await this.prisma.priceTier.findUnique({
      where: { id: tierId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Price tier with ID '${tierId}' not found`);
    }
  }

  private mapTierToResponse(tier: any): PriceTierResponse {
    return {
      id: tier.id,
      name: tier.name,
      description: tier.description,
      derivationType: tier.derivationType,
      baseTierId: tier.baseTierId,
      baseTierName: tier.baseTier?.name ?? null,
      multiplier: tier.multiplier ? formatMoney(tier.multiplier) : null,
      percentage: tier.percentage ? formatMoney(tier.percentage) : null,
      isDefault: tier.isDefault,
      isActive: tier.isActive,
      dishPricesCount: tier._count?.dishPrices ?? 0,
      optionPricesCount: tier._count?.optionPrices ?? 0,
      companiesCount: tier._count?.companies ?? 0,
      createdAt: tier.createdAt,
      updatedAt: tier.updatedAt,
    };
  }
}
