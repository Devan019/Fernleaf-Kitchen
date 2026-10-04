"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AddDishToCategoryModal } from "@/features/menu/AddDishToCategoryModal";
import { CategoryFormModal } from "@/features/menu/CategoryFormModal";
import { CompanyVisibilityModal } from "@/features/menu/CompanyVisibilityModal";
import { MenuPreviewModal } from "@/features/menu/MenuPreviewModal";
import {
  useAddDishToCategory,
  useCategories,
  useCategory,
  useCreateCategory,
  useRemoveDishFromCategory,
  useReorderCategories,
  useReorderCategoryDishes,
  useUpdateCategory,
  useUpdateCategoryStatus,
} from "@/features/menu/useMenu";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  CreateCategoryRequest,
  MenuCategory,
  UpdateCategoryRequest,
} from "@/types";
import {
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Lock,
  Pencil,
  Plus,
  Search,
  Snowflake,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";

export default function MenuPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  // Search & Filter
  const [search, setSearch] = useState("");
  const [secretFilter, setSecretFilter] = useState<"ALL" | "PUBLIC" | "SECRET">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const queryParams = {
    search: search.trim() || undefined,
    isSecret:
      secretFilter === "ALL" ? undefined : secretFilter === "SECRET",
    isActive:
      statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
    limit: 50,
  };

  const { data: categoriesData, isLoading, isError, error } = useCategories(queryParams);
  const categories = categoriesData?.data ?? [];

  // Expanded Categories accordion
  const [expandedCatIds, setExpandedCatIds] = useState<string[]>([]);

  // Mutations
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory("");
  const updateCategoryStatusMutation = useUpdateCategoryStatus();
  const reorderCategoriesMutation = useReorderCategories();

  // Modals state
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);

  const [addDishCategory, setAddDishCategory] = useState<MenuCategory | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Visibility Modal
  const [visibilityItem, setVisibilityItem] = useState<{
    type: "CATEGORY" | "DISH";
    id: string;
    name: string;
  } | null>(null);

  const toggleExpand = (catId: string) => {
    setExpandedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  const handleCreateOrUpdateCategory = async (
    data: CreateCategoryRequest | UpdateCategoryRequest,
  ) => {
    setCategoryFormError(null);
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: data as UpdateCategoryRequest,
        });
      } else {
        await createCategoryMutation.mutateAsync(data as CreateCategoryRequest);
      }
      setCategoryFormOpen(false);
      setEditingCategory(null);
    } catch (err) {
      setCategoryFormError(getErrorMessage(err, "Failed to save category."));
    }
  };

  const handleToggleStatus = async (cat: MenuCategory) => {
    try {
      await updateCategoryStatusMutation.mutateAsync({
        id: cat.id,
        isActive: !cat.isActive,
      });
    } catch {
      // error
    }
  };

  const handleMoveCategory = async (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const categoryIds = reordered.map((c) => c.id);
    try {
      await reorderCategoriesMutation.mutateAsync(categoryIds);
    } catch {
      // error
    }
  };

  return (
    <ProtectedRoute requiredRole={["ADMIN", "KITCHEN", "DISPATCH"]}>
      <Header title="Menu Management" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <PageHeader
          title="Catering Menu Architecture"
          description="Organize customer-facing menu categories, dish display sequences, secret promotional menus, and corporate visibility rules."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                icon={<Eye size={15} />}
                onClick={() => setPreviewOpen(true)}
              >
                Preview Employee Menu
              </Button>
              {isAdmin && (
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryFormError(null);
                    setCategoryFormOpen(true);
                  }}
                >
                  Create Category
                </Button>
              )}
            </div>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
            />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10"
            />
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <select
              value={secretFilter}
              onChange={(e) =>
                setSecretFilter(e.target.value as "ALL" | "PUBLIC" | "SECRET")
              }
              className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] transition-all focus:border-[#315d3c] focus:outline-none"
            >
              <option value="ALL">All Category Types</option>
              <option value="PUBLIC">Public Only</option>
              <option value="SECRET">Secret Direct-Link Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
              }
              className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] transition-all focus:border-[#315d3c] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Categories List */}
        {isError && (
          <div className="rounded-2xl bg-[#fff5f5] p-4 text-sm text-[#a34747] border border-[#ffdada] mb-6">
            {getErrorMessage(error, "Failed to load menu categories.")}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-sm">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 p-8">
            <EmptyState
              icon={<BookOpenCheck size={24} />}
              title="No categories configured"
              description="Create your first catering category (e.g. Lunch Mains, Sandwiches, Beverages) to start assembling menus."
              action={
                isAdmin ? (
                  <Button
                    icon={<Plus size={15} />}
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryFormError(null);
                      setCategoryFormOpen(true);
                    }}
                  >
                    Create Category
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category, index) => {
              const isExpanded = expandedCatIds.includes(category.id);
              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                  totalCount={categories.length}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleExpand(category.id)}
                  onMove={(dir) => handleMoveCategory(index, dir)}
                  onEdit={() => {
                    setEditingCategory(category);
                    setCategoryFormError(null);
                    setCategoryFormOpen(true);
                  }}
                  onToggleStatus={() => handleToggleStatus(category)}
                  onAddDishes={() => setAddDishCategory(category)}
                  onManageVisibility={(type, id, name) =>
                    setVisibilityItem({ type, id, name })
                  }
                  isAdmin={isAdmin}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Category Create/Edit Modal */}
      <CategoryFormModal
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        category={editingCategory}
        onSubmit={handleCreateOrUpdateCategory}
        loading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
        serverError={categoryFormError}
        defaultOrder={categories.length + 1}
      />

      {/* Add Dish to Category Modal */}
      {addDishCategory && (
        <AddDishToCategoryParentModal
          category={addDishCategory}
          open={Boolean(addDishCategory)}
          onClose={() => setAddDishCategory(null)}
        />
      )}

      {/* Visibility Modal */}
      {visibilityItem && (
        <CompanyVisibilityModal
          open={Boolean(visibilityItem)}
          onClose={() => setVisibilityItem(null)}
          itemType={visibilityItem.type}
          itemId={visibilityItem.id}
          itemName={visibilityItem.name}
        />
      )}

      {/* Live Preview Modal */}
      <MenuPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </ProtectedRoute>
  );
}

