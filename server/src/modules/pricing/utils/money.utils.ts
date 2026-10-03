import { Prisma } from '../../../generated/prisma/client.js';

const NICKEL_STEP = new Prisma.Decimal('0.05');
const ONE_HUNDRED = new Prisma.Decimal('100');
const ONE = new Prisma.Decimal('1');
const ZERO = new Prisma.Decimal('0');

/**
 * Safely converts an input into a Prisma.Decimal.
 *
 * @param value - Prisma.Decimal, string, or number
 * @returns Prisma.Decimal
 */
export function toDecimal(
  value: Prisma.Decimal | string | number,
): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(value);
}

/**
 * Rounds a Decimal up to the nearest nickel ($0.05).
 * Formula: ceil(price / 0.05) * 0.05
 *
 * Examples:
 * 2.10 -> 2.10
 * 2.11 -> 2.15
 * 2.14 -> 2.15
 * 2.15 -> 2.15
 * 2.16 -> 2.20
 * 2.19 -> 2.20
 * 2.20 -> 2.20
 *
 * @param amount - Prisma.Decimal to round
 * @returns Rounded Prisma.Decimal
 */
export function roundUpToNickel(amount: Prisma.Decimal): Prisma.Decimal {
  const steps = amount.dividedBy(NICKEL_STEP).ceil();
  const rounded = steps.times(NICKEL_STEP);
  // Guarantee exact 2-decimal scale
  return new Prisma.Decimal(rounded.toFixed(2));
}

/**
 * Computes derived price from cost using a multiplier and rounds up to the nearest $0.05.
 *
 * Example:
 * cost = $2.50, multiplier = 2.4 => $6.00
 *
 * @param cost - The base cost price (Prisma.Decimal)
 * @param multiplier - The tier multiplier (Prisma.Decimal)
 * @returns Derived price rounded up to $0.05
 */
export function calculateMultiplierPrice(
  cost: Prisma.Decimal | string | number,
  multiplier: Prisma.Decimal | string | number,
): Prisma.Decimal {
  const costDec = toDecimal(cost);
  const multDec = toDecimal(multiplier);
  const rawPrice = costDec.times(multDec);
  return roundUpToNickel(rawPrice);
}

/**
 * Computes derived price from a base tier price using a percentage markup and rounds up to the nearest $0.05.
 *
 * Formula: basePrice * (1 + percentage / 100)
 * Example:
 * Standard = $10.00, percentage = 15% => $11.50
 *
 * @param basePrice - Base tier price (Prisma.Decimal)
 * @param percentage - Percentage markup, e.g. 15 for 15% (Prisma.Decimal)
 * @returns Derived price rounded up to $0.05
 */
export function calculatePercentagePrice(
  basePrice: Prisma.Decimal | string | number,
  percentage: Prisma.Decimal | string | number,
): Prisma.Decimal {
  const baseDec = toDecimal(basePrice);
  const pctDec = toDecimal(percentage);
  const factor = ONE.plus(pctDec.dividedBy(ONE_HUNDRED));
  const rawPrice = baseDec.times(factor);
  return roundUpToNickel(rawPrice);
}

/**
 * Formats a Decimal into a standardized 2-decimal string representation (e.g. '12.50').
 * Returns null if the value is null or undefined.
 *
 * @param value - Prisma.Decimal, string, number, or null/undefined
 * @returns String representation e.g. '12.50' or null
 */
export function formatMoney(
  value: Prisma.Decimal | string | number | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const dec = toDecimal(value);
  return dec.toFixed(2);
}

/**
 * Validates that an amount is strictly positive (> 0).
 */
export function isPositivePrice(
  value: Prisma.Decimal | string | number,
): boolean {
  try {
    const dec = toDecimal(value);
    return dec.greaterThan(ZERO);
  } catch {
    return false;
  }
}
