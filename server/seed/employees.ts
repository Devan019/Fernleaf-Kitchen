import { prisma } from './utils.js';

export async function seedEmployees() {
  const allergens = await prisma.allergen.findMany();
  const allergenMap = new Map(allergens.map((a) => [a.name, a.id]));

  const dietaryTags = await prisma.dietaryTag.findMany();
  const tagMap = new Map(dietaryTags.map((t) => [t.name, t.id]));

  const companies = await prisma.company.findMany();
  const companyMap = new Map(companies.map((c) => [c.name, c.id]));

  const employeesData = [
    // 1. Google Employees
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
    {
      name: 'Neha Gupta',
      email: 'neha@google.com',
      company: 'Google',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: false,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: ['Vegetarian'],
    },
    {
      name: 'Rohan Mehta',
      email: 'rohan@google.com',
      company: 'Google',
      isOwner: false,
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: true,
      canChangePackaging: true,
      allergens: ['Soy'],
      dietaryTags: [],
    },

    // 2. TCS Employees
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
    {
      name: 'Arjun Reddy',
      email: 'arjun@tcs.com',
      company: 'TCS',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: ['Milk'],
      dietaryTags: ['Vegetarian'],
    },
    {
      name: 'Meera Nair',
      email: 'meera@tcs.com',
      company: 'TCS',
      isOwner: false,
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: true,
      canChangePackaging: true,
      allergens: [],
      dietaryTags: ['Vegan'],
    },

    // 3. Microsoft Employees
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
    {
      name: 'John Doe',
      email: 'john@microsoft.com',
      company: 'Microsoft',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: false,
      canChangePackaging: true,
      allergens: ['Gluten'],
      dietaryTags: [],
    },
    {
      name: 'Lisa Ray',
      email: 'lisa@microsoft.com',
      company: 'Microsoft',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: ['Vegan', 'Gluten-Free'],
    },

    // 4. Acme Corp Employees
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
      name: 'Mark Johnson',
      email: 'mark@acme.com',
      company: 'Acme Corp',
      isOwner: false,
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: ['Peanuts'],
      dietaryTags: ['Vegetarian'],
    },
    {
      name: 'Julia Roberts',
      email: 'julia@acme.com',
      company: 'Acme Corp',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: true,
      allergens: ['Milk'],
      dietaryTags: [],
    },

    // 5. Globex Inc Employees
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
      name: 'Emma Stone',
      email: 'emma@globex.com',
      company: 'Globex Inc',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: false,
      canChangePackaging: true,
      allergens: ['Soy'],
      dietaryTags: ['Vegan'],
    },
    {
      name: 'Ryan Gosling',
      email: 'ryan@globex.com',
      company: 'Globex Inc',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: ['Vegetarian'],
    },

    // 6. Initech LLC Employees
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
    {
      name: 'Nancy Drew',
      email: 'nancy@initech.com',
      company: 'Initech LLC',
      isOwner: false,
      canChooseDeliveryAddress: false,
      canChangeDeliveryTime: false,
      canChangePackaging: true,
      allergens: ['Milk'],
      dietaryTags: ['Vegetarian'],
    },
    {
      name: 'Peter Gibbons',
      email: 'peter@initech.com',
      company: 'Initech LLC',
      isOwner: false,
      canChooseDeliveryAddress: true,
      canChangeDeliveryTime: true,
      canChangePackaging: false,
      allergens: [],
      dietaryTags: [],
    },
  ];

  const seededEmployees: Record<string, any> = {};

  for (const emp of employeesData) {
    const companyId = companyMap.get(emp.company);
    if (!companyId) continue;

    const allergenIds = emp.allergens.map((a) => allergenMap.get(a)).filter(Boolean) as string[];
    const tagIds = emp.dietaryTags.map((t) => tagMap.get(t)).filter(Boolean) as string[];

    const employee = await prisma.employee.upsert({
      where: { email: emp.email },
      update: {
        name: emp.name,
        companyId,
        canChooseDeliveryAddress: emp.canChooseDeliveryAddress,
        canChangeDeliveryTime: emp.canChangeDeliveryTime,
        canChangePackaging: emp.canChangePackaging,
        isActive: true,
        allergens: {
          set: allergenIds.map((id) => ({ id })),
        },
        dietaryTags: {
          set: tagIds.map((id) => ({ id })),
        },
      },
      create: {
        name: emp.name,
        email: emp.email,
        companyId,
        canChooseDeliveryAddress: emp.canChooseDeliveryAddress,
        canChangeDeliveryTime: emp.canChangeDeliveryTime,
        canChangePackaging: emp.canChangePackaging,
        isActive: true,
        allergens: {
          connect: allergenIds.map((id) => ({ id })),
        },
        dietaryTags: {
          connect: tagIds.map((id) => ({ id })),
        },
      },
    });

    seededEmployees[emp.email] = employee;

    if (emp.isOwner) {
      await prisma.company.update({
        where: { id: companyId },
        data: { ownerId: employee.id },
      });
    }
  }

  return { employees: seededEmployees };
}
