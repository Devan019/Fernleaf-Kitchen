"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { usePriceTiers } from "@/features/pricing/usePricing";
import { useUsers } from "@/features/users/useUsers";
import { useEmployees } from "@/features/employees/useEmployees";
import type {
  CompanyDetail,
  CreateCompanyRequest,
  DayOfWeek,
  UpdateCompanyRequest,
} from "@/types";
import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Globe,
  Package,
  Plus,
  ShieldAlert,
  Tag,
  Trash2,
  Truck,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

const BLOCKED_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "zoho.com",
  "mail.com",
  "yandex.com",
  "live.com",
  "msn.com",
];

const ALL_DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "MONDAY", label: "Monday", short: "Mon" },
  { key: "TUESDAY", label: "Tuesday", short: "Tue" },
  { key: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { key: "THURSDAY", label: "Thursday", short: "Thu" },
  { key: "FRIDAY", label: "Friday", short: "Fri" },
  { key: "SATURDAY", label: "Saturday", short: "Sat" },
  { key: "SUNDAY", label: "Sunday", short: "Sun" },
];

const PACKAGING_OPTIONS = [
  { value: "ECO_BOX", label: "Eco-Friendly Compostable Box (Standard)" },
  { value: "PREMIUM_TRAY", label: "Premium Catering Tray" },
  { value: "STANDARD_BAG", label: "Standard Sealed Paper Bag" },
  { value: "HOT_BOX", label: "Insulated Thermal Box" },
  { value: "CUSTOM", label: "Custom Corporate Packaging" },
];

interface CompanyFormModalProps {
  open: boolean;
  onClose: () => void;
  company?: CompanyDetail | null;
  onSubmit: (
    data: CreateCompanyRequest | UpdateCompanyRequest,
    meta?: {
      domainsToAdd?: string[];
      billingContact?: { name: string; email: string; phone: string };
      ownerId?: string;
      workingDays?: DayOfWeek[];
    },
  ) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function CompanyFormModal({
  open,
  onClose,
  company,
  onSubmit,
  loading = false,
  serverError,
}: CompanyFormModalProps) {
  const isEdit = Boolean(company);

  // Reference data (only query when modal is open)
  const { data: priceTiersData } = usePriceTiers({ limit: 100 }, { enabled: open });
  const { data: usersData } = useUsers({ limit: 100 }, { enabled: open });
  const { data: companyEmployeesData } = useEmployees(
    company?.id ? { companyId: company.id, limit: 100 } : { limit: 0 },
    { enabled: open && Boolean(company?.id) }
  );

  const priceTiers = priceTiersData?.data ?? [];
  const drivers = (usersData?.data ?? []).filter((u) => u.role === "DRIVER");
  const employees = companyEmployeesData?.data ?? [];

  // Tab State
  type TabKey = "basic" | "delivery" | "billing" | "calendar" | "pricing";
  const [activeTab, setActiveTab] = useState<TabKey>("basic");

  // Form Fields
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Domains
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);

  // Delivery Defaults
  const [defaultDeliveryTime, setDefaultDeliveryTime] = useState("12:00");
  const [leaveKitchenMinutes, setLeaveKitchenMinutes] = useState("60");
  const [defaultPackagingType, setDefaultPackagingType] = useState("ECO_BOX");
  const [standingDriverInstructions, setStandingDriverInstructions] = useState("");
  const [defaultDriverId, setDefaultDriverId] = useState("");

  // Billing Contact
  const [billingContactName, setBillingContactName] = useState("");
  const [billingContactEmail, setBillingContactEmail] = useState("");
  const [billingContactPhone, setBillingContactPhone] = useState("");

  // Owner
  const [ownerId, setOwnerId] = useState("");

