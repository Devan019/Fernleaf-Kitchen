/**
 * Configurable blocklist of known public / free email domains.
 * Organizations cannot register these domains as their corporate company email domain.
 */
export const BLOCKED_PUBLIC_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'mail.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'gmx.com',
  'gmx.net',
  'fastmail.com',
]);

/**
 * Normalizes an email domain:
 * - strips whitespace
 * - converts to lowercase
 * - strips leading '@' if present
 */
export function normalizeDomain(domain: string): string {
  if (!domain) {
    return '';
  }
  let cleaned = domain.trim().toLowerCase();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1).trim();
  }
  return cleaned;
}

/**
 * Validates domain format according to RFC rules (e.g. company.com, sub.company.co.uk).
 */
export function isValidDomainFormat(domain: string): boolean {
  if (!domain || domain.length > 253) {
    return false;
  }
  // Standard domain label format: labels separated by dots, each label 1-63 chars, TLD at least 2 chars
  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

/**
 * Checks if a domain is on the public email provider blocklist.
 */
export function isPublicEmailDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  return BLOCKED_PUBLIC_EMAIL_DOMAINS.has(normalized);
}
