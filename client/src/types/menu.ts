import type { Allergen, DietaryTag, DishTemperature } from "./catalogue";
import type { PaginationMeta } from "./index";

export interface MenuDish {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  temperature: DishTemperature;
  price?: string | number;
  costPrice?: string | number;
  sku?: string;
  displayOrder?: number;
  allergens?: Allergen[];
  dietaryTags?: DietaryTag[];
  dishId?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isSecret: boolean;
  isActive: boolean;
  dishesCount?: number;
  dishes?: MenuDish[];
  hiddenCompanies?: { id: string; name: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedCategories {
  data: MenuCategory[];
  meta: PaginationMeta;
}

export interface EmployeeMenuEmployee {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
}

export interface EmployeeMenuResponse {
  employee: EmployeeMenuEmployee;
  categories: MenuCategory[];
}

export type EmployeeCategoryResponse = MenuCategory & {
  employee?: EmployeeMenuEmployee;
};

export interface CreateCategoryRequest {
  name: string;
  displayOrder: number;
  isSecret?: boolean;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  displayOrder?: number;
  isSecret?: boolean;
  isActive?: boolean;
}

export interface AddDishToCategoryRequest {
  dishId: string;
  displayOrder?: number;
}
