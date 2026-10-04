"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAllergens, useDietaryTags } from "@/features/catalogue/useCatalogue";
import type {
  Allergen,
  CreateOptionRequest,
  DietaryTag,
  Option,
  UpdateOptionRequest,
} from "@/types";
import { useEffect, useState } from "react";

interface OptionFormModalProps {
  open: boolean;
  onClose: () => void;
  option?: Option | null;
  onSubmit: (data: CreateOptionRequest | UpdateOptionRequest) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function OptionFormModal({
  open,
  onClose,
  option,
  onSubmit,
  loading = false,
  serverError,
}: OptionFormModalProps) {
  const isEdit = Boolean(option);
  const { data: rawAllergens } = useAllergens();
  const { data: rawDietary } = useDietaryTags();

  const allergensList: Allergen[] = Array.isArray(rawAllergens)
    ? rawAllergens
    : Array.isArray((rawAllergens as any)?.data)
      ? (rawAllergens as any).data
      : [];

  const dietaryTagsList: DietaryTag[] = Array.isArray(rawDietary)
    ? rawDietary
    : Array.isArray((rawDietary as any)?.data)
      ? (rawDietary as any).data
      : [];

  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (option) {
      setName(option.name);
      setCostPrice(String(option.costPrice));
      setSelectedAllergens(option.allergens?.map((a) => a.id) ?? []);
      setSelectedDietaryTags(option.dietaryTags?.map((d) => d.id) ?? []);
      setIsActive(option.isActive);
    } else {
      setName("");
      setCostPrice("");
      setSelectedAllergens([]);
      setSelectedDietaryTags([]);
      setIsActive(true);
    }
    setErrors({});
  }, [option, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Option name is required";
    if (!costPrice || Number.isNaN(Number(costPrice)) || Number(costPrice) < 0) {
      newErrors.costPrice = "Valid positive cost price is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: CreateOptionRequest = {
      name: name.trim(),
      costPrice: costPrice.trim(),
      allergenIds: selectedAllergens,
      dietaryTagIds: selectedDietaryTags,
      isActive,
    };

    await onSubmit(payload);
  };

  const toggleAllergen = (id: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleDietaryTag = (id: string) => {
    setSelectedDietaryTags((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Catalogue Option" : "Create Catalogue Option"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
            {serverError}
          </div>
        )}

        <Input
          label="Option Name *"
          placeholder="e.g. Extra Avocado Slices, Gluten-Free Bun"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={errors.name}
          required
        />

        <Input
          label="Base Cost Price ($) *"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={costPrice}
          onChange={(e) => {
            setCostPrice(e.target.value);
            if (errors.costPrice) setErrors((prev) => ({ ...prev, costPrice: "" }));
          }}
          error={errors.costPrice}
          required
        />

        {/* Allergen warnings */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-2">
            Allergen Warnings
          </label>
          {allergensList.length === 0 ? (
            <p className="text-xs text-[#8a988d] italic">No allergens registered in system.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allergensList.map((allergen) => {
                const checked = selectedAllergens.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    type="button"
                    onClick={() => toggleAllergen(allergen.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
                      checked
                        ? "bg-[#a34747]/15 border-[#a34747] text-[#8c3030] font-semibold"
                        : "bg-white/80 border-[#d9d2c2] text-[#5c685e] hover:border-[#b7b6aa]"
                    }`}
                  >
                    <span>{allergen.name}</span>
                    {checked && <span className="text-[10px]">✕</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dietary preferences */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-2">
            Dietary Preferences
          </label>
          {dietaryTagsList.length === 0 ? (
            <p className="text-xs text-[#8a988d] italic">No dietary tags registered.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {dietaryTagsList.map((tag) => {
                const checked = selectedDietaryTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleDietaryTag(tag.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
                      checked
                        ? "bg-[#294d33]/15 border-[#294d33] text-[#22442b] font-semibold"
                        : "bg-white/80 border-[#d9d2c2] text-[#5c685e] hover:border-[#b7b6aa]"
                    }`}
                  >
                    <span>{tag.name}</span>
                    {checked && <span className="text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-xl bg-[#f5f1e6]/60 p-3 border border-[#eae5d8]">
          <span className="text-xs font-semibold text-[#26352a]">Active Catalogue Option</span>
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {isEdit ? "Save Changes" : "Create Option"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
