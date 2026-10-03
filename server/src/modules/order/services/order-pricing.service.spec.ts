import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { PriceResolutionService } from '../../pricing/price-resolution.service.js';
import { OrderPricingService } from './order-pricing.service.js';

describe('OrderPricingService', () => {
  let service: OrderPricingService;
  let prismaMock: any;
  let priceResolutionMock: any;

  beforeEach(() => {
    prismaMock = {
      dish: {
        findUnique: vi.fn(),
      },
      optionPortion: {
        findUnique: vi.fn(),
      },
    };

    priceResolutionMock = {
      getCompanyPriceTier: vi.fn().mockResolvedValue({ id: 'tier-1', name: 'Standard' }),
      resolveDishPrice: vi.fn(),
      resolveOptionPrice: vi.fn(),
    };

    service = new OrderPricingService(
      prismaMock as unknown as PrismaService,
      priceResolutionMock as unknown as PriceResolutionService,
    );
  });

  it('calculates order line totals and combination totals using Decimal', async () => {
    // Paneer Dish: $10.00
    // Brown Rice option: $1.00
    // Combination 1: qty 6, with Brown Rice -> ($10.00 + $1.00) * 6 = $66.00
    // Combination 2: qty 4, with Jeera Rice ($1.00) -> ($10.00 + $1.00) * 4 = $44.00
    // Line total = $110.00
    prismaMock.dish.findUnique.mockResolvedValue({
      id: 'dish-pnr',
      name: 'Paneer Rice Bowl',
      sku: 'DISH-PNR-001',
      optionGroups: [
        {
          id: 'grp-rice',
          name: 'Choose Rice',
          usesPortions: false,
          optionGroupOptions: [
            { optionId: 'opt-brown', option: { id: 'opt-brown', name: 'Brown Rice' } },
            { optionId: 'opt-jeera', option: { id: 'opt-jeera', name: 'Jeera Rice' } },
          ],
          optionGroupPortions: [],
        },
      ],
    });

    priceResolutionMock.resolveDishPrice.mockResolvedValue({
      status: 'RESOLVED',
      price: new Prisma.Decimal('10.00'),
    });

    priceResolutionMock.resolveOptionPrice.mockImplementation(async (_optId: string) => {
      return {
        status: 'RESOLVED',
        price: new Prisma.Decimal('1.00'),
      };
    });

    const linesDto = [
      {
        dishId: 'dish-pnr',
        quantity: 10,
        combinations: [
          {
            quantity: 6,
            options: [{ optionGroupId: 'grp-rice', optionId: 'opt-brown' }],
          },
          {
            quantity: 4,
            options: [{ optionGroupId: 'grp-rice', optionId: 'opt-jeera' }],
          },
        ],
      },
    ];

    const result = await service.calculateOrderPricing('emp-1', 'comp-1', linesDto);

    expect(result.subtotal.toString()).toBe('110');
    expect(result.total.toString()).toBe('110');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lineTotal.toString()).toBe('110');
    expect(result.lines[0].combinations[0].combinationTotal.toString()).toBe('66');
    expect(result.lines[0].combinations[1].combinationTotal.toString()).toBe('44');
  });

  it('incorporates portion extra charges into option final price', async () => {
    // Protein group with Large portion extra charge $1.50
    prismaMock.dish.findUnique.mockResolvedValue({
      id: 'dish-pnr',
      name: 'Paneer Rice Bowl',
      sku: 'DISH-PNR-001',
      optionGroups: [
        {
          id: 'grp-protein',
          name: 'Choose Protein',
          usesPortions: true,
          optionGroupOptions: [
            { optionId: 'opt-paneer', option: { id: 'opt-paneer', name: 'Paneer' } },
          ],
          optionGroupPortions: [
            { portionSizeId: 'portion-large', portionSize: { id: 'portion-large', name: 'Large' } },
          ],
        },
      ],
    });

    priceResolutionMock.resolveDishPrice.mockResolvedValue({
      status: 'RESOLVED',
      price: new Prisma.Decimal('10.00'),
    });

    priceResolutionMock.resolveOptionPrice.mockResolvedValue({
      status: 'RESOLVED',
      price: new Prisma.Decimal('2.00'),
    });

    prismaMock.optionPortion.findUnique.mockResolvedValue({
      extraCharge: new Prisma.Decimal('1.50'),
    });

    const linesDto = [
      {
        dishId: 'dish-pnr',
        quantity: 2,
        combinations: [
          {
            quantity: 2,
            options: [
              {
                optionGroupId: 'grp-protein',
                optionId: 'opt-paneer',
                portionSizeId: 'portion-large',
              },
            ],
          },
        ],
      },
    ];

    const result = await service.calculateOrderPricing('emp-1', 'comp-1', linesDto);

    // Option base: 2.00 + portion: 1.50 = 3.50
    // Dish: 10.00 + 3.50 = 13.50 * 2 = 27.00
    expect(result.total.toString()).toBe('27');
    expect(result.lines[0].combinations[0].options[0].portionExtraCharge.toString()).toBe('1.5');
    expect(result.lines[0].combinations[0].options[0].finalPrice.toString()).toBe('3.5');
  });

  it('throws BadRequestException if dish price is not resolvable', async () => {
    prismaMock.dish.findUnique.mockResolvedValue({
      id: 'dish-unpriced',
      name: 'Unpriced Bowl',
      optionGroups: [],
    });

    priceResolutionMock.resolveDishPrice.mockResolvedValue({
      status: 'MISSING',
      price: null,
    });

    const linesDto = [
      {
        dishId: 'dish-unpriced',
        quantity: 1,
        combinations: [{ quantity: 1, options: [] }],
      },
    ];

    await expect(
      service.calculateOrderPricing('emp-1', 'comp-1', linesDto),
    ).rejects.toThrow(BadRequestException);
  });
});
