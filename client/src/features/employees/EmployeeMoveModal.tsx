"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCompanies } from "@/features/companies/useCompanies";
import type { EmployeeSummary } from "@/types";
import { AlertTriangle, ArrowRight, Building2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

interface EmployeeMoveModalProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeSummary | null;
  onConfirm: (employeeId: string, newCompanyId: string) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function EmployeeMoveModal({
  open,
  onClose,
  employee,
  onConfirm,
  loading = false,
  serverError,
}: EmployeeMoveModalProps) {
  const { data: companiesData } = useCompanies({ limit: 100 });
  const companies = companiesData?.data ?? [];

  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetCompanyId("");
    setError(null);
  }, [employee, open]);

  const currentCompany = companies.find((c) => c.id === employee?.companyId);
  const targetCompany = companies.find((c) => c.id === targetCompanyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    if (!targetCompanyId) {
      setError("Please select a destination company.");
      return;
    }
    if (targetCompanyId === employee.companyId) {
      setError("Destination company must be different from current company.");
      return;
    }

    await onConfirm(employee.id, targetCompanyId);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Transfer Employee • ${employee?.name ?? ""}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="rounded-2xl bg-[#fff8e6] border border-[#ffd880] p-4 space-y-2 text-[#8a6000]">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle size={16} className="text-[#d48806]" />
            Important Rule Inheritance Notice
          </div>
          <p className="text-[11px] leading-relaxed">
            Moving an employee to another company will immediately transfer their account under that company's billing structure. The employee will inherit the new company's:
          </p>
          <ul className="text-[11px] list-disc list-inside space-y-0.5 pt-1 pl-1">
            <li>Assigned Price Tier & dish pricing</li>
            <li>Configured delivery addresses & default location</li>
            <li>Operating calendar delivery days & scheduled holidays</li>
            <li>Hidden menu categories and dishes</li>
          </ul>
        </div>

        {/* Source & Destination Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div className="rounded-xl bg-[#f5f1e6] border border-[#eae5d8] p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
              Current Company
            </span>
            <p className="text-xs font-semibold text-[#26352a] mt-1 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#294d33]" />
              {currentCompany?.name ?? employee?.company?.name ?? "Unknown"}
            </p>
          </div>

          <div className="rounded-xl bg-white border border-[#294d33] p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#294d33] block">
              New Destination Company
            </span>
            <p className="text-xs font-semibold text-[#26352a] mt-1 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#294d33]" />
              {targetCompany?.name ?? "Select below..."}
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
            Select Destination Company *
          </label>
          <select
            value={targetCompanyId}
            onChange={(e) => {
              setTargetCompanyId(e.target.value);
              setError(null);
            }}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
            required
          >
            <option value="">Choose a destination company...</option>
            {companies
              .filter((c) => c.id !== employee?.companyId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name}
                </option>
              ))}
          </select>
          {error && <p className="text-xs text-[#a34747] font-medium mt-1">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} disabled={!targetCompanyId}>
            Transfer Employee
          </Button>
        </div>
      </form>
    </Modal>
  );
}
