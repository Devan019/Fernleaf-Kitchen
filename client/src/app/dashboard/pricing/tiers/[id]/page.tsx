"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { BulkPriceOverrideModal } from "@/features/pricing/BulkPriceOverrideModal";
import { DishOverrideModal } from "@/features/pricing/DishOverrideModal";
import { OptionOverrideModal } from "@/features/pricing/OptionOverrideModal";
import { PriceTierFormModal } from "@/features/pricing/PriceTierFormModal";
import {
  useBulkUpdateDishPrices,
  useMissingTierDishes,
  usePriceTier,
  useRemoveDishPriceOverride,
  useRemoveOptionPriceOverride,
  useSetDishPriceOverride,
  useSetOptionPriceOverride,
  useTierDishes,
  useTierOptions,
  useUpdatePriceTier,
} from "@/features/pricing/usePricing";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  BulkDishPriceItem,
  PriceTier,
  TierDishPricing,
  TierOptionPricing,
  UpdatePriceTierRequest,
} from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Calculator,
  Edit3,
  Layers,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function TierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tierId = String(params.id ?? "");
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"dishes" | "options">("dishes");

  // Filters for dishes
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Queries
  const { data: tier, isLoading: loadingTier } = usePriceTier(tierId);
  const { data: missingDishesData } = useMissingTierDishes(tierId);
  const missingDishes: TierDishPricing[] = Array.isArray(missingDishesData)
    ? missingDishesData
    : Array.isArray((missingDishesData as any)?.data)
      ? (missingDishesData as any).data
      : [];

  const {
    data: dishesData,
    isLoading: loadingDishes,
    isError: isDishesError,
    error: dishesError,
  } = useTierDishes(tierId, {
    page,
    limit: LIMIT,
    search: search.trim() || undefined,
    missingOnly: missingOnly || undefined,
  });

  const {
    data: rawOptions,
    isLoading: loadingOptions,
    isError: isOptionsError,
    error: optionsError,
  } = useTierOptions(tierId);

  const optionsList: TierOptionPricing[] = Array.isArray(rawOptions)
    ? rawOptions
    : Array.isArray((rawOptions as any)?.data)
      ? (rawOptions as any).data
      : Array.isArray((rawOptions as any)?.options)
        ? (rawOptions as any).options
        : [];

  // Mutations
  const setDishOverrideMutation = useSetDishPriceOverride(tierId);
  const removeDishOverrideMutation = useRemoveDishPriceOverride(tierId);
  const bulkUpdateMutation = useBulkUpdateDishPrices(tierId);

  const setOptionOverrideMutation = useSetOptionPriceOverride(tierId);
  const removeOptionOverrideMutation = useRemoveOptionPriceOverride(tierId);
  const updateTierMutation = useUpdatePriceTier(tierId);

  // Modals
  const [overrideDish, setOverrideDish] = useState<TierDishPricing | null>(null);
  const [overrideOption, setOverrideOption] = useState<TierOptionPricing | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editTierOpen, setEditTierOpen] = useState(false);

  // Handlers
  const handleSaveDishOverride = async (dishId: string, price: string) => {
    try {
      await setDishOverrideMutation.mutateAsync({ dishId, price });
      setOverrideDish(null);
    } catch {
      // error
    }
  };

  const handleRemoveDishOverride = async (dishId: string) => {
    try {
      await removeDishOverrideMutation.mutateAsync(dishId);
      setOverrideDish(null);
    } catch {
      // error
    }
  };

  const handleSaveOptionOverride = async (optionId: string, price: string) => {
    try {
      await setOptionOverrideMutation.mutateAsync({ optionId, price });
      setOverrideOption(null);
    } catch {
      // error
    }
  };

  const handleRemoveOptionOverride = async (optionId: string) => {
    try {
      await removeOptionOverrideMutation.mutateAsync(optionId);
      setOverrideOption(null);
    } catch {
      // error
    }
  };

  const handleSaveBulk = async (prices: BulkDishPriceItem[]) => {
    try {
      await bulkUpdateMutation.mutateAsync(prices);
      setBulkOpen(false);
    } catch {
      // error
    }
  };

  const handleUpdateTier = async (data: UpdatePriceTierRequest) => {
    try {
      await updateTierMutation.mutateAsync({ id: tierId, data });
      setEditTierOpen(false);
    } catch {
      // error
    }
  };

  const dishes = dishesData?.data ?? [];

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title="Tier Price Matrix" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {/* Back breadcrumb */}
        <div className="mb-4">
          <Link
            href="/dashboard/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c685e] hover:text-[#26352a] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Price Tiers
          </Link>
        </div>

        {/* Tier Header Card */}
        {loadingTier ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-sm mb-6">
            <div className="h-6 w-48 bg-[#eae5d8] rounded animate-pulse" />
          </div>
        ) : tier ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/95 backdrop-blur-md p-6 shadow-[0_10px_35px_rgba(38,53,42,0.04)] mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-serif text-2xl font-bold text-[#26352a]">
                    {tier.name}
                  </span>
                  {tier.isDefault && (
                    <span className="rounded-md bg-[#c8a96b]/20 px-2 py-0.5 text-[10px] font-bold text-[#8c6b29]">
                      Default Tier
                    </span>
                  )}
                  <Badge variant={tier.isActive ? "active" : "inactive"}>
                    {tier.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-[#78857a] max-w-2xl">
                  {tier.description || "No tier notes configured."}
                </p>
              </div>

              {/* Derivation summary pill */}
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#eae5d8]/80 p-3 border border-[#d9d2c2] text-xs">
                  <p className="text-[10px] uppercase font-bold text-[#78857a] tracking-wider">
                    Derivation Logic
                  </p>
                  <p className="font-semibold text-[#26352a] mt-0.5">
                    {tier.derivationType === "COST_MULTIPLIER" &&
                      `Cost Price × ${Number(tier.multiplier ?? 1).toFixed(2)}`}
                    {tier.derivationType === "TIER_PERCENTAGE" &&
                      `${tier.baseTierName ?? "Base Tier"} ${Number(tier.percentage ?? 0) >= 0 ? "+" : ""}${Number(tier.percentage ?? 0).toFixed(1)}%`}
                    {tier.derivationType === "MANUAL" && "Explicit item prices only"}
                  </p>
                </div>

                {isAdmin && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Pencil size={13} />}
                    onClick={() => setEditTierOpen(true)}
                  >
                    Edit Tier
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Missing Prices Warning Banner */}
        {missingDishes.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#fff8e6] border border-[#f3d994] p-4 text-xs text-[#8c6b29] mb-6 shadow-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-[#c8a96b] shrink-0" />
              <div>
                <p className="font-bold">
                  Missing Price Audit: {missingDishes.length} unpriced item(s) on this tier!
                </p>
                <p className="text-[11px] text-[#8c6b29]/80 mt-0.5">
                  Corporate employees will be unable to order these dishes until prices or derivation
                  rules are assigned.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setMissingOnly(true);
                setActiveTab("dishes");
              }}
            >
              Filter Unpriced Items
            </Button>
          </div>
        )}

        {/* Sub-tabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex rounded-2xl bg-[#eae5d8]/80 p-1 border border-[#d9d2c2]">
            <button
              onClick={() => setActiveTab("dishes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "dishes"
                  ? "bg-[#294d33] text-white shadow-sm"
                  : "text-[#5c685e] hover:text-[#26352a]"
              }`}
            >
              <UtensilsCrossed size={14} />
              Dishes Price Matrix
            </button>
            <button
              onClick={() => setActiveTab("options")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "options"
                  ? "bg-[#294d33] text-white shadow-sm"
                  : "text-[#5c685e] hover:text-[#26352a]"
              }`}
            >
              <Layers size={14} />
              Options Pricing ({optionsList.length})
            </button>
          </div>

          {activeTab === "dishes" && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
                />
                <input
                  type="text"
                  placeholder="Search dish or SKU..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-8 pr-3 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-[#5c685e] cursor-pointer bg-white/70 px-3 py-1.5 rounded-xl border border-[#d9d2c2]">
                <input
                  type="checkbox"
                  checked={missingOnly}
                  onChange={(e) => {
                    setMissingOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-[#d9d2c2] text-[#294d33]"
                />
                Missing Only
              </label>

              {isAdmin && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Edit3 size={13} />}
                  onClick={() => setBulkOpen(true)}
                  disabled={dishes.length === 0}
                >
                  Bulk Override
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Tab Content: Dishes ───────────────────────────────────────────── */}
        {activeTab === "dishes" && (
          <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(38,53,42,0.04)] overflow-hidden">
            {isDishesError && (
              <div className="px-6 py-4 text-sm text-[#a34747] bg-[#fff5f5] border-b border-[#ffdada]">
                {getErrorMessage(dishesError, "Failed to load tier dishes.")}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tier dishes price matrix">
                <thead>
                  <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Dish / Item
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Cost Price
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Derived Price
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Explicit Override
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Effective Price
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9dc]">
                  {loadingDishes ? (
                    <TableSkeleton rows={5} cols={7} />
                  ) : dishes.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon={<UtensilsCrossed size={24} />}
                          title="No dishes found"
                          description={
                            missingOnly
                              ? "Great news! All catalogue dishes have resolved prices on this tier."
                              : "No dishes matching current query."
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    dishes.map((dish) => (
                      <tr key={dish.dishId} className="hover:bg-[#f6f2e8] transition-colors">
                        <td className="px-6 py-4 font-semibold text-[#26352a]">
                          {dish.dishName}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#78857a]">
                          {dish.sku}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#5c685e]">
                          ${Number(dish.costPrice).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#5c685e]">
                          {dish.derivedPrice
                            ? `$${Number(dish.derivedPrice).toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          {dish.hasOverride ? (
                            <span className="font-mono text-xs font-bold text-[#c8a96b] bg-[#c8a96b]/15 px-2 py-0.5 rounded border border-[#c8a96b]/30">
                              ${Number(dish.overridePrice).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-[#9fa89e]">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-xs">
                          {dish.isMissingPrice ? (
                            <span className="text-[#a34747] bg-[#fff5f5] px-2 py-0.5 rounded border border-[#ffdada] inline-flex items-center gap-1">
                              <AlertTriangle size={11} />
                              Missing Price
                            </span>
                          ) : (
                            <span className="text-[#294d33]">
                              ${Number(dish.effectivePrice ?? 0).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin && (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setOverrideDish(dish)}
                              >
                                {dish.hasOverride ? "Edit Override" : "Set Override"}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {dishesData && dishesData.meta.totalPages > 1 && (
              <Pagination
                page={dishesData.meta.page}
                totalPages={dishesData.meta.totalPages}
                hasNextPage={dishesData.meta.hasNextPage}
                hasPreviousPage={dishesData.meta.hasPreviousPage}
                total={dishesData.meta.total}
                limit={LIMIT}
                onPageChange={setPage}
              />
            )}
          </div>
        )}

        {/* ── Tab Content: Options ─────────────────────────────────────────── */}
        {activeTab === "options" && (
          <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(38,53,42,0.04)] overflow-hidden">
            {isOptionsError && (
              <div className="px-6 py-4 text-sm text-[#a34747] bg-[#fff5f5] border-b border-[#ffdada]">
                {getErrorMessage(optionsError, "Failed to load tier options.")}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tier options price matrix">
                <thead>
                  <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Option Name
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Cost Price
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Explicit Override
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Effective Price
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9dc]">
                  {loadingOptions ? (
                    <TableSkeleton rows={5} cols={5} />
                  ) : optionsList.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          icon={<Layers size={24} />}
                          title="No options registered"
                          description="No options found in catalogue."
                        />
                      </td>
                    </tr>
                  ) : (
                    optionsList?.map((opt) => (
                      <tr key={opt.optionId} className="hover:bg-[#f6f2e8] transition-colors">
                        <td className="px-6 py-4 font-semibold text-[#26352a]">
                          {opt.optionName}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#5c685e]">
                          ${Number(opt.costPrice).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          {opt.hasOverride ? (
                            <span className="font-mono text-xs font-bold text-[#c8a96b] bg-[#c8a96b]/15 px-2 py-0.5 rounded border border-[#c8a96b]/30">
                              ${Number(opt.overridePrice).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-[#9fa89e]">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-xs text-[#294d33]">
                          ${Number(opt.effectivePrice ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setOverrideOption(opt)}
                            >
                              {opt.hasOverride ? "Edit Override" : "Set Override"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Dish Override Modal */}
      {overrideDish && (
        <DishOverrideModal
          open={Boolean(overrideDish)}
          onClose={() => setOverrideDish(null)}
          tierId={tierId}
          item={overrideDish}
          onSaveOverride={handleSaveDishOverride}
          onRemoveOverride={handleRemoveDishOverride}
          loading={setDishOverrideMutation.isPending || removeDishOverrideMutation.isPending}
        />
      )}

      {/* Option Override Modal */}
      {overrideOption && (
        <OptionOverrideModal
          open={Boolean(overrideOption)}
          onClose={() => setOverrideOption(null)}
          tierId={tierId}
          item={overrideOption}
          onSaveOverride={handleSaveOptionOverride}
          onRemoveOverride={handleRemoveOptionOverride}
          loading={setOptionOverrideMutation.isPending || removeOptionOverrideMutation.isPending}
        />
      )}

      {/* Bulk Overrides Modal */}
      <BulkPriceOverrideModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        dishes={dishes}
        onSaveBulk={handleSaveBulk}
        loading={bulkUpdateMutation.isPending}
      />

      {/* Edit Tier Modal */}
      <PriceTierFormModal
        open={editTierOpen}
        onClose={() => setEditTierOpen(false)}
        tier={tier}
        onSubmit={handleUpdateTier}
        loading={updateTierMutation.isPending}
      />
    </ProtectedRoute>
  );
}
