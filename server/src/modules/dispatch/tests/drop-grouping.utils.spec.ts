import { describe, expect, it } from 'vitest';
import {
  calculateIsOnTime,
  createDropGroupingKey,
  getTodayDateString,
  normalizePostcode,
  normalizeString,
} from '../utils/drop-grouping.utils.js';

describe('Drop Grouping Utilities', () => {
  describe('normalizeString & normalizePostcode', () => {
    it('normalizes strings by trimming, lowercasing, and collapsing whitespace', () => {
      expect(normalizeString('  123   Main   Street  ')).toBe('123 main street');
      expect(normalizeString('London')).toBe('london');
      expect(normalizeString(null)).toBe('');
      expect(normalizeString(undefined)).toBe('');
    });

    it('normalizes postcodes by trimming, uppercasing, and removing internal whitespace', () => {
      expect(normalizePostcode('  sw1a   1aa  ')).toBe('SW1A1AA');
      expect(normalizePostcode('EC2M 4PL')).toBe('EC2M4PL');
      expect(normalizePostcode(null)).toBe('');
      expect(normalizePostcode(undefined)).toBe('');
    });
  });

  describe('createDropGroupingKey (Requirements 8, 9, 32, 33)', () => {
    const baseAddress = {
      street: '123 Main St',
      unit: 'Suite 400',
      city: 'London',
      postcode: 'SW1A 1AA',
    };

    it('produces the exact same key for same company, date, time, and address snapshot', () => {
      const key1 = createDropGroupingKey(
        'comp-1',
        '2026-10-14',
        '12:30',
        baseAddress,
      );
      const key2 = createDropGroupingKey(
        'comp-1',
        '2026-10-14T00:00:00.000Z',
        '12:30',
        {
          street: '  123  Main St  ',
          unit: 'suite 400',
          city: 'LONDON',
          postcode: 'sw1a 1aa',
        },
      );

      expect(key1).toBe(key2);
    });

    it('produces different keys for different companies', () => {
      const key1 = createDropGroupingKey('comp-google', '2026-10-14', '12:30', baseAddress);
      const key2 = createDropGroupingKey('comp-microsoft', '2026-10-14', '12:30', baseAddress);

      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different delivery dates', () => {
      const key1 = createDropGroupingKey('comp-1', '2026-10-14', '12:30', baseAddress);
      const key2 = createDropGroupingKey('comp-1', '2026-10-15', '12:30', baseAddress);

      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different delivery times', () => {
      const key1 = createDropGroupingKey('comp-1', '2026-10-14', '12:30', baseAddress);
      const key2 = createDropGroupingKey('comp-1', '2026-10-14', '12:45', baseAddress);

      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different streets', () => {
      const key1 = createDropGroupingKey('comp-1', '2026-10-14', '12:30', baseAddress);
      const key2 = createDropGroupingKey('comp-1', '2026-10-14', '12:30', {
        ...baseAddress,
        street: '456 Other St',
      });

      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different units', () => {
      const key1 = createDropGroupingKey('comp-1', '2026-10-14', '12:30', baseAddress);
      const key2 = createDropGroupingKey('comp-1', '2026-10-14', '12:30', {
        ...baseAddress,
        unit: 'Suite 500',
      });

      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different postcodes', () => {
      const key1 = createDropGroupingKey('comp-1', '2026-10-14', '12:30', baseAddress);
      const key2 = createDropGroupingKey('comp-1', '2026-10-14', '12:30', {
        ...baseAddress,
        postcode: 'W1A 1AA',
      });

      expect(key1).not.toBe(key2);
    });
  });

  describe('getTodayDateString (Requirement 28)', () => {
    it('formats today according to the specified timezone', () => {
      // Midnight in UTC: 2026-10-14T23:30:00Z -> In Tokyo (+9), it is 2026-10-15
      const date = new Date('2026-10-14T23:30:00.000Z');
      expect(getTodayDateString('UTC', date)).toBe('2026-10-14');
      expect(getTodayDateString('Asia/Tokyo', date)).toBe('2026-10-15');
    });
  });

  describe('calculateIsOnTime (Requirements 16, 26, 27, 28)', () => {
    const deliveryDate = '2026-10-14';
    const deliveryTime = '12:30';

    it('returns true when delivered before promised delivery time', () => {
      // Promised: 12:30 UTC. Delivered: 12:25 UTC
      const deliveredAt = new Date('2026-10-14T12:25:00.000Z');
      expect(calculateIsOnTime(deliveredAt, deliveryDate, deliveryTime, 'UTC')).toBe(true);
    });

    it('returns true when delivered exactly at promised delivery time', () => {
      // Promised: 12:30 UTC. Delivered: 12:30:00 UTC
      const deliveredAt = new Date('2026-10-14T12:30:00.000Z');
      expect(calculateIsOnTime(deliveredAt, deliveryDate, deliveryTime, 'UTC')).toBe(true);
    });

    it('returns false when delivered after promised delivery time', () => {
      // Promised: 12:30 UTC. Delivered: 12:31:00 UTC
      const deliveredAt = new Date('2026-10-14T12:31:00.000Z');
      expect(calculateIsOnTime(deliveredAt, deliveryDate, deliveryTime, 'UTC')).toBe(false);
    });
  });
});
