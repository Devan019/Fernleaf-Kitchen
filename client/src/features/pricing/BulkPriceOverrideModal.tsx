"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { BulkDishPriceItem, TierDishPricing } from "@/types";
import { Check, Edit3, Save } from "lucide-react";
import { useEffect, useState } from "react";

interface BulkPriceOverrideModalProps {
  open: boolean;
  onClose: () => void;
  dishes: TierDishPricing[];
  onSaveBulk: (prices: BulkDishPriceItem[]) => Promise<void>;
  loading?: boolean;
}

export function BulkPriceOverrideModal({
  open,
  onClose,
  dishes,
  onSaveBulk,
  loading = false,
}: BulkPriceOverrideModalProps) {
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    dishes.forEach((d) => {
      map[d.dishId] = d.overridePrice
        ? String(d.overridePrice)
        : d.effectivePrice
          ? String(d.effectivePrice)
          : "";
    });
    setEditedPrices(map);
  }, [dishes, open]);

  const handlePriceChange = (dishId: string, val: string) => {
    setEditedPrices((prev) => ({ ...prev, [dishId]: val }));
  };

  const handleApplyMargin = (multiplier: number) => {
    const updated: Record<string, string> = {};
    dishes.forEach((d) => {
      const computed = (Number(d.costPrice) * multiplier).toFixed(2);
      updated[d.dishId] = computed;
    });
    setEditedPrices(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items: BulkDishPriceItem[] = Object.entries(editedPrices)
      .filter(([_, price]) => price && !Number.isNaN(Number(price)))
      .map(([dishId, price]) => ({
        dishId,
        price: Number(price).toFixed(2),
      }));

    if (items.length === 0) return;
    await onSaveBulk(items);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk Price Overrides"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Helper quick actions */}
        <div className="flex items-center justify-between bg-[#f5f1e6]/70 p-3 rounded-2xl border border-[#eae5d8] flex-wrap gap-2">
          <span className="text-xs font-semibold text-[#5c685e]">
            Quick Margin Presets (applied to Cost Price):
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleApplyMargin(1.2)}
            >
              +20%
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleApplyMargin(1.3)}
            >
              +30%
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleApplyMargin(1.5)}
            >
              +50%
            </Button>
          </div>
        </div>

        {/* Table of dishes */}
        <div className="rounded-2xl border border-[#d9d2c2] overflow-hidden max-h-96 overflow-y-auto bg-white">
          <table className="w-full text-xs" aria-label="Bulk pricing override editor">
            <thead className="bg-[#f5f1e6]/80 border-b border-[#eae5d8] sticky top-0">
              <tr>
                <th className="p-3 text-left font-bold text-[#5c685e]">Dish Name</th>
                <th className="p-3 text-left font-bold text-[#5c685e]">SKU</th>
                <th className="p-3 text-left font-bold text-[#5c685e]">Cost Price</th>
                <th className="p-3 text-left font-bold text-[#5c685e]">Tier Override ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee9dc]">
              {dishes.map((dish) => (
                <tr key={dish.dishId} className="hover:bg-[#fbfaf6]">
                  <td className="p-3 font-semibold text-[#26352a]">{dish.dishName}</td>
                  <td className="p-3 font-mono text-[11px] text-[#78857a]">{dish.sku}</td>
                  <td className="p-3 font-mono text-[#5c685e]">${Number(dish.costPrice).toFixed(2)}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedPrices[dish.dishId] ?? ""}
                      onChange={(e) => handlePriceChange(dish.dishId, e.target.value)}
                      placeholder="0.00"
                      className="h-8 w-28 rounded-lg border border-[#d9d2c2] px-2.5 font-mono text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={loading}
            icon={<Save size={15} />}
          >
            Apply Bulk Overrides
          </Button>
        </div>
      </form>
    </Modal>
  );
}
