"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  useHideCategoryForCompany,
  useHideDishForCompany,
  useUnhideCategoryForCompany,
  useUnhideDishForCompany,
} from "@/features/menu/useMenu";
import { getErrorMessage } from "@/lib/utils/errors";
import { Building2, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface CompanyVisibilityModalProps {
  open: boolean;
  onClose: () => void;
  itemType: "CATEGORY" | "DISH";
  itemId: string;
  itemName: string;
}

export function CompanyVisibilityModal({
  open,
  onClose,
  itemType,
  itemId,
  itemName,
}: CompanyVisibilityModalProps) {
  const [companyIdInput, setCompanyIdInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hideCategoryMutation = useHideCategoryForCompany(itemId);
  const unhideCategoryMutation = useUnhideCategoryForCompany(itemId);
  const hideDishMutation = useHideDishForCompany(itemId);
  const unhideDishMutation = useUnhideDishForCompany(itemId);

  const isPending =
    hideCategoryMutation.isPending ||
    unhideCategoryMutation.isPending ||
    hideDishMutation.isPending ||
    unhideDishMutation.isPending;

  const handleHideFromCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyIdInput.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (itemType === "CATEGORY") {
        await hideCategoryMutation.mutateAsync(companyIdInput.trim());
      } else {
        await hideDishMutation.mutateAsync(companyIdInput.trim());
      }
      setSuccessMsg(`Successfully hidden from company: ${companyIdInput.trim()}`);
      setCompanyIdInput("");
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to update company visibility restriction."));
    }
  };

  const handleUnhideFromCompany = async (companyId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (itemType === "CATEGORY") {
        await unhideCategoryMutation.mutateAsync(companyId);
      } else {
        await unhideDishMutation.mutateAsync(companyId);
      }
      setSuccessMsg(`Successfully restored visibility for company: ${companyId}`);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to restore company visibility."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Company Visibility: ${itemName}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-[#78857a]">
          Restrict this {itemType === "CATEGORY" ? "category" : "dish"} from being visible or
          orderable by specific corporate clients and their employees.
        </p>

        {errorMsg && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-[#f0f9f3] p-3 text-xs text-[#226738] border border-[#c4e6ce]">
            {successMsg}
          </div>
        )}

        {/* Hide from new company */}
        <form onSubmit={handleHideFromCompany} className="space-y-2">
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block">
            Hide From Company (Company ID)
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. cmp_123456789"
              value={companyIdInput}
              onChange={(e) => setCompanyIdInput(e.target.value)}
              className="text-xs"
            />
            <Button
              type="submit"
              variant="danger"
              icon={<EyeOff size={14} />}
              loading={isPending}
              disabled={!companyIdInput.trim()}
            >
              Hide
            </Button>
          </div>
        </form>

        {/* Unhide / Manage section */}
        <div className="rounded-2xl border border-[#eae5d8] bg-[#fbfaf6] p-4 text-xs space-y-3">
          <div className="flex items-center gap-2 text-[#26352a] font-semibold">
            <Building2 size={15} className="text-[#294d33]" />
            <span>Manage Visibility Rules</span>
          </div>
          <p className="text-[#78857a] text-[11px]">
            To restore access for a company, enter their Company ID above and use the unhide action.
          </p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Company ID to Unhide..."
              id="unhide-company-id"
              className="text-xs flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<Eye size={13} />}
              onClick={() => {
                const el = document.getElementById("unhide-company-id") as HTMLInputElement;
                if (el?.value) {
                  handleUnhideFromCompany(el.value.trim());
                  el.value = "";
                }
              }}
            >
              Restore Access
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