  // Calendar
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ]);

  // Pricing
  const [priceTierId, setPriceTierId] = useState("");

  // Form Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (company) {
      setName(company.name);
      setIsActive(company.isActive);
      setDomains(company.emailDomains?.map((d) => (typeof d === "string" ? d : d.domain)) ?? []);
      setDefaultDeliveryTime(company.deliveryDefaults?.defaultDeliveryTime ?? "12:00");
      setLeaveKitchenMinutes(String(company.deliveryDefaults?.leaveKitchenMinutes ?? 60));
      setDefaultPackagingType(company.deliveryDefaults?.defaultPackagingType ?? "ECO_BOX");
      setStandingDriverInstructions(company.deliveryDefaults?.standingDriverInstructions ?? "");
      setDefaultDriverId(company.deliveryDefaults?.defaultDriverId ?? "");
      setBillingContactName(company.billingContact?.name ?? "");
      setBillingContactEmail(company.billingContact?.email ?? "");
      setBillingContactPhone(company.billingContact?.phone ?? "");
      setOwnerId(company.ownerId ?? "");
      setWorkingDays(
        company.workingDays && company.workingDays.length > 0
          ? company.workingDays
          : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      );
      setPriceTierId(company.priceTierId ?? "");
    } else {
      setName("");
      setIsActive(true);
      setDomains([]);
      setNewDomainInput("");
      setDefaultDeliveryTime("12:00");
      setLeaveKitchenMinutes("60");
      setDefaultPackagingType("ECO_BOX");
      setStandingDriverInstructions("");
      setDefaultDriverId("");
      setBillingContactName("");
      setBillingContactEmail("");
      setBillingContactPhone("");
      setOwnerId("");
      setWorkingDays(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
      setPriceTierId("");
    }
    setActiveTab("basic");
    setDomainError(null);
    setErrors({});
  }, [company, open]);

  // Add Domain handler
  const handleAddDomain = () => {
    setDomainError(null);
    const cleaned = newDomainInput.trim().toLowerCase().replace(/^@/, "");
    if (!cleaned) return;

    // Validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,10}$/i;
    if (!domainRegex.test(cleaned)) {
      setDomainError("Please enter a valid domain format (e.g. acme-corp.com)");
      return;
    }

    if (BLOCKED_DOMAINS.includes(cleaned)) {
      setDomainError(`Public webmail domain (${cleaned}) is not permitted.`);
      return;
    }

    if (domains.includes(cleaned)) {
      setDomainError("Domain has already been added.");
      return;
    }

    setDomains((prev) => [...prev, cleaned]);
    setNewDomainInput("");
  };

  const handleRemoveDomain = (dom: string) => {
    setDomains((prev) => prev.filter((d) => d !== dom));
  };

  const toggleWorkingDay = (day: DayOfWeek) => {
    setWorkingDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // At least one day required
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Company name is required";
    if (workingDays.length === 0) newErrors.workingDays = "At least one operational working day is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name) setActiveTab("basic");
      else if (newErrors.workingDays) setActiveTab("calendar");
      return;
    }

    if (!isEdit) {
      const payload: CreateCompanyRequest = {
        name: name.trim(),
        domains: domains.length > 0 ? domains : undefined,
        billingContactName: billingContactName.trim() || undefined,
        billingContactEmail: billingContactEmail.trim() || undefined,
        billingContactPhone: billingContactPhone.trim() || undefined,
        workingDays,
        defaultDeliveryTime: defaultDeliveryTime || "12:00",
        leaveKitchenMinutes: leaveKitchenMinutes ? Number(leaveKitchenMinutes) : 60,
        defaultPackagingType: defaultPackagingType || undefined,
        standingDriverInstructions: standingDriverInstructions.trim() || undefined,
        defaultDriverId: defaultDriverId || undefined,
        priceTierId: priceTierId || undefined,
        isActive,
      };
      await onSubmit(payload);
    } else {
      const payload: UpdateCompanyRequest = {
        name: name.trim(),
        defaultDeliveryTime: defaultDeliveryTime || "12:00",
        leaveKitchenMinutes: leaveKitchenMinutes ? Number(leaveKitchenMinutes) : 60,
        defaultPackagingType: defaultPackagingType || undefined,
        standingDriverInstructions: standingDriverInstructions.trim() || undefined,
        defaultDriverId: defaultDriverId || null,
        priceTierId: priceTierId || null,
        isActive,
      };

      await onSubmit(payload, {
        billingContact: {
          name: billingContactName.trim(),
          email: billingContactEmail.trim(),
          phone: billingContactPhone.trim(),
        },
        ownerId: ownerId || undefined,
        workingDays,
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${company?.name ?? "Company"}` : "Register New Company"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#eae5d8] gap-1 overflow-x-auto pb-1">
          {[
            { key: "basic", label: "General & Domains", icon: Globe },
            { key: "delivery", label: "Delivery Defaults", icon: Truck },
            { key: "billing", label: "Billing & Owner", icon: CreditCard },
            { key: "calendar", label: "Operating Calendar", icon: Calendar },
            { key: "pricing", label: "Price Tier", icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? "bg-[#294d33] text-white shadow-xs"
                    : "text-[#5c685e] hover:text-[#26352a] hover:bg-[#f6f2e8]"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: Basic Information & Domains ─────────────────────────── */}
        {activeTab === "basic" && (
          <div className="space-y-4">
            <Input
              label="Company Name *"
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              error={errors.name}
              required
            />

            {/* Corporate Email Domains */}
            <div className="space-y-2 rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4">
              <div>
                <label className="text-xs font-bold text-[#26352a] block">
                  Corporate Email Domains
                </label>
                <p className="text-[11px] text-[#78857a]">
                  Employees signing in or ordering with these verified domains will automatically join this company.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. acme.com or acme-corp.co.uk"
                  value={newDomainInput}
                  onChange={(e) => {
                    setNewDomainInput(e.target.value);
                    if (domainError) setDomainError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDomain();
                    }
                  }}
                  className="flex-1 h-9 rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={13} />}
                  onClick={handleAddDomain}
                >
                  Add Domain
                </Button>
              </div>

              {domainError && (
                <p className="text-xs text-[#a34747] font-medium">{domainError}</p>
              )}

              {domains.length === 0 ? (
                <p className="text-xs text-[#9fa89e] italic py-1">
                  No domains configured yet. Add at least one domain.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {domains.map((dom) => (
                    <span
                      key={dom}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1 text-xs font-mono font-medium text-[#294d33] border border-[#d9d2c2] shadow-xs"
                    >
                      <span>@{dom}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(dom)}
                        className="text-[#9fa89e] hover:text-[#a34747] transition-colors"
                        title="Remove domain"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between rounded-xl bg-[#f5f1e6]/60 p-3.5 border border-[#eae5d8]">
              <div>
                <p className="text-xs font-semibold text-[#26352a]">Active Customer Company</p>
                <p className="text-[11px] text-[#78857a]">
                  Inactive companies cannot place orders or inherit pricing rules.
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
          </div>
        )}

        {/* ── TAB 2: Delivery Defaults & Operations ───────────────────────── */}
        {activeTab === "delivery" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
                  Default Delivery Time (HH:mm)
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={defaultDeliveryTime}
                    onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#78857a] mt-1">
                  Default lunchtime catering arrival slot.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
                  Kitchen Lead Time (Minutes)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  step="5"
                  value={leaveKitchenMinutes}
                  onChange={(e) => setLeaveKitchenMinutes(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none font-mono"
                />
                <p className="text-[10px] text-[#78857a] mt-1">
                  Minutes before delivery food must leave kitchen (default: 60 mins).
                </p>
              </div>
            </div>

            {/* Packaging Type */}
            <div>
              <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
                Default Packaging Type
              </label>
              <select
                value={defaultPackagingType}
                onChange={(e) => setDefaultPackagingType(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              >
                {PACKAGING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Delivery Driver */}
            <div>
              <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
                Assigned Primary Driver (Optional)
              </label>
              <select
                value={defaultDriverId}
                onChange={(e) => setDefaultDriverId(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              >
                <option value="">No Dedicated Driver (Auto-Dispatch)</option>
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    🚗 {drv.name} ({drv.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Standing Driver Instructions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wide text-[#4c594f]">
                Standing Delivery Instructions for Driver
              </label>
              <textarea
                rows={3}
                value={standingDriverInstructions}
                onChange={(e) => setStandingDriverInstructions(e.target.value)}
                placeholder="e.g. Park in loading dock B, call security on 020-7946, take service lift to 4th floor reception."
                className="w-full rounded-xl border border-[#d9d2c2] bg-white p-3 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ── TAB 3: Billing & Owner ───────────────────────────────────────── */}
        {activeTab === "billing" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4 space-y-3">
              <h4 className="text-xs font-bold text-[#26352a] flex items-center gap-2">
                <CreditCard size={15} className="text-[#294d33]" />
                Billing Contact Details
              </h4>
              <p className="text-[11px] text-[#78857a]">
                Point of contact for automated invoices, billing enquiries, and statements.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Contact Name"
                  placeholder="e.g. Accounts Dept / Jane Smith"
                  value={billingContactName}
                  onChange={(e) => setBillingContactName(e.target.value)}
                />

                <Input
                  label="Invoicing Email"
                  type="email"
                  placeholder="e.g. billing@acme.com"
                  value={billingContactEmail}
                  onChange={(e) => setBillingContactEmail(e.target.value)}
                />
              </div>

              <Input
                label="Billing Phone"
                placeholder="e.g. +44 20 7946 0958"
                value={billingContactPhone}
                onChange={(e) => setBillingContactPhone(e.target.value)}
              />
            </div>

            {/* Company Owner Selector */}
            <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4 space-y-2">
              <h4 className="text-xs font-bold text-[#26352a] flex items-center gap-2">
                <UserCheck size={15} className="text-[#294d33]" />
                Designated Company Owner
              </h4>
              <p className="text-[11px] text-[#78857a]">
                The corporate owner manages company settings and holds primary administrative authority.
              </p>

              {isEdit ? (
                employees.length === 0 ? (
                  <p className="text-xs text-[#9fa89e] italic">
                    No employees registered yet. Register employees under this company to designate an owner.
                  </p>
                ) : (
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                  >
                    <option value="">No Owner Designated</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        👤 {emp.name} {emp.email ? `(${emp.email})` : ""}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <div className="rounded-xl bg-[#f5f1e6] p-3 text-xs text-[#5c685e]">
                  💡 Company owner can be designated after company creation and employee onboarding.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: Operating Calendar ───────────────────────────────────── */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-[#26352a] flex items-center gap-2">
                  <Calendar size={15} className="text-[#294d33]" />
                  Operational Delivery Days
                </h4>
                <p className="text-[11px] text-[#78857a] mt-0.5">
                  Select the weekdays when this company accepts food deliveries. Unselected days and registered company holidays will automatically block order scheduling.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {ALL_DAYS.map((day) => {
                  const active = workingDays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleWorkingDay(day.key)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        active
                          ? "bg-[#294d33] text-white border-[#294d33] shadow-xs"
                          : "bg-white text-[#5c685e] border-[#d9d2c2] hover:border-[#b7b6aa]"
                      }`}
                    >
                      <span className="font-semibold">{day.label}</span>
                      <span className="text-[11px] opacity-80">{active ? "✓" : "—"}</span>
                    </button>
                  );
                })}
              </div>

              {errors.workingDays && (
                <p className="text-xs text-[#a34747] font-medium">{errors.workingDays}</p>
              )}

              <div className="rounded-xl bg-[#294d33]/5 border border-[#294d33]/15 p-3 text-xs text-[#294d33] space-y-1">
                <p className="font-semibold">⚠️ Delivery Calendar Protection</p>
                <p className="text-[11px] text-[#4a6b52]">
                  Specific company holidays (e.g. Christmas, Bank Holidays) can be scheduled individually from the company details page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: Price Tier & Menu ────────────────────────────────────── */}
        {activeTab === "pricing" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-[#26352a] flex items-center gap-2">
                  <Tag size={15} className="text-[#294d33]" />
                  Assigned Price Tier
                </h4>
                <p className="text-[11px] text-[#78857a] mt-0.5">
                  Employees ordering under this company inherit pricing rules, dish overrides, and portion surcharges from the selected price tier.
                </p>
              </div>

              <select
                value={priceTierId}
                onChange={(e) => setPriceTierId(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              >
                <option value="">Platform Default Price Tier</option>
                {priceTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    🏷️ {tier.name} {tier.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {isEdit ? "Save Changes" : "Create Company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
