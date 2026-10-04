import type { PaginationMeta } from "./index";

export type PriceDerivationType = "MANUAL" | "COST_MULTIPLIER" | "TIER_PERCENTAGE";

export interface PriceTier {
  id: string;
  name: string;
  description?: string | null;
  derivationType: PriceDerivationType;
  baseTierId?: string | null;
  baseTierName?: string | null;
  multiplier?: string | number | null;
  percentage?: string | number | null;
  isDefault: boolean;
  isActive: boolean;
  companiesCount?: number;
  dishOverridesCount?: number;
  optionOverridesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedPriceTiers {
  data: PriceTier[];
  meta: PaginationMeta;
}

export interface TierDishPricing {
  dishId: string;
  dishName: string;
  sku: string;
  costPrice: string | number;
  tierId: string;
  overridePrice?: string | null;
  derivedPrice?: string | null;
  effectivePrice?: string | null;
  hasOverride: boolean;
  isMissingPrice: boolean;
}

export interface TierOptionPricing {
  optionId: string;
  optionName: string;
  costPrice: string | number;
  tierId: string;
  overridePrice?: string | null;
  derivedPrice?: string | null;
  effectivePrice?: string | null;
  hasOverride: boolean;
  isMissingPrice: boolean;
}

export interface PaginatedTierDishes {
  data: TierDishPricing[];
  meta: PaginationMeta;
}

export interface PaginatedTierOptions {
  data: TierOptionPricing[];
  meta: PaginationMeta;
}

export interface ResolvedPriceResult {
  status: "RESOLVED" | "MISSING_PRICE" | string;
  price: string | number | null;
  source: "OVERRIDE" | "DERIVED" | "MANUAL" | "MISSING" | string;
  isOverridden: boolean;
  isDerived: boolean;
  missing: boolean;
  tierId: string;
  tierName: string;
  itemId?: string;
  itemName?: string;
  itemType?: "DISH" | "OPTION";
}

export interface ResolvedEmployeePrice {
  itemId: string;
  itemType: "DISH" | "OPTION";
  itemName: string;
  effectivePrice: string;
  tierId: string;
  tierName: string;
  derivationSource: "OVERRIDE" | "DERIVED" | "MANUAL" | string;
}

export interface CompanyPricingContext {
  companyId: string;
  companyName: string;
  priceTierId: string;
  priceTierName: string;
  isDefaultTier: boolean;
}

export interface EmployeePricingContext {
  employeeId: string;
  companyId: string;
  companyName: string;
  priceTierId: string;
  priceTierName: string;
  isDefaultTier: boolean;
}

export interface CompanyListItem {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
  priceTierId?: string | null;
  priceTier?: { id: string; name: string } | null;
}

export interface CreatePriceTierRequest {
  name: string;
  description?: string;
  derivationType: PriceDerivationType;
  baseTierId?: string;
  multiplier?: number | string;
  percentage?: number | string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdatePriceTierRequest {
  name?: string;
  description?: string;
  derivationType?: PriceDerivationType;
  baseTierId?: string;
  multiplier?: number | string;
  percentage?: number | string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface BulkDishPriceItem {
  dishId: string;
  price: string | number;
}

export interface BulkDishPriceResponse {
  tierId: string;
  updatedCount: number;
  failedCount: number;
  errors?: string[];
}
