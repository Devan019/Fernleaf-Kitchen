import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsController } from '../settings.controller.js';
import { SettingsService } from '../settings.service.js';
import { KitchenHolidayService } from '../kitchen-holiday.service.js';
import { DayOfWeek } from '../../../generated/prisma/enums.js';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsServiceMock: any;
  let holidayServiceMock: any;

  beforeEach(() => {
    settingsServiceMock = {
      getKitchenSettings: vi.fn().mockResolvedValue({
        workingDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY],
        cutOffTime: '16:00',
        cutOffWorkingDays: 2,
        timezone: 'Europe/London',
        holidays: [],
        updatedAt: new Date(),
      }),
      updateKitchenSettings: vi.fn().mockResolvedValue({
        workingDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY],
        cutOffTime: '15:00',
        cutOffWorkingDays: 3,
        timezone: 'UTC',
        holidays: [],
        updatedAt: new Date(),
      }),
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
      getHolidayById: vi.fn().mockResolvedValue({
        id: 'h-1',
        date: '2026-12-25',
        name: 'Christmas Day',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      createHoliday: vi.fn().mockResolvedValue({
        id: 'h-new',
        date: '2027-01-01',
        name: "New Year's Day",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateHoliday: vi.fn().mockResolvedValue({
        id: 'h-1',
        date: '2026-12-25',
        name: 'Christmas Day (Updated)',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      deleteHoliday: vi.fn().mockResolvedValue({
        success: true,
        message: 'Kitchen holiday deleted successfully',
      }),
    };

    controller = new SettingsController(
      settingsServiceMock as unknown as SettingsService,
      holidayServiceMock as unknown as KitchenHolidayService,
    );
  });

  it('delegates getKitchenSettings to SettingsService', async () => {
    const result = await controller.getKitchenSettings();
    expect(result.cutOffTime).toBe('16:00');
    expect(settingsServiceMock.getKitchenSettings).toHaveBeenCalled();
  });

  it('delegates updateKitchenSettings to SettingsService', async () => {
    const dto = { cutOffTime: '15:00', cutOffWorkingDays: 3 };
    const result = await controller.updateKitchenSettings(dto);
    expect(result.cutOffTime).toBe('15:00');
    expect(settingsServiceMock.updateKitchenSettings).toHaveBeenCalledWith(dto);
  });

  it('delegates getKitchenHolidays to KitchenHolidayService', async () => {
    const result = await controller.getKitchenHolidays();
    expect(result).toHaveLength(1);
    expect(holidayServiceMock.getHolidays).toHaveBeenCalled();
  });

  it('delegates getKitchenHolidayById to KitchenHolidayService', async () => {
    const result = await controller.getKitchenHolidayById('h-1');
    expect(result.id).toBe('h-1');
    expect(holidayServiceMock.getHolidayById).toHaveBeenCalledWith('h-1');
  });

  it('delegates createKitchenHoliday to KitchenHolidayService', async () => {
    const dto = { date: '2027-01-01', name: "New Year's Day" };
    const result = await controller.createKitchenHoliday(dto);
    expect(result.id).toBe('h-new');
    expect(holidayServiceMock.createHoliday).toHaveBeenCalledWith(dto);
  });

  it('delegates updateKitchenHoliday to KitchenHolidayService', async () => {
    const dto = { name: 'Christmas Day (Updated)' };
    const result = await controller.updateKitchenHoliday('h-1', dto);
    expect(result.name).toBe('Christmas Day (Updated)');
    expect(holidayServiceMock.updateHoliday).toHaveBeenCalledWith('h-1', dto);
  });

  it('delegates deleteKitchenHoliday to KitchenHolidayService', async () => {
    const result = await controller.deleteKitchenHoliday('h-1');
    expect(result.success).toBe(true);
    expect(holidayServiceMock.deleteHoliday).toHaveBeenCalledWith('h-1');
  });
});
