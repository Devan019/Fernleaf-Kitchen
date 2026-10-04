import { UserRole } from '../src/generated/prisma/enums.js';
import { prisma, hashPassword } from './utils.js';

export interface SeedUserDef {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const SEED_USERS: SeedUserDef[] = [
  // 1. Mandatory Fixed Login Accounts (Section 3)
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

  // 2. Additional Admin Users (Section 4)
  {
    name: 'Emma Wilson',
    email: 'admin2@test.com',
    password: 'Test@1234',
    role: UserRole.ADMIN,
  },
  {
    name: 'Michael Brown',
    email: 'admin3@test.com',
    password: 'Test@1234',
    role: UserRole.ADMIN,
  },

  // 3. Additional Kitchen Staff (Section 4)
  {
    name: 'James Carter',
    email: 'kitchen2@test.com',
    password: 'Test@1234',
    role: UserRole.KITCHEN,
  },
  {
    name: 'Olivia Martin',
    email: 'kitchen3@test.com',
    password: 'Test@1234',
    role: UserRole.KITCHEN,
  },
  {
    name: 'Noah Anderson',
    email: 'kitchen4@test.com',
    password: 'Test@1234',
    role: UserRole.KITCHEN,
  },
  {
    name: 'Sophia Taylor',
    email: 'kitchen5@test.com',
    password: 'Test@1234',
    role: UserRole.KITCHEN,
  },

  // 4. Additional Dispatch Staff (Section 4)
  {
    name: 'Daniel Thomas',
    email: 'dispatch2@test.com',
    password: 'Test@1234',
    role: UserRole.DISPATCH,
  },
  {
    name: 'Emily Harris',
    email: 'dispatch3@test.com',
    password: 'Test@1234',
    role: UserRole.DISPATCH,
  },
  {
    name: 'William Clark',
    email: 'dispatch4@test.com',
    password: 'Test@1234',
    role: UserRole.DISPATCH,
  },

  // 5. Additional Driver Staff (Section 4 & 13)
  {
    name: 'Liam Walker',
    email: 'driver2@test.com',
    password: 'Test@1234',
    role: UserRole.DRIVER,
  },
  {
    name: 'Ava Lewis',
    email: 'driver3@test.com',
    password: 'Test@1234',
    role: UserRole.DRIVER,
  },
  {
    name: 'Ethan Young',
    email: 'driver4@test.com',
    password: 'Test@1234',
    role: UserRole.DRIVER,
  },
  {
    name: 'Mia Hall',
    email: 'driver5@test.com',
    password: 'Test@1234',
    role: UserRole.DRIVER,
  },
  {
    name: 'Lucas Allen',
    email: 'driver6@test.com',
    password: 'Test@1234',
    role: UserRole.DRIVER,
  },
];

export async function seedUsers() {
  const defaultPasswordHash = await hashPassword('Test@1234');
  let count = 0;

  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash: defaultPasswordHash,
        isActive: true,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash: defaultPasswordHash,
        role: user.role,
        isActive: true,
      },
    });
    count++;
  }

  return { count };
}
