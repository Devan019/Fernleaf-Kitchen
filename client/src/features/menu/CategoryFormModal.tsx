"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { CreateCategoryRequest, MenuCategory, UpdateCategoryRequest } from "@/types";
import { Lock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: MenuCategory | null;
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
  defaultOrder?: number;
}

export function CategoryFormModal({
  open,
  onClose,
  category,
  onSubmit,
  loading = false,
  serverError,
  defaultOrder = 1,
}: CategoryFormModalProps) {
  const isEdit = Boolean(category);

  const [name, setName] = useState("");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [isSecret, setIsSecret] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDisplayOrder(String(category.displayOrder));
      setIsSecret(category.isSecret);
      setIsActive(category.isActive);
    } else {
      setName("");
      setDisplayOrder(String(defaultOrder));
      setIsSecret(false);
      setIsActive(true);
    }
    setErrors({});
  }, [category, open, defaultOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Category name is required";
    const orderNum = Number(displayOrder);
    if (Number.isNaN(orderNum) || orderNum < 0) {
      newErrors.displayOrder = "Valid display order number is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: CreateCategoryRequest = {
      name: name.trim(),
      displayOrder: orderNum,
      isSecret,
      isActive,
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Menu Category" : "Create Menu Category"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
            {serverError}
          </div>
        )}

        <Input
          label="Category Name *"
          placeholder="e.g. Executive Lunch Platters, Healthy Bowls"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={errors.name}
          required
        />

        <Input
          label="Display Sort Order *"
          type="number"
          min="1"
          value={displayOrder}
          onChange={(e) => {
            setDisplayOrder(e.target.value);
            if (errors.displayOrder) setErrors((prev) => ({ ...prev, displayOrder: "" }));
          }}
          error={errors.displayOrder}
          hint="Determines relative order on the customer ordering menu."
          required
        />

        {/* Secret Category Toggle */}
        <div className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={16} className={isSecret ? "text-[#c8a96b]" : "text-[#9fa89e]"} />
              <span className="text-xs font-semibold text-[#26352a]">
                Secret / Direct-Link Category
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#d9d2c2] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c8a96b]" />
            </label>
          </div>
          <p className="text-[11px] text-[#78857a]">
            Secret categories are hidden from the standard menu navigation and can only be accessed
            via direct promotional URLs.
          </p>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between rounded-xl bg-[#f5f1e6]/60 p-3 border border-[#eae5d8]">
          <span className="text-xs font-semibold text-[#26352a]">Active Category</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#d9d2c2] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#294d33]" />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {isEdit ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
