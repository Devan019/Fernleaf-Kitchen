import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { DayOfWeek, OrderStatus } from '../../../generated/prisma/enums.js';
import { CutoffCheckResult, CutoffProcessResult } from '../types/order.types.js';

const DAY_OF_WEEK_MAP: readonly DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
] as const;

export interface KitchenSettingsConfig {
  cutoffTime: string;
  cutoffWorkingDays: number;
  kitchenWorkingDays: DayOfWeek[];
  timezone: string;
}

@Injectable()
export class OrderCutoffService {
  private readonly logger = new Logger(OrderCutoffService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the dynamic kitchen settings from database or sensible defaults.
   */
  async getKitchenSettings(): Promise<KitchenSettingsConfig> {
    const settings = await this.prisma.kitchenSetting.findMany({
      where: {
        key: {
          in: [
            'CUTOFF_TIME',
            'CUTOFF_WORKING_DAYS',
            'KITCHEN_WORKING_DAYS',
            'KITCHEN_TIMEZONE',
          ],
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const cutoffTime = settingsMap.get('CUTOFF_TIME') || '16:00';
    const cutoffWorkingDays = parseInt(
      settingsMap.get('CUTOFF_WORKING_DAYS') || '2',
      10,
    );
    const timezone =
      settingsMap.get('KITCHEN_TIMEZONE') ||
      process.env.KITCHEN_TIMEZONE ||
      'UTC';

    const workingDaysRaw = settingsMap.get('KITCHEN_WORKING_DAYS');
    let kitchenWorkingDays: DayOfWeek[] = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
    ];

    if (workingDaysRaw) {
      const parsed = workingDaysRaw
        .split(',')
        .map((d) => d.trim().toUpperCase()) as DayOfWeek[];
      if (parsed.length > 0) {
        kitchenWorkingDays = parsed;
      }
    }

    return {
      cutoffTime,
      cutoffWorkingDays,
      kitchenWorkingDays,
      timezone,
    };
  }

  /**
   * Calculates the exact cut-off DateTime for a given delivery date.
   * Counts backwards N kitchen working days, skipping weekends and kitchen holidays.
   */
  async calculateCutoff(
    deliveryDate: Date | string,
  ): Promise<{ cutoffDateTime: Date; workingDaysCount: number }> {
    const config = await this.getKitchenSettings();
    const dateStr =
      typeof deliveryDate === 'string'
        ? deliveryDate.substring(0, 10)
        : deliveryDate.toISOString().substring(0, 10);

    const [year, month, day] = dateStr.split('-').map(Number);
    let currentDate = new Date(Date.UTC(year, month - 1, day));

    // Fetch all kitchen holidays to check during iteration
    const holidays = await this.prisma.kitchenHoliday.findMany({
      select: { date: true },
    });
    const holidayDateSet = new Set(
      holidays.map((h) => h.date.toISOString().substring(0, 10)),
    );

    let workingDaysFound = 0;
    const maxIterations = 30; // Safety guard against infinite loop
    let iteration = 0;

    // Step backwards day by day from deliveryDate - 1 day
    while (
      workingDaysFound < config.cutoffWorkingDays &&
      iteration < maxIterations
    ) {
      iteration++;
      // Move 1 day back
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
      const curDateStr = currentDate.toISOString().substring(0, 10);

      // Check day of week
      const dowIndex = currentDate.getUTCDay();
      const dow = DAY_OF_WEEK_MAP[dowIndex];

      const isWorkingDay = config.kitchenWorkingDays.includes(dow);
      const isHoliday = holidayDateSet.has(curDateStr);

      if (isWorkingDay && !isHoliday) {
        workingDaysFound++;
        if (workingDaysFound === config.cutoffWorkingDays) {
          // This is the cutoff calendar date
          break;
        }
      }
    }

    const cutoffDateStr = currentDate.toISOString().substring(0, 10);
    const cutoffDateTime = this.constructDateTimeInTimezone(
      cutoffDateStr,
      config.cutoffTime,
      config.timezone,
    );

    return {
      cutoffDateTime,
      workingDaysCount: workingDaysFound,
    };
  }

  /**
   * Checks whether the current time is past the cut-off for a delivery date.
   */
  async isPastCutoff(
    deliveryDate: Date | string,
    currentTime?: Date,
  ): Promise<boolean> {
    const { cutoffDateTime } = await this.calculateCutoff(deliveryDate);
    const now = currentTime ?? new Date();
    return now.getTime() >= cutoffDateTime.getTime();
  }

  /**
   * Checks cutoff details for inspection and reporting.
   */
  async checkCutoff(
    deliveryDate: Date | string,
    currentTime?: Date,
  ): Promise<CutoffCheckResult> {
    const config = await this.getKitchenSettings();
    const dateStr =
      typeof deliveryDate === 'string'
        ? deliveryDate.substring(0, 10)
        : deliveryDate.toISOString().substring(0, 10);

    const { cutoffDateTime } = await this.calculateCutoff(dateStr);
    const now = currentTime ?? new Date();
    const isPast = now.getTime() >= cutoffDateTime.getTime();

    return {
      deliveryDate: dateStr,
      cutoffDateTime,
      isPastCutoff: isPast,
      kitchenWorkingDays: config.kitchenWorkingDays,
      workingDaysBeforeDelivery: config.cutoffWorkingDays,
      cutoffTime: config.cutoffTime,
      timezone: config.timezone,
    };
  }

  /**
   * Process cut-off for a delivery date idempotently:
   * - All DRAFT orders for that date are transitioned to CANCELLED.
   * - All PLACED orders for that date are transitioned to CONFIRMED.
   */
  async processCutoffForDate(
    deliveryDate: Date | string,
    adminUserId?: string,
  ): Promise<CutoffProcessResult> {
    const dateStr =
      typeof deliveryDate === 'string'
        ? deliveryDate.substring(0, 10)
        : deliveryDate.toISOString().substring(0, 10);

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Find eligible Draft orders
      const draftOrders = await tx.order.findMany({
        where: {
          deliveryDate: targetDate,
          status: OrderStatus.DRAFT,
        },
        select: { id: true },
      });

      // 2. Find eligible Placed orders
      const placedOrders = await tx.order.findMany({
        where: {
          deliveryDate: targetDate,
          status: OrderStatus.PLACED,
        },
        select: { id: true },
      });

      // 3. Cancel Drafts
      if (draftOrders.length > 0) {
        const draftIds = draftOrders.map((o) => o.id);
        await tx.order.updateMany({
          where: { id: { in: draftIds } },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: now,
            updatedAt: now,
          },
        });

        for (const order of draftOrders) {
          await tx.orderStatusHistory.create({
            data: {
              id: randomUUID(),
              orderId: order.id,
              fromStatus: OrderStatus.DRAFT,
              toStatus: OrderStatus.CANCELLED,
              changedByUserId: adminUserId ?? null,
              note: 'Cut-off passed: automatic cancellation of unplaced draft order',
              createdAt: now,
            },
          });
        }
      }

      // 4. Confirm Placed
      if (placedOrders.length > 0) {
        const placedIds = placedOrders.map((o) => o.id);
        await tx.order.updateMany({
          where: { id: { in: placedIds } },
          data: {
            status: OrderStatus.CONFIRMED,
            confirmedAt: now,
            updatedAt: now,
          },
        });

        for (const order of placedOrders) {
          await tx.orderStatusHistory.create({
            data: {
              id: randomUUID(),
              orderId: order.id,
              fromStatus: OrderStatus.PLACED,
              toStatus: OrderStatus.CONFIRMED,
              changedByUserId: adminUserId ?? null,
              note: 'Cut-off passed: automatic confirmation of placed order',
              createdAt: now,
            },
          });
        }
      }

      this.logger.log(
        `Cut-off processed for ${dateStr}: ${draftOrders.length} drafts cancelled, ${placedOrders.length} placed confirmed.`,
      );

      return {
        deliveryDate: dateStr,
        cancelledDrafts: draftOrders.length,
        confirmedPlaced: placedOrders.length,
        processedAt: now,
      };
    });
  }

  /**
   * Helper to construct a UTC Date object representing dateStr + timeStr in the target timezone.
   */
  private constructDateTimeInTimezone(
    dateStr: string,
    timeStr: string,
    timeZone: string,
  ): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hr, min] = timeStr.split(':').map(Number);

    if (timeZone.toUpperCase() === 'UTC') {
      return new Date(Date.UTC(y, m - 1, d, hr, min, 0, 0));
    }

    try {
      const tempUtc = new Date(Date.UTC(y, m - 1, d, hr, min, 0, 0));
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(tempUtc);
      const map: Record<string, string> = {};
      for (const p of parts) map[p.type] = p.value;

      const tzHour = parseInt(map.hour === '24' ? '00' : map.hour, 10);
      const tzMin = parseInt(map.minute, 10);
      const tzYear = parseInt(map.year, 10);
      const tzMonth = parseInt(map.month, 10);
      const tzDay = parseInt(map.day, 10);

      const asTz = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0, 0);
      const diff = tempUtc.getTime() - asTz;
      return new Date(tempUtc.getTime() + diff);
    } catch {
      // Fallback to UTC if timezone string is invalid
      return new Date(Date.UTC(y, m - 1, d, hr, min, 0, 0));
    }
  }
}
