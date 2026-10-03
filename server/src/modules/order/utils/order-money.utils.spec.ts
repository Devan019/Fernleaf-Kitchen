import { describe, expect, it } from 'vitest';
import { Prisma } from '../../../generated/prisma/client.js';
import {
  addMoney,
  formatMoney,
  multiplyMoney,
  roundMoney,
  sumMoney,
  toDecimal,
} from './order-money.utils.js';

describe('order-money.utils', () => {
  it('converts number/string/Decimal correctly', () => {
    expect(toDecimal(10.5).toString()).toBe('10.5');
    expect(toDecimal('14.25').toString()).toBe('14.25');
    expect(toDecimal(new Prisma.Decimal('5.00')).toString()).toBe('5');
    expect(toDecimal(null).toString()).toBe('0');
  });

  it('adds money precisely without floating point issues', () => {
    // In JS float: 0.1 + 0.2 = 0.30000000000000004
    const result = addMoney('0.10', '0.20');
    expect(result.toString()).toBe('0.3');
    expect(formatMoney(result)).toBe('0.30');
  });

  it('multiplies money by quantity', () => {
    const result = multiplyMoney('12.25', 10);
    expect(result.toString()).toBe('122.5');
    expect(formatMoney(result)).toBe('122.50');
  });

  it('sums array of monetary values', () => {
    const items = ['10.50', '20.25', '5.00', 4.25];
    const total = sumMoney(items);
    expect(formatMoney(total)).toBe('40.00');
  });

  it('formats money to 2 decimal places string', () => {
    expect(formatMoney(new Prisma.Decimal('12.5'))).toBe('12.50');
    expect(formatMoney(null)).toBe('0.00');
    expect(formatMoney(undefined)).toBe('0.00');
    expect(formatMoney('0')).toBe('0.00');
  });

  it('rounds money correctly', () => {
    const dec = new Prisma.Decimal('15.678');
    expect(roundMoney(dec).toString()).toBe('15.68');
  });
});
