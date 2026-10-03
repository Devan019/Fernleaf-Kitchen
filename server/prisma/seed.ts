import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { DishTemperature, PriceDerivationType, UserRole, DayOfWeek, OrderStatus } from '../src/generated/prisma/enums.js';
import { hashPassword } from '../src/common/utils/index.js';
import { randomUUID } from 'node:crypto';

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

  // 7. Companies and Employees
  console.log('\nSeeding Companies and Employees...');
  const driverUser = await prisma.user.findUnique({
    where: { email: 'driver@test.com' },
  });

  const companyData = [
    {
      name: 'Google',
      billingContactName: 'Sundar Pichai',
      billingContactEmail: 'billing@google.com',
      billingContactPhone: '+1-650-253-0000',
      domains: ['google.com', 'alphabet.com'],
      addresses: [
        {
          label: 'HQ Main Campus',
          street: '1600 Amphitheatre Parkway',
          city: 'Mountain View',
          postcode: 'CA 94043',
          deliveryInstructions: 'Deliver to main reception, ask for cafeteria dispatch',
          isDefault: true,
        },
        {
          label: 'NYC Office',
          street: '111 8th Ave',
          city: 'New York',
          postcode: 'NY 10011',
          deliveryInstructions: 'Deliver to 4th floor loading bay',
          isDefault: false,
        },
      ],
      holidays: [
        { date: '2026-12-25', name: 'Christmas Day' },
        { date: '2026-01-01', name: "New Year's Day" },
      ],
    },
    {
      name: 'TCS',
      billingContactName: 'Rajesh Gopinathan',
      billingContactEmail: 'billing@tcs.com',
      billingContactPhone: '+91-22-6778-9999',
      domains: ['tcs.com', 'tataconsultancy.com'],
      addresses: [
        {
          label: 'Olympus Facility',
          street: 'TCS Olympus, Hiranandani Estate',
          city: 'Thane',
          postcode: '400607',
          deliveryInstructions: 'Security check at Gate 2',
          isDefault: true,
        },
      ],
      holidays: [
        { date: '2026-10-20', name: 'Diwali' },
        { date: '2026-12-25', name: 'Christmas Day' },
      ],
    },
    {
      name: 'Microsoft',
      billingContactName: 'Satya Nadella',
      billingContactEmail: 'billing@microsoft.com',
      billingContactPhone: '+1-425-882-8080',
      domains: ['microsoft.com', 'msft.com'],
      addresses: [
        {
          label: 'Redmond Headquarters',
          street: 'One Microsoft Way',
          city: 'Redmond',
          postcode: 'WA 98052',
          deliveryInstructions: 'Building 92 Visitor Center',
          isDefault: true,
        },
      ],
      holidays: [
        { date: '2026-11-26', name: 'Thanksgiving Day' },
      ],
    },
    {
      name: 'Acme Corp',
      billingContactName: 'Wile E. Coyote',
      billingContactEmail: 'billing@acme.com',
      billingContactPhone: '+1-555-0100',
      domains: ['acme.com'],
      addresses: [
        {
          label: 'Acme Headquarters',
          street: '100 Acme Way',
          city: 'Austin',
          postcode: 'TX 78701',
          isDefault: true,
        },
      ],
      holidays: [],
    },
    {
      name: 'Globex Inc',
      billingContactName: 'Hank Scorpio',
      billingContactEmail: 'billing@globex.com',
      billingContactPhone: '+1-555-0200',
      domains: ['globex.com'],
      addresses: [
        {
          label: 'Globex Tower',
          street: '200 Globex Blvd',
          city: 'Chicago',
          postcode: 'IL 60601',
          isDefault: true,
        },
      ],
      holidays: [],
    },
    {
      name: 'Initech LLC',
      billingContactName: 'Bill Lumbergh',
      billingContactEmail: 'billing@initech.com',
      billingContactPhone: '+1-555-0300',
      domains: ['initech.com'],
      addresses: [
        {
          label: 'Initech Office Park',
          street: '4120 Freidrich Lane',
          city: 'Austin',
          postcode: 'TX 78744',
          isDefault: true,
        },
      ],
      holidays: [],
    },
  ];

  const seededCompanies: Record<string, { id: string; name: string }> = {};
  for (const comp of companyData) {
    const record = await prisma.company.upsert({
      where: { name: comp.name },
      update: {
        billingContactName: comp.billingContactName,
        billingContactEmail: comp.billingContactEmail,
        billingContactPhone: comp.billingContactPhone,
        workingDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        defaultDeliveryTime: '12:30',
        leaveKitchenMinutes: 60,
        defaultPackagingType: 'ECO_BOX',
        standingDriverInstructions: 'Please call before arrival',
        defaultDriverId: driverUser ? driverUser.id : null,
        isActive: true,
      },
      create: {
        name: comp.name,
        billingContactName: comp.billingContactName,
        billingContactEmail: comp.billingContactEmail,
        billingContactPhone: comp.billingContactPhone,
        workingDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        defaultDeliveryTime: '12:30',
        leaveKitchenMinutes: 60,
        defaultPackagingType: 'ECO_BOX',
        standingDriverInstructions: 'Please call before arrival',
        defaultDriverId: driverUser ? driverUser.id : null,
        isActive: true,
      },
    });
    seededCompanies[comp.name] = record;

    // Seed email domains
    for (const domain of comp.domains) {
      await prisma.companyEmailDomain.upsert({
        where: { domain },
        update: { companyId: record.id },
        create: { domain, companyId: record.id },
      });
    }

    // Seed addresses
    for (const addr of comp.addresses) {
      const existingAddr = await prisma.deliveryAddress.findFirst({
        where: { companyId: record.id, street: addr.street },
      });
      if (!existingAddr) {
        await prisma.deliveryAddress.create({
          data: {
            companyId: record.id,
            label: addr.label,
            street: addr.street,
            city: addr.city,
            postcode: addr.postcode,
            deliveryInstructions: 'deliveryInstructions' in addr ? (addr as { deliveryInstructions?: string }).deliveryInstructions ?? null : null,
            isDefault: addr.isDefault,
          },
        });
      }
    }

    // Seed holidays
    for (const hol of comp.holidays) {
      const dateObj = new Date(`${hol.date}T00:00:00.000Z`);
      await prisma.companyHoliday.upsert({
        where: {
          companyId_date: {
            companyId: record.id,
            date: dateObj,
          },
        },
        update: { name: hol.name },
        create: {
          companyId: record.id,
          date: dateObj,
          name: hol.name,
        },
      });
    }
  }
  console.log(`✓ Seeded ${companyData.length} Companies with Domains, Addresses, and Holidays`);

  // Seed customer employees with varied permissions, allergies, dietary preferences, and owners
  const employeesData = [
    // Google Employees
    {
      name: 'Rahul Sharma',
      email: 'rahul@google.com',
      company: 'Google',
      isOwner: true,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: false,
      canChangePackaging: true,
      allergens: ['Milk'],
      dietaryTags: ['Vegetarian'],
    },
    {
      name: 'Priya Patel',
      email: 'priya@google.com',
      company: 'Google',
      isOwner: false,
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: ['Peanuts'],
      dietaryTags: ['Vegan'],
    },
    {
      name: 'Amit Kumar',
      email: 'amit@google.com',
      company: 'Google',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: true,
      allergens: ['Gluten'],
      dietaryTags: ['Jain'],
    },
    // TCS Employees
    {
      name: 'Vikram Malhotra',
      email: 'vikram@tcs.com',
      company: 'TCS',
      isOwner: true,
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: false,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: ['Vegetarian'],
    },
    {
      name: 'Ananya Sen',
      email: 'ananya@tcs.com',
      company: 'TCS',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: false,
      canChangePackaging: true,
      allergens: ['Soy'],
      dietaryTags: ['Gluten-Free'],
    },
    // Microsoft Employees
    {
      name: 'David Miller',
      email: 'david@microsoft.com',
      company: 'Microsoft',
      isOwner: true,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: ['Vegetarian'],
    },
    {
      name: 'Sarah Connor',
      email: 'sarah@microsoft.com',
      company: 'Microsoft',
      isOwner: false,
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: true,
      canChangePackaging: true,
      allergens: ['Milk'],
      dietaryTags: ['Vegetarian'],
    },
    // Acme, Globex, Initech Employees (preserving original test references)
    {
      name: 'Alice Smith',
      email: 'alice@acme.com',
      company: 'Acme Corp',
      isOwner: true,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: false,
      canChangePackaging: true,
      allergens: [],
      dietaryTags: [],
    },
    {
      name: 'Bob Jones',
      email: 'bob@globex.com',
      company: 'Globex Inc',
      isOwner: true,
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: [],
    },
    {
      name: 'Charlie Brown',
      email: 'charlie@initech.com',
      company: 'Initech LLC',
      isOwner: true,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: true,
      allergens: [],
      dietaryTags: [],
    },
  ];

  for (const emp of employeesData) {
    const compRecord = seededCompanies[emp.company];
    const employee = await prisma.employee.upsert({
      where: { email: emp.email },
      update: {
        name: emp.name,
        companyId: compRecord.id,
        canChooseDeliveryAddress: emp.canChooseDeliveryAddress,
        canChangeDeliveryTime: emp.canChangeDeliveryTime,
        canChangePackaging: emp.canChangePackaging,
        isActive: true,
        allergens: {
          set: emp.allergens.map((a) => ({ id: allergens[a].id })),
        },
        dietaryTags: {
          set: emp.dietaryTags.map((d) => ({ id: dietaryTags[d].id })),
        },
      },
      create: {
        name: emp.name,
        email: emp.email,
        companyId: compRecord.id,
        canChooseDeliveryAddress: emp.canChooseDeliveryAddress,
        canChangeDeliveryTime: emp.canChangeDeliveryTime,
        canChangePackaging: emp.canChangePackaging,
        isActive: true,
        allergens: {
          connect: emp.allergens.map((a) => ({ id: allergens[a].id })),
        },
        dietaryTags: {
          connect: emp.dietaryTags.map((d) => ({ id: dietaryTags[d].id })),
        },
      },
    });

    // Set as company owner if designated
    if (emp.isOwner) {
      await prisma.company.update({
        where: { id: compRecord.id },
        data: { ownerId: employee.id },
      });
    }
  }
  console.log(`✓ Seeded ${employeesData.length} Employees with Preferences, Permissions, and Company Owners`);

  // 8. Menu Categories
  console.log('\nSeeding Menu Categories and Category Dishes...');
  const categoriesData = [
    {
      name: 'Bowls',
      displayOrder: 1,
      isSecret: false,
      dishes: ['DISH-PNR-001', 'DISH-CHK-001', 'DISH-TOFU-001'],
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

  const seededCategories: Record<string, { id: string; name: string }> = {};
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

    // Seed category dishes
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
  console.log(
    `✓ Seeded ${categoriesData.length} Menu Categories and Item Assignments`,
  );

  // 9. Company Visibility Hiding Rules
  console.log('\nSeeding Company Visibility Hiding Rules...');
  // Company A ("Acme Corp"): Hide "Desserts" category
  const acmeCompany = seededCompanies['Acme Corp'];
  const dessertsCategory = seededCategories['Desserts'];
  if (acmeCompany && dessertsCategory) {
    await prisma.companyHiddenCategory.upsert({
      where: {
        companyId_categoryId: {
          companyId: acmeCompany.id,
          categoryId: dessertsCategory.id,
        },
      },
      update: {},
      create: {
        companyId: acmeCompany.id,
        categoryId: dessertsCategory.id,
      },
    });
    console.log(
      `✓ Seeded: Hidden Category 'Desserts' for Company 'Acme Corp'`,
    );
  }

  // Company B ("Globex Inc"): Hide "Chocolate Brownie" dish
  const globexCompany = seededCompanies['Globex Inc'];
  const brownieDish = await prisma.dish.findUnique({
    where: { sku: 'DISH-BRW-001' },
  });
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
    console.log(
      `✓ Seeded: Hidden Dish 'Chocolate Brownie' for Company 'Globex Inc'`,
    );
  }

  // Company C ("Google"): Hide "Breakfast" category
  const googleCompany = seededCompanies['Google'];
  const breakfastCategory = seededCategories['Breakfast'];
  if (googleCompany && breakfastCategory) {
    await prisma.companyHiddenCategory.upsert({
      where: {
        companyId_categoryId: {
          companyId: googleCompany.id,
          categoryId: breakfastCategory.id,
        },
      },
      update: {},
      create: {
        companyId: googleCompany.id,
        categoryId: breakfastCategory.id,
      },
    });
    console.log(
      `✓ Seeded: Hidden Category 'Breakfast' for Company 'Google'`,
    );
  }

  // Company D ("TCS"): Hide "Chicken Rice Bowl" dish
  const tcsCompany = seededCompanies['TCS'];
  const chickenDish = await prisma.dish.findUnique({
    where: { sku: 'DISH-CHK-001' },
  });
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
    console.log(
      `✓ Seeded: Hidden Dish 'Chicken Rice Bowl' for Company 'TCS'`,
    );
  }

  // 10. Pricing Tiers, Dish Prices, Option Prices & Company Assignments
  console.log('\nSeeding Pricing Tiers, Dish & Option Prices...');

  // 10.1 Standard Tier (MANUAL, Default)
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
  console.log(`✓ Seeded Price Tier: Standard (Default, MANUAL)`);

  // 10.2 Enterprise Tier (TIER_PERCENTAGE: Standard + 15%)
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
  console.log(`✓ Seeded Price Tier: Enterprise (+15% of Standard)`);

  // 10.3 Partner Tier (COST_MULTIPLIER: cost x 2.4)
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
  console.log(`✓ Seeded Price Tier: Partner (Cost x 2.4)`);

  // Standard Dish Prices (Manual)
  // Intentionally omitting DISH-VEG-001 so missing-price behavior can be demonstrated!
  const standardDishPrices: Record<string, string> = {
    'DISH-PNR-001': '10.00',
    'DISH-TOFU-001': '9.50',
    'DISH-CHK-001': '11.50',
    'DISH-BRW-001': '4.50',
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
  console.log(`✓ Seeded Standard manual dish prices (Vegetable Breakfast Bowl left unpriced)`);

  // Standard Option Prices (Manual)
  const standardOptionPrices: Record<string, string> = {
    'Paneer': '3.50',
    'Tofu': '3.00',
    'Chicken': '4.00',
    'Brown Rice': '2.00',
    'Jeera Rice': '1.80',
    'Raita': '1.50',
    'Mint Chutney': '1.00',
  };

  for (const [name, price] of Object.entries(standardOptionPrices)) {
    const opt = seededOptions[name];
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
  console.log(`✓ Seeded Standard manual option prices`);

  // Enterprise Overrides
  // Standard Paneer is 10.00 -> 15% is 11.50. Override to 12.25:
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
  // Standard Chicken is 11.50 -> 15% is 13.25. Override to 14.50:
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
  console.log(`✓ Seeded Enterprise individual dish overrides (Paneer Bowl @ 12.25, Chicken Bowl @ 14.50)`);

  // Partner Overrides
  // Partner Brownie cost is 2.20 * 2.4 = 5.28 -> rounds up to 5.30. Override to 5.00:
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
  console.log(`✓ Seeded Partner individual dish overrides (Brownie @ 5.00)`);

  // Assign Companies to Price Tiers
  // Acme Corp -> null priceTierId (uses Default Standard Tier)
  // Globex Inc -> Enterprise Tier
  // Initech LLC -> Partner Tier
  // Google -> Enterprise Tier
  // TCS -> Partner Tier
  // Microsoft -> Standard Tier
  await prisma.company.update({
    where: { name: 'Acme Corp' },
    data: { priceTierId: null },
  });

  await prisma.company.update({
    where: { name: 'Globex Inc' },
    data: { priceTierId: enterpriseTier.id },
  });

  await prisma.company.update({
    where: { name: 'Initech LLC' },
    data: { priceTierId: partnerTier.id },
  });

  await prisma.company.update({
    where: { name: 'Google' },
    data: { priceTierId: enterpriseTier.id },
  });

  await prisma.company.update({
    where: { name: 'TCS' },
    data: { priceTierId: partnerTier.id },
  });

  await prisma.company.update({
    where: { name: 'Microsoft' },
    data: { priceTierId: standardTier.id },
  });
  console.log(`✓ Assigned Companies to Price Tiers: Acme (Default), Globex & Google (Enterprise), Initech & TCS (Partner), Microsoft (Standard)`);

  // ====================================================
  // 6. Kitchen Settings & Holidays
  // ====================================================
  console.log('\nSeeding Kitchen Settings & Holidays...');
  const defaultSettings = [
    { key: 'CUTOFF_TIME', value: '16:00', description: 'Kitchen cut-off time in HH:mm' },
    { key: 'CUTOFF_WORKING_DAYS', value: '2', description: 'Number of kitchen working days prior to delivery date' },
    { key: 'KITCHEN_WORKING_DAYS', value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY', description: 'Kitchen operating working days' },
    { key: 'KITCHEN_TIMEZONE', value: 'UTC', description: 'Kitchen operational timezone' },
  ];

  for (const s of defaultSettings) {
    await prisma.kitchenSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, updatedAt: new Date() },
      create: {
        id: randomUUID(),
        key: s.key,
        value: s.value,
        description: s.description,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`✓ Seeded ${defaultSettings.length} Kitchen Settings`);

  await prisma.kitchenHoliday.upsert({
    where: { date: new Date('2026-12-25T00:00:00.000Z') },
    update: { name: 'Christmas Day', updatedAt: new Date() },
    create: {
      id: randomUUID(),
      date: new Date('2026-12-25T00:00:00.000Z'),
      name: 'Christmas Day',
      description: 'Kitchen closed for Christmas',
      updatedAt: new Date(),
    },
  });
  console.log('✓ Seeded Kitchen Holiday: Christmas Day');

  // ====================================================
  // 7. Realistic Seed Orders Across Companies & Employees
  // ====================================================
  console.log('\nSeeding Realistic Orders...');
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
  const googleComp = await prisma.company.findUnique({
    where: { name: 'Google' },
    include: { deliveryAddresses: true, employees: true },
  });
  const tcsComp = await prisma.company.findUnique({
    where: { name: 'TCS' },
    include: { deliveryAddresses: true, employees: true },
  });
  const msftComp = await prisma.company.findUnique({
    where: { name: 'Microsoft' },
    include: { deliveryAddresses: true, employees: true },
  });

  const pnrDishItem = await prisma.dish.findUnique({
    where: { sku: 'DISH-PNR-001' },
    include: {
      optionGroups: {
        include: {
          optionGroupOptions: { include: { option: true } },
          optionGroupPortions: { include: { portionSize: true } },
        },
      },
    },
  });

  const chkDishItem = await prisma.dish.findUnique({
    where: { sku: 'DISH-CHK-001' },
    include: {
      optionGroups: {
        include: {
          optionGroupOptions: { include: { option: true } },
          optionGroupPortions: { include: { portionSize: true } },
        },
      },
    },
  });

  const brwDishItem = await prisma.dish.findUnique({
    where: { sku: 'DISH-BRW-001' },
  });

  if (googleComp && tcsComp && msftComp && pnrDishItem && chkDishItem && brwDishItem) {
    const pnrProteinGroup = pnrDishItem.optionGroups.find((g) => g.name === 'Choose Protein');
    const pnrRiceGroup = pnrDishItem.optionGroups.find((g) => g.name === 'Choose Rice Base');
    const pnrPaneerOpt = pnrProteinGroup?.optionGroupOptions.find((o) => o.option.name === 'Paneer')?.option;
    const pnrBrownRiceOpt = pnrRiceGroup?.optionGroupOptions.find((o) => o.option.name === 'Brown Rice')?.option;
    const pnrJeeraRiceOpt = pnrRiceGroup?.optionGroupOptions.find((o) => o.option.name === 'Jeera Rice')?.option;
    const regularPortion = pnrProteinGroup?.optionGroupPortions.find((p) => p.portionSize.name === 'Regular')?.portionSize;
    const largePortion = pnrProteinGroup?.optionGroupPortions.find((p) => p.portionSize.name === 'Large')?.portionSize;

    const ordersToSeed = [
      {
        orderNumber: 'SEED-ORD-001',
        company: googleComp,
        employee: googleComp.employees[0], // Rahul Sharma
        deliveryDate: '2026-10-07',
        deliveryTime: '12:30',
        status: OrderStatus.DRAFT,
        packagingType: 'ECO_BOX',
        subtotal: '122.50',
        total: '122.50',
        placedAt: null,
        confirmedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        rejectedAt: null,
        note: 'Order saved as draft by staff',
        lines: [
          {
            dish: pnrDishItem,
            unitPrice: '12.25',
            quantity: 10,
            lineTotal: '122.50',
            combinations: [
              {
                quantity: 6,
                unitPrice: '12.25',
                combinationTotal: '73.50',
                options: [
                  { group: pnrProteinGroup, option: pnrPaneerOpt, portion: regularPortion, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                  { group: pnrRiceGroup, option: pnrBrownRiceOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                ],
              },
              {
                quantity: 4,
                unitPrice: '12.25',
                combinationTotal: '49.00',
                options: [
                  { group: pnrProteinGroup, option: pnrPaneerOpt, portion: regularPortion, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                  { group: pnrRiceGroup, option: pnrJeeraRiceOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                ],
              },
            ],
          },
        ],
      },
      {
        orderNumber: 'SEED-ORD-002',
        company: googleComp,
        employee: googleComp.employees[1], // Priya Patel
        deliveryDate: '2026-10-08',
        deliveryTime: '13:00',
        status: OrderStatus.PLACED,
        packagingType: 'STANDARD',
        subtotal: '107.50',
        total: '107.50',
        placedAt: new Date('2026-10-03T10:00:00.000Z'),
        confirmedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        rejectedAt: null,
        note: 'Order placed by staff',
        lines: [
          {
            dish: chkDishItem,
            unitPrice: '14.50',
            quantity: 5,
            lineTotal: '72.50',
            combinations: [
              {
                quantity: 5,
                unitPrice: '14.50',
                combinationTotal: '72.50',
                options: [],
              },
            ],
          },
          {
            dish: brwDishItem,
            unitPrice: '7.00',
            quantity: 5,
            lineTotal: '35.00',
            combinations: [
              {
                quantity: 5,
                unitPrice: '7.00',
                combinationTotal: '35.00',
                options: [],
              },
            ],
          },
        ],
      },
      {
        orderNumber: 'SEED-ORD-003',
        company: tcsComp,
        employee: tcsComp.employees[0], // Vikram Malhotra
        deliveryDate: '2026-10-05',
        deliveryTime: '12:00',
        status: OrderStatus.CONFIRMED,
        packagingType: 'ECO_BOX',
        subtotal: '150.00',
        total: '150.00',
        placedAt: new Date('2026-10-01T11:00:00.000Z'),
        confirmedAt: new Date('2026-10-01T16:00:00.000Z'),
        deliveredAt: null,
        cancelledAt: null,
        rejectedAt: null,
        note: 'Cut-off passed: order confirmed',
        lines: [
          {
            dish: pnrDishItem,
            unitPrice: '10.00',
            quantity: 15,
            lineTotal: '150.00',
            combinations: [
              {
                quantity: 15,
                unitPrice: '10.00',
                combinationTotal: '150.00',
                options: [],
              },
            ],
          },
        ],
      },
      {
        orderNumber: 'SEED-ORD-004',
        company: msftComp,
        employee: msftComp.employees[0], // Suresh Raina
        deliveryDate: '2026-09-30',
        deliveryTime: '12:30',
        status: OrderStatus.DELIVERED,
        packagingType: 'STANDARD',
        subtotal: '92.00',
        total: '92.00',
        placedAt: new Date('2026-09-26T09:00:00.000Z'),
        confirmedAt: new Date('2026-09-26T16:00:00.000Z'),
        deliveredAt: new Date('2026-09-30T12:45:00.000Z'),
        cancelledAt: null,
        rejectedAt: null,
        note: 'Order successfully delivered to customer',
        lines: [
          {
            dish: chkDishItem,
            unitPrice: '11.50',
            quantity: 8,
            lineTotal: '92.00',
            combinations: [
              {
                quantity: 8,
                unitPrice: '11.50',
                combinationTotal: '92.00',
                options: [],
              },
            ],
          },
        ],
      },
      {
        orderNumber: 'SEED-ORD-005',
        company: googleComp,
        employee: googleComp.employees[2], // Amit Kumar
        deliveryDate: '2026-10-01',
        deliveryTime: '12:30',
        status: OrderStatus.CANCELLED,
        packagingType: 'STANDARD',
        subtotal: '73.50',
        total: '73.50',
        placedAt: new Date('2026-09-28T09:00:00.000Z'),
        confirmedAt: null,
        deliveredAt: null,
        cancelledAt: new Date('2026-09-29T10:00:00.000Z'),
        rejectedAt: null,
        note: 'Cancelled by employee request',
        lines: [
          {
            dish: pnrDishItem,
            unitPrice: '12.25',
            quantity: 6,
            lineTotal: '73.50',
            combinations: [
              {
                quantity: 6,
                unitPrice: '12.25',
                combinationTotal: '73.50',
                options: [],
              },
            ],
          },
        ],
      },
      {
        orderNumber: 'SEED-ORD-006',
        company: tcsComp,
        employee: tcsComp.employees[1], // Ananya Sen
        deliveryDate: '2026-09-29',
        deliveryTime: '12:30',
        status: OrderStatus.REJECTED,
        packagingType: 'ECO_BOX',
        subtotal: '20.00',
        total: '20.00',
        placedAt: new Date('2026-09-25T14:00:00.000Z'),
        confirmedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        rejectedAt: new Date('2026-09-26T16:00:00.000Z'),
        note: 'Rejected due to kitchen capacity constraints',
        lines: [
          {
            dish: brwDishItem,
            unitPrice: '5.00',
            quantity: 4,
            lineTotal: '20.00',
            combinations: [
              {
                quantity: 4,
                unitPrice: '5.00',
                combinationTotal: '20.00',
                options: [],
              },
            ],
          },
        ],
      },
    ];

    for (const ord of ordersToSeed) {
      const existing = await prisma.order.findUnique({
        where: { orderNumber: ord.orderNumber },
      });

      if (!existing) {
        const address = ord.company.deliveryAddresses[0];
        const orderId = randomUUID();
        const now = new Date();

        await prisma.order.create({
          data: {
            id: orderId,
            orderNumber: ord.orderNumber,
            employeeId: ord.employee.id,
            companyId: ord.company.id,
            deliveryDate: new Date(`${ord.deliveryDate}T00:00:00.000Z`),
            deliveryTime: ord.deliveryTime,
            status: ord.status,
            packagingType: ord.packagingType,
            deliveryAddressId: address ? address.id : null,
            deliveryAddressLabel: address ? address.label : 'HQ',
            deliveryStreet: address ? address.street : 'Main St',
            deliveryUnit: address ? address.unit : null,
            deliveryCity: address ? address.city : 'London',
            deliveryPostcode: address ? address.postcode : 'EC1A 1BB',
            deliveryInstructions: address ? address.deliveryInstructions : null,
            subtotal: new Prisma.Decimal(ord.subtotal),
            total: new Prisma.Decimal(ord.total),
            createdByUserId: adminUser ? adminUser.id : null,
            placedAt: ord.placedAt,
            confirmedAt: ord.confirmedAt,
            deliveredAt: ord.deliveredAt,
            cancelledAt: ord.cancelledAt,
            rejectedAt: ord.rejectedAt,
            createdAt: now,
            updatedAt: now,
          },
        });

        for (const line of ord.lines) {
          const lineId = randomUUID();
          await prisma.orderLine.create({
            data: {
              id: lineId,
              orderId,
              dishId: line.dish.id,
              dishNameSnapshot: line.dish.name,
              dishSkuSnapshot: line.dish.sku,
              unitPrice: new Prisma.Decimal(line.unitPrice),
              quantity: line.quantity,
              lineTotal: new Prisma.Decimal(line.lineTotal),
              createdAt: now,
              updatedAt: now,
            },
          });

          for (const comb of line.combinations) {
            const combId = randomUUID();
            await prisma.orderLineCombination.create({
              data: {
                id: combId,
                orderLineId: lineId,
                quantity: comb.quantity,
                unitPrice: new Prisma.Decimal(comb.unitPrice),
                combinationTotal: new Prisma.Decimal(comb.combinationTotal),
                createdAt: now,
                updatedAt: now,
              },
            });

            for (const opt of comb.options) {
              if (opt.option) {
                await prisma.orderCombinationOption.create({
                  data: {
                    id: randomUUID(),
                    combinationId: combId,
                    optionGroupId: opt.group?.id ?? null,
                    optionGroupNameSnapshot: opt.group?.name ?? null,
                    optionId: opt.option.id,
                    optionNameSnapshot: opt.option.name,
                    unitPrice: new Prisma.Decimal(opt.unitPrice),
                    portionSizeId: opt.portion?.id ?? null,
                    portionSizeNameSnapshot: opt.portion?.name ?? null,
                    portionExtraCharge: new Prisma.Decimal(opt.extraCharge),
                    finalPrice: new Prisma.Decimal(opt.finalPrice),
                    createdAt: now,
                  },
                });
              }
            }
          }
        }

        await prisma.orderStatusHistory.create({
          data: {
            id: randomUUID(),
            orderId,
            fromStatus: null,
            toStatus: ord.status,
            changedByUserId: adminUser ? adminUser.id : null,
            note: ord.note,
            createdAt: now,
          },
        });
      }
    }
    console.log(`✓ Seeded ${ordersToSeed.length} Realistic Orders across statuses (DRAFT, PLACED, CONFIRMED, DELIVERED, CANCELLED, REJECTED)`);
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
