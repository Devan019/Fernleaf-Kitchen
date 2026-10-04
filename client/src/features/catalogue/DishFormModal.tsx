"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  useAllergens,
  useDietaryTags,
  useKitchenStations,
} from "@/features/catalogue/useCatalogue";
import type {
  Allergen,
  CreateDishRequest,
  DietaryTag,
  Dish,
  DishTemperature,
  KitchenStation,
  UpdateDishRequest,
} from "@/types";
import {
  Building2,
  Flame,
  Image as ImageIcon,
  Snowflake,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DishFormModalProps {
  open: boolean;
  onClose: () => void;
  dish?: Dish | null;
  onSubmit: (
    data: CreateDishRequest | UpdateDishRequest,
    imageFile?: File | null,
    removeImage?: boolean,
  ) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function DishFormModal({
  open,
  onClose,
  dish,
  onSubmit,
  loading = false,
  serverError,
}: DishFormModalProps) {
  const isEdit = Boolean(dish);
  const { data: rawAllergens } = useAllergens();
  const { data: rawDietary } = useDietaryTags();
  const { data: rawStations } = useKitchenStations();

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const stationsList: KitchenStation[] = Array.isArray(rawStations)
    ? rawStations
    : Array.isArray((rawStations as any)?.data)
      ? (rawStations as any).data
      : [];

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [temperature, setTemperature] = useState<DishTemperature>("HOT");
  const [costPrice, setCostPrice] = useState("");
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState("1");
  const [kitchenStationId, setKitchenStationId] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Image upload & preview state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (dish) {
      setName(dish.name);
      setSku(dish.sku);
      setDescription(dish.description ?? "");
      setTemperature(dish.temperature);
      setCostPrice(String(dish.costPrice));
      setMinimumOrderQuantity(String(dish.minimumOrderQuantity ?? 1));
      setKitchenStationId(dish.kitchenStationId ?? "");
      setSelectedAllergens(dish.allergens?.map((a) => a.id) ?? []);
      setSelectedDietaryTags(dish.dietaryTags?.map((d) => d.id) ?? []);
      setIsActive(dish.isActive);
      setImagePreview(dish.imageUrl ?? null);
      setImageFile(null);
      setRemoveImage(false);
    } else {
      setName("");
      setSku("");
      setDescription("");
      setTemperature("HOT");
      setCostPrice("");
      setMinimumOrderQuantity("1");
      setKitchenStationId("");
      setSelectedAllergens([]);
      setSelectedDietaryTags([]);
      setIsActive(true);
      setImagePreview(null);
      setImageFile(null);
      setRemoveImage(false);
    }
    setErrors({});
  }, [dish, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Dish name is required";
    if (!sku.trim()) newErrors.sku = "SKU is required";
    if (!costPrice || Number.isNaN(Number(costPrice)) || Number(costPrice) < 0) {
      newErrors.costPrice = "Valid positive cost price is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: CreateDishRequest = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      description: description.trim() || undefined,
      temperature,
      costPrice: costPrice.trim(),
      minimumOrderQuantity: minimumOrderQuantity ? Number(minimumOrderQuantity) : 1,
      kitchenStationId: kitchenStationId.trim() || undefined,
      allergenIds: selectedAllergens,
      dietaryTagIds: selectedDietaryTags,
      isActive,
    };

    await onSubmit(payload, imageFile, removeImage);
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
      title={isEdit ? "Edit Catalogue Dish" : "Create New Catalogue Dish"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
            {serverError}
          </div>
        )}

        {/* Dish Image & Primary Info Header */}
        <div className="flex gap-4 items-center rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-3.5 shadow-xs">
          <div className="relative group w-20 h-20 rounded-xl bg-white border border-[#d9d2c2] overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
            {imagePreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Dish Preview"
                  className="w-full h-full object-cover"
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-[#9fa89e]">
                <ImageIcon size={22} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<Upload size={12} />}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? "Change Photo" : "Upload Photo"}
              </Button>
              {imagePreview && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={12} className="text-[#a34747]" />}
                  onClick={handleRemovePhoto}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-[#78857a]">
              JPEG, PNG, WebP or GIF (max 5MB). Photo is shown on employee portals.
            </p>
          </div>
        </div>

        {/* Row 1: Name & SKU */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Dish Name *"
            placeholder="e.g. Herb-Roasted Salmon"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            error={errors.name}
            required
          />

          <Input
            label="SKU / Item Code *"
            placeholder="e.g. DISH-SLM-01"
            value={sku}
            onChange={(e) => {
              setSku(e.target.value);
              if (errors.sku) setErrors((prev) => ({ ...prev, sku: "" }));
            }}
            error={errors.sku}
            className="uppercase font-mono text-xs"
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-[#4c594f]">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed ingredients, cooking notes, or serving description..."
            className="w-full rounded-xl border border-[#d9d2c2] bg-white p-2.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10"
          />
        </div>

        {/* Row 2: Temperature, Cost Price, Min Order Qty */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
              Serving Temperature *
            </label>
            <div className="flex items-center rounded-xl bg-[#eae5d8]/70 p-1 border border-[#d9d2c2]">
              <button
                type="button"
                onClick={() => setTemperature("HOT")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  temperature === "HOT"
                    ? "bg-[#294d33] text-white shadow-xs font-semibold"
                    : "text-[#5c685e] hover:text-[#26352a]"
                }`}
              >
                <Flame size={13} className={temperature === "HOT" ? "text-[#f3a762]" : ""} />
                HOT
              </button>
              <button
                type="button"
                onClick={() => setTemperature("COLD")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  temperature === "COLD"
                    ? "bg-[#294d33] text-white shadow-xs font-semibold"
                    : "text-[#5c685e] hover:text-[#26352a]"
                }`}
              >
                <Snowflake size={13} className={temperature === "COLD" ? "text-[#7bc0ea]" : ""} />
                COLD
              </button>
            </div>
          </div>

          <Input
            label="Internal Cost Price ($) *"
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

          <Input
            label="Min Order Qty"
            type="number"
            min="1"
            placeholder="1"
            value={minimumOrderQuantity}
            onChange={(e) => setMinimumOrderQuantity(e.target.value)}
          />
        </div>

        {/* Row 3: Kitchen Station Dropdown */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
            Kitchen Preparation Station (Optional)
          </label>
          <select
            value={kitchenStationId}
            onChange={(e) => setKitchenStationId(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#294d33] focus:outline-none"
          >
            <option value="">None / Unassigned</option>
            {stationsList.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>

        {/* Allergens Selection */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-2">
            Allergen Warnings
          </label>
          {allergensList.length === 0 ? (
            <p className="text-xs text-[#8a988d] italic">No allergens registered in system yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allergensList.map((allergen) => {
                const checked = selectedAllergens.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    type="button"
                    onClick={() => toggleAllergen(allergen.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium border transition-all ${
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

        {/* Dietary Tags Selection */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-2">
            Dietary Preferences & Certifications
          </label>
          {dietaryTagsList.length === 0 ? (
            <p className="text-xs text-[#8a988d] italic">No dietary tags registered yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {dietaryTagsList.map((tag) => {
                const checked = selectedDietaryTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleDietaryTag(tag.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium border transition-all ${
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

        {/* Active Toggle */}
        <div className="flex items-center justify-between rounded-xl bg-[#f5f1e6]/60 p-3 border border-[#eae5d8]">
          <div>
            <p className="text-xs font-semibold text-[#26352a]">Active Catalogue Item</p>
            <p className="text-[11px] text-[#78857a]">
              Available for addition to catering menus and price tiers
            </p>
          </div>
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

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {isEdit ? "Save Changes" : "Create Dish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
