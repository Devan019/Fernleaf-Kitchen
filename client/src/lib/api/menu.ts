import { client } from "./client";
import type {
  AddDishToCategoryRequest,
  CreateCategoryRequest,
  EmployeeCategoryResponse,
  EmployeeMenuResponse,
  MenuCategory,
  PaginatedCategories,
  UpdateCategoryRequest,
} from "@/types";

export interface ListCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  isSecret?: boolean;
  isActive?: boolean;
}

export const menuApi = {
  // ── Categories ──────────────────────────────────────────────────────────
  listCategories: (params: ListCategoriesParams = {}): Promise<PaginatedCategories> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.isSecret !== undefined) qs.set("isSecret", String(params.isSecret));
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    const query = qs.toString();
    return client.get<PaginatedCategories>(`/api/menu/categories${query ? `?${query}` : ""}`);
  },

  getCategory: (id: string): Promise<MenuCategory> =>
    client.get<MenuCategory>(`/api/menu/categories/${id}`),

  createCategory: (data: CreateCategoryRequest): Promise<MenuCategory> =>
    client.post<MenuCategory>("/api/menu/categories", data),

  updateCategory: (id: string, data: UpdateCategoryRequest): Promise<MenuCategory> =>
    client.patch<MenuCategory>(`/api/menu/categories/${id}`, data),

  updateCategoryStatus: (id: string, isActive: boolean): Promise<MenuCategory> =>
    client.patch<MenuCategory>(`/api/menu/categories/${id}/status`, { isActive }),

  reorderCategories: (categoryIds: string[]): Promise<MenuCategory[]> =>
    client.patch<MenuCategory[]>("/api/menu/categories/reorder", { categoryIds }),

  // ── Dish Assignments ────────────────────────────────────────────────────
  addDishToCategory: (
    categoryId: string,
    data: AddDishToCategoryRequest,
  ): Promise<MenuCategory> =>
    client.post<MenuCategory>(`/api/menu/categories/${categoryId}/dishes`, data),

  removeDishFromCategory: (
    categoryId: string,
    dishId: string,
  ): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/menu/categories/${categoryId}/dishes/${dishId}`),

  reorderCategoryDishes: (
    categoryId: string,
    dishIds: string[],
  ): Promise<MenuCategory> =>
    client.patch<MenuCategory>(`/api/menu/categories/${categoryId}/dishes/reorder`, { dishIds }),

  // ── Company Visibility ──────────────────────────────────────────────────
  hideCategoryForCompany: (
    categoryId: string,
    companyId: string,
  ): Promise<{ success: boolean }> =>
    client.post<{ success: boolean }>(`/api/menu/categories/${categoryId}/hidden-companies/${companyId}`),

  unhideCategoryForCompany: (
    categoryId: string,
    companyId: string,
  ): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/menu/categories/${categoryId}/hidden-companies/${companyId}`),

  hideDishForCompany: (
    dishId: string,
    companyId: string,
  ): Promise<{ success: boolean }> =>
    client.post<{ success: boolean }>(`/api/menu/dishes/${dishId}/hidden-companies/${companyId}`),

  unhideDishForCompany: (
    dishId: string,
    companyId: string,
  ): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/menu/dishes/${dishId}/hidden-companies/${companyId}`),

  // ── Preview & Customer Access ───────────────────────────────────────────
  previewEmployeeMenu: (employeeId: string): Promise<EmployeeMenuResponse> =>
    client.get<EmployeeMenuResponse>(`/api/menu/preview/employees/${employeeId}`),

  previewEmployeeCategory: (
    employeeId: string,
    categoryId: string,
  ): Promise<EmployeeCategoryResponse> =>
    client.get<EmployeeCategoryResponse>(`/api/menu/preview/employees/${employeeId}/categories/${categoryId}`),

  getEmployeeMenu: (employeeId: string): Promise<EmployeeMenuResponse> =>
    client.get<EmployeeMenuResponse>(`/api/menu/employees/${employeeId}`),

  getEmployeeCategory: (
    employeeId: string,
    categoryId: string,
  ): Promise<EmployeeCategoryResponse> =>
    client.get<EmployeeCategoryResponse>(`/api/menu/employees/${employeeId}/categories/${categoryId}`),
};
