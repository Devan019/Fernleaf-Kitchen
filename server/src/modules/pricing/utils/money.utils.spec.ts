import { describe, expect, it } from 'vitest';
import { Prisma } from '../../../generated/prisma/client.js';
import {
  calculateMultiplierPrice,
  calculatePercentagePrice,
  formatMoney,
  isPositivePrice,
  roundUpToNickel,
  toDecimal,
} from './money.utils.js';

describe('money.utils', () => {
  describe('roundUpToNickel', () => {
    it('rounds prices UP to the next $0.05 strictly as specified', () => {
      // Required explicit test cases from assignment:
      // 2.10 -> 2.10
      // 2.11 -> 2.15
      // 2.14 -> 2.15
      // 2.15 -> 2.15
      // 2.16 -> 2.20
      // 2.19 -> 2.20
      // 2.20 -> 2.20
      expect(roundUpToNickel(new Prisma.Decimal('2.10')).toFixed(2)).toBe(
        '2.10',
      );
      expect(roundUpToNickel(new Prisma.Decimal('2.11')).toFixed(2)).toBe(
        '2.15',
      );
      expect(roundUpToNickel(new Prisma.Decimal('2.14')).toFixed(2)).toBe(
        '2.15',
      );
      expect(roundUpToNickel(new Prisma.Decimal('2.15')).toFixed(2)).toBe(
        '2.15',
      );
      expect(roundUpToNickel(new Prisma.Decimal('2.16')).toFixed(2)).toBe(
        '2.20',
      );
      expect(roundUpToNickel(new Prisma.Decimal('2.19')).toFixed(2)).toBe(
        '2.20',
      );
      expect(roundUpToNickel(new Prisma.Decimal('2.20')).toFixed(2)).toBe(
        '2.20',
      );
    });

    it('handles exact nickel values without modifying them', () => {
      expect(roundUpToNickel(new Prisma.Decimal('0.05')).toFixed(2)).toBe(
        '0.05',
      );
      expect(roundUpToNickel(new Prisma.Decimal('1.00')).toFixed(2)).toBe(
        '1.00',
      );
      expect(roundUpToNickel(new Prisma.Decimal('10.50')).toFixed(2)).toBe(
        '10.50',
      );
      expect(roundUpToNickel(new Prisma.Decimal('10.55')).toFixed(2)).toBe(
        '10.55',
      );
    });

    it('rounds fractional cents up to the next nickel', () => {
      // 2.101 -> 2.15
      expect(roundUpToNickel(new Prisma.Decimal('2.101')).toFixed(2)).toBe(
        '2.15',
      );
      // 10.0001 -> 10.05
      expect(roundUpToNickel(new Prisma.Decimal('10.0001')).toFixed(2)).toBe(
        '10.05',
      );
    });
  });

  describe('calculateMultiplierPrice', () => {
    it('calculates cost * multiplier and rounds up to the next $0.05', () => {
      // Example: cost = 2.50, multiplier = 2.4 => 6.00
      const result1 = calculateMultiplierPrice('2.50', '2.4');
      expect(result1.toFixed(2)).toBe('6.00');

      // cost = 4.20, multiplier = 2.4 => raw 10.08 => 10.10
      const result2 = calculateMultiplierPrice('4.20', '2.4');
      expect(result2.toFixed(2)).toBe('10.10');

      // cost = 5.50, multiplier = 2.4 => raw 13.20 => 13.20
      const result3 = calculateMultiplierPrice('5.50', '2.4');
      expect(result3.toFixed(2)).toBe('13.20');
    });

    it('operates purely with Decimal and avoids floating point inaccuracies', () => {
      // 0.1 * 3 = 0.30000000000000004 in IEEE 754, but Decimal should be exact 0.30
      const result = calculateMultiplierPrice('0.10', '3');
      expect(result.toFixed(2)).toBe('0.30');
    });
  });

  describe('calculatePercentagePrice', () => {
    it('calculates basePrice + percentage and rounds up to next $0.05', () => {
      // Standard = 10.00, percentage = 15% => 11.50
      const result1 = calculatePercentagePrice('10.00', '15');
      expect(result1.toFixed(2)).toBe('11.50');

      // Base = 11.50, percentage = 15% => raw 13.225 => 13.25
      const result2 = calculatePercentagePrice('11.50', '15');
      expect(result2.toFixed(2)).toBe('13.25');

      // Base = 9.50, percentage = 15% => raw 10.925 => 10.95
      const result3 = calculatePercentagePrice('9.50', '15');
      expect(result3.toFixed(2)).toBe('10.95');
    });

    it('supports 0% markup', () => {
      const result = calculatePercentagePrice('10.00', '0');
      expect(result.toFixed(2)).toBe('10.00');
    });
  });

  describe('formatMoney and toDecimal', () => {
    it('formats Decimal to 2 decimal string', () => {
      expect(formatMoney(new Prisma.Decimal('12.5'))).toBe('12.50');
      expect(formatMoney(null)).toBeNull();
      expect(formatMoney(undefined)).toBeNull();
    });

    it('safely converts numbers, strings, and Decimals to Decimal', () => {
      expect(toDecimal('4.50')).toBeInstanceOf(Prisma.Decimal);
      expect(toDecimal(4.5).toFixed(2)).toBe('4.50');
      const dec = new Prisma.Decimal('10.00');
      expect(toDecimal(dec)).toBe(dec);
    });

    it('validates positive prices', () => {
      expect(isPositivePrice('10.00')).toBe(true);
      expect(isPositivePrice('0.00')).toBe(false);
      expect(isPositivePrice('-5.00')).toBe(false);
      expect(isPositivePrice('invalid')).toBe(false);
    });
  });
});
