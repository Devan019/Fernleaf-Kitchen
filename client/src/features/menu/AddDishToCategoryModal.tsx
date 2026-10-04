"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useDishes } from "@/features/catalogue/useCatalogue";
import { Flame, Plus, Search, Snowflake, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

interface AddDishToCategoryModalProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  existingDishIds?: string[];
  onAddDish: (dishId: string, displayOrder?: number) => Promise<void>;
  loading?: boolean;
}

export function AddDishToCategoryModal({
  open,
  onClose,
  categoryName,
  existingDishIds = [],
  onAddDish,
  loading = false,
}: AddDishToCategoryModalProps) {
  const [search, setSearch] = useState("");
  const { data: dishesData, isLoading } = useDishes({
    limit: 50,
    search: search.trim() || undefined,
    isActive: true,
  });

  const dishes = dishesData?.data ?? [];
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [displayOrder, setDisplayOrder] = useState<string>("1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDishId) return;
    await onAddDish(selectedDishId, displayOrder ? Number(displayOrder) : undefined);
    setSelectedDishId(null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add Dishes to "${categoryName}"`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
          />
          <input
            type="text"
            placeholder="Search active master dishes by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10"
          />
        </div>

        {/* Dishes list */}
        <div className="divide-y divide-[#eae5d8] rounded-2xl border border-[#d9d2c2] bg-white max-h-64 overflow-y-auto">
          {isLoading ? (
            <p className="p-6 text-center text-xs text-[#78857a]">Loading catalogue dishes...</p>
          ) : dishes.length === 0 ? (
            <p className="p-6 text-center text-xs text-[#78857a]">No matching active dishes found.</p>
          ) : (
            dishes.map((dish) => {
              const alreadyAdded = existingDishIds.includes(dish.id);
              const isSelected = selectedDishId === dish.id;

              return (
                <div
                  key={dish.id}
                  onClick={() => {
                    if (!alreadyAdded) setSelectedDishId(dish.id);
                  }}
                  className={`flex items-center justify-between p-3 text-xs transition-colors cursor-pointer ${
                    alreadyAdded
                      ? "bg-[#f5f2e9] opacity-50 cursor-not-allowed"
                      : isSelected
                        ? "bg-[#294d33]/10 border-l-4 border-[#294d33]"
                        : "hover:bg-[#fbfaf6]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eae5d8] text-[#294d33] shrink-0 overflow-hidden">
                      {dish.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UtensilsCrossed size={14} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#26352a]">{dish.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-[#78857a]">{dish.sku}</span>
                        <span className="flex items-center gap-1 text-[10px] text-[#5c685e]">
                          {dish.temperature === "HOT" ? (
                            <Flame size={11} className="text-[#f3a762]" />
                          ) : (
                            <Snowflake size={11} className="text-[#7bc0ea]" />
                          )}
                          {dish.temperature}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {alreadyAdded ? (
                      <span className="text-[10px] font-medium text-[#78857a]">Already in category</span>
                    ) : (
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "bg-[#294d33] border-[#294d33] text-white"
                            : "border-[#d9d2c2]"
                        }`}
                      >
                        {isSelected && <span className="text-[10px]">✓</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedDishId && (
          <Input
            label="Dish Display Order in Category"
            type="number"
            min="1"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            hint="Sort position of this dish within this specific category"
          />
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={loading}
            disabled={!selectedDishId}
            icon={<Plus size={15} />}
          >
            Add to Category
          </Button>
        </div>
      </form>
    </Modal>
  );
}
