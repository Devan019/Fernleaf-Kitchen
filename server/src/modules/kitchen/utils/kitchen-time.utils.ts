import { KitchenUnitOperationalStatus } from '../types/kitchen-board.types.js';

export const DEFAULT_AT_RISK_THRESHOLD_MINUTES = 30;
export const DEFAULT_KITCHEN_BUFFER_MINUTES = 30;

/**
 * Constructs a UTC Date object representing dateStr (YYYY-MM-DD) + timeStr (HH:mm) in the target timezone.
 */
export function constructDateTimeInTimezone(
  dateStr: string,
  timeStr: string,
  timeZone = 'UTC',
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hr, min] = timeStr.split(':').map(Number);

  if (!timeZone || timeZone.toUpperCase() === 'UTC') {
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
    return new Date(Date.UTC(y, m - 1, d, hr, min, 0, 0));
  }
}

/**
 * Calculates plannedDispatchReadyAt and plannedKitchenReadyAt according to business formulas:
 * - dispatch-ready = delivery time - company's delivery minutes
 * - kitchen-ready = dispatch-ready - 30 minutes (kitchen buffer)
 */
export function calculatePlannedTimes(
  deliveryDate: Date | string,
  deliveryTime: string,
  leaveKitchenMinutes: number,
  timeZone = 'UTC',
): { plannedDispatchReadyAt: Date; plannedKitchenReadyAt: Date } {
  const dateStr =
    typeof deliveryDate === 'string'
      ? deliveryDate.substring(0, 10)
      : deliveryDate.toISOString().substring(0, 10);

  const deliveryDateTime = constructDateTimeInTimezone(
    dateStr,
    deliveryTime,
    timeZone,
  );

  const plannedDispatchReadyAt = new Date(
    deliveryDateTime.getTime() - leaveKitchenMinutes * 60 * 1000,
  );

  const plannedKitchenReadyAt = new Date(
    plannedDispatchReadyAt.getTime() - DEFAULT_KITCHEN_BUFFER_MINUTES * 60 * 1000,
  );

  return {
    plannedDispatchReadyAt,
    plannedKitchenReadyAt,
  };
}

/**
 * Calculates operational late/at-risk indicators:
 * - COMPLETED: If unit/order is DONE.
 * - LATE: Current time > plannedKitchenReadyAt and incomplete.
 * - AT RISK: Current time is approaching plannedKitchenReadyAt within threshold and incomplete.
 * - ON TRACK: Otherwise.
 */
export function calculateWorkStatus(
  plannedKitchenReadyAt: Date | null,
  isDone: boolean,
  now = new Date(),
  atRiskThresholdMinutes = DEFAULT_AT_RISK_THRESHOLD_MINUTES,
): {
  isLate: boolean;
  isAtRisk: boolean;
  operationalStatus: KitchenUnitOperationalStatus;
} {
  if (isDone) {
    return {
      isLate: false,
      isAtRisk: false,
      operationalStatus: 'COMPLETED',
    };
  }

  if (!plannedKitchenReadyAt) {
    return {
      isLate: false,
      isAtRisk: false,
      operationalStatus: 'ON_TRACK',
    };
  }

  const plannedTime = plannedKitchenReadyAt.getTime();
  const currentTime = now.getTime();
  const thresholdMs = atRiskThresholdMinutes * 60 * 1000;

  if (currentTime > plannedTime) {
    return {
      isLate: true,
      isAtRisk: false,
      operationalStatus: 'LATE',
    };
  }

  if (currentTime >= plannedTime - thresholdMs) {
    return {
      isLate: false,
      isAtRisk: true,
      operationalStatus: 'AT_RISK',
    };
  }

  return {
    isLate: false,
    isAtRisk: false,
    operationalStatus: 'ON_TRACK',
  };
}
