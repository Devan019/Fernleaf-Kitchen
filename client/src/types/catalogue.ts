import type { PaginationMeta } from "./index";

export type DishTemperature = "HOT" | "COLD";

export interface Allergen {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DietaryTag {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortionSize {
  id: string;
  name: string;
  multiplier?: string | number;
  displayOrder?: number;
}

export interface Option {
  id: string;
  name: string;
  costPrice: string | number;
  isActive: boolean;
  allergens?: Allergen[];
  dietaryTags?: DietaryTag[];
  allergenIds?: string[];
  dietaryTagIds?: string[];
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OptionGroupPortion {
  id?: string;
  portionSizeId?: string;
  portionSize?: PortionSize;
  name?: string;
  displayOrder: number;
}

export interface OptionGroup {
  id: string;
  dishId?: string;
  name: string;
  isRequired: boolean;
  displayOrder: number;
  usesPortions: boolean;
  options: Option[];
  portions?: OptionGroupPortion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface KitchenStation {
  id: string;
  name: string;
  description?: string;
}

export interface Dish {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  temperature: DishTemperature;
  costPrice: string | number;
  minimumOrderQuantity?: number;
  kitchenStationId?: string | null;
  kitchenStation?: KitchenStation | null;
  imageUrl?: string | null;
  isActive: boolean;
  allergens: Allergen[];
  dietaryTags: DietaryTag[];
  optionGroups?: OptionGroup[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedDishes {
  data: Dish[];
  meta: PaginationMeta;
}

export interface PaginatedOptions {
  data: Option[];
  meta: PaginationMeta;
}

export interface CreateDishRequest {
  name: string;
  description?: string;
  sku: string;
  temperature: DishTemperature;
  costPrice: number | string;
  minimumOrderQuantity?: number;
  kitchenStationId?: string;
  allergenIds?: string[];
  dietaryTagIds?: string[];
  isActive?: boolean;
}

export interface UpdateDishRequest {
  name?: string;
  description?: string | null;
  sku?: string;
  temperature?: DishTemperature;
  costPrice?: number | string;
  minimumOrderQuantity?: number;
  kitchenStationId?: string | null;
  allergenIds?: string[];
  dietaryTagIds?: string[];
  isActive?: boolean;
}

export interface CreateOptionRequest {
  name: string;
  costPrice: number | string;
  allergenIds?: string[];
  dietaryTagIds?: string[];
  isActive?: boolean;
}

export interface UpdateOptionRequest {
  name?: string;
  costPrice?: number | string;
  allergenIds?: string[];
  dietaryTagIds?: string[];
  isActive?: boolean;
}

export interface CreateOptionGroupRequest {
  name: string;
  isRequired?: boolean;
  displayOrder?: number;
  usesPortions?: boolean;
}

export interface UpdateOptionGroupRequest {
  name?: string;
  isRequired?: boolean;
  displayOrder?: number;
  usesPortions?: boolean;
}

export interface AddOptionToGroupRequest {
  optionId: string;
  displayOrder?: number;
}

export interface AddPortionToGroupRequest {
  portionSizeId: string;
  displayOrder?: number;
}
