import { PriceDerivationType } from '../src/generated/prisma/enums.js';
import { prisma, Prisma } from './utils.js';

export async function seedPricing() {
  // 1. Standard Tier (MANUAL, Default)
  const standardTier = await prisma.priceTier.upsert({
    where: { name: 'Standard' },
    update: {
      description: 'Standard base manual pricing tier',
      derivationType: PriceDerivationType.MANUAL,
      isDefault: true,
      isActive: true,
      baseTierId: null,
      multiplier: null,
      percentage: null,
    },
    create: {
      name: 'Standard',
      description: 'Standard base manual pricing tier',
      derivationType: PriceDerivationType.MANUAL,
      isDefault: true,
      isActive: true,
    },
  });

  // 2. Enterprise Tier (TIER_PERCENTAGE: Standard + 15%)
  const enterpriseTier = await prisma.priceTier.upsert({
    where: { name: 'Enterprise' },
    update: {
      description: 'Enterprise pricing tier with 15% markup over standard pricing',
      derivationType: PriceDerivationType.TIER_PERCENTAGE,
      baseTierId: standardTier.id,
      percentage: new Prisma.Decimal('15.00'),
      multiplier: null,
      isDefault: false,
      isActive: true,
    },
    create: {
      name: 'Enterprise',
      description: 'Enterprise pricing tier with 15% markup over standard pricing',
      derivationType: PriceDerivationType.TIER_PERCENTAGE,
      baseTierId: standardTier.id,
      percentage: new Prisma.Decimal('15.00'),
      isDefault: false,
      isActive: true,
    },
  });

  // 3. Partner Tier (COST_MULTIPLIER: cost x 2.4)
  const partnerTier = await prisma.priceTier.upsert({
    where: { name: 'Partner' },
    update: {
      description: 'Partner tier derived from dish/option cost x 2.4',
      derivationType: PriceDerivationType.COST_MULTIPLIER,
      multiplier: new Prisma.Decimal('2.4000'),
      baseTierId: null,
      percentage: null,
      isDefault: false,
      isActive: true,
    },
    create: {
      name: 'Partner',
      description: 'Partner tier derived from dish/option cost x 2.4',
      derivationType: PriceDerivationType.COST_MULTIPLIER,
      multiplier: new Prisma.Decimal('2.4000'),
      isDefault: false,
      isActive: true,
    },
  });

  // Standard Dish Prices
  const standardDishPrices: Record<string, string> = {
    'DISH-PNR-001': '10.00',
    'DISH-TOFU-001': '9.50',
    'DISH-CHK-001': '11.50',
    'DISH-BRW-001': '4.50',
    'DISH-GRL-001': '13.50',
  };

  for (const [sku, price] of Object.entries(standardDishPrices)) {
    const dish = await prisma.dish.findUnique({ where: { sku } });
    if (dish) {
      await prisma.dishPrice.upsert({
        where: {
          tierId_dishId: {
            tierId: standardTier.id,
            dishId: dish.id,
          },
        },
        update: { price: new Prisma.Decimal(price) },
        create: {
          tierId: standardTier.id,
          dishId: dish.id,
          price: new Prisma.Decimal(price),
        },
      });
    }
  }

  // Standard Option Prices
  const standardOptionPrices: Record<string, string> = {
    'Paneer': '3.50',
    'Tofu': '3.00',
    'Chicken': '4.00',
    'Brown Rice': '2.00',
    'Jeera Rice': '1.80',
    'Raita': '1.50',
    'Mint Chutney': '1.00',
    'Steamed Veggies': '2.50',
  };

  for (const [name, price] of Object.entries(standardOptionPrices)) {
    const opt = await prisma.option.findFirst({ where: { name } });
    if (opt) {
      await prisma.optionPrice.upsert({
        where: {
          tierId_optionId: {
            tierId: standardTier.id,
            optionId: opt.id,
          },
        },
        update: { price: new Prisma.Decimal(price) },
        create: {
          tierId: standardTier.id,
          optionId: opt.id,
          price: new Prisma.Decimal(price),
        },
      });
    }
  }

  // Enterprise Overrides
  const pnrDish = await prisma.dish.findUnique({ where: { sku: 'DISH-PNR-001' } });
  if (pnrDish) {
    await prisma.dishPrice.upsert({
      where: {
        tierId_dishId: {
          tierId: enterpriseTier.id,
          dishId: pnrDish.id,
        },
      },
      update: { price: new Prisma.Decimal('12.25') },
      create: {
        tierId: enterpriseTier.id,
        dishId: pnrDish.id,
        price: new Prisma.Decimal('12.25'),
      },
    });
  }

  const chkDish = await prisma.dish.findUnique({ where: { sku: 'DISH-CHK-001' } });
  if (chkDish) {
    await prisma.dishPrice.upsert({
      where: {
        tierId_dishId: {
          tierId: enterpriseTier.id,
          dishId: chkDish.id,
        },
      },
      update: { price: new Prisma.Decimal('14.50') },
      create: {
        tierId: enterpriseTier.id,
        dishId: chkDish.id,
        price: new Prisma.Decimal('14.50'),
      },
    });
  }

  // Partner Overrides
  const brwDish = await prisma.dish.findUnique({ where: { sku: 'DISH-BRW-001' } });
  if (brwDish) {
    await prisma.dishPrice.upsert({
      where: {
        tierId_dishId: {
          tierId: partnerTier.id,
          dishId: brwDish.id,
        },
      },
      update: { price: new Prisma.Decimal('5.00') },
      create: {
        tierId: partnerTier.id,
        dishId: brwDish.id,
        price: new Prisma.Decimal('5.00'),
      },
    });
  }

  // Assign Companies to Price Tiers
  await prisma.company.updateMany({
    where: { name: 'Acme Corp' },
    data: { priceTierId: null },
  });

  await prisma.company.updateMany({
    where: { name: 'Globex Inc' },
    data: { priceTierId: enterpriseTier.id },
  });

  await prisma.company.updateMany({
    where: { name: 'Initech LLC' },
    data: { priceTierId: partnerTier.id },
  });

  await prisma.company.updateMany({
    where: { name: 'Google' },
    data: { priceTierId: enterpriseTier.id },
  });

  await prisma.company.updateMany({
    where: { name: 'TCS' },
    data: { priceTierId: partnerTier.id },
  });

  await prisma.company.updateMany({
    where: { name: 'Microsoft' },
    data: { priceTierId: standardTier.id },
  });

  return {
    tiers: {
      Standard: standardTier,
      Enterprise: enterpriseTier,
      Partner: partnerTier,
    },
  };
}
