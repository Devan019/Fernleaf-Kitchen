import { DishTemperature } from '../src/generated/prisma/enums.js';
import { prisma, Prisma } from './utils.js';

export async function seedCatalogue() {
  // 1. Allergens
  const allergenNames = ['Milk', 'Soy', 'Gluten', 'Peanuts', 'Sesame', 'Eggs', 'Mustard'];
  const allergens: Record<string, { id: string; name: string }> = {};
  for (const name of allergenNames) {
    const record = await prisma.allergen.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    allergens[name] = record;
  }

  // 2. Dietary Tags
  const dietaryTagNames = ['Vegan', 'Vegetarian', 'Jain', 'Gluten-Free', 'Halal', 'Nut-Free'];
  const dietaryTags: Record<string, { id: string; name: string }> = {};
  for (const name of dietaryTagNames) {
    const record = await prisma.dietaryTag.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    dietaryTags[name] = record;
  }

  // 3. Kitchen Stations
  const kitchenStationNames = ['Indian', 'Grill', 'Bakery', 'Dessert'];
  const stations: Record<string, { id: string; name: string }> = {};
  for (const name of kitchenStationNames) {
    const record = await prisma.kitchenStation.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    stations[name] = record;
  }

  // 4. Portion Sizes
  const portionSizeNames = ['Regular', 'Large'];
  const portions: Record<string, { id: string; name: string }> = {};
  for (const name of portionSizeNames) {
    const record = await prisma.portionSize.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    portions[name] = record;
  }

  // 5. Options & Portion Charges
  const optionsData = [
    {
      name: 'Paneer',
      costPrice: '2.00',
      allergens: ['Milk'],
      dietaryTags: ['Vegetarian'],
      portionCharges: { Regular: '0.00', Large: '1.50' },
    },
    {
      name: 'Tofu',
      costPrice: '1.80',
      allergens: ['Soy'],
      dietaryTags: ['Vegan', 'Vegetarian'],
      portionCharges: { Regular: '0.00', Large: '1.25' },
    },
    {
      name: 'Chicken',
      costPrice: '2.50',
      allergens: [],
      dietaryTags: ['Halal'],
      portionCharges: { Regular: '0.00', Large: '2.00' },
    },
    {
      name: 'Brown Rice',
      costPrice: '1.20',
      allergens: [],
      dietaryTags: ['Vegan', 'Vegetarian', 'Gluten-Free'],
      portionCharges: { Regular: '0.00', Large: '1.00' },
    },
    {
      name: 'Jeera Rice',
      costPrice: '1.00',
      allergens: [],
      dietaryTags: ['Vegan', 'Vegetarian', 'Jain', 'Gluten-Free'],
      portionCharges: { Regular: '0.00', Large: '1.00' },
    },
    {
      name: 'Raita',
      costPrice: '0.80',
      allergens: ['Milk'],
      dietaryTags: ['Vegetarian'],
      portionCharges: { Regular: '0.00', Large: '0.50' },
    },
    {
      name: 'Mint Chutney',
      costPrice: '0.50',
      allergens: [],
      dietaryTags: ['Vegan', 'Vegetarian', 'Jain', 'Gluten-Free'],
      portionCharges: { Regular: '0.00', Large: '0.25' },
    },
    {
      name: 'Steamed Veggies',
      costPrice: '1.50',
      allergens: [],
      dietaryTags: ['Vegan', 'Vegetarian', 'Gluten-Free'],
      portionCharges: { Regular: '0.00', Large: '0.75' },
    },
  ];

  const seededOptions: Record<string, { id: string; name: string }> = {};

  for (const opt of optionsData) {
    let option = await prisma.option.findFirst({
      where: { name: opt.name },
    });

    if (!option) {
      option = await prisma.option.create({
        data: {
          name: opt.name,
          costPrice: new Prisma.Decimal(opt.costPrice),
          allergens: {
            connect: opt.allergens.map((a) => ({ id: allergens[a]?.id })).filter(Boolean),
          },
          dietaryTags: {
            connect: opt.dietaryTags.map((d) => ({ id: dietaryTags[d]?.id })).filter(Boolean),
          },
        },
      });
    } else {
      await prisma.option.update({
        where: { id: option.id },
        data: {
          costPrice: new Prisma.Decimal(opt.costPrice),
          isActive: true,
          allergens: {
            set: opt.allergens.map((a) => ({ id: allergens[a]?.id })).filter(Boolean),
          },
          dietaryTags: {
            set: opt.dietaryTags.map((d) => ({ id: dietaryTags[d]?.id })).filter(Boolean),
          },
        },
      });
    }

    seededOptions[opt.name] = option;

    for (const [portionName, extraCharge] of Object.entries(opt.portionCharges)) {
      const portionSize = portions[portionName];
      if (portionSize) {
        await prisma.optionPortion.upsert({
          where: {
            optionId_portionSizeId: {
              optionId: option.id,
              portionSizeId: portionSize.id,
            },
          },
          update: { extraCharge: new Prisma.Decimal(extraCharge) },
          create: {
            optionId: option.id,
            portionSizeId: portionSize.id,
            extraCharge: new Prisma.Decimal(extraCharge),
          },
        });
      }
    }
  }

  // 6. Dishes & Option Groups
  const dishesData = [
    {
      name: 'Paneer Rice Bowl',
      description: 'Marinated paneer cubes served over fragrant basmati rice with warm Indian spices.',
      sku: 'DISH-PNR-001',
      temperature: DishTemperature.HOT,
      costPrice: '4.50',
      minimumOrderQuantity: 5,
      station: 'Indian',
      allergens: ['Milk'],
      dietaryTags: ['Vegetarian'],
      groups: [
        {
          name: 'Choose your protein',
          isRequired: true,
          displayOrder: 1,
          usesPortions: true,
          portions: ['Regular', 'Large'],
          options: ['Paneer', 'Tofu'],
        },
        {
          name: 'Choose rice base',
          isRequired: true,
          displayOrder: 2,
          usesPortions: false,
          portions: [],
          options: ['Jeera Rice', 'Brown Rice'],
        },
        {
          name: 'Add side',
          isRequired: false,
          displayOrder: 3,
          usesPortions: false,
          portions: [],
          options: ['Raita', 'Mint Chutney'],
        },
      ],
    },
    {
      name: 'Tofu Teriyaki Bowl',
      description: 'Glazed grilled tofu with steamed vegetables and seasoned rice.',
      sku: 'DISH-TOFU-001',
      temperature: DishTemperature.HOT,
      costPrice: '4.20',
      minimumOrderQuantity: 5,
      station: 'Grill',
      allergens: ['Soy'],
      dietaryTags: ['Vegan', 'Vegetarian'],
      groups: [
        {
          name: 'Choose rice base',
          isRequired: true,
          displayOrder: 1,
          usesPortions: false,
          portions: [],
          options: ['Brown Rice', 'Jeera Rice'],
        },
        {
          name: 'Add side',
          isRequired: false,
          displayOrder: 2,
          usesPortions: false,
          portions: [],
          options: ['Steamed Veggies'],
        },
      ],
    },
    {
      name: 'Chicken Tikka Bowl',
      description: 'Tender chicken tikka pieces served with rich spiced gravy and rice.',
      sku: 'DISH-CHK-001',
      temperature: DishTemperature.HOT,
      costPrice: '5.50',
      minimumOrderQuantity: 5,
      station: 'Indian',
      allergens: [],
      dietaryTags: ['Halal'],
      groups: [
        {
          name: 'Protein portion',
          isRequired: true,
          displayOrder: 1,
          usesPortions: true,
          portions: ['Regular', 'Large'],
          options: ['Chicken'],
        },
        {
          name: 'Choose rice base',
          isRequired: true,
          displayOrder: 2,
          usesPortions: false,
          portions: [],
          options: ['Jeera Rice', 'Brown Rice'],
        },
      ],
    },
    {
      name: 'Vegetable Breakfast Bowl',
      description: 'Fresh crisp seasonal salad with mint yogurt chutney and roasted seeds.',
      sku: 'DISH-VEG-001',
      temperature: DishTemperature.COLD,
      costPrice: '3.50',
      minimumOrderQuantity: 1,
      station: 'Indian',
      allergens: [],
      dietaryTags: ['Vegetarian', 'Gluten-Free'],
      groups: [
        {
          name: 'Add extra side',
          isRequired: false,
          displayOrder: 1,
          usesPortions: false,
          portions: [],
          options: ['Mint Chutney', 'Raita'],
        },
      ],
    },
    {
      name: 'Chocolate Brownie',
      description: 'Fudgy artisanal chocolate brownie baked fresh in the bakery.',
      sku: 'DISH-BRW-001',
      temperature: DishTemperature.COLD,
      costPrice: '2.20',
      minimumOrderQuantity: 2,
      station: 'Bakery',
      allergens: ['Milk', 'Gluten'],
      dietaryTags: ['Vegetarian'],
      groups: [],
    },
    {
      name: 'Grilled Salmon Bowl',
      description: 'Pan-seared Atlantic salmon fillet served with herb brown rice and greens.',
      sku: 'DISH-GRL-001',
      temperature: DishTemperature.HOT,
      costPrice: '6.80',
      minimumOrderQuantity: 3,
      station: 'Grill',
      allergens: [],
      dietaryTags: ['Gluten-Free'],
      groups: [
        {
          name: 'Choose rice base',
          isRequired: true,
          displayOrder: 1,
          usesPortions: false,
          portions: [],
          options: ['Brown Rice', 'Jeera Rice'],
        },
      ],
    },
  ];

  const seededDishes: Record<string, any> = {};

  for (const dishInfo of dishesData) {
    const dish = await prisma.dish.upsert({
      where: { sku: dishInfo.sku },
      update: {
        name: dishInfo.name,
        description: dishInfo.description,
        temperature: dishInfo.temperature,
        costPrice: new Prisma.Decimal(dishInfo.costPrice),
        minimumOrderQuantity: dishInfo.minimumOrderQuantity,
        kitchenStationId: stations[dishInfo.station]?.id,
        isActive: true,
        allergens: {
          set: dishInfo.allergens.map((a) => ({ id: allergens[a]?.id })).filter(Boolean),
        },
        dietaryTags: {
          set: dishInfo.dietaryTags.map((d) => ({ id: dietaryTags[d]?.id })).filter(Boolean),
        },
      },
      create: {
        name: dishInfo.name,
        description: dishInfo.description,
        sku: dishInfo.sku,
        temperature: dishInfo.temperature,
        costPrice: new Prisma.Decimal(dishInfo.costPrice),
        minimumOrderQuantity: dishInfo.minimumOrderQuantity,
        kitchenStationId: stations[dishInfo.station]?.id,
        allergens: {
          connect: dishInfo.allergens.map((a) => ({ id: allergens[a]?.id })).filter(Boolean),
        },
        dietaryTags: {
          connect: dishInfo.dietaryTags.map((d) => ({ id: dietaryTags[d]?.id })).filter(Boolean),
        },
      },
    });

    seededDishes[dish.sku] = dish;

    // Option groups
    for (const groupInfo of dishInfo.groups) {
      const optionGroup = await prisma.optionGroup.upsert({
        where: {
          dishId_displayOrder: {
            dishId: dish.id,
            displayOrder: groupInfo.displayOrder,
          },
        },
        update: {
          name: groupInfo.name,
          isRequired: groupInfo.isRequired,
          usesPortions: groupInfo.usesPortions,
        },
        create: {
          dishId: dish.id,
          name: groupInfo.name,
          isRequired: groupInfo.isRequired,
          displayOrder: groupInfo.displayOrder,
          usesPortions: groupInfo.usesPortions,
        },
      });

      // Group portions
      for (let pIdx = 0; pIdx < groupInfo.portions.length; pIdx++) {
        const portionName = groupInfo.portions[pIdx];
        const portionSize = portions[portionName];
        if (portionSize) {
          await prisma.optionGroupPortion.upsert({
            where: {
              optionGroupId_portionSizeId: {
                optionGroupId: optionGroup.id,
                portionSizeId: portionSize.id,
              },
            },
            update: { displayOrder: pIdx + 1 },
            create: {
              optionGroupId: optionGroup.id,
              portionSizeId: portionSize.id,
              displayOrder: pIdx + 1,
            },
          });
        }
      }

      // Group options
      for (let oIdx = 0; oIdx < groupInfo.options.length; oIdx++) {
        const optionName = groupInfo.options[oIdx];
        const optRecord = seededOptions[optionName];
        if (optRecord) {
          await prisma.optionGroupOption.upsert({
            where: {
              optionGroupId_optionId: {
                optionGroupId: optionGroup.id,
                optionId: optRecord.id,
              },
            },
            update: { displayOrder: oIdx + 1 },
            create: {
              optionGroupId: optionGroup.id,
              optionId: optRecord.id,
              displayOrder: oIdx + 1,
            },
          });
        }
      }
    }
  }

  return {
    allergens,
    dietaryTags,
    stations,
    portions,
    options: seededOptions,
    dishes: seededDishes,
  };
}
