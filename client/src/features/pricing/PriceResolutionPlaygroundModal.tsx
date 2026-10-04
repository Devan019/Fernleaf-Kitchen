"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useDishes, useOptions } from "@/features/catalogue/useCatalogue";
import {
  useCompanies,
  useCompanyPricingContext,
  useResolveCompanyDishPrice,
  useResolveCompanyOptionPrice,
} from "@/features/pricing/usePricing";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Percent,
  Play,
  Search,
  Sparkles,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PriceResolutionPlaygroundModalProps {
  open: boolean;
  onClose: () => void;
}

export function PriceResolutionPlaygroundModal({
  open,
  onClose,
}: PriceResolutionPlaygroundModalProps) {
  // Query reference lists for intuitive dropdown selection
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();
  const { data: dishesData } = useDishes({ limit: 100, isActive: true });
  const { data: optionsData } = useOptions({ limit: 100, isActive: true });

  const dishes = dishesData?.data ?? [];
  const options = optionsData?.data ?? [];

  const [companyId, setCompanyId] = useState("");
  const [itemType, setItemType] = useState<"DISH" | "OPTION">("DISH");
  const [itemId, setItemId] = useState("");

  // Query triggers
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [activeItemId, setActiveItemId] = useState("");
  const [activeItemType, setActiveItemType] = useState<"DISH" | "OPTION">("DISH");

  // Default initial selections once data loads
  useEffect(() => {
    if (companies.length > 0 && !companyId) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  useEffect(() => {
    if (itemType === "DISH" && dishes.length > 0 && !itemId) {
      setItemId(dishes[0].id);
    } else if (itemType === "OPTION" && options.length > 0 && !itemId) {
      setItemId(options[0].id);
    }
  }, [itemType, dishes, options, itemId]);

  // Pricing context for company
  const { data: contextData, isLoading: loadingContext } = useCompanyPricingContext(
    activeCompanyId,
    Boolean(activeCompanyId),
  );

  // Resolved price for dish
  const {
    data: resolvedDish,
    isLoading: loadingDish,
    isError: isDishErr,
    error: dishErr,
  } = useResolveCompanyDishPrice(
    activeCompanyId,
    activeItemId,
    activeItemType === "DISH" && Boolean(activeCompanyId) && Boolean(activeItemId),
  );

  // Resolved price for option
  const {
    data: resolvedOption,
    isLoading: loadingOption,
    isError: isOptionErr,
    error: optionErr,
  } = useResolveCompanyOptionPrice(
    activeCompanyId,
    activeItemId,
    activeItemType === "OPTION" && Boolean(activeCompanyId) && Boolean(activeItemId),
  );

  const resolved = activeItemType === "DISH" ? resolvedDish : resolvedOption;
  const isLoading =
    loadingContext || (activeItemType === "DISH" ? loadingDish : loadingOption);
  const isError = activeItemType === "DISH" ? isDishErr : isOptionErr;
  const errorObj = activeItemType === "DISH" ? dishErr : optionErr;

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId.trim() || !itemId.trim()) return;
    setActiveCompanyId(companyId.trim());
    setActiveItemId(itemId.trim());
    setActiveItemType(itemType);
  };

  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedDish = dishes.find((d) => d.id === itemId);
  const selectedOption = options.find((o) => o.id === itemId);

  return (
    <Modal open={open} onClose={onClose} title="Company Dynamic Pricing Resolution" size="lg">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        <p className="text-xs text-[#78857a]">
          Test real-time authoritative price resolution walking the client&apos;s corporate tier hierarchy:
          <span className="font-semibold text-[#26352a]"> Company → Assigned Price Tier → Cost Multipliers & Overrides → Final Customer Price</span>.
        </p>

        {/* Input Form */}
        <form
          onSubmit={handleResolve}
          className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6] p-4 space-y-4 shadow-xs"
        >
          {/* Row 1: Select Company */}
          <div>
            <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
              Select Corporate Client / Company *
            </label>
            {loadingCompanies ? (
              <div className="h-10 rounded-xl bg-[#eae5d8] animate-pulse" />
            ) : (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10"
                required
              >
                <option value="">Select a corporate company...</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} {comp.code ? `(${comp.code})` : ""} — Price Tier: {comp.priceTier?.name ?? "Default"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Row 2: Item Type & Item Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
                Item Classification *
              </label>
              <div className="flex rounded-xl bg-[#eae5d8]/70 p-1 border border-[#d9d2c2]">
                <button
                  type="button"
                  onClick={() => {
                    setItemType("DISH");
                    if (dishes.length > 0) setItemId(dishes[0].id);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    itemType === "DISH"
                      ? "bg-[#294d33] text-white shadow-xs"
                      : "text-[#5c685e] hover:text-[#26352a]"
                  }`}
                >
                  Dish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemType("OPTION");
                    if (options.length > 0) setItemId(options[0].id);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    itemType === "OPTION"
                      ? "bg-[#294d33] text-white shadow-xs"
                      : "text-[#5c685e] hover:text-[#26352a]"
                  }`}
                >
                  Option
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
                {itemType === "DISH" ? "Select Master Dish *" : "Select Catalogue Option *"}
              </label>
              {itemType === "DISH" ? (
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                  required
                >
                  <option value="">Select dish from catalogue...</option>
                  {dishes.map((dish) => (
                    <option key={dish.id} value={dish.id}>
                      {dish.name} {dish.sku ? `(${dish.sku})` : ""} — Cost: ${Number(dish.costPrice).toFixed(2)}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                  required
                >
                  <option value="">Select option from catalogue...</option>
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} — Cost: ${Number(opt.costPrice).toFixed(2)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              icon={<Play size={14} />}
              loading={isLoading}
              disabled={!companyId.trim() || !itemId.trim()}
            >
              Resolve Company Price
            </Button>
          </div>
        </form>

        {/* Resolution Output */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="loader mb-2" />
            <p className="text-xs text-[#78857a]">Resolving company tier lineage & item price overrides...</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl bg-[#fff5f5] p-5 text-center text-xs text-[#a34747] border border-[#ffdada]">
            {getErrorMessage(errorObj, "Failed to resolve item price for company.")}
          </div>
        ) : resolved ? (
          <div className="space-y-4">
            {/* Main Result Card */}
            <div className="rounded-3xl border border-[#294d33]/30 bg-[#172e1f] p-6 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#d8bd83]">
                      Authoritative Price
                    </span>
                    <span className="rounded bg-[#294d33] px-2 py-0.5 text-[10px] font-bold text-[#fbfaf6] border border-white/10">
                      Derivation Source: {resolved.source}
                    </span>
                    {resolved.isOverridden && (
                      <span className="rounded bg-[#c8a96b]/30 px-2 py-0.5 text-[10px] font-bold text-[#f0dfba] border border-[#c8a96b]/40">
                        Explicit Override
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-2xl font-bold text-[#fbfaf6]">
                    {activeItemType === "DISH"
                      ? selectedDish?.name ?? resolved.itemName ?? "Selected Dish"
                      : selectedOption?.name ?? resolved.itemName ?? "Selected Option"}
                  </h3>

                  {selectedDish?.sku && (
                    <p className="text-xs text-[#9eb6a3] font-mono mt-0.5">
                      SKU: {selectedDish.sku}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
                  <p className="text-[10px] text-[#9eb6a3] uppercase tracking-wider">
                    Company Selling Price
                  </p>
                  <p className="font-serif text-3xl font-bold text-[#d8bd83]">
                    ${Number(resolved.price ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Tier resolution path & company context */}
              <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-[#d8bd83]" />
                  <div>
                    <span className="text-[#9eb6a3]">Company: </span>
                    <span className="font-semibold text-white">
                      {contextData?.companyName ?? selectedCompany?.name ?? "Selected Company"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BadgeDollarSign size={15} className="text-[#d8bd83]" />
                  <div>
                    <span className="text-[#9eb6a3]">Effective Price Tier: </span>
                    <span className="font-semibold text-white">
                      {resolved.tierName ?? contextData?.priceTierName ?? "Standard Tier"}
                      {contextData?.isDefaultTier && " (System Default)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-2 border-t border-[#eae5d8]">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
