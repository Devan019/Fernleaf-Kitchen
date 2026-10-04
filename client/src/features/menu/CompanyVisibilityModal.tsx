"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  useHideCategoryForCompany,
  useHideDishForCompany,
  useUnhideCategoryForCompany,
  useUnhideDishForCompany,
} from "@/features/menu/useMenu";
import { useCompanies } from "@/features/pricing/usePricing";
import { getErrorMessage } from "@/lib/utils/errors";
import type { CompanyListItem } from "@/types";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

interface CompanyVisibilityModalProps {
  open: boolean;
  onClose: () => void;
  itemType: "CATEGORY" | "DISH";
  itemId: string;
  itemName: string;
  hiddenCompanyIds?: string[];
}

export function CompanyVisibilityModal({
  open,
  onClose,
  itemType,
  itemId,
  itemName,
  hiddenCompanyIds = [],
}: CompanyVisibilityModalProps) {
  const [companySearch, setCompanySearch] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load all corporate clients
  const { data: companies = [], isLoading: loadingCompanies, refetch: refetchCompanies } =
    useCompanies();

  // Local state to track hidden companies for instant UI feedback
  const [hiddenIds, setHiddenIds] = useState<string[]>(hiddenCompanyIds);

  // Mutations
  const hideCategoryMutation = useHideCategoryForCompany(itemId);
  const unhideCategoryMutation = useUnhideCategoryForCompany(itemId);
  const hideDishMutation = useHideDishForCompany(itemId);
  const unhideDishMutation = useUnhideDishForCompany(itemId);

  const isPending =
    hideCategoryMutation.isPending ||
    unhideCategoryMutation.isPending ||
    hideDishMutation.isPending ||
    unhideDishMutation.isPending;

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const q = companySearch.toLowerCase().trim();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q),
    );
  }, [companies, companySearch]);

  const handleToggleHide = async (company: CompanyListItem) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const isCurrentlyHidden = hiddenIds.includes(company.id);

    try {
      if (isCurrentlyHidden) {
        // Unhide
        if (itemType === "CATEGORY") {
          await unhideCategoryMutation.mutateAsync(company.id);
        } else {
          await unhideDishMutation.mutateAsync(company.id);
        }
        setHiddenIds((prev) => prev.filter((id) => id !== company.id));
        setSuccessMsg(`Restored visibility for ${company.name}`);
      } else {
        // Hide
        if (itemType === "CATEGORY") {
          await hideCategoryMutation.mutateAsync(company.id);
        } else {
          await hideDishMutation.mutateAsync(company.id);
        }
        setHiddenIds((prev) => [...prev, company.id]);
        setSuccessMsg(`Hidden from ${company.name}`);
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to update company visibility restriction."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Company Visibility: ${itemName}`}
      size="md"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <p className="text-xs text-[#78857a]">
          Toggle corporate client visibility for this {itemType === "CATEGORY" ? "category" : "dish"}.
          Hidden items will not appear on employees&apos; ordering menus.
        </p>

        {errorMsg && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-[#f0f9f3] p-3 text-xs text-[#226738] border border-[#c4e6ce] flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
          />
          <input
            type="text"
            placeholder="Search companies by name or code..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
          />
        </div>

        {/* Corporate Companies Directory */}
        {loadingCompanies ? (
          <div className="flex items-center justify-center py-12 text-xs text-[#78857a] gap-2">
            <RefreshCw size={14} className="animate-spin text-[#294d33]" />
            <span>Loading corporate clients...</span>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9d2c2] p-8 text-center text-xs text-[#78857a]">
            No companies found matching &quot;{companySearch}&quot;.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-[#f5f1e6] rounded-2xl border border-[#d9d2c2] bg-white shadow-xs">
            {filteredCompanies.map((comp) => {
              const isHidden = hiddenIds.includes(comp.id);
              return (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-3.5 hover:bg-[#fbfaf6] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-8.5 w-8.5 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold font-serif ${
                        isHidden
                          ? "bg-[#fff5f5] text-[#a34747] border border-[#ffdada]"
                          : "bg-[#f5f1e6] text-[#294d33] border border-[#eae5d8]"
                      }`}
                    >
                      {comp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#26352a] truncate">
                          {comp.name}
                        </span>
                        {comp.code && (
                          <span className="text-[10px] bg-[#f5f1e6] px-1.5 py-0.2 rounded text-[#78857a] font-mono">
                            {comp.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isHidden ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#a34747]">
                            <EyeOff size={10} />
                            Hidden from employees
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#226738]">
                            <Eye size={10} />
                            Visible on menu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isHidden ? "secondary" : "danger"}
                    icon={isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    onClick={() => handleToggleHide(comp)}
                    loading={isPending}
                  >
                    {isHidden ? "Restore Access" : "Hide"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[#eae5d8]">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
