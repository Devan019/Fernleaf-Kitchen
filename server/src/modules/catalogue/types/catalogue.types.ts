import 'multer';
import { PaginatedResult } from '../../../common/utils/pagination/pagination.js';
import { DishTemperature } from '../../../generated/prisma/enums.js';
import { Prisma } from '../../../generated/prisma/client.js';

export interface AllergenResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DietaryTagResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface KitchenStationResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortionSizeResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptionPortionDetail {
  id: string;
  portionSizeId: string;
  portionName: string;
  extraCharge: string;
}

export interface OptionResponse {
  id: string;
  name: string;
  costPrice: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  allergens?: AllergenResponse[];
  dietaryTags?: DietaryTagResponse[];
  portions?: OptionPortionDetail[];
}

export interface GroupOptionResponse {
  id: string;
  optionId: string;
  name: string;
  costPrice: string;
  displayOrder: number;
  isActive: boolean;
  allergens: AllergenResponse[];
  dietaryTags: DietaryTagResponse[];
  portions?: OptionPortionDetail[];
}

export interface GroupPortionResponse {
  id: string;
  portionSizeId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface OptionGroupResponse {
  id: string;
  dishId: string;
  name: string;
  isRequired: boolean;
  displayOrder: number;
  usesPortions: boolean;
  createdAt: Date;
  updatedAt: Date;
  options: GroupOptionResponse[];
  portions: GroupPortionResponse[];
}

export interface DishListItemResponse {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string;
  temperature: DishTemperature;
  costPrice: string;
  minimumOrderQuantity: number | null;
  isActive: boolean;
  kitchenStationId: string | null;
  kitchenStation?: KitchenStationResponse | null;
  allergens: AllergenResponse[];
  dietaryTags: DietaryTagResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DishDetailResponse extends DishListItemResponse {
  optionGroups: OptionGroupResponse[];
}

export type PaginatedAllergensResponse = PaginatedResult<AllergenResponse>;
export type PaginatedDietaryTagsResponse = PaginatedResult<DietaryTagResponse>;
export type PaginatedKitchenStationsResponse =
  PaginatedResult<KitchenStationResponse>;
export type PaginatedPortionSizesResponse =
  PaginatedResult<PortionSizeResponse>;
export type PaginatedOptionsResponse = PaginatedResult<OptionResponse>;
export type PaginatedDishesResponse = PaginatedResult<DishListItemResponse>;

/**
 * Decimal serialization helper converting Prisma Decimal to string representation.
 */
export function formatDecimal(val: Prisma.Decimal | number | string): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val.toFixed(2);
  return val.toFixed(2);
}
