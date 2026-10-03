import { Prisma } from '../../../generated/prisma/client.js';

export const ZERO_MONEY = new Prisma.Decimal('0.00');

/**
 * Safely converts an input into a Prisma.Decimal with standard 2 decimal places.
 */
export function toDecimal(
  value: Prisma.Decimal | string | number | null | undefined,
): Prisma.Decimal {
  if (value === null || value === undefined) {
    return ZERO_MONEY;
  }
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(value);
}

/**
 * Adds two monetary Decimal values together.
 */
export function addMoney(
  a: Prisma.Decimal | string | number,
  b: Prisma.Decimal | string | number,
): Prisma.Decimal {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  return decA.plus(decB);
}

/**
 * Multiplies a monetary Decimal value by an integer quantity.
 */
export function multiplyMoney(
  price: Prisma.Decimal | string | number,
  quantity: number,
): Prisma.Decimal {
  const priceDec = toDecimal(price);
  const qtyDec = new Prisma.Decimal(quantity);
  return priceDec.times(qtyDec);
}

/**
 * Sums an array of monetary Decimal values.
 */
export function sumMoney(
  items: Array<Prisma.Decimal | string | number>,
): Prisma.Decimal {
  return items.reduce<Prisma.Decimal>((acc, item) => {
    return acc.plus(toDecimal(item));
  }, ZERO_MONEY);
}

/**
 * Formats a Decimal into a standard 2-decimal string (e.g. "12.50").
 */
export function formatMoney(
  value: Prisma.Decimal | string | number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '0.00';
  }
  const dec = toDecimal(value);
  return dec.toFixed(2);
}

/**
 * Rounds a Decimal to 2 decimal places.
 */
export function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}
