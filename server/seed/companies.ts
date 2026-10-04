import { DayOfWeek } from '../src/generated/prisma/enums.js';
import { prisma } from './utils.js';

export async function seedCompanies() {
  const driverUser1 = await prisma.user.findUnique({ where: { email: 'driver@test.com' } });
  const driverUser2 = await prisma.user.findUnique({ where: { email: 'driver2@test.com' } });
  const driverUser3 = await prisma.user.findUnique({ where: { email: 'driver3@test.com' } });
  const driverUser4 = await prisma.user.findUnique({ where: { email: 'driver4@test.com' } });

  const companyData = [
    {
      name: 'Google',
      billingContactName: 'Sundar Pichai',
      billingContactEmail: 'billing@google.com',
      billingContactPhone: '+1-650-253-0000',
      domains: ['google.com', 'alphabet.com'],
      workingDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY, // OPEN TODAY (Sunday 2026-10-04)
      ],
      defaultDeliveryTime: '12:00',
      leaveKitchenMinutes: 60,
      defaultPackagingType: 'ECO_BOX',
      standingDriverInstructions: 'Deliver to main reception, ask for cafeteria dispatch',
      defaultDriverId: driverUser1 ? driverUser1.id : null,
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
      name: 'Microsoft',
      billingContactName: 'Satya Nadella',
      billingContactEmail: 'billing@microsoft.com',
      billingContactPhone: '+1-425-882-8080',
      domains: ['microsoft.com', 'msft.com'],
      workingDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY, // OPEN TODAY (Sunday 2026-10-04)
      ],
      defaultDeliveryTime: '12:30',
      leaveKitchenMinutes: 45,
      defaultPackagingType: 'STANDARD',
      standingDriverInstructions: 'Building 92 Visitor Center desk check-in',
      defaultDriverId: driverUser2 ? driverUser2.id : null,
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
      name: 'Globex Inc',
      billingContactName: 'Hank Scorpio',
      billingContactEmail: 'billing@globex.com',
      billingContactPhone: '+1-555-0200',
      domains: ['globex.com'],
      workingDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY, // OPEN TODAY (Sunday 2026-10-04)
      ],
      defaultDeliveryTime: '12:30',
      leaveKitchenMinutes: 60,
      defaultPackagingType: 'ECO_BOX',
      standingDriverInstructions: 'Security desk elevator pass required',
      defaultDriverId: driverUser3 ? driverUser3.id : null,
      addresses: [
        {
          label: 'Globex Tower',
          street: '200 Globex Blvd',
          city: 'Chicago',
          postcode: 'IL 60601',
          deliveryInstructions: 'Security check at freight elevator',
          isDefault: true,
        },
      ],
      holidays: [],
    },
    {
      name: 'Acme Corp',
      billingContactName: 'Wile E. Coyote',
      billingContactEmail: 'billing@acme.com',
      billingContactPhone: '+1-555-0100',
      domains: ['acme.com'],
      workingDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY, // CLOSED SUNDAY
      ],
      defaultDeliveryTime: '12:30',
      leaveKitchenMinutes: 60,
      defaultPackagingType: 'ECO_BOX',
      standingDriverInstructions: 'Please call before arrival',
      defaultDriverId: driverUser1 ? driverUser1.id : null,
      addresses: [
        {
          label: 'Acme Headquarters',
          street: '100 Acme Way',
          city: 'Austin',
          postcode: 'TX 78701',
          deliveryInstructions: 'Main lobby receptionist',
          isDefault: true,
        },
      ],
      holidays: [],
    },
    {
      name: 'TCS',
      billingContactName: 'Rajesh Gopinathan',
      billingContactEmail: 'billing@tcs.com',
      billingContactPhone: '+91-22-6778-9999',
      domains: ['tcs.com', 'tataconsultancy.com'],
      workingDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY, // CLOSED SUNDAY
      ],
      defaultDeliveryTime: '12:30',
      leaveKitchenMinutes: 60,
      defaultPackagingType: 'ECO_BOX',
      standingDriverInstructions: 'Security check at Gate 2',
      defaultDriverId: driverUser4 ? driverUser4.id : null,
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
      name: 'Initech LLC',
      billingContactName: 'Bill Lumbergh',
      billingContactEmail: 'billing@initech.com',
      billingContactPhone: '+1-555-0300',
      domains: ['initech.com'],
      workingDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY, // CLOSED SUNDAY
      ],
      defaultDeliveryTime: '12:30',
      leaveKitchenMinutes: 60,
      defaultPackagingType: 'ECO_BOX',
      standingDriverInstructions: 'Deliver to back loading dock',
      defaultDriverId: driverUser2 ? driverUser2.id : null,
      addresses: [
        {
          label: 'Initech Office Park',
          street: '4120 Freidrich Lane',
          city: 'Austin',
          postcode: 'TX 78744',
          deliveryInstructions: 'Deliver to 2nd floor pantry',
          isDefault: true,
        },
      ],
      holidays: [],
    },
  ];

  const seededCompanies: Record<string, any> = {};

  for (const comp of companyData) {
    const record = await prisma.company.upsert({
      where: { name: comp.name },
      update: {
        billingContactName: comp.billingContactName,
        billingContactEmail: comp.billingContactEmail,
        billingContactPhone: comp.billingContactPhone,
        workingDays: comp.workingDays,
        defaultDeliveryTime: comp.defaultDeliveryTime,
        leaveKitchenMinutes: comp.leaveKitchenMinutes,
        defaultPackagingType: comp.defaultPackagingType,
        standingDriverInstructions: comp.standingDriverInstructions,
        defaultDriverId: comp.defaultDriverId,
        isActive: true,
      },
      create: {
        name: comp.name,
        billingContactName: comp.billingContactName,
        billingContactEmail: comp.billingContactEmail,
        billingContactPhone: comp.billingContactPhone,
        workingDays: comp.workingDays,
        defaultDeliveryTime: comp.defaultDeliveryTime,
        leaveKitchenMinutes: comp.leaveKitchenMinutes,
        defaultPackagingType: comp.defaultPackagingType,
        standingDriverInstructions: comp.standingDriverInstructions,
        defaultDriverId: comp.defaultDriverId,
        isActive: true,
      },
    });

    seededCompanies[comp.name] = record;

    // Domains
    for (const domain of comp.domains) {
      await prisma.companyEmailDomain.upsert({
        where: { domain },
        update: { companyId: record.id },
        create: { domain, companyId: record.id },
      });
    }

    // Addresses
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
            deliveryInstructions: addr.deliveryInstructions,
            isDefault: addr.isDefault,
          },
        });
      } else {
        await prisma.deliveryAddress.update({
          where: { id: existingAddr.id },
          data: {
            label: addr.label,
            city: addr.city,
            postcode: addr.postcode,
            deliveryInstructions: addr.deliveryInstructions,
            isDefault: addr.isDefault,
          },
        });
      }
    }

    // Holidays
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

  return { companies: seededCompanies };
}