// ── Category Card Component ──────────────────────────────────────────────────

interface CategoryCardProps {
  category: MenuCategory;
  index: number;
  totalCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMove: (direction: "up" | "down") => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onAddDishes: () => void;
  onManageVisibility: (type: "CATEGORY" | "DISH", id: string, name: string) => void;
  isAdmin: boolean;
}

function CategoryCard({
  category,
  index,
  totalCount,
  isExpanded,
  onToggleExpand,
  onMove,
  onEdit,
  onToggleStatus,
  onAddDishes,
  onManageVisibility,
  isAdmin,
}: CategoryCardProps) {
  // Query full category details when expanded
  const { data: fullCategory, isLoading: loadingDetails } = useCategory(
    isExpanded ? category.id : "",
  );

  const dishes = fullCategory?.dishes ?? category.dishes ?? [];

  const removeDishMutation = useRemoveDishFromCategory(category.id);
  const reorderDishesMutation = useReorderCategoryDishes(category.id);

  const handleMoveDish = async (
    dishIndex: number,
    direction: "up" | "down",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const targetIndex = direction === "up" ? dishIndex - 1 : dishIndex + 1;
    if (targetIndex < 0 || targetIndex >= dishes.length) return;

    const reordered = [...dishes];
    const temp = reordered[dishIndex];
    reordered[dishIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const dishIds = reordered.map((d) => d.id ?? d.dishId ?? "");
    try {
      await reorderDishesMutation.mutateAsync(dishIds);
    } catch {
      // error
    }
  };

  const handleRemoveDish = async (dishId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeDishMutation.mutateAsync(dishId);
    } catch {
      // error
    }
  };

  return (
    <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_6px_25px_rgba(38,53,42,0.03)] overflow-hidden transition-all">
      {/* Category Header Row */}
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between p-5 hover:bg-[#f6f2e8] transition-colors cursor-pointer gap-4 flex-wrap select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            className="h-8 w-8 rounded-xl bg-white border border-[#d9d2c2] flex items-center justify-center text-[#78857a] hover:text-[#26352a] shrink-0"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[#78857a] bg-[#eae5d8] px-2 py-0.5 rounded">
                #{category.displayOrder}
              </span>
              <h3 className="font-serif text-base font-bold text-[#26352a] truncate">
                {category.name}
              </h3>
              {category.isSecret && (
                <Badge variant="kitchen">
                  <span className="flex items-center gap-1">
                    <Lock size={10} />
                    Secret Category
                  </span>
                </Badge>
              )}
            </div>

            <p className="text-xs text-[#78857a] mt-0.5">
              {category.itemsCount ?? category.dishesCount ?? dishes.length} dish
              {(category.itemsCount ?? category.dishesCount ?? dishes.length) === 1 ? "" : "es"} assigned
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={onToggleStatus}>
            <Badge variant={category.isActive ? "active" : "inactive"}>
              {category.isActive ? "Active" : "Inactive"}
            </Badge>
          </button>

          {isAdmin && (
            <div className="flex items-center gap-1 border-l border-[#eae5d8] pl-2">
              <button
                disabled={index === 0}
                onClick={() => onMove("up")}
                title="Move Category Up"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#5c685e] hover:bg-white hover:border hover:border-[#d9d2c2] disabled:opacity-25"
              >
                <ArrowUp size={14} />
              </button>
              <button
                disabled={index === totalCount - 1}
                onClick={() => onMove("down")}
                title="Move Category Down"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#5c685e] hover:bg-white hover:border hover:border-[#d9d2c2] disabled:opacity-25"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={() => onManageVisibility("CATEGORY", category.id, category.name)}
                title="Company Visibility"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#35617a] hover:bg-[#35617a]/15"
              >
                <Building2 size={14} />
              </button>
              <button
                onClick={onEdit}
                title="Edit Category Settings"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#78857a] hover:bg-white hover:border hover:border-[#d9d2c2] hover:text-[#26352a]"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Dishes Accordion */}
      {isExpanded && (
        <div className="border-t border-[#eae5d8] bg-white p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-sm font-semibold text-[#26352a]">
              Assigned Dishes ({dishes.length})
            </h4>
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={14} />}
                onClick={onAddDishes}
              >
                Add Dish to Category
              </Button>
            )}
          </div>

          {loadingDetails ? (
            <div className="py-6 text-center text-xs text-[#78857a]">Loading category dishes...</div>
          ) : dishes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d9d2c2] p-6 text-center bg-[#fbfaf6]">
              <UtensilsCrossed size={20} className="mx-auto text-[#9fa89e] mb-1.5" />
              <p className="text-xs font-semibold text-[#26352a]">No dishes in this category</p>
              <p className="text-[11px] text-[#78857a] mt-0.5">
                Click &quot;Add Dish to Category&quot; to assign catalogue items.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eee9dc] rounded-2xl border border-[#eae5d8] overflow-hidden bg-[#fbfaf6]">
              {dishes.map((dish, dIdx) => (
                <div
                  key={dish.id ?? dish.dishId}
                  className="flex items-center justify-between p-3 text-xs hover:bg-[#f6f2e8] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#9fa89e] w-4">
                      #{dIdx + 1}
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-white border border-[#d9d2c2] flex items-center justify-center overflow-hidden shrink-0">
                      {dish.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UtensilsCrossed size={12} className="text-[#9fa89e]" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#26352a]">{dish.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#78857a]">
                        <span className="flex items-center gap-0.5">
                          {dish.temperature === "HOT" ? (
                            <Flame size={10} className="text-[#f3a762]" />
                          ) : (
                            <Snowflake size={10} className="text-[#7bc0ea]" />
                          )}
                          {dish.temperature}
                        </span>
                        {dish.sku && <span className="font-mono">{dish.sku}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <>
                        <button
                          disabled={dIdx === 0}
                          onClick={(e) => handleMoveDish(dIdx, "up", e)}
                          title="Move Dish Up"
                          className="h-7 w-7 rounded flex items-center justify-center text-[#5c685e] hover:bg-[#eae5d8] disabled:opacity-20"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          disabled={dIdx === dishes.length - 1}
                          onClick={(e) => handleMoveDish(dIdx, "down", e)}
                          title="Move Dish Down"
                          className="h-7 w-7 rounded flex items-center justify-center text-[#5c685e] hover:bg-[#eae5d8] disabled:opacity-20"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() =>
                            onManageVisibility(
                              "DISH",
                              dish.id ?? dish.dishId ?? "",
                              dish.name,
                            )
                          }
                          title="Company Visibility for Dish"
                          className="h-7 w-7 rounded flex items-center justify-center text-[#35617a] hover:bg-[#35617a]/15"
                        >
                          <Building2 size={13} />
                        </button>
                        <button
                          onClick={(e) =>
                            handleRemoveDish(dish.id ?? dish.dishId ?? "", e)
                          }
                          title="Remove Dish from Category"
                          className="h-7 w-7 rounded flex items-center justify-center text-[#a34747] hover:bg-[#fff0f0]"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Wrapper to safely pass category dish ids to add modal ────────────────────

function AddDishToCategoryParentModal({
  category,
  open,
  onClose,
}: {
  category: MenuCategory;
  open: boolean;
  onClose: () => void;
}) {
  const addDishMutation = useAddDishToCategory(category.id);
  const existingIds = category.dishes?.map((d) => d.id ?? d.dishId ?? "") ?? [];

  const handleAddDish = async (dishId: string, displayOrder?: number) => {
    try {
      await addDishMutation.mutateAsync({ dishId, displayOrder });
      onClose();
    } catch {
      // error
    }
  };

  return (
    <AddDishToCategoryModal
      open={open}
      onClose={onClose}
      categoryName={category.name}
      existingDishIds={existingIds}
      onAddDish={handleAddDish}
      loading={addDishMutation.isPending}
    />
  );
}
