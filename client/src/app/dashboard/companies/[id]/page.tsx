"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useDishes } from "@/features/catalogue/useCatalogue";
import { CompanyAddressModal } from "@/features/companies/CompanyAddressModal";
import { CompanyFormModal } from "@/features/companies/CompanyFormModal";
import { CompanyHolidayModal } from "@/features/companies/CompanyHolidayModal";
import { CsvImportModal } from "@/features/companies/CsvImportModal";
import { DeliveryAvailabilityModal } from "@/features/companies/DeliveryAvailabilityModal";
import {
  useAddCompanyAddress,
  useAddCompanyDomain,
  useAddCompanyHoliday,
  useAssignCompanyPriceTier,
  useCompany,
  useCompanyAddresses,
  useCompanyHolidays,
  useDeactivateCompany,
  useDeleteCompanyAddress,
  useDeleteCompanyHoliday,
  useHideCompanyCategory,
  useHideCompanyDish,
  useRemoveCompanyDomain,
  useSetCompanyOwner,
  useUnhideCompanyCategory,
  useUnhideCompanyDish,
  useUpdateBillingContact,
  useUpdateCompany,
  useUpdateCompanyAddress,
  useUpdateCompanyCalendar,
  useUpdateCompanyHoliday,
  useUpdateDeliveryDefaults,
} from "@/features/companies/useCompanies";
import { EmployeeFormModal } from "@/features/employees/EmployeeFormModal";
import { EmployeeMoveModal } from "@/features/employees/EmployeeMoveModal";
import {
  useCreateEmployee,
  useDeactivateEmployee,
  useEmployees,
  useUpdateEmployee,
  useUpdateEmployeePermissions,
  useUpdateEmployeePreferences,
} from "@/features/employees/useEmployees";
import { useCategories } from "@/features/menu/useMenu";
import { usePriceTiers } from "@/features/pricing/usePricing";
import { useUsers } from "@/features/users/useUsers";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  CompanyHoliday,
  CreateCompanyRequest,
  CreateDeliveryAddressRequest,
  CreateEmployeeRequest,
  CreateHolidayRequest,
  DayOfWeek,
  DeliveryAddress,
  EmployeeSummary,
  UpdateCompanyRequest,
  UpdateDeliveryAddressRequest,
  UpdateEmployeeRequest,
  UpdateHolidayRequest,
} from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  Tag,
  Trash2,
  Truck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const ALL_DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "MONDAY", label: "Monday", short: "Mon" },
  { key: "TUESDAY", label: "Tuesday", short: "Tue" },
  { key: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { key: "THURSDAY", label: "Thursday", short: "Thu" },
  { key: "FRIDAY", label: "Friday", short: "Fri" },
  { key: "SATURDAY", label: "Saturday", short: "Sat" },
  { key: "SUNDAY", label: "Sunday", short: "Sun" },
];

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;

  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  // Tab State
  type DetailTab = "overview" | "addresses" | "calendar" | "domains" | "employees";
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  // Query Company Details
  const { data: company, isLoading: loadingCompany, isError, error } = useCompany(companyId);
  const { data: addresses = [] } = useCompanyAddresses(companyId);
  const { data: holidays = [] } = useCompanyHolidays(companyId);
  const { data: priceTiersData } = usePriceTiers({ limit: 100 });
  const { data: categoriesData } = useCategories({ limit: 100 });
  const { data: dishesData } = useDishes({ limit: 100 });
  const { data: usersData } = useUsers({ limit: 100 });

  const priceTiers = priceTiersData?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const dishes = dishesData?.data ?? [];
  const drivers = (usersData?.data ?? []).filter((u) => u.role === "DRIVER");

  // Employee Roster Search & Pagination
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [employeePage, setEmployeePage] = useState(1);
  const EMPLOYEE_LIMIT = 15;

  const {
    data: employeesData,
    isLoading: loadingEmployees,
  } = useEmployees({
    companyId,
    page: employeePage,
    limit: EMPLOYEE_LIMIT,
    search: employeeSearch.trim() || undefined,
    isActive: employeeStatusFilter === "ALL" ? undefined : employeeStatusFilter === "ACTIVE",
  });

  // Company Mutations
  const updateCompanyMutation = useUpdateCompany(companyId);
  const deactivateCompanyMutation = useDeactivateCompany();
  const addDomainMutation = useAddCompanyDomain(companyId);
  const removeDomainMutation = useRemoveCompanyDomain(companyId);
  const addAddressMutation = useAddCompanyAddress(companyId);
  const updateAddressMutation = useUpdateCompanyAddress(companyId);
  const deleteAddressMutation = useDeleteCompanyAddress(companyId);
  const updateBillingMutation = useUpdateBillingContact(companyId);
  const setOwnerMutation = useSetCompanyOwner(companyId);
  const updateCalendarMutation = useUpdateCompanyCalendar(companyId);
  const addHolidayMutation = useAddCompanyHoliday(companyId);
  const updateHolidayMutation = useUpdateCompanyHoliday(companyId);
  const deleteHolidayMutation = useDeleteCompanyHoliday(companyId);
  const updateDefaultsMutation = useUpdateDeliveryDefaults(companyId);
  const assignPriceTierMutation = useAssignCompanyPriceTier(companyId);
  const hideCategoryMutation = useHideCompanyCategory(companyId);
  const unhideCategoryMutation = useUnhideCompanyCategory(companyId);
  const hideDishMutation = useHideCompanyDish(companyId);
  const unhideDishMutation = useUnhideCompanyDish(companyId);

  // Employee Mutations
  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  const deactivateEmployeeMutation = useDeactivateEmployee();
  const updatePermissionsMutation = useUpdateEmployeePermissions();
  const updatePreferencesMutation = useUpdateEmployeePreferences();

  // Modal States
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeSummary | null>(null);
  const [movingEmployee, setMovingEmployee] = useState<EmployeeSummary | null>(null);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<EmployeeSummary | null>(null);

  // Domain Quick Add
  const [domainInput, setDomainInput] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);

  // General Error Banner
  const [pageError, setPageError] = useState<string | null>(null);

  // Handlers
  const handleAddDomain = async () => {
    setDomainError(null);
    const cleaned = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!cleaned) return;
    try {
      await addDomainMutation.mutateAsync({ id: companyId, domain: cleaned });
      setDomainInput("");
    } catch (err) {
      setDomainError(getErrorMessage(err, "Failed to add domain."));
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    try {
      await removeDomainMutation.mutateAsync({ id: companyId, domainId });
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to remove domain. Active companies require at least one verified domain."));
    }
  };

  const handleSaveAddress = async (data: CreateDeliveryAddressRequest | UpdateDeliveryAddressRequest) => {
    try {
      if (editingAddress) {
        await updateAddressMutation.mutateAsync({
          id: companyId,
          addressId: editingAddress.id,
          data: data as UpdateDeliveryAddressRequest,
        });
      } else {
        await addAddressMutation.mutateAsync({
          id: companyId,
          data: data as CreateDeliveryAddressRequest,
        });
      }
      setAddressModalOpen(false);
      setEditingAddress(null);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to save address."));
    }
  };

  const handleDeleteAddress = async () => {
    if (!deletingAddressId) return;
    try {
      await deleteAddressMutation.mutateAsync({
        id: companyId,
        addressId: deletingAddressId,
      });
      setDeletingAddressId(null);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to delete address. Active companies must maintain at least one delivery address."));
    }
  };

  const handleSaveHoliday = async (data: CreateHolidayRequest | UpdateHolidayRequest) => {
    try {
      if (editingHoliday) {
        await updateHolidayMutation.mutateAsync({
          id: companyId,
          holidayId: editingHoliday.id,
          data: data as UpdateHolidayRequest,
        });
      } else {
        await addHolidayMutation.mutateAsync({
          id: companyId,
          data: data as CreateHolidayRequest,
        });
      }
      setHolidayModalOpen(false);
      setEditingHoliday(null);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to save holiday."));
    }
  };

  const handleDeleteHoliday = async () => {
    if (!deletingHolidayId) return;
    try {
      await deleteHolidayMutation.mutateAsync({
        id: companyId,
        holidayId: deletingHolidayId,
      });
      setDeletingHolidayId(null);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to delete holiday."));
    }
  };

  const handleToggleWorkingDay = async (day: DayOfWeek) => {
    if (!company) return;
    const current = company.workingDays ?? [];
    let updated: DayOfWeek[];
    if (current.includes(day)) {
      if (current.length === 1) {
        setPageError("At least one operational working day is required.");
        return;
      }
      updated = current.filter((d) => d !== day);
    } else {
      updated = [...current, day];
    }
    try {
      await updateCalendarMutation.mutateAsync({ id: companyId, workingDays: updated });
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to update operational calendar."));
    }
  };

  const handleSaveEmployee = async (
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
  ) => {
    try {
      if (editingEmployee) {
        await updateEmployeeMutation.mutateAsync({
          id: editingEmployee.id,
          data: data as UpdateEmployeeRequest,
        });

        if (meta?.permissions) {
          await updatePermissionsMutation.mutateAsync({
            id: editingEmployee.id,
            data: meta.permissions,
          });
        }

        if (meta?.allergenIds || meta?.dietaryTagIds) {
          await updatePreferencesMutation.mutateAsync({
            id: editingEmployee.id,
            data: {
              allergenIds: meta.allergenIds,
              dietaryTagIds: meta.dietaryTagIds,
            },
          });
        }
      } else {
        await createEmployeeMutation.mutateAsync(data as CreateEmployeeRequest);
      }
      setEmployeeModalOpen(false);
      setEditingEmployee(null);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to save employee."));
    }
  };

  const handleMoveEmployee = async (employeeId: string, newCompanyId: string) => {
    try {
      await updateEmployeeMutation.mutateAsync({
        id: employeeId,
        data: { companyId: newCompanyId },
      });
      setMovingEmployee(null);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to transfer employee."));
    }
  };

  const handleDeactivateEmployee = async () => {
    if (!deactivatingEmployee) return;
    try {
      await deactivateEmployeeMutation.mutateAsync(deactivatingEmployee.id);
      setDeactivatingEmployee(null);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to deactivate employee."));
    }
  };

  if (loadingCompany) {
    return (
      <ProtectedRoute requiredRole={["ADMIN"]}>
        <Header title="Company Details" />
        <main className="flex-1 p-8 space-y-6">
          <div className="h-8 w-48 bg-[#eae5d8] rounded-xl animate-pulse" />
          <div className="h-40 bg-white rounded-3xl border border-[#d9d2c2] animate-pulse" />
        </main>
      </ProtectedRoute>
    );
  }

  if (isError || !company) {
    return (
      <ProtectedRoute requiredRole={["ADMIN"]}>
        <Header title="Company Not Found" />
        <main className="flex-1 p-8">
          <div className="rounded-2xl bg-[#fff5f5] p-6 text-sm text-[#a34747] border border-[#ffdada] space-y-3">
            <p className="font-bold text-base">Error Loading Company</p>
            <p>{getErrorMessage(error, "The requested company could not be retrieved or does not exist.")}</p>
            <Button
              variant="secondary"
              icon={<ArrowLeft size={14} />}
              onClick={() => router.push("/dashboard/companies")}
            >
              Back to Companies
            </Button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title={company.name} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard/companies"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#5c685e] hover:text-[#26352a] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Companies Roster
          </Link>
        </div>

        {/* Global Page Error */}
        {pageError && (
          <div className="rounded-xl bg-[#fff5f5] p-3.5 text-xs text-[#a34747] border border-[#ffdada] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{pageError}</span>
            </div>
            <button
              type="button"
              onClick={() => setPageError(null)}
              className="text-[#a34747] hover:underline font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#294d33] text-[#d8bd83] shadow-md border border-white/10 font-serif text-2xl font-bold">
              <Building2 size={28} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-serif text-[#26352a]">
                  {company.name}
                </h1>
                <Badge variant={company.isActive ? "active" : "inactive"}>
                  {company.isActive ? "Active Account" : "Deactivated"}
                </Badge>
                {company.priceTier && (
                  <Badge variant="kitchen">
                    🏷️ {company.priceTier.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-[#78857a] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-[#294d33]" />
                  {company.employeeCount} Enrolled Employees
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe size={13} className="text-[#294d33]" />
                  {company.emailDomains?.length ?? 0} Email Domains
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#294d33]" />
                  {addresses.length} Delivery Addresses
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              icon={<Calendar size={14} />}
              onClick={() => setAvailabilityOpen(true)}
            >
              Test Availability
            </Button>
            {isAdmin && (
              <Button
                variant="primary"
                icon={<Pencil size={14} />}
                onClick={() => setEditCompanyOpen(true)}
              >
                Edit Company
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#eae5d8] gap-2 overflow-x-auto pb-1">
          {[
            { key: "overview", label: "Overview & Rules", icon: Building2 },
            { key: "addresses", label: `Delivery Addresses (${addresses.length})`, icon: MapPin },
            { key: "calendar", label: `Calendar & Holidays (${holidays.length})`, icon: Calendar },
            { key: "domains", label: `Domains (${company.emailDomains?.length ?? 0})`, icon: Globe },
            { key: "employees", label: `Employees (${company.employeeCount ?? 0})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as DetailTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? "bg-[#294d33] text-white shadow-sm"
                    : "text-[#5c685e] hover:text-[#26352a] hover:bg-[#f5f1e6]"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: Overview & Defaults ───────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Delivery Defaults Card */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                  <Truck size={15} className="text-[#294d33]" />
                  Delivery Defaults
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setEditCompanyOpen(true)}
                    className="text-xs text-[#294d33] font-semibold hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#78857a] block text-[11px]">Default Arrival Time:</span>
                  <p className="font-semibold text-sm text-[#26352a] font-mono mt-0.5">
                    ⏰ {company.deliveryDefaults?.defaultDeliveryTime ?? "12:00"}
                  </p>
                </div>

                <div>
                  <span className="text-[#78857a] block text-[11px]">Kitchen Lead Time:</span>
                  <p className="font-semibold text-[#26352a] mt-0.5">
                    {company.deliveryDefaults?.leaveKitchenMinutes ?? 60} minutes before delivery
                  </p>
                </div>

                <div>
                  <span className="text-[#78857a] block text-[11px]">Preferred Packaging:</span>
                  <p className="font-semibold text-[#26352a] mt-0.5">
                    📦 {company.deliveryDefaults?.defaultPackagingType ?? "ECO_BOX"}
                  </p>
                </div>

                <div>
                  <span className="text-[#78857a] block text-[11px]">Assigned Driver:</span>
                  <p className="font-semibold text-[#26352a] mt-0.5">
                    {company.deliveryDefaults?.defaultDriver?.name ? (
                      `🚗 ${company.deliveryDefaults.defaultDriver.name}`
                    ) : (
                      <span className="text-[#9fa89e] italic">Auto-Dispatch</span>
                    )}
                  </p>
                </div>

                {company.deliveryDefaults?.standingDriverInstructions && (
                  <div className="rounded-xl bg-[#fbfaf6] p-3 border border-[#eae5d8]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
                      Standing Driver Instructions:
                    </span>
                    <p className="text-xs text-[#26352a] mt-1 leading-relaxed">
                      "{company.deliveryDefaults.standingDriverInstructions}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Billing Contact & Owner Card */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                  <CreditCard size={15} className="text-[#294d33]" />
                  Billing & Owner
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setEditCompanyOpen(true)}
                    className="text-xs text-[#294d33] font-semibold hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#78857a] block text-[11px]">Company Owner:</span>
                  <p className="font-semibold text-[#26352a] mt-0.5 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-[#294d33]" />
                    {company.owner?.name ?? <span className="text-[#9fa89e] italic">No Owner Designated</span>}
                  </p>
                  {company.owner?.email && (
                    <p className="text-[11px] text-[#78857a] font-mono">{company.owner.email}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#eae5d8]">
                  <span className="text-[#78857a] block text-[11px]">Billing Contact Name:</span>
                  <p className="font-semibold text-[#26352a] mt-0.5">
                    {company.billingContact?.name ?? "—"}
                  </p>
                </div>

                <div>
                  <span className="text-[#78857a] block text-[11px]">Invoicing Email:</span>
                  <p className="font-semibold text-[#26352a] font-mono mt-0.5">
                    {company.billingContact?.email ?? "—"}
                  </p>
                </div>

                <div>
                  <span className="text-[#78857a] block text-[11px]">Billing Phone:</span>
                  <p className="font-semibold text-[#26352a] mt-0.5">
                    {company.billingContact?.phone ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Price Tier & Menu Visibility Card */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                  <Tag size={15} className="text-[#294d33]" />
                  Pricing & Menu Visibility
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* Price Tier Selection */}
                <div>
                  <span className="text-[#78857a] block text-[11px] mb-1">
                    Bound Custom Price Tier:
                  </span>
                  {isAdmin ? (
                    <select
                      value={company.priceTierId ?? ""}
                      onChange={async (e) => {
                        const val = e.target.value || null;
                        await assignPriceTierMutation.mutateAsync({
                          id: companyId,
                          priceTierId: val,
                        });
                      }}
                      className="h-9 w-full rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                    >
                      <option value="">Platform Default Tier</option>
                      {priceTiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          🏷️ {tier.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={company.priceTier ? "kitchen" : "default"}>
                      {company.priceTier?.name ?? "Platform Default"}
                    </Badge>
                  )}
                </div>

                {/* Hidden Categories */}
                <div className="pt-2 border-t border-[#eae5d8] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#26352a] flex items-center gap-1.5">
                      <EyeOff size={13} className="text-[#a34747]" />
                      Hidden Categories ({company.hiddenCategoryIds?.length ?? 0})
                    </span>
                  </div>

                  {company.hiddenCategoryIds && company.hiddenCategoryIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {company.hiddenCategoryIds.map((catId) => {
                        const cat = categories.find((c) => c.id === catId);
                        return (
                          <span
                            key={catId}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#fff5f5] px-2.5 py-1 text-[11px] font-semibold text-[#a34747] border border-[#ffdada]"
                          >
                            <span>{cat?.name ?? catId}</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => unhideCategoryMutation.mutateAsync({ id: companyId, categoryId: catId })}
                                className="hover:text-[#822c2c] text-xs"
                                title="Unhide category"
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#9fa89e] italic">All categories visible to employees.</p>
                  )}

                  {/* Hide Category Selector */}
                  {isAdmin && (
                    <div className="pt-1">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            hideCategoryMutation.mutateAsync({ id: companyId, categoryId: e.target.value });
                          }
                        }}
                        className="h-8 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-2.5 text-[11px] text-[#5c685e] focus:border-[#315d3c] focus:outline-none"
                      >
                        <option value="">+ Hide a menu category...</option>
                        {categories
                          .filter((c) => !company.hiddenCategoryIds?.includes(c.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Hidden Dishes */}
                <div className="pt-2 border-t border-[#eae5d8] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#26352a] flex items-center gap-1.5">
                      <EyeOff size={13} className="text-[#a34747]" />
                      Hidden Dishes ({company.hiddenDishIds?.length ?? 0})
                    </span>
                  </div>

                  {company.hiddenDishIds && company.hiddenDishIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {company.hiddenDishIds.map((dishId) => {
                        const dish = dishes.find((d) => d.id === dishId);
                        return (
                          <span
                            key={dishId}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#fff5f5] px-2.5 py-1 text-[11px] font-semibold text-[#a34747] border border-[#ffdada]"
                          >
                            <span>{dish?.name ?? dishId}</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => unhideDishMutation.mutateAsync({ id: companyId, dishId })}
                                className="hover:text-[#822c2c] text-xs"
                                title="Unhide dish"
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#9fa89e] italic">All catalogue dishes visible to employees.</p>
                  )}

                  {/* Hide Dish Selector */}
                  {isAdmin && (
                    <div className="pt-1">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            hideDishMutation.mutateAsync({ id: companyId, dishId: e.target.value });
                          }
                        }}
                        className="h-8 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-2.5 text-[11px] text-[#5c685e] focus:border-[#315d3c] focus:outline-none"
                      >
                        <option value="">+ Hide a master dish...</option>
                        {dishes
                          .filter((d) => !company.hiddenDishIds?.includes(d.id))
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.sku})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: Delivery Addresses ────────────────────────────────────── */}
        {activeTab === "addresses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#26352a]">Corporate Delivery Locations</h3>
                <p className="text-xs text-[#78857a]">
                  Addresses available for employee lunch drops. At least one address is required.
                </p>
              </div>
              {isAdmin && (
                <Button
                  icon={<Plus size={14} />}
                  onClick={() => {
                    setEditingAddress(null);
                    setAddressModalOpen(true);
                  }}
                >
                  Add Delivery Address
                </Button>
              )}
            </div>

            {addresses.length === 0 ? (
              <EmptyState
                icon={<MapPin size={24} />}
                title="No delivery addresses registered"
                description="Add corporate delivery locations such as HQ, annex offices, or floors."
                action={
                  isAdmin ? (
                    <Button
                      icon={<Plus size={14} />}
                      onClick={() => {
                        setEditingAddress(null);
                        setAddressModalOpen(true);
                      }}
                    >
                      Add Delivery Address
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`rounded-3xl border p-5 transition-all relative ${
                      addr.isDefault
                        ? "bg-white border-[#294d33] shadow-md ring-1 ring-[#294d33]/20"
                        : "bg-white border-[#d9d2c2] shadow-xs hover:border-[#b7b6aa]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className={addr.isDefault ? "text-[#294d33]" : "text-[#78857a]"} />
                        <h4 className="font-bold text-sm text-[#26352a]">{addr.label}</h4>
                      </div>
                      {addr.isDefault && (
                        <Badge variant="active">Default</Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-[#5c685e]">
                      <p className="font-medium text-[#26352a]">
                        {addr.street} {addr.unit ? `(${addr.unit})` : ""}
                      </p>
                      <p>
                        {addr.city}, <span className="font-mono font-bold uppercase">{addr.postcode}</span>
                      </p>
                      {addr.deliveryInstructions && (
                        <p className="text-[11px] text-[#78857a] italic mt-2 bg-[#fbfaf6] p-2 rounded-xl border border-[#eae5d8]">
                          "{addr.deliveryInstructions}"
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#eae5d8]">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Pencil size={12} />}
                          onClick={() => {
                            setEditingAddress(addr);
                            setAddressModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={12} className="text-[#a34747]" />}
                          onClick={() => setDeletingAddressId(addr.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: Calendar & Holidays ───────────────────────────────────── */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            {/* Working Days Card */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#26352a] flex items-center gap-2">
                  <Calendar size={16} className="text-[#294d33]" />
                  Operational Delivery Days
                </h3>
                <p className="text-xs text-[#78857a] mt-0.5">
                  Select the weekdays when this company accepts food deliveries. Unselected days automatically block order placement and dispatch.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {ALL_DAYS.map((day) => {
                  const active = (company.workingDays ?? []).includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleToggleWorkingDay(day.key)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs transition-all ${
                        active
                          ? "bg-[#294d33] text-white border-[#294d33] font-bold shadow-xs"
                          : "bg-[#fbfaf6] text-[#78857a] border-[#d9d2c2] hover:border-[#b7b6aa]"
                      }`}
                    >
                      <span className="text-sm">{day.short}</span>
                      <span className="text-[10px] opacity-80 mt-1">
                        {active ? "Active" : "Closed"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Holidays Table */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#26352a] flex items-center gap-2">
                    <Calendar size={16} className="text-[#a34747]" />
                    Company Holidays & Scheduled Closures
                  </h3>
                  <p className="text-xs text-[#78857a] mt-0.5">
                    Holidays prevent deliveries on specific dates regardless of the operational weekday.
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    icon={<Plus size={14} />}
                    onClick={() => {
                      setEditingHoliday(null);
                      setHolidayModalOpen(true);
                    }}
                  >
                    Add Holiday Closure
                  </Button>
                )}
              </div>

              {holidays.length === 0 ? (
                <EmptyState
                  icon={<Calendar size={24} />}
                  title="No holidays scheduled"
                  description="Register annual company closures such as Christmas, New Year, or private events."
                  action={
                    isAdmin ? (
                      <Button
                        icon={<Plus size={14} />}
                        onClick={() => {
                          setEditingHoliday(null);
                          setHolidayModalOpen(true);
                        }}
                      >
                        Add Holiday Closure
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Company Holidays">
                    <thead>
                      <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                          Holiday Name
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold text-[#5c685e] uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee9dc]">
                      {holidays.map((h) => (
                        <tr key={h.id} className="hover:bg-[#fbfaf6]">
                          <td className="px-4 py-3 font-mono font-bold text-xs text-[#26352a]">
                            📅 {h.date.split("T")[0]}
                          </td>
                          <td className="px-4 py-3 font-semibold text-xs text-[#26352a]">
                            {h.name}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#78857a]">
                            {h.description || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isAdmin && (
                              <div className="flex justify-end gap-1">
                                <button
                                  aria-label={`Edit ${h.name}`}
                                  onClick={() => {
                                    setEditingHoliday(h);
                                    setHolidayModalOpen(true);
                                  }}
                                  className="p-1.5 text-[#5c685e] hover:text-[#26352a] rounded-lg hover:bg-[#f5f1e6]"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  aria-label={`Delete ${h.name}`}
                                  onClick={() => setDeletingHolidayId(h.id)}
                                  className="p-1.5 text-[#a34747] hover:text-[#822c2c] rounded-lg hover:bg-[#fff5f5]"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: Corporate Domains ─────────────────────────────────────── */}
        {activeTab === "domains" && (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#26352a] flex items-center gap-2">
                <Globe size={16} className="text-[#294d33]" />
                Corporate Email Domains
              </h3>
              <p className="text-xs text-[#78857a] mt-0.5">
                Employees registering or checking out with an email on these verified domains are automatically linked to {company.name}.
              </p>
            </div>

            {/* Add Domain Input */}
            {isAdmin && (
              <div className="space-y-2 max-w-md">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. acme-corp.com"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value);
                      if (domainError) setDomainError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDomain();
                      }
                    }}
                    className="flex-1 h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                  />
                  <Button
                    type="button"
                    icon={<Plus size={14} />}
                    onClick={handleAddDomain}
                    loading={addDomainMutation.isPending}
                  >
                    Add Domain
                  </Button>
                </div>
                {domainError && (
                  <p className="text-xs text-[#a34747] font-medium">{domainError}</p>
                )}
              </div>
            )}

            {/* Domains List */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#4c594f] block uppercase tracking-wider">
                Active Verified Domains ({company.emailDomains?.length ?? 0})
              </label>
              {company.emailDomains && company.emailDomains.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {company.emailDomains.map((d) => {
                    const domName = typeof d === "string" ? d : d.domain;
                    const domId = typeof d === "string" ? d : d.id;
                    return (
                      <div
                        key={domId}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#fbfaf6] border border-[#d9d2c2] shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="text-[#294d33]" />
                          <span className="font-mono text-xs font-semibold text-[#26352a]">
                            @{domName}
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(domId)}
                            className="text-[#a34747] hover:text-[#822c2c] p-1 rounded-lg hover:bg-[#fff5f5]"
                            title="Remove domain"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#9fa89e] italic">No verified email domains registered.</p>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: Employees Roster ──────────────────────────────────────── */}
        {activeTab === "employees" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#26352a] flex items-center gap-2">
                  <Users size={16} className="text-[#294d33]" />
                  Corporate Employee Roster
                </h3>
                <p className="text-xs text-[#78857a]">
                  Manage employee accounts, dietary preferences, and self-service ordering permissions.
                </p>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    icon={<FileSpreadsheet size={14} />}
                    onClick={() => setCsvImportOpen(true)}
                  >
                    Bulk CSV Import
                  </Button>
                  <Button
                    icon={<UserPlus size={14} />}
                    onClick={() => {
                      setEditingEmployee(null);
                      setEmployeeModalOpen(true);
                    }}
                  >
                    Add Employee
                  </Button>
                </div>
              )}
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
                />
                <input
                  type="text"
                  placeholder="Search employees by name or email..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setEmployeePage(1);
                  }}
                  className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
                />
              </div>

              <select
                value={employeeStatusFilter}
                onChange={(e) => {
                  setEmployeeStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                  setEmployeePage(1);
                }}
                className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Employees</option>
                <option value="INACTIVE">Inactive Employees</option>
              </select>
            </div>

            {/* Employees Table */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(38,53,42,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Employees Table">
                  <thead>
                    <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                        Employee
                      </th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                        Dietary & Allergens
                      </th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                        Ordering Permissions
                      </th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee9dc]">
                    {loadingEmployees ? (
                      <TableSkeleton rows={5} cols={5} />
                    ) : !employeesData || employeesData.data.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            icon={<Users size={24} />}
                            title="No employees registered"
                            description="Enrol employees individually or bulk-import via CSV file."
                            action={
                              isAdmin ? (
                                <Button
                                  icon={<UserPlus size={14} />}
                                  onClick={() => {
                                    setEditingEmployee(null);
                                    setEmployeeModalOpen(true);
                                  }}
                                >
                                  Add Employee
                                </Button>
                              ) : undefined
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      employeesData.data.map((emp) => (
                        <tr key={emp.id} className="hover:bg-[#f6f2e8] transition-colors">
                          {/* Name & Email */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-[#d9d2c2] text-[#294d33] font-bold text-xs shadow-inner">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-xs text-[#26352a] flex items-center gap-1.5">
                                  {emp.name}
                                  {emp.isOwnerOfCompany && (
                                    <span className="rounded bg-[#d8bd83]/20 text-[#8c6b24] px-1.5 py-0.2 text-[9px] font-bold uppercase">
                                      Owner
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-[#78857a] font-mono">{emp.email ?? "No email"}</p>
                              </div>
                            </div>
                          </td>

                          {/* Dietary & Allergens */}
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {emp.dietaryTags?.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="rounded bg-[#294d33]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#294d33]"
                                >
                                  🌱 {tag.name}
                                </span>
                              ))}
                              {emp.allergens?.map((a) => (
                                <span
                                  key={a.id}
                                  className="rounded bg-[#a34747]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#a34747]"
                                >
                                  ⚠️ {a.name}
                                </span>
                              ))}
                              {(!emp.dietaryTags || emp.dietaryTags.length === 0) &&
                                (!emp.allergens || emp.allergens.length === 0) && (
                                  <span className="text-xs text-[#9fa89e]">—</span>
                                )}
                            </div>
                          </td>

                          {/* Ordering Permissions */}
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {emp.canChooseDeliveryAddress && (
                                <span className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-[#26352a] border border-[#d9d2c2]">
                                  📍 Address
                                </span>
                              )}
                              {emp.canChangeDeliveryTime && (
                                <span className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-[#26352a] border border-[#d9d2c2]">
                                  ⏰ Time
                                </span>
                              )}
                              {emp.canChangePackaging && (
                                <span className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-[#26352a] border border-[#d9d2c2]">
                                  📦 Packaging
                                </span>
                              )}
                              {!emp.canChooseDeliveryAddress &&
                                !emp.canChangeDeliveryTime &&
                                !emp.canChangePackaging && (
                                  <span className="text-xs text-[#9fa89e]">Standard</span>
                                )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <Badge variant={emp.isActive ? "active" : "inactive"}>
                              {emp.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            {isAdmin && (
                              <div className="flex justify-end items-center gap-1.5">
                                <button
                                  aria-label={`Edit ${emp.name}`}
                                  onClick={() => {
                                    setEditingEmployee(emp);
                                    setEmployeeModalOpen(true);
                                  }}
                                  className="p-1.5 text-[#5c685e] hover:text-[#26352a] rounded-lg hover:bg-white transition-colors"
                                  title="Edit Employee"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  aria-label={`Transfer ${emp.name}`}
                                  onClick={() => setMovingEmployee(emp)}
                                  className="p-1.5 text-[#294d33] hover:text-[#1e3c26] rounded-lg hover:bg-white transition-colors"
                                  title="Transfer to Another Company"
                                >
                                  <Building2 size={13} />
                                </button>
                                <button
                                  aria-label={`Deactivate ${emp.name}`}
                                  onClick={() => setDeactivatingEmployee(emp)}
                                  className="p-1.5 text-[#a34747] hover:text-[#822c2c] rounded-lg hover:bg-white transition-colors"
                                  title="Deactivate Employee"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Employees Pagination */}
              {employeesData && employeesData.meta.totalPages > 1 && (
                <Pagination
                  page={employeesData.meta.page}
                  totalPages={employeesData.meta.totalPages}
                  hasNextPage={employeesData.meta.hasNextPage}
                  hasPreviousPage={employeesData.meta.hasPreviousPage}
                  total={employeesData.meta.total}
                  limit={EMPLOYEE_LIMIT}
                  onPageChange={setEmployeePage}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── All Modals ────────────────────────────────────────────────────── */}

      {/* Edit Company Modal */}
      <CompanyFormModal
        open={editCompanyOpen}
        onClose={() => setEditCompanyOpen(false)}
        company={company}
        onSubmit={async (data, meta) => {
          await updateCompanyMutation.mutateAsync({
            id: companyId,
            data: data as UpdateCompanyRequest,
          });
          if (meta?.billingContact) {
            await updateBillingMutation.mutateAsync({
              id: companyId,
              data: {
                billingContactName: meta.billingContact.name || undefined,
                billingContactEmail: meta.billingContact.email || undefined,
                billingContactPhone: meta.billingContact.phone || undefined,
              },
            });
          }
          if (meta?.ownerId) {
            await setOwnerMutation.mutateAsync({
              id: companyId,
              ownerId: meta.ownerId,
            });
          }
          if (meta?.workingDays) {
            await updateCalendarMutation.mutateAsync({
              id: companyId,
              workingDays: meta.workingDays,
            });
          }
          setEditCompanyOpen(false);
        }}
        loading={updateCompanyMutation.isPending}
      />

      {/* Delivery Address Modal */}
      <CompanyAddressModal
        open={addressModalOpen}
        onClose={() => {
          setAddressModalOpen(false);
          setEditingAddress(null);
        }}
        address={editingAddress}
        onSubmit={handleSaveAddress}
        loading={addAddressMutation.isPending || updateAddressMutation.isPending}
      />

      {/* Delete Address Confirm Dialog */}
      <ConfirmDialog
        open={deletingAddressId !== null}
        onClose={() => setDeletingAddressId(null)}
        onConfirm={handleDeleteAddress}
        title="Delete Delivery Address"
        description="Are you sure you want to remove this delivery location? Active companies must maintain at least one delivery address."
        confirmLabel="Delete Address"
        loading={deleteAddressMutation.isPending}
      />

      {/* Company Holiday Modal */}
      <CompanyHolidayModal
        open={holidayModalOpen}
        onClose={() => {
          setHolidayModalOpen(false);
          setEditingHoliday(null);
        }}
        holiday={editingHoliday}
        onSubmit={handleSaveHoliday}
        loading={addHolidayMutation.isPending || updateHolidayMutation.isPending}
      />

      {/* Delete Holiday Confirm Dialog */}
      <ConfirmDialog
        open={deletingHolidayId !== null}
        onClose={() => setDeletingHolidayId(null)}
        onConfirm={handleDeleteHoliday}
        title="Remove Delivery Holiday"
        description="Are you sure you want to delete this scheduled holiday? Catering deliveries will become available on this date again."
        confirmLabel="Remove Holiday"
        loading={deleteHolidayMutation.isPending}
      />

      {/* Delivery Availability Modal */}
      <DeliveryAvailabilityModal
        open={availabilityOpen}
        onClose={() => setAvailabilityOpen(false)}
        companyId={companyId}
        companyName={company.name}
      />

      {/* Bulk CSV Import Modal */}
      <CsvImportModal
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        companyId={companyId}
        companyName={company.name}
      />

      {/* Employee Form Modal */}
      <EmployeeFormModal
        open={employeeModalOpen}
        onClose={() => {
          setEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        defaultCompanyId={companyId}
        onSubmit={handleSaveEmployee}
        loading={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
      />

      {/* Move Employee Modal */}
      <EmployeeMoveModal
        open={movingEmployee !== null}
        onClose={() => setMovingEmployee(null)}
        employee={movingEmployee}
        onConfirm={handleMoveEmployee}
        loading={updateEmployeeMutation.isPending}
      />

      {/* Deactivate Employee Confirm Dialog */}
      <ConfirmDialog
        open={deactivatingEmployee !== null}
        onClose={() => setDeactivatingEmployee(null)}
        onConfirm={handleDeactivateEmployee}
        title="Deactivate Employee Account"
        description={`Are you sure you want to deactivate ${deactivatingEmployee?.name}? They will no longer be able to log in or place catering lunch orders.`}
        confirmLabel="Deactivate"
        loading={deactivateEmployeeMutation.isPending}
      />
    </ProtectedRoute>
  );
}
