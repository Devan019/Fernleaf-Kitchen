import { DishTemperature } from '../../../generated/prisma/enums.js';
import { PaginatedResult } from '../../../common/utils/index.js';

export interface CategoryDishItemResponse {
  id: string;
  dishId: string;
  displayOrder: number;
  dish: {
    id: string;
    name: string;
    sku: string;
    temperature: DishTemperature;
    isActive: boolean;
    imageUrl: string | null;
  };
}

export interface MenuCategoryResponse {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  isSecret: boolean;
  itemsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategoryDetailResponse {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  isSecret: boolean;
  items: CategoryDishItemResponse[];
  hiddenCompanyIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type PaginatedCategoriesResponse = PaginatedResult<MenuCategoryResponse>;

// Employee-facing menu types (strictly scrubbed of cost prices and internal flags)
export interface EmployeeOptionResponse {
  id: string;
  name: string;
}

export interface EmployeePortionResponse {
  id: string;
  name: string;
}

export interface EmployeeOptionGroupResponse {
  id: string;
  name: string;
  isRequired: boolean;
  usesPortions: boolean;
  options: EmployeeOptionResponse[];
  portions: EmployeePortionResponse[];
}

export interface EmployeeMenuItemResponse {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string;
  temperature: DishTemperature;
  price: string;
  optionGroups: EmployeeOptionGroupResponse[];
}

export interface EmployeeMenuCategoryResponse {
  id: string;
  name: string;
  displayOrder: number;
  items: EmployeeMenuItemResponse[];
}

export interface EmployeeMenuResponse {
  categories: EmployeeMenuCategoryResponse[];
}
