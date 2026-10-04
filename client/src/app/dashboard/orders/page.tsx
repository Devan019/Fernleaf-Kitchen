"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useCompanies } from "@/features/companies/useCompanies";
import { ProcessCutoffModal } from "@/features/orders/ProcessCutoffModal";
import { useCancelOrder, useOrders } from "@/features/orders/useOrders";
import { getErrorMessage } from "@/lib/utils/errors";
import type { OrderStatus, OrderSummary } from "@/types";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  Filter,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_BADGE_MAP: Record<
  OrderStatus,
  { variant: "active" | "inactive" | "kitchen" | "dispatch" | "default"; label: string }
> = {
  DRAFT: { variant: "default", label: "Draft" },
  PLACED: { variant: "kitchen", label: "Placed" },
  CONFIRMED: { variant: "active", label: "Confirmed" },
  DELIVERED: { variant: "dispatch", label: "Delivered" },
  CANCELLED: { variant: "inactive", label: "Cancelled" },
  REJECTED: { variant: "inactive", label: "Rejected" },
};

export default function OrdersPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  // Filter States (Admin, Kitchen & Dispatch)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [invoicedFilter, setInvoicedFilter] = useState<"ALL" | "INVOICED" | "UNINVOICED">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const queryParams = {
    page,
    limit: LIMIT,
    search: search.trim() || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    companyId: companyFilter !== "ALL" ? companyFilter : undefined,
    isInvoiced: invoicedFilter === "ALL" ? undefined : invoicedFilter === "INVOICED",
    deliveryDateFrom: startDate || undefined,
    deliveryDateTo: endDate || undefined,
  };

  const { data: ordersData, isLoading, isError, error } = useOrders(queryParams);
  const { data: companiesData } = useCompanies({ limit: 100 });
  const companies = companiesData?.data ?? [];

  // Mutations
  const cancelOrderMutation = useCancelOrder();

  // Modals
  const [cutoffModalOpen, setCutoffModalOpen] = useState(false);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setCompanyFilter("ALL");
    setInvoicedFilter("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== "ALL" ||
    companyFilter !== "ALL" ||
    invoicedFilter !== "ALL" ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <ProtectedRoute requiredRole={["ADMIN", "KITCHEN", "DISPATCH"]}>
      <Header title="Orders" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Orders"
          description="Manage customer orders and their lifecycle across draft, placed, cut-off confirmed, and delivered states."
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              {isAdmin && (
                <>
                  <Button
                    variant="secondary"
                    icon={<Zap size={14} className="text-[#d8bd83]" />}
                    onClick={() => setCutoffModalOpen(true)}
                  >
                    Process Cut-Off
                  </Button>
                  <Button
                    icon={<Plus size={16} />}
                    onClick={() => router.push("/dashboard/orders/new")}
                  >
                    Create New Order
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78857a] mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
              <ShoppingBag size={16} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#26352a]">
              {ordersData?.meta.total ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78857a] mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Placed & Open</span>
              <Clock size={16} className="text-[#e27d34]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#e27d34]">
              {ordersData?.data.filter((o) => o.status === "PLACED").length ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78857a] mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Confirmed (Billable)</span>
              <CheckCircle2 size={16} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#294d33]">
              {ordersData?.data.filter((o) => o.status === "CONFIRMED").length ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78857a] mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Invoices</span>
              <Receipt size={16} className="text-[#78857a]" />
            </div>
            <p className="text-2xl font-bold font-serif text-[#26352a]">
              {ordersData?.data.filter((o) => !o.isInvoiced && (o.status === "CONFIRMED" || o.status === "DELIVERED")).length ?? "—"}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
              />
              <input
                type="text"
                placeholder="Search by order number (e.g. ORD-20261014-0001)..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
              />
            </div>

            {/* Select Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as OrderStatus | "ALL");
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PLACED">Placed</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>

              {/* Company */}
              <select
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              >
                <option value="ALL">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name}
                  </option>
                ))}
              </select>

              {/* Invoiced */}
              <select
                value={invoicedFilter}
                onChange={(e) => {
                  setInvoicedFilter(e.target.value as any);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              >
                <option value="ALL">All Invoicing</option>
                <option value="INVOICED">Invoiced</option>
                <option value="UNINVOICED">Not Invoiced</option>
              </select>

              {/* Date Pickers */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-2.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none font-mono"
                  placeholder="From"
                  title="From Delivery Date"
                />
                <span className="text-xs text-[#78857a]">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-2.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none font-mono"
                  placeholder="To"
                  title="To Delivery Date"
                />
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw size={13} />}
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Orders Table Card */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(38,53,42,0.04)] overflow-hidden">
          {isError && (
            <div className="px-6 py-4 text-sm text-[#a34747] bg-[#fff5f5] border-b border-[#ffdada]">
              {getErrorMessage(error, "Failed to load catering orders.")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Catering Orders">
              <thead>
                <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                    Order Number
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                    Customer / Company
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                    Delivery Slot
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                    Invoiced
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9dc]">
                {isLoading ? (
                  <TableSkeleton rows={5} cols={8} />
                ) : !ordersData || ordersData.data.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon={<ShoppingBag size={24} />}
                        title="No orders found"
                        description={
                          hasActiveFilters
                            ? "Try adjusting your search filters or date range."
                            : "Create customer orders for corporate lunch deliveries."
                        }
                        action={
                          isAdmin ? (
                            <Button
                              icon={<Plus size={15} />}
                              onClick={() => router.push("/dashboard/orders/new")}
                            >
                              Create New Order
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  ordersData.data.map((order) => {
                    const badge = STATUS_BADGE_MAP[order.status] ?? {
                      variant: "default",
                      label: order.status,
                    };
                    return (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                        className="hover:bg-[#f6f2e8] transition-colors cursor-pointer group"
                      >
                        {/* Order Number */}
                        <td className="px-6 py-4 font-mono font-bold text-xs text-[#26352a] group-hover:text-[#294d33]">
                          {order.orderNumber}
                        </td>

                        {/* Customer / Company */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-xs text-[#26352a]">
                            {order.employeeName}
                          </p>
                          <p className="text-[11px] text-[#78857a] flex items-center gap-1">
                            🏢 {order.companyName}
                          </p>
                        </td>

                        {/* Delivery Slot */}
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs font-semibold text-[#26352a]">
                            📅 {order.deliveryDate}
                          </p>
                          <p className="text-[11px] text-[#78857a] font-mono">
                            ⏰ {order.deliveryTime ?? "12:00"}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4 font-mono font-bold text-xs text-[#26352a]">
                          ${Number(order.total).toFixed(2)}
                        </td>

                        {/* Invoiced */}
                        <td className="px-6 py-4">
                          {order.isInvoiced ? (
                            <span className="rounded bg-[#294d33]/10 text-[#294d33] px-2 py-0.5 text-[10px] font-bold">
                              Invoiced
                            </span>
                          ) : (
                            <span className="text-xs text-[#9fa89e]">—</span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-6 py-4 text-[11px] text-[#78857a] font-mono">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                        </td>

                        {/* Actions */}
                        <td
                          className="px-6 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg border border-transparent text-[#294d33] hover:border-[#d9d2c2] hover:bg-white text-xs font-semibold transition-all shadow-xs"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {ordersData && ordersData.meta.totalPages > 1 && (
            <Pagination
              page={ordersData.meta.page}
              totalPages={ordersData.meta.totalPages}
              hasNextPage={ordersData.meta.hasNextPage}
              hasPreviousPage={ordersData.meta.hasPreviousPage}
              total={ordersData.meta.total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      </main>

      {/* Manual Cut-Off Processing Modal */}
      <ProcessCutoffModal
        open={cutoffModalOpen}
        onClose={() => setCutoffModalOpen(false)}
      />
    </ProtectedRoute>
  );
}
