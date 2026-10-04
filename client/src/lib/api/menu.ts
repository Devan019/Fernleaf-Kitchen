import { client } from "./client";
import type {
  AddDishToCategoryRequest,
  CreateCategoryRequest,
  EmployeeCategoryResponse,
  EmployeeMenuResponse,
  MenuCategory,
  MenuDish,
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
  listCategories: async (params: ListCategoriesParams = {}): Promise<PaginatedCategories> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.isSecret !== undefined) qs.set("isSecret", String(params.isSecret));
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    const query = qs.toString();
    const res = await client.get<any>(`/api/menu/categories${query ? `?${query}` : ""}`);
    
    const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    const meta = res?.meta ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: rawList.length,
      totalPages: Math.ceil(rawList.length / (params.limit ?? 20)) || 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    const data: MenuCategory[] = rawList.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      displayOrder: cat.displayOrder ?? 0,
      isSecret: Boolean(cat.isSecret),
      isActive: Boolean(cat.isActive),
      itemsCount: cat.itemsCount ?? cat._count?.categoryDishes ?? cat.dishesCount ?? 0,
      dishesCount: cat.itemsCount ?? cat._count?.categoryDishes ?? cat.dishesCount ?? 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    return { data, meta };
  },

  getCategory: async (id: string): Promise<MenuCategory> => {
    const res = await client.get<any>(`/api/menu/categories/${id}`);
    const rawItems = Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res?.dishes)
        ? res.dishes
        : Array.isArray(res?.categoryDishes)
          ? res.categoryDishes
          : [];

    const dishes: MenuDish[] = rawItems.map((item: any) => {
      const dishObj = item.dish ?? item;
      return {
        id: dishObj.id ?? item.dishId ?? item.id,
        dishId: item.dishId ?? dishObj.id ?? item.id,
        name: dishObj.name ?? item.name ?? "Unnamed Dish",
        description: dishObj.description ?? item.description ?? null,
        imageUrl: dishObj.imageUrl ?? item.imageUrl ?? null,
        sku: dishObj.sku ?? item.sku ?? "",
        temperature: dishObj.temperature ?? item.temperature ?? "HOT",
        price: dishObj.price ?? item.price ?? undefined,
        costPrice: dishObj.costPrice ?? item.costPrice ?? undefined,
        displayOrder: item.displayOrder ?? dishObj.displayOrder ?? 0,
        allergens: dishObj.allergens ?? item.allergens ?? [],
        dietaryTags: dishObj.dietaryTags ?? item.dietaryTags ?? [],
      };
    });

    return {
      id: res.id,
      name: res.name,
      displayOrder: res.displayOrder ?? 0,
      isSecret: Boolean(res.isSecret),
      isActive: Boolean(res.isActive),
      itemsCount: dishes.length,
      dishesCount: dishes.length,
      dishes,
      items: dishes,
      hiddenCompanies: res.hiddenCompanies ?? (res.hiddenCompanyIds?.map((cid: string) => ({ id: cid, name: cid })) ?? []),
      hiddenCompanyIds: res.hiddenCompanyIds ?? [],
      createdAt: res.createdAt,
      updatedAt: res.updatedAt,
    };
  },

  createCategory: (data: CreateCategoryRequest): Promise<MenuCategory> =>
    client.post<MenuCategory>("/api/menu/categories", data),

  updateCategory: (id: string, data: UpdateCategoryRequest): Promise<MenuCategory> =>
    client.patch<MenuCategory>(`/api/menu/categories/${id}`, data),

  updateCategoryStatus: (id: string, isActive: boolean): Promise<MenuCategory> =>
    client.patch<MenuCategory>(`/api/menu/categories/${id}/status`, { isActive }),

  reorderCategories: (categoryIds: string[]): Promise<MenuCategory[]> =>
    client.patch<MenuCategory[]>("/api/menu/categories/reorder", {
      categories: categoryIds.map((id, idx) => ({
        categoryId: id,
        displayOrder: idx + 1,
      })),
    }),

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
    client.patch<MenuCategory>(`/api/menu/categories/${categoryId}/dishes/reorder`, {
      items: dishIds.map((id, idx) => ({
        dishId: id,
        displayOrder: idx + 1,
      })),
    }),

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
