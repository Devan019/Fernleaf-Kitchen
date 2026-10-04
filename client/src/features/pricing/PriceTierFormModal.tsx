"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { usePriceTiers } from "@/features/pricing/usePricing";
import type {
  CreatePriceTierRequest,
  PriceDerivationType,
  PriceTier,
  UpdatePriceTierRequest,
} from "@/types";
import { Calculator, Percent, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface PriceTierFormModalProps {
  open: boolean;
  onClose: () => void;
  tier?: PriceTier | null;
  onSubmit: (data: CreatePriceTierRequest | UpdatePriceTierRequest) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function PriceTierFormModal({
  open,
  onClose,
  tier,
  onSubmit,
  loading = false,
  serverError,
}: PriceTierFormModalProps) {
  const isEdit = Boolean(tier);
  const { data: tiersData } = usePriceTiers({ limit: 100 });
  const otherTiers = (tiersData?.data ?? []).filter((t) => t.id !== tier?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [derivationType, setDerivationType] = useState<PriceDerivationType>("COST_MULTIPLIER");
  const [multiplier, setMultiplier] = useState("1.30");
  const [baseTierId, setBaseTierId] = useState("");
  const [percentage, setPercentage] = useState("10.00");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tier) {
      setName(tier.name);
      setDescription(tier.description ?? "");
      setDerivationType(tier.derivationType);
      setMultiplier(tier.multiplier ? String(tier.multiplier) : "1.30");
      setBaseTierId(tier.baseTierId ?? "");
      setPercentage(tier.percentage ? String(tier.percentage) : "10.00");
      setIsDefault(tier.isDefault);
      setIsActive(tier.isActive);
    } else {
      setName("");
      setDescription("");
      setDerivationType("COST_MULTIPLIER");
      setMultiplier("1.30");
      setBaseTierId("");
      setPercentage("10.00");
      setIsDefault(false);
      setIsActive(true);
    }
    setErrors({});
  }, [tier, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Tier name is required";

    if (derivationType === "COST_MULTIPLIER") {
      if (!multiplier || Number.isNaN(Number(multiplier)) || Number(multiplier) <= 0) {
        newErrors.multiplier = "Valid positive multiplier (e.g. 1.30) is required";
      }
    } else if (derivationType === "TIER_PERCENTAGE") {
      if (!baseTierId) {
        newErrors.baseTierId = "Base tier is required for percentage derivation";
      }
      if (!percentage || Number.isNaN(Number(percentage))) {
        newErrors.percentage = "Valid percentage markup or discount is required";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: CreatePriceTierRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      derivationType,
      multiplier: derivationType === "COST_MULTIPLIER" ? multiplier.trim() : undefined,
      baseTierId: derivationType === "TIER_PERCENTAGE" ? baseTierId : undefined,
      percentage: derivationType === "TIER_PERCENTAGE" ? percentage.trim() : undefined,
      isDefault,
      isActive,
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Price Tier" : "Create Price Tier"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
            {serverError}
          </div>
        )}

        <Input
          label="Tier Name *"
          placeholder="e.g. Standard Corporate, Gold VIP, Tech Hub Tier"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={errors.name}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-[#4c594f]">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contract notes, client qualification, or pricing terms..."
            className="w-full rounded-xl border border-[#d9d2c2] bg-white p-3 text-sm text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10"
          />
        </div>

        {/* Derivation Type Selection */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
            Price Derivation Strategy *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDerivationType("COST_MULTIPLIER")}
              className={`p-3 rounded-2xl border text-left transition-all ${
                derivationType === "COST_MULTIPLIER"
                  ? "bg-[#294d33]/10 border-[#294d33] ring-1 ring-[#294d33]"
                  : "bg-white border-[#d9d2c2] hover:border-[#b7b6aa]"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#26352a]">
                <Calculator size={14} className="text-[#294d33]" />
                Cost Multiplier
              </div>
              <p className="text-[10px] text-[#78857a] mt-1">Cost × Multiplier (e.g. 1.30)</p>
            </button>

            <button
              type="button"
              onClick={() => setDerivationType("TIER_PERCENTAGE")}
              className={`p-3 rounded-2xl border text-left transition-all ${
                derivationType === "TIER_PERCENTAGE"
                  ? "bg-[#294d33]/10 border-[#294d33] ring-1 ring-[#294d33]"
                  : "bg-white border-[#d9d2c2] hover:border-[#b7b6aa]"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#26352a]">
                <Percent size={14} className="text-[#294d33]" />
                Base Tier ± %
              </div>
              <p className="text-[10px] text-[#78857a] mt-1">Markup/discount on parent tier</p>
            </button>

            <button
              type="button"
              onClick={() => setDerivationType("MANUAL")}
              className={`p-3 rounded-2xl border text-left transition-all ${
                derivationType === "MANUAL"
                  ? "bg-[#294d33]/10 border-[#294d33] ring-1 ring-[#294d33]"
                  : "bg-white border-[#d9d2c2] hover:border-[#b7b6aa]"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#26352a]">
                <Sparkles size={14} className="text-[#294d33]" />
                Manual Only
              </div>
              <p className="text-[10px] text-[#78857a] mt-1">Explicit item price overrides</p>
            </button>
          </div>
        </div>

        {/* Dynamic fields based on strategy */}
        {derivationType === "COST_MULTIPLIER" && (
          <Input
            label="Cost Multiplier *"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="1.3000"
            value={multiplier}
            onChange={(e) => {
              setMultiplier(e.target.value);
              if (errors.multiplier) setErrors((prev) => ({ ...prev, multiplier: "" }));
            }}
            error={errors.multiplier}
            hint="For example, 1.30 computes a 30% markup over kitchen preparation cost."
            required
          />
        )}

        {derivationType === "TIER_PERCENTAGE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
                Base Ancestor Tier *
              </label>
              <select
                value={baseTierId}
                onChange={(e) => {
                  setBaseTierId(e.target.value);
                  if (errors.baseTierId) setErrors((prev) => ({ ...prev, baseTierId: "" }));
                }}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a]"
                required
              >
                <option value="">Select parent tier...</option>
                {otherTiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.derivationType})
                  </option>
                ))}
              </select>
              {errors.baseTierId && (
                <p className="text-xs text-[#a34747] mt-1">{errors.baseTierId}</p>
              )}
            </div>

            <Input
              label="Percentage Offset (%) *"
              type="number"
              step="0.01"
              placeholder="10.00 or -5.00"
              value={percentage}
              onChange={(e) => {
                setPercentage(e.target.value);
                if (errors.percentage) setErrors((prev) => ({ ...prev, percentage: "" }));
              }}
              error={errors.percentage}
              hint="+10 for +10% markup, -5 for 5% client discount"
              required
            />
          </div>
        )}

        {/* Default & Active checkboxes */}
        <div className="space-y-2 rounded-xl bg-[#f5f1e6]/60 p-3 border border-[#eae5d8]">
          <label className="flex items-center justify-between text-xs text-[#26352a] cursor-pointer">
            <div>
              <p className="font-semibold">System Default Tier</p>
              <p className="text-[11px] text-[#78857a]">
                Automatically applied to companies without custom contracts
              </p>
            </div>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-[#d9d2c2] text-[#294d33] focus:ring-[#294d33]"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-[#26352a] cursor-pointer pt-2 border-t border-[#eae5d8]">
            <div>
              <p className="font-semibold">Active Tier</p>
              <p className="text-[11px] text-[#78857a]">Available for order calculation</p>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-[#d9d2c2] text-[#294d33] focus:ring-[#294d33]"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {isEdit ? "Save Tier" : "Create Tier"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
