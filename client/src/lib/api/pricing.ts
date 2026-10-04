import { client } from "./client";
import type {
  BulkDishPriceItem,
  BulkDishPriceResponse,
  CompanyListItem,
  CompanyPricingContext,
  CreatePriceTierRequest,
  EmployeePricingContext,
  PaginatedCompanies,
  PaginatedPriceTiers,
  PaginatedTierDishes,
  PriceTier,
  ResolvedEmployeePrice,
  ResolvedPriceResult,
  TierDishPricing,
  TierOptionPricing,
  UpdatePriceTierRequest,
} from "@/types";

export interface ListPriceTiersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ListTierDishesParams {
  page?: number;
  limit?: number;
  search?: string;
  missingOnly?: boolean;
}

export const pricingApi = {
  // ── Price Tiers ─────────────────────────────────────────────────────────
  listTiers: (params: ListPriceTiersParams = {}): Promise<PaginatedPriceTiers> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    const query = qs.toString();
    return client.get<PaginatedPriceTiers>(`/api/pricing/tiers${query ? `?${query}` : ""}`);
  },

  getTier: (id: string): Promise<PriceTier> =>
    client.get<PriceTier>(`/api/pricing/tiers/${id}`),

  createTier: (data: CreatePriceTierRequest): Promise<PriceTier> =>
    client.post<PriceTier>("/api/pricing/tiers", data),

  updateTier: (id: string, data: UpdatePriceTierRequest): Promise<PriceTier> =>
    client.patch<PriceTier>(`/api/pricing/tiers/${id}`, data),

  deleteTier: (id: string): Promise<{ success: boolean; message: string }> =>
    client.delete<{ success: boolean; message: string }>(`/api/pricing/tiers/${id}`),

  setDefaultTier: (id: string): Promise<PriceTier> =>
    client.patch<PriceTier>(`/api/pricing/tiers/${id}/default`),

  // ── Tier Dishes & Overrides ─────────────────────────────────────────────
  getTierDishes: async (
    tierId: string,
    params: ListTierDishesParams = {},
  ): Promise<PaginatedTierDishes> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.missingOnly !== undefined) qs.set("missingOnly", String(params.missingOnly));
    const query = qs.toString();
    const res = await client.get<any>(`/api/pricing/tiers/${tierId}/dishes${query ? `?${query}` : ""}`);
    const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    const meta = res?.meta ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: rawList.length,
      totalPages: Math.ceil(rawList.length / (params.limit ?? 20)) || 1,
    };

    const data: TierDishPricing[] = rawList.map((item: any) => ({
      dishId: item.dishId || item.id,
      dishName: item.name || item.dishName || "",
      sku: item.sku || "",
      costPrice: item.costPrice ?? "0.00",
      tierId,
      overridePrice: item.overridden ? item.price : item.overridePrice ?? null,
      derivedPrice: item.derived ? item.price : item.derivedPrice ?? null,
      effectivePrice: item.price ?? item.effectivePrice ?? null,
      hasOverride: Boolean(item.overridden ?? item.hasOverride),
      isMissingPrice: Boolean(item.missing ?? item.isMissingPrice),
    }));

    return { data, meta };
  },

  getMissingDishes: async (tierId: string): Promise<TierDishPricing[]> => {
    const res = await client.get<any>(`/api/pricing/tiers/${tierId}/missing-dishes`);
    const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    return rawList.map((item: any) => ({
      dishId: item.dishId || item.id,
      dishName: item.name || item.dishName || "",
      sku: item.sku || "",
      costPrice: item.costPrice ?? "0.00",
      tierId,
      overridePrice: item.overridden ? item.price : item.overridePrice ?? null,
      derivedPrice: item.derived ? item.price : item.derivedPrice ?? null,
      effectivePrice: item.price ?? item.effectivePrice ?? null,
      hasOverride: Boolean(item.overridden ?? item.hasOverride),
      isMissingPrice: Boolean(item.missing ?? item.isMissingPrice),
    }));
  },

  setDishPriceOverride: (
    tierId: string,
    dishId: string,
    price: string | number,
  ): Promise<TierDishPricing> =>
    client.put<TierDishPricing>(`/api/pricing/tiers/${tierId}/dishes/${dishId}`, { price }),

  removeDishPriceOverride: (
    tierId: string,
    dishId: string,
  ): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/pricing/tiers/${tierId}/dishes/${dishId}`),

  bulkUpdateDishPrices: (
    tierId: string,
    prices: BulkDishPriceItem[],
  ): Promise<BulkDishPriceResponse> =>
    client.put<BulkDishPriceResponse>(`/api/pricing/tiers/${tierId}/dishes/bulk`, { prices }),

  // ── Tier Options & Overrides ────────────────────────────────────────────
  getTierOptions: async (tierId: string): Promise<TierOptionPricing[]> => {
    const res = await client.get<any>(`/api/pricing/tiers/${tierId}/options?limit=100`);
    const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.options) ? res.options : []));
    return rawList.map((item: any) => ({
      optionId: item.optionId || item.id,
      optionName: item.name || item.optionName || "",
      costPrice: item.costPrice ?? "0.00",
      tierId,
      overridePrice: item.overridden ? item.price : item.overridePrice ?? null,
      derivedPrice: item.derived ? item.price : item.derivedPrice ?? null,
      effectivePrice: item.price ?? item.effectivePrice ?? null,
      hasOverride: Boolean(item.overridden ?? item.hasOverride),
      isMissingPrice: Boolean(item.missing ?? item.isMissingPrice),
    }));
  },

  getMissingOptions: async (tierId: string): Promise<TierOptionPricing[]> => {
    const res = await client.get<any>(`/api/pricing/tiers/${tierId}/missing-options?limit=100`);
    const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.options) ? res.options : []));
    return rawList.map((item: any) => ({
      optionId: item.optionId || item.id,
      optionName: item.name || item.optionName || "",
      costPrice: item.costPrice ?? "0.00",
      tierId,
      overridePrice: item.overridden ? item.price : item.overridePrice ?? null,
      derivedPrice: item.derived ? item.price : item.derivedPrice ?? null,
      effectivePrice: item.price ?? item.effectivePrice ?? null,
      hasOverride: Boolean(item.overridden ?? item.hasOverride),
      isMissingPrice: Boolean(item.missing ?? item.isMissingPrice),
    }));
  },

  setOptionPriceOverride: (
    tierId: string,
    optionId: string,
    price: string | number,
  ): Promise<TierOptionPricing> =>
    client.put<TierOptionPricing>(`/api/pricing/tiers/${tierId}/options/${optionId}`, { price }),

  removeOptionPriceOverride: (
    tierId: string,
    optionId: string,
  ): Promise<{ success: boolean }> =>
    client.delete<{ success: boolean }>(`/api/pricing/tiers/${tierId}/options/${optionId}`),

  // ── Company-level Runtime Price Resolution ──────────────────────────────
  resolveCompanyDishPrice: (
    companyId: string,
    dishId: string,
  ): Promise<ResolvedPriceResult> =>
    client.get<ResolvedPriceResult>(`/api/pricing/resolve/company/${companyId}/dish/${dishId}`),

  resolveCompanyOptionPrice: (
    companyId: string,
    optionId: string,
  ): Promise<ResolvedPriceResult> =>
    client.get<ResolvedPriceResult>(`/api/pricing/resolve/company/${companyId}/option/${optionId}`),

  getCompanyPricingContext: (companyId: string): Promise<CompanyPricingContext> =>
    client.get<CompanyPricingContext>(`/api/pricing/resolve/company/${companyId}/context`),

  // ── Employee-level Runtime Price Resolution ─────────────────────────────
  resolveEmployeeDishPrice: (
    employeeId: string,
    dishId: string,
  ): Promise<ResolvedEmployeePrice> =>
    client.get<ResolvedEmployeePrice>(`/api/pricing/resolve/employee/${employeeId}/dish/${dishId}`),

  resolveEmployeeOptionPrice: (
    employeeId: string,
    optionId: string,
  ): Promise<ResolvedEmployeePrice> =>
    client.get<ResolvedEmployeePrice>(`/api/pricing/resolve/employee/${employeeId}/option/${optionId}`),

  getEmployeePricingContext: (employeeId: string): Promise<EmployeePricingContext> =>
    client.get<EmployeePricingContext>(`/api/pricing/resolve/employee/${employeeId}/context`),

  // ── Companies Reference Listing ─────────────────────────────────────────
  listCompanies: async (params: { search?: string; limit?: number } = {}): Promise<CompanyListItem[]> => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    const query = qs.toString();
    const res = await client.get<any>(`/api/companies${query ? `?${query}` : ""}`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  },
};
