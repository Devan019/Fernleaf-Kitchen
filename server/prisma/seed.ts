import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { DishTemperature, UserRole } from '../src/generated/prisma/enums.js';
import { hashPassword } from '../src/common/utils/index.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'Test@1234',
    role: UserRole.ADMIN,
  },
  {
    name: 'Kitchen Staff',
    email: 'kitchen@test.com',
    password: 'Test@1234',
    role: UserRole.KITCHEN,
  },
  {
    name: 'Dispatch Staff',
    email: 'dispatch@test.com',
    password: 'Test@1234',
    role: UserRole.DISPATCH,
  },
  {
    name: 'Driver Staff',
    email: 'driver@test.com',
    password: 'Test@1234',
    role: UserRole.DRIVER,
  },
];

async function main() {
  console.log('Seeding initial staff users...');

  for (const user of seedUsers) {
    const passwordHash = await hashPassword(user.password);

    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        isActive: true,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });

    console.log(
      `✓ Seeded user: ${upserted.email} [${upserted.role}] (ID: ${upserted.id})`,
    );
  }

  console.log('\nSeeding Reference Data...');

  // 1. Allergens
  const allergenNames = ['Milk', 'Soy', 'Gluten', 'Peanuts', 'Sesame'];
  const allergens: Record<string, { id: string; name: string }> = {};
  for (const name of allergenNames) {
    const record = await prisma.allergen.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    allergens[name] = record;
  }
  console.log(`✓ Seeded ${allergenNames.length} Allergens`);

  // 2. Dietary Tags
  const dietaryTagNames = ['Vegan', 'Vegetarian', 'Jain', 'Gluten-Free'];
  const dietaryTags: Record<string, { id: string; name: string }> = {};
  for (const name of dietaryTagNames) {
    const record = await prisma.dietaryTag.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    dietaryTags[name] = record;
  }
  console.log(`✓ Seeded ${dietaryTagNames.length} Dietary Tags`);

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
  console.log(`✓ Seeded ${kitchenStationNames.length} Kitchen Stations`);

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
  console.log(`✓ Seeded ${portionSizeNames.length} Portion Sizes`);

  // 5. Options
  console.log('\nSeeding Options & Portion Charges...');
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
      dietaryTags: [],
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
            connect: opt.allergens.map((a) => ({ id: allergens[a].id })),
          },
          dietaryTags: {
            connect: opt.dietaryTags.map((d) => ({ id: dietaryTags[d].id })),
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
            set: opt.allergens.map((a) => ({ id: allergens[a].id })),
          },
          dietaryTags: {
            set: opt.dietaryTags.map((d) => ({ id: dietaryTags[d].id })),
          },
        },
      });
    }

    seededOptions[opt.name] = option;

    // Seed portion charges for this option
    for (const [portionName, extraCharge] of Object.entries(
      opt.portionCharges,
    )) {
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
  console.log(`✓ Seeded ${optionsData.length} Options with Portion Charges`);

  // 6. Dishes and Option Groups
  console.log('\nSeeding Dishes and Option Groups...');
  const dishesData = [
    {
      name: 'Paneer Rice Bowl',
      description:
        'Marinated paneer cubes served over fragrant basmati rice with warm Indian spices.',
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
      description:
        'Glazed grilled tofu with steamed vegetables and seasoned rice.',
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
      ],
    },
    {
      name: 'Chicken Tikka Bowl',
      description:
        'Tender chicken tikka pieces served with rich spiced gravy and rice.',
      sku: 'DISH-CHK-001',
      temperature: DishTemperature.HOT,
      costPrice: '5.50',
      minimumOrderQuantity: 5,
      station: 'Indian',
      allergens: [],
      dietaryTags: [],
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
      description:
        'Fresh crisp seasonal salad with mint yogurt chutney and roasted seeds.',
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
      description:
        'Fudgy artisanal chocolate brownie baked fresh in the bakery.',
      sku: 'DISH-BRW-001',
      temperature: DishTemperature.COLD,
      costPrice: '2.20',
      minimumOrderQuantity: 2,
      station: 'Bakery',
      allergens: ['Milk', 'Gluten'],
      dietaryTags: ['Vegetarian'],
      groups: [],
    },
  ];

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
          set: dishInfo.allergens.map((a) => ({ id: allergens[a].id })),
        },
        dietaryTags: {
          set: dishInfo.dietaryTags.map((d) => ({ id: dietaryTags[d].id })),
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
          connect: dishInfo.allergens.map((a) => ({ id: allergens[a].id })),
        },
        dietaryTags: {
          connect: dishInfo.dietaryTags.map((d) => ({ id: dietaryTags[d].id })),
        },
      },
    });

    console.log(`✓ Seeded Dish: ${dish.name} (${dish.sku})`);

    // Seed Option Groups for this dish
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

      // Seed portions for this group
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

      // Seed options for this group
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

  console.log('\nDatabase seed finished successfully and idempotently.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
