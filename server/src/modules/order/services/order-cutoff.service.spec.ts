import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { DayOfWeek } from '../../../generated/prisma/enums.js';
import { OrderCutoffService } from './order-cutoff.service.js';

describe('OrderCutoffService', () => {
  let service: OrderCutoffService;
  let prismaMock: any;
  let settingsServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      kitchenSetting: {
        findMany: vi.fn(),
      },
      kitchenHoliday: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      order: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      orderStatusHistory: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    settingsServiceMock = {
      getKitchenSettings: vi.fn().mockResolvedValue({
        workingDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        cutOffTime: '16:00',
        cutOffWorkingDays: 2,
        timezone: 'UTC',
        holidays: [],
        updatedAt: new Date(),
      }),
      isKitchenWorkingDay: vi.fn(async (date: Date | string) => {
        const dateStr =
          typeof date === 'string'
            ? date.substring(0, 10)
            : date.toISOString().substring(0, 10);
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        const dow = dateObj.getUTCDay();
        if (dow === 0 || dow === 6) return false;
        const holidays = await prismaMock.kitchenHoliday.findMany();
        const isHoliday = holidays.some(
          (h: any) => h.date.toISOString().substring(0, 10) === dateStr,
        );
        return !isHoliday;
      }),
    };

    service = new OrderCutoffService(
      prismaMock as unknown as PrismaService,
      settingsServiceMock,
    );
  });

  describe('calculateCutoff', () => {
    it('calculates 2 kitchen working days backwards for Wednesday delivery (normal week)', async () => {
      // 2026-10-14 is a Wednesday
      // Tuesday = 1 working day back
      // Monday = 2 working days back -> Cut-off is Monday 2026-10-12 at 16:00 UTC
      const result = await service.calculateCutoff('2026-10-14');

      expect(result.workingDaysCount).toBe(2);
      expect(result.cutoffDateTime.toISOString()).toBe('2026-10-12T16:00:00.000Z');
    });

    it('skips weekends when calculating cutoff for Monday delivery', async () => {
      // 2026-10-12 is a Monday
      // Sunday (skipped, weekend)
      // Saturday (skipped, weekend)
      // Friday 2026-10-09 = 1 working day back
      // Thursday 2026-10-08 = 2 working days back -> Cutoff is Thursday 16:00 UTC
      const result = await service.calculateCutoff('2026-10-12');

      expect(result.workingDaysCount).toBe(2);
      expect(result.cutoffDateTime.toISOString()).toBe('2026-10-08T16:00:00.000Z');
    });

    it('skips kitchen holidays when calculating cutoff', async () => {
      // Wednesday delivery: 2026-10-14
      // Tuesday 2026-10-13 = 1
      // Monday 2026-10-12 is a Kitchen Holiday (skipped)
      // Sunday, Saturday (skipped weekends)
      // Friday 2026-10-09 = 2 working days back -> Cutoff is Friday 2026-10-09 16:00 UTC
      prismaMock.kitchenHoliday.findMany.mockResolvedValue([
        { date: new Date('2026-10-12T00:00:00.000Z') },
      ]);

      const result = await service.calculateCutoff('2026-10-14');

      expect(result.workingDaysCount).toBe(2);
      expect(result.cutoffDateTime.toISOString()).toBe('2026-10-09T16:00:00.000Z');
    });
  });

  describe('isPastCutoff', () => {
    it('returns false when current time is before cut-off', async () => {
      // Cutoff is 2026-10-12 16:00:00 UTC
      const currentTime = new Date('2026-10-12T14:30:00.000Z');
      const isPast = await service.isPastCutoff('2026-10-14', currentTime);
      expect(isPast).toBe(false);
    });

    it('returns true when current time is after cut-off', async () => {
      // Cutoff is 2026-10-12 16:00:00 UTC
      const currentTime = new Date('2026-10-12T16:01:00.000Z');
      const isPast = await service.isPastCutoff('2026-10-14', currentTime);
      expect(isPast).toBe(true);
    });
  });

  describe('processCutoffForDate', () => {
    it('cancels DRAFT orders and confirms PLACED orders idempotently', async () => {
      prismaMock.order.findMany
        .mockResolvedValueOnce([{ id: 'draft-1' }, { id: 'draft-2' }]) // drafts
        .mockResolvedValueOnce([{ id: 'placed-1' }]); // placed

      const result = await service.processCutoffForDate('2026-10-14', 'admin-id');

      expect(result.cancelledDrafts).toBe(2);
      expect(result.confirmedPlaced).toBe(1);
      expect(prismaMock.order.updateMany).toHaveBeenCalledTimes(2);

      // Verify second run with 0 eligible orders is safe and idempotent
      prismaMock.order.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const secondRun = await service.processCutoffForDate('2026-10-14', 'admin-id');
      expect(secondRun.cancelledDrafts).toBe(0);
      expect(secondRun.confirmedPlaced).toBe(0);
    });
  });
});
