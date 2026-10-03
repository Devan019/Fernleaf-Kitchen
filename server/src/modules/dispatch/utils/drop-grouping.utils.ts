import { constructDateTimeInTimezone } from '../../kitchen/utils/kitchen-time.utils.js';

/**
 * Normalizes a string by trimming, lowercasing, and collapsing whitespace.
 */
export function normalizeString(val: string | null | undefined): string {
  if (!val) return '';
  return val.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes a postcode by trimming, uppercasing, and removing all internal spaces
 * for deterministic equality.
 */
export function normalizePostcode(val: string | null | undefined): string {
  if (!val) return '';
  return val.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Deterministically constructs a grouping key for drop reconciliation.
 * Orders belong to the same drop if and only if they share:
 * 1. Same companyId
 * 2. Same normalized delivery date (YYYY-MM-DD)
 * 3. Same exact delivery time (HH:mm)
 * 4. Same historical delivery address snapshot (street, unit, city, postcode)
 */
export function createDropGroupingKey(
  companyId: string,
  deliveryDateStr: string,
  deliveryTime: string,
  address: {
    street: string;
    unit?: string | null;
    city: string;
    postcode: string;
  },
): string {
  const normCompany = companyId.trim();
  const normDate = deliveryDateStr.substring(0, 10).trim();
  const normTime = deliveryTime.trim();
  const normStreet = normalizeString(address.street);
  const normUnit = normalizeString(address.unit);
  const normCity = normalizeString(address.city);
  const normPostcode = normalizePostcode(address.postcode);

  return `${normCompany}::${normDate}::${normTime}::${normStreet}::${normUnit}::${normCity}::${normPostcode}`;
}

/**
 * Obtains today's date in YYYY-MM-DD format within the specified timezone.
 */
export function getTodayDateString(
  timeZone = 'UTC',
  now = new Date(),
): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().substring(0, 10);
  }
}

/**
 * Determines whether a delivery was on time.
 * promisedDeliveryTime = deliveryDate + deliveryTime in target timezone.
 * isOnTime = deliveredAt <= promisedDeliveryTime.
 */
export function calculateIsOnTime(
  deliveredAt: Date,
  deliveryDate: Date | string,
  deliveryTime: string,
  timeZone = 'UTC',
): boolean {
  const dateStr =
    typeof deliveryDate === 'string'
      ? deliveryDate.substring(0, 10)
      : deliveryDate.toISOString().substring(0, 10);

  const promisedDateTime = constructDateTimeInTimezone(
    dateStr,
    deliveryTime,
    timeZone,
  );

  return deliveredAt.getTime() <= promisedDateTime.getTime();
}
