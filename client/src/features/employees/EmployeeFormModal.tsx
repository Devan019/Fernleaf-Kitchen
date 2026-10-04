"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAllergens, useDietaryTags } from "@/features/catalogue/useCatalogue";
import { useCompanies } from "@/features/companies/useCompanies";
import type {
  Allergen,
  CreateEmployeeRequest,
  DietaryTag,
  EmployeeSummary,
  UpdateEmployeeRequest,
} from "@/types";
import {
  AlertCircle,
  Building2,
  Check,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  employee?: EmployeeSummary | null;
  defaultCompanyId?: string;
  onSubmit: (
    data: CreateEmployeeRequest | UpdateEmployeeRequest,
    meta?: {
      allergenIds?: string[];
      dietaryTagIds?: string[];
      permissions?: {
        canChooseDeliveryAddress: boolean;
        canChangeDeliveryTime: boolean;
        canChangePackaging: boolean;
      };
    },
  ) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function EmployeeFormModal({
  open,
  onClose,
  employee,
  defaultCompanyId,
  onSubmit,
  loading = false,
  serverError,
}: EmployeeFormModalProps) {
  const isEdit = Boolean(employee);

  // References
  const { data: rawAllergens } = useAllergens();
  const { data: rawDietary } = useDietaryTags();
  const { data: companiesData } = useCompanies({ limit: 100 });

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

  const companiesList = companiesData?.data ?? [];

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [canChooseDeliveryAddress, setCanChooseDeliveryAddress] = useState(false);
  const [canChangeDeliveryTime, setCanChangeDeliveryTime] = useState(false);
  const [canChangePackaging, setCanChangePackaging] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email ?? "");
      setCompanyId(employee.companyId ?? "");
      setCanChooseDeliveryAddress(Boolean(employee.canChooseDeliveryAddress));
      setCanChangeDeliveryTime(Boolean(employee.canChangeDeliveryTime));
      setCanChangePackaging(Boolean(employee.canChangePackaging));
      setSelectedAllergens(employee.allergens?.map((a) => a.id) ?? []);
      setSelectedDietaryTags(employee.dietaryTags?.map((d) => d.id) ?? []);
      setIsActive(employee.isActive);
    } else {
      setName("");
      setEmail("");
      setCompanyId(defaultCompanyId ?? "");
      setCanChooseDeliveryAddress(false);
      setCanChangeDeliveryTime(false);
      setCanChangePackaging(false);
      setSelectedAllergens([]);
      setSelectedDietaryTags([]);
      setIsActive(true);
    }
    setErrors({});
  }, [employee, defaultCompanyId, open]);

  const initialCompanyId = employee?.companyId;
  const isCompanyChanged = isEdit && companyId && initialCompanyId && companyId !== initialCompanyId;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Employee name is required";
    if (!companyId) newErrors.companyId = "Company association is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!isEdit) {
      const payload: CreateEmployeeRequest = {
        name: name.trim(),
        email: email.trim() || undefined,
        companyId,
        canChooseDeliveryAddress,
        canChangeDeliveryTime,
        canChangePackaging,
        allergenIds: selectedAllergens,
        dietaryTagIds: selectedDietaryTags,
        isActive,
      };
      await onSubmit(payload);
    } else {
      const payload: UpdateEmployeeRequest = {
        name: name.trim(),
        email: email.trim() || undefined,
        companyId,
        canChooseDeliveryAddress,
        canChangeDeliveryTime,
        canChangePackaging,
        isActive,
      };
      await onSubmit(payload, {
        allergenIds: selectedAllergens,
        dietaryTagIds: selectedDietaryTags,
        permissions: {
          canChooseDeliveryAddress,
          canChangeDeliveryTime,
          canChangePackaging,
        },
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Employee • ${employee?.name ?? ""}` : "Register New Employee"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Basic Fields */}
        <div className="space-y-3">
          <Input
            label="Full Name *"
            placeholder="e.g. Sarah Connor"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            error={errors.name}
            required
          />

          <Input
            label="Corporate Email"
            type="email"
            placeholder="e.g. sarah.connor@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Used for authentication, notifications, and company auto-resolution."
          />

          {/* Company Selector */}
          <div>
            <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
              Assigned Company *
            </label>
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                if (errors.companyId) setErrors((prev) => ({ ...prev, companyId: "" }));
              }}
              className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              required
            >
              <option value="">Select a company...</option>
              {companiesList.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  🏢 {comp.name}
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="text-xs text-[#a34747] font-medium mt-1">{errors.companyId}</p>
            )}
          </div>

          {/* Relocation Warning */}
          {isCompanyChanged && (
            <div className="rounded-xl bg-[#fff8e6] border border-[#ffd880] p-3 text-xs text-[#8a6000] flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#d48806]" />
              <div>
                <p className="font-bold">Transferring Employee Company</p>
                <p className="text-[11px] text-[#8a6000] mt-0.5">
                  Moving this employee to another company will immediately update their inherited pricing tier, accessible delivery addresses, and calendar delivery rules.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Business Permission Flags */}
        <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4 space-y-3">
          <h4 className="text-xs font-bold text-[#26352a] flex items-center gap-2">
            <Shield size={15} className="text-[#294d33]" />
            Ordering Permissions & Flexibility
          </h4>
          <p className="text-[11px] text-[#78857a]">
            Allow this employee self-service ordering privileges to customize their catering deliveries.
          </p>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#eae5d8] cursor-pointer hover:bg-[#faf8f2] transition-colors">
              <div>
                <p className="text-xs font-semibold text-[#26352a]">Choose Delivery Address</p>
                <p className="text-[10px] text-[#78857a]">Can select alternate company delivery locations</p>
              </div>
              <input
                type="checkbox"
                checked={canChooseDeliveryAddress}
                onChange={(e) => setCanChooseDeliveryAddress(e.target.checked)}
                className="rounded text-[#294d33] focus:ring-[#294d33] h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#eae5d8] cursor-pointer hover:bg-[#faf8f2] transition-colors">
              <div>
                <p className="text-xs font-semibold text-[#26352a]">Customize Delivery Time</p>
                <p className="text-[10px] text-[#78857a]">Can adjust arrival time slot from company default</p>
              </div>
              <input
                type="checkbox"
                checked={canChangeDeliveryTime}
                onChange={(e) => setCanChangeDeliveryTime(e.target.checked)}
                className="rounded text-[#294d33] focus:ring-[#294d33] h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#eae5d8] cursor-pointer hover:bg-[#faf8f2] transition-colors">
              <div>
                <p className="text-xs font-semibold text-[#26352a]">Customize Packaging</p>
                <p className="text-[10px] text-[#78857a]">Can specify preferred packaging type on checkout</p>
              </div>
              <input
                type="checkbox"
                checked={canChangePackaging}
                onChange={(e) => setCanChangePackaging(e.target.checked)}
                className="rounded text-[#294d33] focus:ring-[#294d33] h-4 w-4"
              />
            </label>
          </div>
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
                    <span>⚠️ {allergen.name}</span>
                    {checked && <span className="text-[10px]">✕</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dietary Preferences Selection */}
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
                    <span>🌱 {tag.name}</span>
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
            <p className="text-xs font-semibold text-[#26352a]">Active Employee</p>
            <p className="text-[11px] text-[#78857a]">
              Inactive employees cannot log in or place lunch orders.
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
            {isEdit ? "Save Employee" : "Create Employee"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
