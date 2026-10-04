import { menuApi } from "@/lib/api/menu";
import type { ListCategoriesParams } from "@/lib/api/menu";
import type {
  AddDishToCategoryRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Keys ─────────────────────────────────────────────────────────────────────

export const menuKeys = {
  all: ["menu"] as const,
  categories: (params: ListCategoriesParams = {}) => ["menu", "categories", params] as const,
  category: (id: string) => ["menu", "categories", id] as const,
  previewEmployee: (employeeId: string) => ["menu", "preview", "employee", employeeId] as const,
  previewCategory: (employeeId: string, categoryId: string) =>
    ["menu", "preview", "employee", employeeId, "category", categoryId] as const,
};

// ── Category Hooks ───────────────────────────────────────────────────────────

export function useCategories(params: ListCategoriesParams = {}) {
  return useQuery({
    queryKey: menuKeys.categories(params),
    queryFn: () => menuApi.listCategories(params),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: menuKeys.category(id),
    queryFn: () => menuApi.getCategory(id),
    enabled: Boolean(id),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => menuApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
    },
  });
}

export function useUpdateCategory(categoryId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdateCategoryRequest }) =>
      menuApi.updateCategory(id ?? categoryId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
      const targetId = vars.id ?? categoryId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: menuKeys.category(targetId) });
      }
    },
  });
}

export function useUpdateCategoryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      menuApi.updateCategoryStatus(id, isActive),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
      queryClient.invalidateQueries({ queryKey: menuKeys.category(vars.id) });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryIds: string[]) => menuApi.reorderCategories(categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
    },
  });
}

// ── Dish Assignment Hooks ────────────────────────────────────────────────────

export function useAddDishToCategory(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddDishToCategoryRequest) =>
      menuApi.addDishToCategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.category(categoryId) });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
    },
  });
}

export function useRemoveDishFromCategory(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dishId: string) =>
      menuApi.removeDishFromCategory(categoryId, dishId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.category(categoryId) });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
    },
  });
}

export function useReorderCategoryDishes(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dishIds: string[]) =>
      menuApi.reorderCategoryDishes(categoryId, dishIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.category(categoryId) });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
    },
  });
}

// ── Company Visibility Hooks ─────────────────────────────────────────────────

export function useHideCategoryForCompany(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) =>
      menuApi.hideCategoryForCompany(categoryId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.category(categoryId) });
    },
  });
}

export function useUnhideCategoryForCompany(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) =>
      menuApi.unhideCategoryForCompany(categoryId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.category(categoryId) });
    },
  });
}

export function useHideDishForCompany(dishId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) =>
      menuApi.hideDishForCompany(dishId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
  });
}

export function useUnhideDishForCompany(dishId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) =>
      menuApi.unhideDishForCompany(dishId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
  });
}

// ── Preview Hooks ────────────────────────────────────────────────────────────

export function usePreviewEmployeeMenu(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: menuKeys.previewEmployee(employeeId),
    queryFn: () => menuApi.previewEmployeeMenu(employeeId),
    enabled: Boolean(employeeId) && enabled,
  });
}

export function usePreviewEmployeeCategory(
  employeeId: string,
  categoryId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: menuKeys.previewCategory(employeeId, categoryId),
    queryFn: () => menuApi.previewEmployeeCategory(employeeId, categoryId),
    enabled: Boolean(employeeId) && Boolean(categoryId) && enabled,
  });
}
