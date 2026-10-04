"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { TierOptionPricing } from "@/types";
import { useEffect, useState } from "react";

interface OptionOverrideModalProps {
  open: boolean;
  onClose: () => void;
  tierId: string;
  item: TierOptionPricing | null;
  onSaveOverride: (optionId: string, price: string) => Promise<void>;
  onRemoveOverride: (optionId: string) => Promise<void>;
  loading?: boolean;
}

export function OptionOverrideModal({
  open,
  onClose,
  item,
  onSaveOverride,
  onRemoveOverride,
  loading = false,
}: OptionOverrideModalProps) {
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setPrice(
        item.overridePrice
          ? String(item.overridePrice)
          : item.derivedPrice
            ? String(item.derivedPrice)
            : "",
      );
    } else {
      setPrice("");
    }
    setError(null);
  }, [item, open]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || Number.isNaN(Number(price)) || Number(price) < 0) {
      setError("Please provide a valid non-negative override price.");
      return;
    }
    await onSaveOverride(item.optionId, price.trim());
  };

  const handleRemove = async () => {
    await onRemoveOverride(item.optionId);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Option Price Override: ${item.optionName}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6] p-4 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-[#78857a]">Cost Price:</span>
            <span className="font-mono text-[#26352a]">${Number(item.costPrice).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-[#eae5d8] pt-1.5 font-bold">
            <span className="text-[#78857a]">Effective Price:</span>
            <span className="font-mono text-[#294d33]">${Number(item.effectivePrice ?? 0).toFixed(2)}</span>
          </div>
        </div>

        <Input
          label="Explicit Option Override Price ($) *"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            if (error) setError(null);
          }}
          error={error ?? undefined}
          required
        />

        <div className="flex items-center justify-between pt-3 border-t border-[#eae5d8]">
          {item.hasOverride ? (
            <Button
              variant="danger"
              type="button"
              onClick={handleRemove}
              loading={loading}
              size="sm"
            >
              Remove Override
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading}>
              Save Override
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
