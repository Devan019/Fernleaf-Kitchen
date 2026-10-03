import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { PriceResolutionService } from '../../pricing/price-resolution.service.js';
import { CreateOrderLineDto } from '../dto/create-order.dto.js';
import {
  addMoney,
  multiplyMoney,
  sumMoney,
  toDecimal,
  ZERO_MONEY,
} from '../utils/order-money.utils.js';

export interface CalculatedOptionSnapshot {
  optionId: string;
  optionNameSnapshot: string;
  optionGroupId: string | null;
  optionGroupNameSnapshot: string | null;
  portionSizeId: string | null;
  portionSizeNameSnapshot: string | null;
  unitPrice: Prisma.Decimal;
  portionExtraCharge: Prisma.Decimal;
  finalPrice: Prisma.Decimal;
}

export interface CalculatedCombinationSnapshot {
  quantity: number;
  unitPrice: Prisma.Decimal;
  combinationTotal: Prisma.Decimal;
  options: CalculatedOptionSnapshot[];
}

export interface CalculatedOrderLineSnapshot {
  dishId: string;
  dishNameSnapshot: string;
  dishSkuSnapshot: string | null;
  unitPrice: Prisma.Decimal;
  quantity: number;
  lineTotal: Prisma.Decimal;
  combinations: CalculatedCombinationSnapshot[];
}

export interface OrderPricingCalculationResult {
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  lines: CalculatedOrderLineSnapshot[];
}

@Injectable()
export class OrderPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priceResolutionService: PriceResolutionService,
  ) {}

  /**
   * Resolves prices and computes all financial totals for an order line item.
   * Completely calculates all unit prices, option prices, portion charges, combination totals,
   * and line totals using Prisma.Decimal.
   */
  async calculateOrderPricing(
    employeeId: string,
    companyId: string,
    linesDto: CreateOrderLineDto[],
  ): Promise<OrderPricingCalculationResult> {
    const tier =
      await this.priceResolutionService.getCompanyPriceTier(companyId);

    const calculatedLines: CalculatedOrderLineSnapshot[] = [];

    for (const lineDto of linesDto) {
      // 1. Load dish
      const dish = await this.prisma.dish.findUnique({
        where: { id: lineDto.dishId },
        include: {
          optionGroups: {
            include: {
              optionGroupOptions: {
                include: { option: true },
              },
              optionGroupPortions: {
                include: { portionSize: true },
              },
            },
          },
        },
      });

      if (!dish) {
        throw new BadRequestException(
          `Dish with ID '${lineDto.dishId}' not found`,
        );
      }

      // 2. Resolve selling price for dish
      const dishPriceResult =
        await this.priceResolutionService.resolveDishPrice(dish.id, tier.id);

      if (
        dishPriceResult.status !== 'RESOLVED' ||
        !dishPriceResult.price ||
        dishPriceResult.price.lessThanOrEqualTo(ZERO_MONEY)
      ) {
        throw new BadRequestException(
          `Dish '${dish.name}' does not have a valid selling price configured for this company`,
        );
      }

      const dishUnitPrice = dishPriceResult.price;

      // 3. Process each combination
      const calculatedCombinations: CalculatedCombinationSnapshot[] = [];

      for (const combDto of lineDto.combinations) {
        const calculatedOptions: CalculatedOptionSnapshot[] = [];
        let totalOptionUnitPrice = ZERO_MONEY;

        for (const optDto of combDto.options) {
          // Find option group and option within dish
          const group = dish.optionGroups.find(
            (g) => g.id === optDto.optionGroupId,
          );
          const optionGroupOption = group?.optionGroupOptions.find(
            (ogo) => ogo.optionId === optDto.optionId,
          );
          const option = optionGroupOption?.option;

          if (!option) {
            throw new BadRequestException(
              `Option '${optDto.optionId}' not found in group for dish '${dish.name}'`,
            );
          }

          // Resolve option price
          const optPriceResult =
            await this.priceResolutionService.resolveOptionPrice(
              option.id,
              tier.id,
            );

          const optionBasePrice =
            optPriceResult.status === 'RESOLVED' && optPriceResult.price
              ? optPriceResult.price
              : ZERO_MONEY;

          // Portion extra charge
          let extraCharge = ZERO_MONEY;
          let portionSizeName: string | null = null;

          if (group?.usesPortions && optDto.portionSizeId) {
            const portionSize = group.optionGroupPortions.find(
              (ogp) => ogp.portionSizeId === optDto.portionSizeId,
            )?.portionSize;

            if (portionSize) {
              portionSizeName = portionSize.name;
              const optionPortion = await this.prisma.optionPortion.findUnique({
                where: {
                  optionId_portionSizeId: {
                    optionId: option.id,
                    portionSizeId: portionSize.id,
                  },
                },
              });

              if (optionPortion) {
                extraCharge = toDecimal(optionPortion.extraCharge);
              }
            }
          }

          const optionFinalPrice = addMoney(optionBasePrice, extraCharge);
          totalOptionUnitPrice = addMoney(
            totalOptionUnitPrice,
            optionFinalPrice,
          );

          calculatedOptions.push({
            optionId: option.id,
            optionNameSnapshot: option.name,
            optionGroupId: group?.id ?? null,
            optionGroupNameSnapshot: group?.name ?? null,
            portionSizeId: optDto.portionSizeId ?? null,
            portionSizeNameSnapshot: portionSizeName,
            unitPrice: optionBasePrice,
            portionExtraCharge: extraCharge,
            finalPrice: optionFinalPrice,
          });
        }

        // Combination unit price = dish unit price + chosen options
        const combinationUnitPrice = addMoney(
          dishUnitPrice,
          totalOptionUnitPrice,
        );
        const combinationTotal = multiplyMoney(
          combinationUnitPrice,
          combDto.quantity,
        );

        calculatedCombinations.push({
          quantity: combDto.quantity,
          unitPrice: combinationUnitPrice,
          combinationTotal,
          options: calculatedOptions,
        });
      }

      // Line total = sum of combination totals
      const lineTotal = sumMoney(
        calculatedCombinations.map((c) => c.combinationTotal),
      );

      calculatedLines.push({
        dishId: dish.id,
        dishNameSnapshot: dish.name,
        dishSkuSnapshot: dish.sku,
        unitPrice: dishUnitPrice,
        quantity: lineDto.quantity,
        lineTotal,
        combinations: calculatedCombinations,
      });
    }

    // Order total = sum of line totals
    const orderTotal = sumMoney(calculatedLines.map((l) => l.lineTotal));

    return {
      subtotal: orderTotal,
      total: orderTotal,
      lines: calculatedLines,
    };
  }
}
