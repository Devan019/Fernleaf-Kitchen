import { pricingApi } from "@/lib/api/pricing";
import type {
  ListPriceTiersParams,
  ListTierDishesParams,
} from "@/lib/api/pricing";
import type {
  BulkDishPriceItem,
  CreatePriceTierRequest,
  UpdatePriceTierRequest,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Keys ─────────────────────────────────────────────────────────────────────

export const pricingKeys = {
  all: ["pricing"] as const,
  tiers: (params: ListPriceTiersParams = {}) => ["pricing", "tiers", params] as const,
  tier: (id: string) => ["pricing", "tiers", id] as const,
  tierDishes: (tierId: string, params: ListTierDishesParams = {}) =>
    ["pricing", "tiers", tierId, "dishes", params] as const,
  missingDishes: (tierId: string) => ["pricing", "tiers", tierId, "missing-dishes"] as const,
  tierOptions: (tierId: string) => ["pricing", "tiers", tierId, "options"] as const,
  missingOptions: (tierId: string) => ["pricing", "tiers", tierId, "missing-options"] as const,
  resolveCompanyDish: (companyId: string, dishId: string) =>
    ["pricing", "resolve", "company", companyId, "dish", dishId] as const,
  resolveCompanyOption: (companyId: string, optionId: string) =>
    ["pricing", "resolve", "company", companyId, "option", optionId] as const,
  companyContext: (companyId: string) =>
    ["pricing", "resolve", "company", companyId, "context"] as const,
  resolveEmployeeDish: (employeeId: string, dishId: string) =>
    ["pricing", "resolve", "employee", employeeId, "dish", dishId] as const,
  resolveEmployeeOption: (employeeId: string, optionId: string) =>
    ["pricing", "resolve", "employee", employeeId, "option", optionId] as const,
  employeeContext: (employeeId: string) =>
    ["pricing", "resolve", "employee", employeeId, "context"] as const,
  companies: () => ["pricing", "companies"] as const,
};

// ── Price Tier Hooks ─────────────────────────────────────────────────────────

export function usePriceTiers(
  params: ListPriceTiersParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: pricingKeys.tiers(params),
    queryFn: () => pricingApi.listTiers(params),
    enabled: options?.enabled,
  });
}

export function usePriceTier(id: string) {
  return useQuery({
    queryKey: pricingKeys.tier(id),
    queryFn: () => pricingApi.getTier(id),
    enabled: Boolean(id),
  });
}

export function useCreatePriceTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePriceTierRequest) => pricingApi.createTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers"] });
    },
  });
}

export function useUpdatePriceTier(tierId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdatePriceTierRequest }) =>
      pricingApi.updateTier(id ?? tierId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers"] });
      const targetId = vars.id ?? tierId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: pricingKeys.tier(targetId) });
      }
    },
  });
}

export function useDeletePriceTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pricingApi.deleteTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers"] });
    },
  });
}

export function useSetDefaultTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pricingApi.setDefaultTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers"] });
    },
  });
}

// ── Tier Dish Pricing Hooks ──────────────────────────────────────────────────

export function useTierDishes(
  tierId: string,
  params: ListTierDishesParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: pricingKeys.tierDishes(tierId, params),
    queryFn: () => pricingApi.getTierDishes(tierId, params),
    enabled: Boolean(tierId) && enabled,
  });
}

export function useMissingTierDishes(tierId: string) {
  return useQuery({
    queryKey: pricingKeys.missingDishes(tierId),
    queryFn: () => pricingApi.getMissingDishes(tierId),
    enabled: Boolean(tierId),
  });
}

export function useSetDishPriceOverride(tierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dishId, price }: { dishId: string; price: string | number }) =>
      pricingApi.setDishPriceOverride(tierId, dishId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers", tierId] });
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers"] });
    },
  });
}

export function useRemoveDishPriceOverride(tierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dishId: string) => pricingApi.removeDishPriceOverride(tierId, dishId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers", tierId] });
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers"] });
    },
  });
}

export function useBulkUpdateDishPrices(tierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prices: BulkDishPriceItem[]) =>
      pricingApi.bulkUpdateDishPrices(tierId, prices),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers", tierId] });
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers"] });
    },
  });
}

// ── Tier Option Pricing Hooks ────────────────────────────────────────────────

export function useTierOptions(tierId: string, enabled = true) {
  return useQuery({
    queryKey: pricingKeys.tierOptions(tierId),
    queryFn: () => pricingApi.getTierOptions(tierId),
    enabled: Boolean(tierId) && enabled,
  });
}

export function useMissingTierOptions(tierId: string) {
  return useQuery({
    queryKey: pricingKeys.missingOptions(tierId),
    queryFn: () => pricingApi.getMissingOptions(tierId),
    enabled: Boolean(tierId),
  });
}

export function useSetOptionPriceOverride(tierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, price }: { optionId: string; price: string | number }) =>
      pricingApi.setOptionPriceOverride(tierId, optionId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers", tierId] });
    },
  });
}

export function useRemoveOptionPriceOverride(tierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) =>
      pricingApi.removeOptionPriceOverride(tierId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing", "tiers", tierId] });
    },
  });
}

// ── Company-level Runtime Price Resolution Hooks ─────────────────────────────

export function useResolveCompanyDishPrice(
  companyId: string,
  dishId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: pricingKeys.resolveCompanyDish(companyId, dishId),
    queryFn: () => pricingApi.resolveCompanyDishPrice(companyId, dishId),
    enabled: Boolean(companyId) && Boolean(dishId) && enabled,
  });
}

export function useResolveCompanyOptionPrice(
  companyId: string,
  optionId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: pricingKeys.resolveCompanyOption(companyId, optionId),
    queryFn: () => pricingApi.resolveCompanyOptionPrice(companyId, optionId),
    enabled: Boolean(companyId) && Boolean(optionId) && enabled,
  });
}

export function useCompanyPricingContext(companyId: string, enabled = true) {
  return useQuery({
    queryKey: pricingKeys.companyContext(companyId),
    queryFn: () => pricingApi.getCompanyPricingContext(companyId),
    enabled: Boolean(companyId) && enabled,
  });
}

// ── Employee-level Runtime Price Resolution Hooks ────────────────────────────

export function useResolveEmployeeDishPrice(
  employeeId: string,
  dishId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: pricingKeys.resolveEmployeeDish(employeeId, dishId),
    queryFn: () => pricingApi.resolveEmployeeDishPrice(employeeId, dishId),
    enabled: Boolean(employeeId) && Boolean(dishId) && enabled,
  });
}

export function useResolveEmployeeOptionPrice(
  employeeId: string,
  optionId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: pricingKeys.resolveEmployeeOption(employeeId, optionId),
    queryFn: () => pricingApi.resolveEmployeeOptionPrice(employeeId, optionId),
    enabled: Boolean(employeeId) && Boolean(optionId) && enabled,
  });
}

export function useEmployeePricingContext(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: pricingKeys.employeeContext(employeeId),
    queryFn: () => pricingApi.getEmployeePricingContext(employeeId),
    enabled: Boolean(employeeId) && enabled,
  });
}

// ── Companies Reference Listing ──────────────────────────────────────────────

export function useCompanies(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: pricingKeys.companies(),
    queryFn: () => pricingApi.listCompanies({ limit: 100 }),
    enabled: options?.enabled,
  });
}
