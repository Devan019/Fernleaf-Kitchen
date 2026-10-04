import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword as argonHashPassword } from '../src/common/utils/index.js';

const connectionString = process.env.DATABASE_URL as string;
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
export { Prisma };

export async function hashPassword(password: string): Promise<string> {
  return argonHashPassword(password);
}

/**
 * Normalizes string for grouping
 */
export function normalizeString(val: string | null | undefined): string {
  if (!val) return '';
  return val.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizePostcode(val: string | null | undefined): string {
  if (!val) return '';
  return val.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Deterministically constructs a grouping key for drop reconciliation.
 */
export function createDropGroupingKey(
  companyId: string,
  deliveryDateStr: string,
  deliveryTime: string,
  address: {
    street: string;
    unit?: string | null;
    city: string;
    postcode: string;
  },
): string {
  const normCompany = companyId.trim();
  const normDate = deliveryDateStr.substring(0, 10).trim();
  const normTime = deliveryTime.trim();
  const normStreet = normalizeString(address.street);
  const normUnit = normalizeString(address.unit);
  const normCity = normalizeString(address.city);
  const normPostcode = normalizePostcode(address.postcode);

  return `${normCompany}::${normDate}::${normTime}::${normStreet}::${normUnit}::${normCity}::${normPostcode}`;
}

export function getTodayDate(): { todayDate: Date; dateStr: string } {
  const dateStr = '2026-10-04'; // Testing date: Sunday 2026-10-04
  const todayDate = new Date(`${dateStr}T00:00:00.000Z`);
  return { todayDate, dateStr };
}
