import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { UserRole } from '../src/generated/prisma/enums.js';
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

    console.log(`✓ Seeded user: ${upserted.email} [${upserted.role}] (ID: ${upserted.id})`);
  }

  console.log('Database seed finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
