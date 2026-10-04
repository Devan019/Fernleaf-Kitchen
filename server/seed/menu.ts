import { prisma } from './utils.js';

export async function seedMenu() {
  const categoriesData = [
    {
      name: 'Bowls',
      displayOrder: 1,
      isSecret: false,
      dishes: ['DISH-PNR-001', 'DISH-CHK-001', 'DISH-TOFU-001', 'DISH-GRL-001'],
    },
    {
      name: 'Breakfast',
      displayOrder: 2,
      isSecret: false,
      dishes: ['DISH-VEG-001'],
    },
    {
      name: 'Desserts',
      displayOrder: 3,
      isSecret: false,
      dishes: ['DISH-BRW-001'],
    },
    {
      name: 'Secret Desserts',
      displayOrder: 4,
      isSecret: true,
      dishes: ['DISH-BRW-001', 'DISH-PNR-001'],
    },
  ];

  const seededCategories: Record<string, any> = {};

  for (const cat of categoriesData) {
    const category = await prisma.menuCategory.upsert({
      where: { name: cat.name },
      update: {
        displayOrder: cat.displayOrder,
        isSecret: cat.isSecret,
        isActive: true,
      },
      create: {
        name: cat.name,
        displayOrder: cat.displayOrder,
        isSecret: cat.isSecret,
        isActive: true,
      },
    });
    seededCategories[cat.name] = category;

    // Seed Category Dishes
    for (let dIdx = 0; dIdx < cat.dishes.length; dIdx++) {
      const sku = cat.dishes[dIdx];
      const dish = await prisma.dish.findUnique({ where: { sku } });
      if (dish) {
        await prisma.categoryDish.upsert({
          where: {
            categoryId_dishId: {
              categoryId: category.id,
              dishId: dish.id,
            },
          },
          update: { displayOrder: dIdx + 1 },
          create: {
            categoryId: category.id,
            dishId: dish.id,
            displayOrder: dIdx + 1,
          },
        });
      }
    }
  }

  // Company Visibility Hiding Rules
  const acmeCompany = await prisma.company.findUnique({ where: { name: 'Acme Corp' } });
  const globexCompany = await prisma.company.findUnique({ where: { name: 'Globex Inc' } });
  const googleCompany = await prisma.company.findUnique({ where: { name: 'Google' } });
  const tcsCompany = await prisma.company.findUnique({ where: { name: 'TCS' } });

  const dessertsCat = seededCategories['Desserts'];
  const breakfastCat = seededCategories['Breakfast'];
  const brownieDish = await prisma.dish.findUnique({ where: { sku: 'DISH-BRW-001' } });
  const chickenDish = await prisma.dish.findUnique({ where: { sku: 'DISH-CHK-001' } });

  // 1. Acme: Hide "Desserts" category
  if (acmeCompany && dessertsCat) {
    await prisma.companyHiddenCategory.upsert({
      where: {
        companyId_categoryId: {
          companyId: acmeCompany.id,
          categoryId: dessertsCat.id,
        },
      },
      update: {},
      create: {
        companyId: acmeCompany.id,
        categoryId: dessertsCat.id,
      },
    });
  }

  // 2. Globex: Hide "Chocolate Brownie" dish
  if (globexCompany && brownieDish) {
    await prisma.companyHiddenDish.upsert({
      where: {
        companyId_dishId: {
          companyId: globexCompany.id,
          dishId: brownieDish.id,
        },
      },
      update: {},
      create: {
        companyId: globexCompany.id,
        dishId: brownieDish.id,
      },
    });
  }

  // 3. Google: Hide "Breakfast" category
  if (googleCompany && breakfastCat) {
    await prisma.companyHiddenCategory.upsert({
      where: {
        companyId_categoryId: {
          companyId: googleCompany.id,
          categoryId: breakfastCat.id,
        },
      },
      update: {},
      create: {
        companyId: googleCompany.id,
        categoryId: breakfastCat.id,
      },
    });
  }

  // 4. TCS: Hide "Chicken Tikka Bowl" dish
  if (tcsCompany && chickenDish) {
    await prisma.companyHiddenDish.upsert({
      where: {
        companyId_dishId: {
          companyId: tcsCompany.id,
          dishId: chickenDish.id,
        },
      },
      update: {},
      create: {
        companyId: tcsCompany.id,
        dishId: chickenDish.id,
      },
    });
  }

  return { categories: seededCategories };
}
