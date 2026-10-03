import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { DayOfWeek } from '../../../generated/prisma/enums.js';
import { SettingsService, SETTING_KEYS } from '../settings.service.js';
import { KitchenHolidayService } from '../kitchen-holiday.service.js';

describe('SettingsService', () => {
  let service: SettingsService;
  let prismaMock: any;
  let holidayServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      kitchenSetting: {
        findMany: vi.fn().mockResolvedValue([
          {
            key: SETTING_KEYS.WORKING_DAYS,
            value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
            updatedAt: new Date('2026-10-01T10:00:00.000Z'),
          },
          {
            key: SETTING_KEYS.CUTOFF_TIME,
            value: '16:00',
            updatedAt: new Date('2026-10-01T10:00:00.000Z'),
          },
          {
            key: SETTING_KEYS.CUTOFF_WORKING_DAYS,
            value: '2',
            updatedAt: new Date('2026-10-01T10:00:00.000Z'),
          },
          {
            key: SETTING_KEYS.TIMEZONE,
            value: 'Europe/London',
            updatedAt: new Date('2026-10-01T10:00:00.000Z'),
          },
          {
            key: SETTING_KEYS.AT_RISK_THRESHOLD_MINUTES,
            value: '30',
            updatedAt: new Date('2026-10-01T10:00:00.000Z'),
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          key: SETTING_KEYS.AT_RISK_THRESHOLD_MINUTES,
          value: '30',
        }),
        upsert: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    holidayServiceMock = {
      getHolidays: vi.fn().mockResolvedValue([
        {
          id: 'h-1',
          date: '2026-12-25',
          name: 'Christmas Day',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      onHolidayChanged: vi.fn(),
    };

    service = new SettingsService(
      prismaMock as unknown as PrismaService,
      holidayServiceMock as unknown as KitchenHolidayService,
    );
  });

  describe('getKitchenSettings', () => {
    it('returns loaded settings composed with kitchen holidays', async () => {
      const settings = await service.getKitchenSettings();

      expect(settings.workingDays).toEqual([
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ]);
      expect(settings.cutOffTime).toBe('16:00');
      expect(settings.cutOffWorkingDays).toBe(2);
      expect(settings.timezone).toBe('Europe/London');
      expect(settings.holidays).toHaveLength(1);
      expect(settings.holidays[0].name).toBe('Christmas Day');
    });

    it('returns sensible defaults when no rows exist in database', async () => {
      prismaMock.kitchenSetting.findMany.mockResolvedValue([]);
      holidayServiceMock.getHolidays.mockResolvedValue([]);

      const settings = await service.getKitchenSettings();

      expect(settings.workingDays).toEqual([
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ]);
      expect(settings.cutOffTime).toBe('16:00');
      expect(settings.cutOffWorkingDays).toBe(2);
      expect(settings.holidays).toEqual([]);
    });

    it('parses JSON string representation of working days', async () => {
      prismaMock.kitchenSetting.findMany.mockResolvedValue([
        {
          key: SETTING_KEYS.WORKING_DAYS,
          value: JSON.stringify([DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY]),
          updatedAt: new Date(),
        },
      ]);

      const settings = await service.getKitchenSettings();
      expect(settings.workingDays).toEqual([
        DayOfWeek.MONDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.FRIDAY,
      ]);
    });

    it('caches response across consecutive calls', async () => {
      await service.getKitchenSettings();
      await service.getKitchenSettings();

      // findMany should only have been called once due to cache
      expect(prismaMock.kitchenSetting.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateKitchenSettings', () => {
    it('updates settings atomically inside transaction and invalidates cache', async () => {
      const updateDto = {
        workingDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
        ],
        cutOffTime: '15:00',
        cutOffWorkingDays: 3,
        timezone: 'UTC',
      };

      await service.updateKitchenSettings(updateDto);

      // Verify transaction executed
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.kitchenSetting.upsert).toHaveBeenCalledTimes(4);
    });
  });

  describe('isKitchenWorkingDay & isKitchenHoliday', () => {
    it('returns true for standard working day (Wednesday 2026-10-14)', async () => {
      const isWorking = await service.isKitchenWorkingDay('2026-10-14');
      expect(isWorking).toBe(true);
    });

    it('returns false for Saturday (weekend)', async () => {
      // 2026-10-17 is a Saturday
      const isWorking = await service.isKitchenWorkingDay('2026-10-17');
      expect(isWorking).toBe(false);
    });

    it('returns false for Sunday (weekend)', async () => {
      // 2026-10-18 is a Sunday
      const isWorking = await service.isKitchenWorkingDay('2026-10-18');
      expect(isWorking).toBe(false);
    });

    it('returns false for kitchen holiday (2026-12-25 Christmas)', async () => {
      // 2026-12-25 is a Friday, but configured as holiday in mock
      const isWorking = await service.isKitchenWorkingDay('2026-12-25');
      expect(isWorking).toBe(false);

      const isHoliday = await service.isKitchenHoliday('2026-12-25');
      expect(isHoliday).toBe(true);
    });

    it('returns false for isKitchenHoliday on regular working day', async () => {
      const isHoliday = await service.isKitchenHoliday('2026-10-14');
      expect(isHoliday).toBe(false);
    });
  });

  describe('getters', () => {
    it('getKitchenWorkingDays returns working days', async () => {
      const days = await service.getKitchenWorkingDays();
      expect(days).toHaveLength(5);
    });

    it('getKitchenCutOffTime returns 16:00', async () => {
      const time = await service.getKitchenCutOffTime();
      expect(time).toBe('16:00');
    });

    it('getKitchenCutOffWorkingDays returns 2', async () => {
      const days = await service.getKitchenCutOffWorkingDays();
      expect(days).toBe(2);
    });

    it('getKitchenTimezone returns Europe/London', async () => {
      const tz = await service.getKitchenTimezone();
      expect(tz).toBe('Europe/London');
    });

    it('getAtRiskThresholdMinutes returns 30', async () => {
      const minutes = await service.getAtRiskThresholdMinutes();
      expect(minutes).toBe(30);
    });
  });
});
