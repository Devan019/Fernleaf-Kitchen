import { client } from "./client";
import type {
  Allergen,
  CreateDishRequest,
  CreateOptionGroupRequest,
  CreateOptionRequest,
  DietaryTag,
  Dish,
  DishTemperature,
  KitchenStation,
  Option,
  OptionGroup,
  PaginatedDishes,
  PaginatedOptions,
  UpdateDishRequest,
  UpdateOptionGroupRequest,
  UpdateOptionRequest,
} from "@/types";

export interface ListDishesParams {
  page?: number;
  limit?: number;
  search?: string;
  temperature?: DishTemperature;
  kitchenStationId?: string;
  isActive?: boolean;
}

export interface ListOptionsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export const catalogueApi = {
  // ── Dishes ──────────────────────────────────────────────────────────────
  listDishes: async (params: ListDishesParams = {}): Promise<PaginatedDishes> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.temperature) qs.set("temperature", params.temperature);
    if (params.kitchenStationId) qs.set("kitchenStationId", params.kitchenStationId);
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    const query = qs.toString();
    const res = await client.get<any>(`/api/catalogue/dishes${query ? `?${query}` : ""}`);
    if (Array.isArray(res)) {
      return { data: res, meta: { page: 1, limit: res.length, total: res.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
    }
    return res;
  },

  getDish: (id: string): Promise<Dish> =>
    client.get<Dish>(`/api/catalogue/dishes/${id}`),

  createDish: (data: CreateDishRequest): Promise<Dish> =>
    client.post<Dish>("/api/catalogue/dishes", data),

  updateDish: (id: string, data: UpdateDishRequest): Promise<Dish> =>
    client.patch<Dish>(`/api/catalogue/dishes/${id}`, data),

  updateDishStatus: (id: string, isActive: boolean): Promise<Dish> =>
    client.patch<Dish>(`/api/catalogue/dishes/${id}/status`, { isActive }),

  uploadDishImage: (id: string, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post<{ imageUrl: string }>(`/api/catalogue/dishes/${id}/image`, formData);
  },

  deleteDishImage: (id: string): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/catalogue/dishes/${id}/image`),

  // ── Options ─────────────────────────────────────────────────────────────
  listOptions: async (params: ListOptionsParams = {}): Promise<PaginatedOptions> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    const query = qs.toString();
    const res = await client.get<any>(`/api/catalogue/options${query ? `?${query}` : ""}`);
    if (Array.isArray(res)) {
      return { data: res, meta: { page: 1, limit: res.length, total: res.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
    }
    return res;
  },

  getOption: (id: string): Promise<Option> =>
    client.get<Option>(`/api/catalogue/options/${id}`),

  createOption: (data: CreateOptionRequest): Promise<Option> =>
    client.post<Option>("/api/catalogue/options", data),

  updateOption: (id: string, data: UpdateOptionRequest): Promise<Option> =>
    client.patch<Option>(`/api/catalogue/options/${id}`, data),

  updateOptionStatus: (id: string, isActive: boolean): Promise<Option> =>
    client.patch<Option>(`/api/catalogue/options/${id}/status`, { isActive }),

  // ── Option Groups & Portions ─────────────────────────────────────────────
  listOptionGroups: async (dishId: string): Promise<OptionGroup[]> => {
    const res = await client.get<any>(`/api/catalogue/dishes/${dishId}/option-groups`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.optionGroups)) return res.optionGroups;
    return [];
  },

  getOptionGroup: (id: string): Promise<OptionGroup> =>
    client.get<OptionGroup>(`/api/catalogue/option-groups/${id}`),

  createOptionGroup: (dishId: string, data: CreateOptionGroupRequest): Promise<OptionGroup> =>
    client.post<OptionGroup>(`/api/catalogue/dishes/${dishId}/option-groups`, data),

  updateOptionGroup: (id: string, data: UpdateOptionGroupRequest): Promise<OptionGroup> =>
    client.patch<OptionGroup>(`/api/catalogue/option-groups/${id}`, data),

  deleteOptionGroup: (id: string): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/catalogue/option-groups/${id}`),

  addOptionToGroup: (
    groupId: string,
    data: { optionId: string; displayOrder?: number },
  ): Promise<OptionGroup> =>
    client.post<OptionGroup>(`/api/catalogue/option-groups/${groupId}/options`, data),

  removeOptionFromGroup: (groupId: string, optionId: string): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/catalogue/option-groups/${groupId}/options/${optionId}`),

  reorderGroupOptions: (groupId: string, optionIds: string[]): Promise<OptionGroup> =>
    client.patch<OptionGroup>(`/api/catalogue/option-groups/${groupId}/options/reorder`, { optionIds }),

  addPortionToGroup: (
    groupId: string,
    data: { portionSizeId: string; displayOrder?: number },
  ): Promise<OptionGroup> =>
    client.post<OptionGroup>(`/api/catalogue/option-groups/${groupId}/portions`, data),

  removePortionFromGroup: (groupId: string, portionId: string): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/catalogue/option-groups/${groupId}/portions/${portionId}`),

  reorderGroupPortions: (groupId: string, portionSizeIds: string[]): Promise<OptionGroup> =>
    client.patch<OptionGroup>(`/api/catalogue/option-groups/${groupId}/portions/reorder`, { portionSizeIds }),

  // ── Reference Data ──────────────────────────────────────────────────────
  listAllergens: async (): Promise<Allergen[]> => {
    const res = await client.get<any>("/api/catalogue/allergens");
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.allergens)) return res.allergens;
    return [];
  },

  createAllergen: (data: { name: string }): Promise<Allergen> =>
    client.post<Allergen>("/api/catalogue/allergens", data),

  updateAllergen: (id: string, data: { name?: string; isActive?: boolean }): Promise<Allergen> =>
    client.patch<Allergen>(`/api/catalogue/allergens/${id}`, data),

  listDietaryTags: async (): Promise<DietaryTag[]> => {
    const res = await client.get<any>("/api/catalogue/dietary-tags");
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.dietaryTags)) return res.dietaryTags;
    return [];
  },

  createDietaryTag: (data: { name: string }): Promise<DietaryTag> =>
    client.post<DietaryTag>("/api/catalogue/dietary-tags", data),

  updateDietaryTag: (id: string, data: { name?: string; isActive?: boolean }): Promise<DietaryTag> =>
    client.patch<DietaryTag>(`/api/catalogue/dietary-tags/${id}`, data),

  listKitchenStations: async (): Promise<KitchenStation[]> => {
    const res = await client.get<any>("/api/catalogue/kitchen-stations");
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  },
};
