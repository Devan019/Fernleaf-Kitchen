import { Prisma } from '../../../generated/prisma/client.js';
import { PriceDerivationType } from '../../../generated/prisma/enums.js';
import { PaginatedResult } from '../../../common/utils/pagination/pagination.js';

/**
 * Indicates how an effective selling price was determined.
 */
export enum PricingSource {
  MANUAL = 'MANUAL',
  DERIVED = 'DERIVED',
  OVERRIDE = 'OVERRIDE',
  MISSING = 'MISSING',
}

/**
 * High-level status of the price resolution attempt.
 */
export type PriceResolutionStatus = 'RESOLVED' | 'MISSING_PRICE';

/**
 * Detailed outcome of resolving a single item's price.
 */
export interface ResolvedPriceResult {
  status: PriceResolutionStatus;
  price: Prisma.Decimal | null;
  source: PricingSource;
  isOverridden: boolean;
  isDerived: boolean;
  missing: boolean;
  tierId: string;
  tierName: string;
}

/**
 * Context describing how an employee's effective tier was resolved.
 */
export interface EffectivePricingContext {
  employeeId: string;
  employeeName: string;
  companyId: string;
  companyName: string;
  priceTierId: string;
  priceTierName: string;
  isDefaultTier: boolean;
}

/**
 * Tier overview response item.
 */
export interface PriceTierResponse {
  id: string;
  name: string;
  description: string | null;
  derivationType: PriceDerivationType;
  baseTierId: string | null;
  baseTierName?: string | null;
  multiplier: string | null;
  percentage: string | null;
  isDefault: boolean;
  isActive: boolean;
  dishPricesCount?: number;
  optionPricesCount?: number;
  companiesCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Summary item for dish pricing inspection within a tier.
 */
export interface TierDishPriceItem {
  dishId: string;
  name: string;
  sku: string;
  costPrice: string;
  price: string | null;
  source: PricingSource;
  overridden: boolean;
  derived: boolean;
  missing: boolean;
}

/**
 * Summary item for option pricing inspection within a tier.
 */
export interface TierOptionPriceItem {
  optionId: string;
  name: string;
  costPrice: string;
  price: string | null;
  source: PricingSource;
  overridden: boolean;
  derived: boolean;
  missing: boolean;
}

export type PaginatedPriceTiersResponse = PaginatedResult<PriceTierResponse>;
export type PaginatedTierDishesResponse = PaginatedResult<TierDishPriceItem>;
export type PaginatedTierOptionsResponse = PaginatedResult<TierOptionPriceItem>;

/**
 * Result returned after batch updating dish prices on a tier.
 */
export interface BulkUpdateTierPricesResult {
  tierId: string;
  updatedCount: number;
  dishPrices: Array<{ dishId: string; price: string }>;
}
