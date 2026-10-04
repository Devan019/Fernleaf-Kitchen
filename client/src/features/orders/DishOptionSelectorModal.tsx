"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type {
  CreateOrderCombination,
  CreateOrderLine,
  CreateOrderOptionChoice,
  Dish,
  OptionGroup,
} from "@/types";
import { Check, Flame, Layers, Minus, Plus, Snowflake, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";

interface DishOptionSelectorModalProps {
  open: boolean;
  onClose: () => void;
  dish: any | null; // Preview dish with optionGroups & resolved pricing
  onAdd: (line: CreateOrderLine) => void;
}

export function DishOptionSelectorModal({
  open,
  onClose,
  dish,
  onAdd,
}: DishOptionSelectorModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, { optionId: string; portionSizeId?: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dish) {
      setQuantity(dish.minimumOrderQuantity ? Math.max(1, dish.minimumOrderQuantity) : 1);
      // Auto-select first option for required groups if available
      const initial: Record<string, { optionId: string; portionSizeId?: string }> = {};
      const groups: OptionGroup[] = dish.optionGroups ?? [];
      groups.forEach((grp) => {
        if (grp.isRequired && grp.options && grp.options.length > 0) {
          const firstOpt = grp.options[0];
          const firstPortion = grp.portions && grp.portions.length > 0 ? (grp.portions[0].portionSizeId || grp.portions[0].id) : undefined;
          initial[grp.id] = {
            optionId: firstOpt.id,
            portionSizeId: grp.usesPortions ? firstPortion : undefined,
          };
        }
      });
      setSelectedOptions(initial);
      setError(null);
    }
  }, [dish, open]);

  if (!dish) return null;

  const optionGroups: OptionGroup[] = dish.optionGroups ?? [];

  const handleSelectOption = (groupId: string, optionId: string, portionSizeId?: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupId]: { optionId, portionSizeId },
    }));
    setError(null);
  };

  const handleSelectPortion = (groupId: string, portionSizeId: string) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId];
      if (!current) return prev;
      return {
        ...prev,
        [groupId]: { ...current, portionSizeId },
      };
    });
  };

  const handleClearGroup = (groupId: string) => {
    setSelectedOptions((prev) => {
      const copy = { ...prev };
      delete copy[groupId];
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required option groups
    for (const grp of optionGroups) {
      if (grp.isRequired && !selectedOptions[grp.id]?.optionId) {
        setError(`Please make a selection for required group: "${grp.name}"`);
        return;
      }
    }

    const optionChoices: CreateOrderOptionChoice[] = Object.entries(selectedOptions).map(
      ([groupId, val]) => ({
        optionGroupId: groupId,
        optionId: val.optionId,
        portionSizeId: val.portionSizeId,
      }),
    );

    const combination: CreateOrderCombination = {
      quantity,
      options: optionChoices.length > 0 ? optionChoices : undefined,
    };

    const line: CreateOrderLine = {
      dishId: dish.id,
      quantity,
      combinations: [combination],
    };

    onAdd(line);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Customize Dish • ${dish.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dish Summary Header */}
        <div className="flex gap-3.5 items-center rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-3.5 shadow-xs">
          <div className="w-14 h-14 rounded-xl bg-white border border-[#d9d2c2] overflow-hidden shrink-0 flex items-center justify-center">
            {dish.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed size={20} className="text-[#9fa89e]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-[#26352a] truncate">{dish.name}</h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span className="font-mono font-bold text-[#294d33]">
                ${Number(dish.price ?? dish.costPrice ?? 0).toFixed(2)}
              </span>
              <span className="text-[#78857a] font-mono text-[11px]">{dish.sku}</span>
              <span className="flex items-center gap-0.5 text-[10px] text-[#5c685e]">
                {dish.temperature === "HOT" ? (
                  <Flame size={11} className="text-[#e27d34]" />
                ) : (
                  <Snowflake size={11} className="text-[#4e9dd8]" />
                )}
                {dish.temperature}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
            {error}
          </div>
        )}

        {/* Option Groups */}
        {optionGroups.length > 0 ? (
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {optionGroups.map((grp) => {
              const selectedVal = selectedOptions[grp.id];
              return (
                <div key={grp.id} className="space-y-2 rounded-2xl bg-white border border-[#eae5d8] p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers size={13} className="text-[#294d33]" />
                      <span className="font-bold text-xs text-[#26352a]">{grp.name}</span>
                      {grp.isRequired ? (
                        <span className="rounded bg-[#a34747]/10 text-[#a34747] px-1.5 py-0.2 text-[9px] font-bold uppercase">
                          Required
                        </span>
                      ) : (
                        <span className="rounded bg-[#eae5d8] text-[#5c685e] px-1.5 py-0.2 text-[9px] font-medium uppercase">
                          Optional
                        </span>
                      )}
                    </div>
                    {!grp.isRequired && selectedVal && (
                      <button
                        type="button"
                        onClick={() => handleClearGroup(grp.id)}
                        className="text-[10px] text-[#78857a] hover:text-[#a34747]"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {(grp.options ?? []).map((opt) => {
                      const isChecked = selectedVal?.optionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            handleSelectOption(
                              grp.id,
                              opt.id,
                              grp.usesPortions ? selectedVal?.portionSizeId : undefined,
                            )
                          }
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs text-left transition-all ${
                            isChecked
                              ? "bg-[#294d33] text-white border-[#294d33] font-semibold shadow-xs"
                              : "bg-[#fbfaf6] text-[#26352a] border-[#d9d2c2] hover:border-[#b7b6aa]"
                          }`}
                        >
                          <span>{opt.name}</span>
                          <div className="flex items-center gap-1.5">
                            {Number(opt.costPrice) > 0 && (
                              <span className="font-mono text-[11px] opacity-90">
                                +${Number(opt.costPrice).toFixed(2)}
                              </span>
                            )}
                            {isChecked && <Check size={12} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Portions Selection if group usesPortions */}
                  {grp.usesPortions && selectedVal && (grp.portions?.length ?? 0) > 0 && (
                    <div className="pt-2 border-t border-[#eae5d8] space-y-1">
                      <span className="text-[10px] font-semibold text-[#78857a] uppercase tracking-wider block">
                        Portion Size
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(grp.portions ?? []).map((port) => {
                          const portId = port.portionSizeId || port.id || "";
                          const portName = port.portionSize?.name || port.name || "Portion";
                          const isPortChecked = selectedVal.portionSizeId === portId;
                          return (
                            <button
                              key={portId}
                              type="button"
                              onClick={() => handleSelectPortion(grp.id, portId)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                isPortChecked
                                  ? "bg-[#294d33] text-white border-[#294d33] font-semibold"
                                  : "bg-white text-[#5c685e] border-[#d9d2c2]"
                              }`}
                            >
                              {portName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#78857a] italic py-2">
            No customization options required for this item.
          </p>
        )}

        {/* Quantity Selector */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f5f1e6]/70 border border-[#eae5d8]">
          <div>
            <span className="text-xs font-bold text-[#26352a] block">Quantity</span>
            <span className="text-[10px] text-[#78857a]">
              Min order: {dish.minimumOrderQuantity ?? 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={quantity <= (dish.minimumOrderQuantity ?? 1)}
              onClick={() => setQuantity((q) => Math.max(dish.minimumOrderQuantity ?? 1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#d9d2c2] text-[#26352a] hover:bg-[#eae5d8] disabled:opacity-40"
            >
              <Minus size={13} />
            </button>
            <span className="font-mono font-bold text-sm w-6 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#d9d2c2] text-[#26352a] hover:bg-[#eae5d8]"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Add to Order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
