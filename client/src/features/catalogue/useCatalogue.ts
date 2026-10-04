import { catalogueApi } from "@/lib/api/catalogue";
import type {
  ListDishesParams,
  ListOptionsParams,
} from "@/lib/api/catalogue";
import type {
  CreateDishRequest,
  CreateOptionGroupRequest,
  CreateOptionRequest,
  UpdateDishRequest,
  UpdateOptionGroupRequest,
  UpdateOptionRequest,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Keys ─────────────────────────────────────────────────────────────────────

export const catalogueKeys = {
  all: ["catalogue"] as const,
  dishes: (params: ListDishesParams = {}) => ["catalogue", "dishes", params] as const,
  dish: (id: string) => ["catalogue", "dishes", id] as const,
  options: (params: ListOptionsParams = {}) => ["catalogue", "options", params] as const,
  option: (id: string) => ["catalogue", "options", id] as const,
  optionGroups: (dishId: string) => ["catalogue", "dishes", dishId, "option-groups"] as const,
  allergens: () => ["catalogue", "allergens"] as const,
  dietaryTags: () => ["catalogue", "dietary-tags"] as const,
};

// ── Dishes Hooks ─────────────────────────────────────────────────────────────

export function useDishes(params: ListDishesParams = {}) {
  return useQuery({
    queryKey: catalogueKeys.dishes(params),
    queryFn: () => catalogueApi.listDishes(params),
  });
}

export function useDish(id: string) {
  return useQuery({
    queryKey: catalogueKeys.dish(id),
    queryFn: () => catalogueApi.getDish(id),
    enabled: Boolean(id),
  });
}

export function useCreateDish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDishRequest) => catalogueApi.createDish(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "dishes"] });
    },
  });
}

export function useUpdateDish(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdateDishRequest }) =>
      catalogueApi.updateDish(id ?? dishId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "dishes"] });
      const targetId = vars.id ?? dishId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(targetId) });
      }
    },
  });
}

export function useUpdateDishStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      catalogueApi.updateDishStatus(id, isActive),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "dishes"] });
      queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(vars.id) });
    },
  });
}

export function useUploadDishImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      catalogueApi.uploadDishImage(id, file),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "dishes"] });
      queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(vars.id) });
    },
  });
}

export function useDeleteDishImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogueApi.deleteDishImage(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "dishes"] });
      queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(id) });
    },
  });
}

// ── Options Hooks ────────────────────────────────────────────────────────────

export function useOptions(params: ListOptionsParams = {}) {
  return useQuery({
    queryKey: catalogueKeys.options(params),
    queryFn: () => catalogueApi.listOptions(params),
  });
}

export function useOption(id: string) {
  return useQuery({
    queryKey: catalogueKeys.option(id),
    queryFn: () => catalogueApi.getOption(id),
    enabled: Boolean(id),
  });
}

export function useCreateOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOptionRequest) => catalogueApi.createOption(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "options"] });
    },
  });
}

export function useUpdateOption(optionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdateOptionRequest }) =>
      catalogueApi.updateOption(id ?? optionId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "options"] });
      const targetId = vars.id ?? optionId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.option(targetId) });
      }
    },
  });
}

export function useUpdateOptionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      catalogueApi.updateOptionStatus(id, isActive),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["catalogue", "options"] });
      queryClient.invalidateQueries({ queryKey: catalogueKeys.option(vars.id) });
    },
  });
}

// ── Option Groups Hooks ──────────────────────────────────────────────────────

export function useOptionGroups(dishId: string) {
  return useQuery({
    queryKey: catalogueKeys.optionGroups(dishId),
    queryFn: () => catalogueApi.listOptionGroups(dishId),
    enabled: Boolean(dishId),
  });
}

export function useCreateOptionGroup(dishId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOptionGroupRequest) =>
      catalogueApi.createOptionGroup(dishId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
      queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
    },
  });
}

export function useUpdateOptionGroup(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOptionGroupRequest }) =>
      catalogueApi.updateOptionGroup(id, data),
    onSuccess: () => {
      if (dishId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
      }
    },
  });
}

export function useDeleteOptionGroup(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogueApi.deleteOptionGroup(id),
    onSuccess: () => {
      if (dishId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
      }
    },
  });
}

export function useAddOptionToGroup(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { optionId: string; displayOrder?: number };
    }) => catalogueApi.addOptionToGroup(groupId, data),
    onSuccess: () => {
      if (dishId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
      }
    },
  });
}

export function useRemoveOptionFromGroup(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      optionId,
    }: {
      groupId: string;
      optionId: string;
    }) => catalogueApi.removeOptionFromGroup(groupId, optionId),
    onSuccess: () => {
      if (dishId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
      }
    },
  });
}

export function useReorderGroupOptions(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      optionIds,
    }: {
      groupId: string;
      optionIds: string[];
    }) => catalogueApi.reorderGroupOptions(groupId, optionIds),
    onSuccess: () => {
      if (dishId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
      }
    },
  });
}

export function useAddPortionToGroup(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { portionSizeId: string; displayOrder?: number };
    }) => catalogueApi.addPortionToGroup(groupId, data),
    onSuccess: () => {
      if (dishId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
      }
    },
  });
}

export function useRemovePortionFromGroup(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      portionId,
    }: {
      groupId: string;
      portionId: string;
    }) => catalogueApi.removePortionFromGroup(groupId, portionId),
    onSuccess: () => {
      if (dishId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
      }
    },
  });
}

export function useReorderGroupPortions(dishId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      portionSizeIds,
    }: {
      groupId: string;
      portionSizeIds: string[];
    }) => catalogueApi.reorderGroupPortions(groupId, portionSizeIds),
    onSuccess: () => {
      if (dishId) {
        queryClient.invalidateQueries({ queryKey: catalogueKeys.optionGroups(dishId) });
        queryClient.invalidateQueries({ queryKey: catalogueKeys.dish(dishId) });
      }
    },
  });
}

// ── Reference Data Hooks ─────────────────────────────────────────────────────

export function useAllergens() {
  return useQuery({
    queryKey: catalogueKeys.allergens(),
    queryFn: () => catalogueApi.listAllergens(),
  });
}

export function useCreateAllergen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => catalogueApi.createAllergen(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogueKeys.allergens() });
    },
  });
}

export function useUpdateAllergen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
      catalogueApi.updateAllergen(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogueKeys.allergens() });
    },
  });
}

export function useDietaryTags() {
  return useQuery({
    queryKey: catalogueKeys.dietaryTags(),
    queryFn: () => catalogueApi.listDietaryTags(),
  });
}

export function useCreateDietaryTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => catalogueApi.createDietaryTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogueKeys.dietaryTags() });
    },
  });
}

export function useUpdateDietaryTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
      catalogueApi.updateDietaryTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogueKeys.dietaryTags() });
    },
  });
}
