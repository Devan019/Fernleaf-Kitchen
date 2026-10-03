import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { DayOfWeek } from '../../generated/prisma/enums.js';
import { KitchenHolidayService } from './kitchen-holiday.service.js';
import { UpdateKitchenSettingsDto } from './dto/index.js';
import type {
  KitchenSettingsConfig,
  KitchenSettingsResponse,
} from './types/settings.types.js';

const DAY_OF_WEEK_MAP: readonly DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
] as const;

export const DEFAULT_WORKING_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
];

export const DEFAULT_CUTOFF_TIME = '16:00';
export const DEFAULT_CUTOFF_WORKING_DAYS = 2;
export const DEFAULT_TIMEZONE = 'Europe/London';
export const DEFAULT_AT_RISK_THRESHOLD_MINUTES = 30;

export const SETTING_KEYS = {
  WORKING_DAYS: 'KITCHEN_WORKING_DAYS',
  CUTOFF_TIME: 'CUTOFF_TIME',
  CUTOFF_WORKING_DAYS: 'CUTOFF_WORKING_DAYS',
  TIMEZONE: 'KITCHEN_TIMEZONE',
  AT_RISK_THRESHOLD_MINUTES: 'AT_RISK_THRESHOLD_MINUTES',
} as const;

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  // In-process cache for kitchen settings
  private cachedSettings: KitchenSettingsResponse | null = null;
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 10_000; // 10 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly holidayService: KitchenHolidayService,
  ) {}

  onModuleInit(): void {
    // Invalidate settings cache whenever kitchen holidays change
    this.holidayService.onHolidayChanged(() => {
      this.invalidateCache();
    });
  }

  /**
   * Invalidate the in-process settings cache immediately.
   */
  invalidateCache(): void {
    this.cachedSettings = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Parse working days from stored string format (comma-separated or JSON).
   */
  private parseWorkingDays(raw?: string | null): DayOfWeek[] {
    if (!raw || !raw.trim()) {
      return [...DEFAULT_WORKING_DAYS];
    }

    try {
      if (raw.trim().startsWith('[')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((d): d is DayOfWeek =>
            Object.values(DayOfWeek).includes(d),
          );
        }
      }
    } catch {
      // Fallback to comma-separated parsing
    }

    const items = raw
      .split(',')
      .map((d) => d.trim().toUpperCase())
      .filter((d): d is DayOfWeek =>
        Object.values(DayOfWeek).includes(d as DayOfWeek),
      );

    return items.length > 0 ? items : [...DEFAULT_WORKING_DAYS];
  }

  /**
   * Retrieve platform-wide kitchen settings, composed with current kitchen holidays.
   */
  async getKitchenSettings(): Promise<KitchenSettingsResponse> {
    const nowMs = Date.now();
    if (this.cachedSettings && nowMs < this.cacheExpiresAt) {
      return this.cachedSettings;
    }

    const records = await this.prisma.kitchenSetting.findMany({
      where: {
        key: {
          in: [
            SETTING_KEYS.WORKING_DAYS,
            SETTING_KEYS.CUTOFF_TIME,
            SETTING_KEYS.CUTOFF_WORKING_DAYS,
            SETTING_KEYS.TIMEZONE,
            SETTING_KEYS.AT_RISK_THRESHOLD_MINUTES,
          ],
        },
      },
    });

    const map = new Map(records.map((r) => [r.key, r.value]));

    const workingDays = this.parseWorkingDays(map.get(SETTING_KEYS.WORKING_DAYS));
    const cutOffTime = map.get(SETTING_KEYS.CUTOFF_TIME) || DEFAULT_CUTOFF_TIME;
    const cutOffWorkingDays = parseInt(
      map.get(SETTING_KEYS.CUTOFF_WORKING_DAYS) || String(DEFAULT_CUTOFF_WORKING_DAYS),
      10,
    );
    const timezone =
      map.get(SETTING_KEYS.TIMEZONE) ||
      process.env.KITCHEN_TIMEZONE ||
      DEFAULT_TIMEZONE;

    // Fetch kitchen holidays
    const holidays = await this.holidayService.getHolidays();

    // Determine latest updatedAt
    let latestUpdatedAt = new Date(0);
    for (const r of records) {
      if (r.updatedAt && r.updatedAt > latestUpdatedAt) {
        latestUpdatedAt = r.updatedAt;
      }
    }
    if (latestUpdatedAt.getTime() === 0) {
      latestUpdatedAt = new Date();
    }

    const response: KitchenSettingsResponse = {
      workingDays,
      cutOffTime,
      cutOffWorkingDays: isNaN(cutOffWorkingDays) ? DEFAULT_CUTOFF_WORKING_DAYS : cutOffWorkingDays,
      timezone,
      holidays,
      updatedAt: latestUpdatedAt,
    };

    this.cachedSettings = response;
    this.cacheExpiresAt = nowMs + this.CACHE_TTL_MS;

    return response;
  }

  /**
   * Helper returning the legacy config shape if needed by callers.
   */
  async getKitchenSettingsConfig(): Promise<KitchenSettingsConfig> {
    const s = await this.getKitchenSettings();
    return {
      cutoffTime: s.cutOffTime,
      cutoffWorkingDays: s.cutOffWorkingDays,
      kitchenWorkingDays: s.workingDays,
      timezone: s.timezone,
    };
  }

  /**
   * Update platform-wide kitchen settings atomically in a single transaction.
   */
  async updateKitchenSettings(
    dto: UpdateKitchenSettingsDto,
  ): Promise<KitchenSettingsResponse> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (dto.workingDays !== undefined) {
        const val = dto.workingDays.join(',');
        await tx.kitchenSetting.upsert({
          where: { key: SETTING_KEYS.WORKING_DAYS },
          update: { value: val, updatedAt: now },
          create: {
            id: randomUUID(),
            key: SETTING_KEYS.WORKING_DAYS,
            value: val,
            description: 'Kitchen operating working days',
            updatedAt: now,
          },
        });
      }

      if (dto.cutOffTime !== undefined) {
        await tx.kitchenSetting.upsert({
          where: { key: SETTING_KEYS.CUTOFF_TIME },
          update: { value: dto.cutOffTime, updatedAt: now },
          create: {
            id: randomUUID(),
            key: SETTING_KEYS.CUTOFF_TIME,
            value: dto.cutOffTime,
            description: 'Kitchen cut-off time in HH:mm',
            updatedAt: now,
          },
        });
      }

      if (dto.cutOffWorkingDays !== undefined) {
        const val = String(dto.cutOffWorkingDays);
        await tx.kitchenSetting.upsert({
          where: { key: SETTING_KEYS.CUTOFF_WORKING_DAYS },
          update: { value: val, updatedAt: now },
          create: {
            id: randomUUID(),
            key: SETTING_KEYS.CUTOFF_WORKING_DAYS,
            value: val,
            description:
              'Number of kitchen working days prior to delivery date',
            updatedAt: now,
          },
        });
      }

      if (dto.timezone !== undefined) {
        await tx.kitchenSetting.upsert({
          where: { key: SETTING_KEYS.TIMEZONE },
          update: { value: dto.timezone, updatedAt: now },
          create: {
            id: randomUUID(),
            key: SETTING_KEYS.TIMEZONE,
            value: dto.timezone,
            description: 'Kitchen operational timezone',
            updatedAt: now,
          },
        });
      }
    });

    this.invalidateCache();
    this.logger.log('Updated kitchen settings configuration');
    return this.getKitchenSettings();
  }

  /**
   * Retrieve kitchen operational working days.
   */
  async getKitchenWorkingDays(): Promise<DayOfWeek[]> {
    const settings = await this.getKitchenSettings();
    return settings.workingDays;
  }

  /**
   * Retrieve kitchen cut-off time (HH:mm).
   */
  async getKitchenCutOffTime(): Promise<string> {
    const settings = await this.getKitchenSettings();
    return settings.cutOffTime;
  }

  /**
   * Retrieve kitchen cut-off working days count.
   */
  async getKitchenCutOffWorkingDays(): Promise<number> {
    const settings = await this.getKitchenSettings();
    return settings.cutOffWorkingDays;
  }

  /**
   * Retrieve kitchen platform timezone.
   */
  async getKitchenTimezone(): Promise<string> {
    const settings = await this.getKitchenSettings();
    return settings.timezone;
  }

  /**
   * Retrieve kitchen at-risk threshold minutes.
   */
  async getAtRiskThresholdMinutes(): Promise<number> {
    const setting = await this.prisma.kitchenSetting.findUnique({
      where: { key: SETTING_KEYS.AT_RISK_THRESHOLD_MINUTES },
    });
    if (setting?.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return DEFAULT_AT_RISK_THRESHOLD_MINUTES;
  }

  /**
   * Check whether a given date is a valid kitchen working day.
   * Centralized business helper: returns false if non-working weekday OR kitchen holiday; otherwise true.
   */
  async isKitchenWorkingDay(date: Date | string): Promise<boolean> {
    const settings = await this.getKitchenSettings();
    const dateStr =
      typeof date === 'string'
        ? date.substring(0, 10)
        : date.toISOString().substring(0, 10);

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dow = DAY_OF_WEEK_MAP[dateObj.getUTCDay()];

    if (!settings.workingDays.includes(dow)) {
      return false;
    }

    const isHoliday = settings.holidays.some((h) => h.date === dateStr);
    return !isHoliday;
  }

  /**
   * Check whether a given date is a platform-wide kitchen holiday.
   */
  async isKitchenHoliday(date: Date | string): Promise<boolean> {
    const settings = await this.getKitchenSettings();
    const dateStr =
      typeof date === 'string'
        ? date.substring(0, 10)
        : date.toISOString().substring(0, 10);

    return settings.holidays.some((h) => h.date === dateStr);
  }
}
