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
import { CompanyFormModal } from "@/features/companies/CompanyFormModal";
import {
  useAddCompanyDomain,
  useCompanies,
  useCreateCompany,
  useDeactivateCompany,
  useSetCompanyOwner,
  useUpdateBillingContact,
  useUpdateCompany,
  useUpdateCompanyCalendar,
} from "@/features/companies/useCompanies";
import { usePriceTiers } from "@/features/pricing/usePricing";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  Company,
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
  Eye,
  Globe,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CompaniesPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [priceTierFilter, setPriceTierFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const queryParams = {
    page,
    limit: LIMIT,
    search: search.trim() || undefined,
    isActive: statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
    priceTierId: priceTierFilter !== "ALL" ? priceTierFilter : undefined,
  };

  const { data: companiesData, isLoading, isError, error } = useCompanies(queryParams);
  const { data: priceTiersData } = usePriceTiers({ limit: 100 });
  const priceTiers = priceTiersData?.data ?? [];

  // Mutations
  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const deactivateCompanyMutation = useDeactivateCompany();
  const updateBillingMutation = useUpdateBillingContact();
  const setOwnerMutation = useSetCompanyOwner();
  const updateCalendarMutation = useUpdateCompanyCalendar();
  const addDomainMutation = useAddCompanyDomain();

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyDetail | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [deactivatingCompany, setDeactivatingCompany] = useState<Company | null>(null);

  // Handlers
  const handleCreateCompany = async (data: CreateCompanyRequest | UpdateCompanyRequest) => {
    setFormError(null);
    try {
      const created = await createCompanyMutation.mutateAsync(data as CreateCompanyRequest);
      setCreateModalOpen(false);
      router.push(`/dashboard/companies/${created.id}`);
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to create company."));
    }
  };

  const handleEditCompany = async (
    data: CreateCompanyRequest | UpdateCompanyRequest,
    meta?: {
      domainsToAdd?: string[];
      billingContact?: { name: string; email: string; phone: string };
      ownerId?: string;
      workingDays?: DayOfWeek[];
    },
  ) => {
    if (!editingCompany) return;
    setFormError(null);
    try {
      await updateCompanyMutation.mutateAsync({
        id: editingCompany.id,
        data: data as UpdateCompanyRequest,
      });

      if (meta?.billingContact) {
        await updateBillingMutation.mutateAsync({
          id: editingCompany.id,
          data: {
            billingContactName: meta.billingContact.name || undefined,
            billingContactEmail: meta.billingContact.email || undefined,
            billingContactPhone: meta.billingContact.phone || undefined,
          },
        });
      }

      if (meta?.ownerId) {
        await setOwnerMutation.mutateAsync({
          id: editingCompany.id,
          ownerId: meta.ownerId,
        });
      }

      if (meta?.workingDays) {
        await updateCalendarMutation.mutateAsync({
          id: editingCompany.id,
          workingDays: meta.workingDays,
        });
      }

      setEditingCompany(null);
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to update company."));
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingCompany) return;
    try {
      await deactivateCompanyMutation.mutateAsync(deactivatingCompany.id);
      setDeactivatingCompany(null);
    } catch {
      // error handled
    }
  };

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title="Companies" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {/* Page Header */}
        <PageHeader
          title="Customer Companies"
          description="Manage corporate billing entities, email domains, delivery calendars, customized price tiers, and employee rosters."
          actions={
            isAdmin && (
              <Button
                icon={<Plus size={16} />}
                onClick={() => {
                  setFormError(null);
                  setCreateModalOpen(true);
                }}
              >
                Register Company
              </Button>
            )
          }
        />

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78857a] mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Companies</span>
              <Building2 size={16} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#26352a]">
              {companiesData?.meta.total ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78857a] mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Corporate Clients</span>
              <Building2 size={16} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#294d33]">
              {companiesData?.data.filter((c) => c.isActive).length ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78857a] mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Employees</span>
              <Users size={16} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#26352a]">
              {companiesData?.data.reduce((acc, c) => acc + (c.employeeCount ?? 0), 0) ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78857a] mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Price Tiers Configured</span>
              <Tag size={16} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#26352a]">
              {priceTiers.length}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
            />
            <input
              type="text"
              placeholder="Search companies by name or email domain..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            <select
              value={priceTierFilter}
              onChange={(e) => {
                setPriceTierFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] transition-all focus:border-[#315d3c] focus:outline-none"
            >
              <option value="ALL">All Price Tiers</option>
              {priceTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  🏷️ {tier.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                setPage(1);
              }}
              className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] transition-all focus:border-[#315d3c] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Companies Table Card */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(38,53,42,0.04)] overflow-hidden">
          {isError && (
            <div className="px-6 py-4 text-sm text-[#a34747] bg-[#fff5f5] border-b border-[#ffdada]">
              {getErrorMessage(error, "Failed to load companies.")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Customer Companies">
              <thead>
                <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Company & Domains
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Owner & Billing
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Price Tier
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Delivery Defaults
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Employees
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9dc]">
                {isLoading ? (
                  <TableSkeleton rows={5} cols={7} />
                ) : !companiesData || companiesData.data.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<Building2 size={24} />}
                        title="No companies found"
                        description={
                          search || statusFilter !== "ALL" || priceTierFilter !== "ALL"
                            ? "Try adjusting your search or filters."
                            : "Register customer companies to enable corporate catering, domains, and pricing."
                        }
                        action={
                          isAdmin ? (
                            <Button
                              icon={<Plus size={15} />}
                              onClick={() => {
                                setFormError(null);
                                setCreateModalOpen(true);
                              }}
                            >
                              Register Company
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  companiesData.data.map((company) => {
                    const domainsList = (company.emailDomains ?? []).map((d) =>
                      typeof d === "string" ? d : d.domain,
                    );
                    return (
                      <tr
                        key={company.id}
                        onClick={() => router.push(`/dashboard/companies/${company.id}`)}
                        className="hover:bg-[#f6f2e8] transition-colors cursor-pointer group"
                      >
                        {/* Company Name & Domains */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#d9d2c2] text-[#294d33] shadow-xs group-hover:bg-[#294d33] group-hover:text-white transition-colors">
                              <Building2 size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#26352a] group-hover:text-[#294d33] transition-colors">
                                {company.name}
                              </p>
                              {domainsList.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {domainsList.slice(0, 3).map((dom) => (
                                    <span
                                      key={dom}
                                      className="rounded bg-white px-1.5 py-0.5 text-[10px] font-mono text-[#5c685e] border border-[#d9d2c2]"
                                    >
                                      @{dom}
                                    </span>
                                  ))}
                                  {domainsList.length > 3 && (
                                    <span className="text-[10px] text-[#78857a]">
                                      +{domainsList.length - 3} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#9fa89e] italic">No domains</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Owner & Billing */}
                        <td className="px-6 py-4">
                          {company.owner ? (
                            <p className="text-xs font-semibold text-[#26352a] flex items-center gap-1">
                              <UserCheck size={12} className="text-[#294d33]" />
                              {company.owner.name}
                            </p>
                          ) : company.billingContact?.name ? (
                            <p className="text-xs text-[#5c685e]">
                              {company.billingContact.name}
                            </p>
                          ) : (
                            <span className="text-xs text-[#9fa89e]">—</span>
                          )}
                          {company.billingContact?.email && (
                            <p className="text-[11px] text-[#78857a] font-mono">
                              {company.billingContact.email}
                            </p>
                          )}
                        </td>

                        {/* Price Tier */}
                        <td className="px-6 py-4">
                          {company.priceTier ? (
                            <Badge variant="kitchen">
                              🏷️ {company.priceTier.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[#78857a] bg-[#f5f1e6] px-2 py-0.5 rounded border border-[#eae5d8]">
                              Platform Default
                            </span>
                          )}
                        </td>

                        {/* Delivery Defaults */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-xs text-[#5c685e]">
                            {company.deliveryDefaults?.defaultDeliveryTime ? (
                              <p className="flex items-center gap-1 font-mono">
                                <Clock size={11} className="text-[#294d33]" />
                                {company.deliveryDefaults.defaultDeliveryTime}
                              </p>
                            ) : (
                              <p className="text-[#9fa89e]">12:00 default</p>
                            )}
                            <p className="text-[10px] text-[#78857a]">
                              {company.deliveryDefaults?.leaveKitchenMinutes ?? 60}m lead time
                            </p>
                          </div>
                        </td>

                        {/* Employee Count */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-xs text-[#26352a]">
                            <Users size={13} className="text-[#294d33]" />
                            {company.employeeCount ?? 0}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <Badge variant={company.isActive ? "active" : "inactive"}>
                            {company.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-6 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end items-center gap-1.5">
                            <Link
                              href={`/dashboard/companies/${company.id}`}
                              className="inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg border border-transparent text-[#294d33] hover:border-[#d9d2c2] hover:bg-white text-xs font-semibold transition-all shadow-xs"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </Link>
                            {isAdmin && (
                              <button
                                aria-label={`Deactivate ${company.name}`}
                                onClick={() => setDeactivatingCompany(company)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#a34747] hover:border-[#ffdada] hover:bg-[#fff5f5] transition-all shadow-xs"
                                title="Deactivate Company"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {companiesData && companiesData.meta.totalPages > 1 && (
            <Pagination
              page={companiesData.meta.page}
              totalPages={companiesData.meta.totalPages}
              hasNextPage={companiesData.meta.hasNextPage}
              hasPreviousPage={companiesData.meta.hasPreviousPage}
              total={companiesData.meta.total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      </main>

      {/* Create Company Modal */}
      {createModalOpen && (
        <CompanyFormModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateCompany}
          loading={createCompanyMutation.isPending}
          serverError={formError}
        />
      )}

      {/* Deactivate Confirm Dialog */}
      <ConfirmDialog
        open={deactivatingCompany !== null}
        onClose={() => setDeactivatingCompany(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Company"
        description={`Are you sure you want to deactivate ${deactivatingCompany?.name}? This will prevent employees from ordering lunch and will suspend corporate pricing.`}
        confirmLabel="Deactivate"
        loading={deactivateCompanyMutation.isPending}
      />
    </ProtectedRoute>
  );
}
