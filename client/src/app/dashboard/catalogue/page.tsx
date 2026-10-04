"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DishDetailModal } from "@/features/catalogue/DishDetailModal";
import { DishFormModal } from "@/features/catalogue/DishFormModal";
import { OptionFormModal } from "@/features/catalogue/OptionFormModal";
import { ReferenceDataModal } from "@/features/catalogue/ReferenceDataModal";
import {
  useCreateDish,
  useCreateOption,
  useDeleteDishImage,
  useDishes,
  useOptions,
  useUpdateDish,
  useUpdateDishStatus,
  useUpdateOption,
  useUpdateOptionStatus,
  useUploadDishImage,
} from "@/features/catalogue/useCatalogue";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  CreateDishRequest,
  CreateOptionRequest,
  Dish,
  DishTemperature,
  Option,
  UpdateDishRequest,
  UpdateOptionRequest,
} from "@/types";
import {
  BookOpen,
  ChefHat,
  Flame,
  Layers,
  Pencil,
  Plus,
  Search,
  Settings,
  Settings2,
  Snowflake,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";

export default function CataloguePage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  // Tab State
  const [activeTab, setActiveTab] = useState<"dishes" | "options">("dishes");

  // Filters state
  const [search, setSearch] = useState("");
  const [tempFilter, setTempFilter] = useState<DishTemperature | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // Query Params
  const dishParams = {
    page,
    limit: LIMIT,
    search: search.trim() || undefined,
    temperature: tempFilter !== "ALL" ? tempFilter : undefined,
    isActive: statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
  };

  const optionParams = {
    page,
    limit: LIMIT,
    search: search.trim() || undefined,
    isActive: statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
  };

  // Queries
  const {
    data: dishesData,
    isLoading: loadingDishes,
    isError: isDishesError,
    error: dishesError,
  } = useDishes(dishParams);

  const {
    data: optionsData,
    isLoading: loadingOptions,
    isError: isOptionsError,
    error: optionsError,
  } = useOptions(optionParams);

  // Mutations
  const createDishMutation = useCreateDish();
  const updateDishMutation = useUpdateDish("");
  const updateDishStatusMutation = useUpdateDishStatus();
  const uploadDishImageMutation = useUploadDishImage();
  const deleteDishImageMutation = useDeleteDishImage();

  const createOptionMutation = useCreateOption();
  const updateOptionMutation = useUpdateOption("");
  const updateOptionStatusMutation = useUpdateOptionStatus();

  // Modals
  const [dishFormOpen, setDishFormOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishDetailId, setDishDetailId] = useState<string | null>(null);
  const [dishFormError, setDishFormError] = useState<string | null>(null);

  const [optionFormOpen, setOptionFormOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [optionFormError, setOptionFormError] = useState<string | null>(null);

  const [refDataOpen, setRefDataOpen] = useState(false);

  // ── Dish Handlers ──────────────────────────────────────────────────────────

  const handleCreateOrUpdateDish = async (
    data: CreateDishRequest | UpdateDishRequest,
    imageFile?: File | null,
    removeImage?: boolean,
  ) => {
    setDishFormError(null);
    try {
      let dishId = editingDish?.id;
      if (editingDish) {
        await updateDishMutation.mutateAsync({
          id: editingDish.id,
          data: data as UpdateDishRequest,
        });
      } else {
        const created = await createDishMutation.mutateAsync(data as CreateDishRequest);
        dishId = created.id;
      }

      if (dishId) {
        if (imageFile) {
          await uploadDishImageMutation.mutateAsync({ id: dishId, file: imageFile });
        } else if (removeImage && editingDish?.imageUrl) {
          await deleteDishImageMutation.mutateAsync(dishId);
        }
      }

      setDishFormOpen(false);
      setEditingDish(null);
    } catch (err) {
      setDishFormError(getErrorMessage(err, "Failed to save dish."));
    }
  };

  const handleToggleDishStatus = async (dish: Dish, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDishStatusMutation.mutateAsync({
        id: dish.id,
        isActive: !dish.isActive,
      });
    } catch {
      // error handled
    }
  };

  // ── Option Handlers ────────────────────────────────────────────────────────

  const handleCreateOrUpdateOption = async (
    data: CreateOptionRequest | UpdateOptionRequest,
  ) => {
    setOptionFormError(null);
    try {
      if (editingOption) {
        await updateOptionMutation.mutateAsync({
          id: editingOption.id,
          data: data as UpdateOptionRequest,
        });
      } else {
        await createOptionMutation.mutateAsync(data as CreateOptionRequest);
      }
      setOptionFormOpen(false);
      setEditingOption(null);
    } catch (err) {
      setOptionFormError(getErrorMessage(err, "Failed to save option."));
    }
  };

  const handleToggleOptionStatus = async (option: Option, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateOptionStatusMutation.mutateAsync({
        id: option.id,
        isActive: !option.isActive,
      });
    } catch {
      // error handled
    }
  };

  return (
    <ProtectedRoute requiredRole={["ADMIN", "KITCHEN"]}>
      <Header title="Catalogue" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Top Header */}
        <PageHeader
          title="Food Item Catalogue"
          description="Manage master dishes, custom options, temperature controls, portion sizes, allergens, and dietary tags."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                icon={<Settings size={15} />}
                onClick={() => setRefDataOpen(true)}
              >
                Allergens & Tags
              </Button>
              {isAdmin && (
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => {
                    if (activeTab === "dishes") {
                      setEditingDish(null);
                      setDishFormError(null);
                      setDishFormOpen(true);
                    } else {
                      setEditingOption(null);
                      setOptionFormError(null);
                      setOptionFormOpen(true);
                    }
                  }}
                >
                  {activeTab === "dishes" ? "Add Master Dish" : "Add Option"}
                </Button>
              )}
            </div>
          }
        />

        {/* Tab & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Main Tabs */}
          <div className="flex rounded-2xl bg-[#eae5d8]/80 p-1 border border-[#d9d2c2] self-start">
            <button
              onClick={() => {
                setActiveTab("dishes");
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "dishes"
                  ? "bg-[#294d33] text-white shadow-sm"
                  : "text-[#5c685e] hover:text-[#26352a]"
              }`}
            >
              <UtensilsCrossed size={15} />
              Master Dishes
              {dishesData?.meta && (
                <span className="rounded-full bg-white/20 px-2 py-0.2 text-[10px]">
                  {dishesData.meta.total}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("options");
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "options"
                  ? "bg-[#294d33] text-white shadow-sm"
                  : "text-[#5c685e] hover:text-[#26352a]"
              }`}
            >
              <Layers size={15} />
              Reusable Options
              {optionsData?.meta && (
                <span className="rounded-full bg-white/20 px-2 py-0.2 text-[10px]">
                  {optionsData.meta.total}
                </span>
              )}
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative min-w-[220px]">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "dishes" ? "Search dishes or SKU..." : "Search options..."
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10"
              />
            </div>

            {activeTab === "dishes" && (
              <select
                value={tempFilter}
                onChange={(e) => {
                  setTempFilter(e.target.value as DishTemperature | "ALL");
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] transition-all focus:border-[#315d3c] focus:outline-none"
              >
                <option value="ALL">All Temperatures</option>
                <option value="HOT">Hot Items Only 🔥</option>
                <option value="COLD">Cold Items Only ❄️</option>
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                setPage(1);
              }}
              className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] transition-all focus:border-[#315d3c] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* ── Tab Content: Dishes ───────────────────────────────────────────── */}
        {activeTab === "dishes" && (
          <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(38,53,42,0.04)] overflow-hidden">
            {isDishesError && (
              <div className="px-6 py-4 text-sm text-[#a34747] bg-[#fff5f5] border-b border-[#ffdada]">
                {getErrorMessage(dishesError, "Failed to load catalogue dishes.")}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Catalogue dishes">
                <thead>
                  <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Dish / Item
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Temp
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Cost Price
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Tags & Allergens
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9dc]">
                  {loadingDishes ? (
                    <TableSkeleton rows={5} cols={7} />
                  ) : !dishesData || dishesData.data.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon={<ChefHat size={24} />}
                          title="No dishes found"
                          description={
                            search || tempFilter !== "ALL" || statusFilter !== "ALL"
                              ? "Try adjusting your search or filters."
                              : "Get started by registering your kitchen's master dishes."
                          }
                          action={
                            isAdmin ? (
                              <Button
                                icon={<Plus size={15} />}
                                onClick={() => {
                                  setEditingDish(null);
                                  setDishFormError(null);
                                  setDishFormOpen(true);
                                }}
                              >
                                Add Master Dish
                              </Button>
                            ) : undefined
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    dishesData.data.map((dish) => (
                      <tr
                        key={dish.id}
                        onClick={() => setDishDetailId(dish.id)}
                        className="hover:bg-[#f6f2e8] transition-colors cursor-pointer group"
                      >
                        {/* Name & Photo */}
                        <td className="px-6 py-4 font-medium text-[#26352a]">
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#d9d2c2] overflow-hidden shrink-0 shadow-inner">
                              {dish.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={dish.imageUrl}
                                  alt={dish.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <UtensilsCrossed size={16} className="text-[#9fa89e]" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#26352a] group-hover:text-[#294d33] transition-colors">
                                {dish.name}
                              </p>
                              {dish.description && (
                                <p className="text-xs text-[#78857a] line-clamp-1 max-w-xs">
                                  {dish.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-6 py-4 font-mono text-xs font-bold text-[#5c685e]">
                          <span className="rounded bg-[#f5f1e6] px-2 py-0.5 border border-[#eae5d8]">
                            {dish.sku}
                          </span>
                        </td>

                        {/* Temp */}
                        <td className="px-6 py-4">
                          <Badge variant={dish.temperature === "HOT" ? "kitchen" : "dispatch"}>
                            <span className="flex items-center gap-1">
                              {dish.temperature === "HOT" ? (
                                <Flame size={12} />
                              ) : (
                                <Snowflake size={12} />
                              )}
                              {dish.temperature}
                            </span>
                          </Badge>
                        </td>

                        {/* Cost Price */}
                        <td className="px-6 py-4 font-mono font-semibold text-xs text-[#26352a]">
                          ${Number(dish.costPrice).toFixed(2)}
                        </td>

                        {/* Dietary Tags & Allergens */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {dish.dietaryTags?.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded bg-[#294d33]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#294d33]"
                              >
                                {tag.name}
                              </span>
                            ))}
                            {dish.allergens?.map((a) => (
                              <span
                                key={a.id}
                                className="rounded bg-[#a34747]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#a34747]"
                              >
                                ⚠️ {a.name}
                              </span>
                            ))}
                            {(!dish.dietaryTags || dish.dietaryTags.length === 0) &&
                              (!dish.allergens || dish.allergens.length === 0) && (
                                <span className="text-xs text-[#9fa89e]">—</span>
                              )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleToggleDishStatus(dish, e)}
                            className="cursor-pointer"
                          >
                            <Badge variant={dish.isActive ? "active" : "inactive"}>
                              {dish.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </button>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-6 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setDishDetailId(dish.id)}
                              title="Configure Options & Portions"
                              className="flex h-8 px-2.5 items-center gap-1.5 rounded-lg border border-transparent text-[#294d33] hover:border-[#d9d2c2] hover:bg-white text-xs font-semibold transition-all shadow-xs"
                            >
                              <Layers size={14} />
                              <span className="hidden sm:inline">Options</span>
                            </button>
                            {isAdmin && (
                              <button
                                aria-label={`Edit ${dish.name}`}
                                onClick={() => {
                                  setEditingDish(dish);
                                  setDishFormError(null);
                                  setDishFormOpen(true);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#78857a] hover:border-[#d9d2c2] hover:bg-white hover:text-[#26352a] transition-all shadow-xs"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
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
                {getErrorMessage(optionsError, "Failed to load catalogue options.")}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Catalogue options">
                <thead>
                  <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Option Name
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Base Cost Price
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Dietary & Allergens
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9dc]">
                  {loadingOptions ? (
                    <TableSkeleton rows={5} cols={5} />
                  ) : !optionsData || optionsData.data.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          icon={<Layers size={24} />}
                          title="No options found"
                          description={
                            search || statusFilter !== "ALL"
                              ? "Try adjusting your search or filters."
                              : "Create reusable choices like extra cheeses, dressings, and side substitutes."
                          }
                          action={
                            isAdmin ? (
                              <Button
                                icon={<Plus size={15} />}
                                onClick={() => {
                                  setEditingOption(null);
                                  setOptionFormError(null);
                                  setOptionFormOpen(true);
                                }}
                              >
                                Add Option
                              </Button>
                            ) : undefined
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    optionsData.data.map((opt) => (
                      <tr key={opt.id} className="hover:bg-[#f6f2e8] transition-colors">
                        <td className="px-6 py-4 font-semibold text-[#26352a]">{opt.name}</td>
                        <td className="px-6 py-4 font-mono font-semibold text-xs text-[#26352a]">
                          ${Number(opt.costPrice).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {opt.dietaryTags?.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded bg-[#294d33]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#294d33]"
                              >
                                {tag.name}
                              </span>
                            ))}
                            {opt.allergens?.map((a) => (
                              <span
                                key={a.id}
                                className="rounded bg-[#a34747]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#a34747]"
                              >
                                ⚠️ {a.name}
                              </span>
                            ))}
                            {(!opt.dietaryTags || opt.dietaryTags.length === 0) &&
                              (!opt.allergens || opt.allergens.length === 0) && (
                                <span className="text-xs text-[#9fa89e]">—</span>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => handleToggleOptionStatus(opt, e)}
                            className="cursor-pointer"
                          >
                            <Badge variant={opt.isActive ? "active" : "inactive"}>
                              {opt.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin && (
                            <button
                              aria-label={`Edit ${opt.name}`}
                              onClick={() => {
                                setEditingOption(opt);
                                setOptionFormError(null);
                                setOptionFormOpen(true);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#78857a] hover:border-[#d9d2c2] hover:bg-white hover:text-[#26352a] transition-all shadow-xs"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {optionsData && optionsData.meta.totalPages > 1 && (
              <Pagination
                page={optionsData.meta.page}
                totalPages={optionsData.meta.totalPages}
                hasNextPage={optionsData.meta.hasNextPage}
                hasPreviousPage={optionsData.meta.hasPreviousPage}
                total={optionsData.meta.total}
                limit={LIMIT}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </main>

      {/* Dish Create/Edit Modal */}
      <DishFormModal
        open={dishFormOpen}
        onClose={() => setDishFormOpen(false)}
        dish={editingDish}
        onSubmit={handleCreateOrUpdateDish}
        loading={createDishMutation.isPending || updateDishMutation.isPending}
        serverError={dishFormError}
      />

      {/* Dish Detail / Option Groups Modal */}
      <DishDetailModal
        dishId={dishDetailId}
        open={dishDetailId !== null}
        onClose={() => setDishDetailId(null)}
        onEdit={() => {
          const found = dishesData?.data.find((d) => d.id === dishDetailId);
          if (found) {
            setDishDetailId(null);
            setEditingDish(found);
            setDishFormError(null);
            setDishFormOpen(true);
          }
        }}
      />

      {/* Option Create/Edit Modal */}
      <OptionFormModal
        open={optionFormOpen}
        onClose={() => setOptionFormOpen(false)}
        option={editingOption}
        onSubmit={handleCreateOrUpdateOption}
        loading={createOptionMutation.isPending || updateOptionMutation.isPending}
        serverError={optionFormError}
      />

      {/* Reference Data Modal */}
      <ReferenceDataModal open={refDataOpen} onClose={() => setRefDataOpen(false)} />
    </ProtectedRoute>
  );
}
