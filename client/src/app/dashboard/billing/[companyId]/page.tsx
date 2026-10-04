"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { CreateInvoiceModal } from "@/features/billing/CreateInvoiceModal";
import { InvoiceDetailDrawer } from "@/features/billing/InvoiceDetailDrawer";
import { InvoiceStatusBadge } from "@/features/billing/InvoiceStatusBadge";
import { MarkPaidConfirmModal } from "@/features/billing/MarkPaidConfirmModal";
import {
  useCompanyBillingSummary,
  useInvoices,
  useUninvoicedOrders,
} from "@/features/billing/useBilling";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  InvoiceDetail,
  InvoiceSummary,
  UninvoicedOrder,
} from "@/types";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Mail,
  Phone,
  PlusCircle,
  Receipt,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

const LIMIT = 15;

export default function CompanyBillingDetailPage() {
  const params = useParams();
  const companyId = String(params?.companyId || "");

  const [activeTab, setActiveTab] = useState<"UNINVOICED" | "INVOICES">("UNINVOICED");

  // Selection for Invoice Creation
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Search & Pagination for Uninvoiced Orders
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersSearch, setOrdersSearch] = useState("");

  // Invoices Tab State
  const [invoicesPage, setInvoicesPage] = useState(1);

  // Modals & Drawers
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [inspectingInvoiceId, setInspectingInvoiceId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceSummary | null>(null);

  // Queries
  const {
    data: summaryData,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useCompanyBillingSummary(companyId);

  const {
    data: uninvoicedData,
    isLoading: loadingOrders,
    isError: isOrdersError,
    error: ordersError,
    refetch: refetchOrders,
    isFetching: isFetchingOrders,
  } = useUninvoicedOrders(companyId, {
    page: ordersPage,
    limit: LIMIT,
    search: ordersSearch || undefined,
  });

  const {
    data: invoicesData,
    isLoading: loadingInvoices,
    refetch: refetchInvoices,
  } = useInvoices({
    companyId,
    page: invoicesPage,
    limit: LIMIT,
  });

  const uninvoicedOrders = uninvoicedData?.orders ?? [];
  const invoices = invoicesData?.data ?? [];
  const companyName = summaryData?.company?.name || uninvoicedData?.company?.name || "Company";

  // Selected Orders Objects
  const selectedOrders = useMemo(() => {
    return uninvoicedOrders.filter((o) => selectedOrderIds.has(o.id));
  }, [uninvoicedOrders, selectedOrderIds]);

  const selectedTotal = useMemo(() => {
    return selectedOrders
      .reduce((sum, o) => sum + parseFloat(o.total || "0"), 0)
      .toFixed(2);
  }, [selectedOrders]);

  // Handle Toggle Selection
  const toggleOrderSelection = (orderId: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      next.add(orderId);
    }
    setSelectedOrderIds(next);
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.size === uninvoicedOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(uninvoicedOrders.map((o) => o.id)));
    }
  };

  const handleInvoiceCreated = (newInvoice: InvoiceDetail) => {
    setSelectedOrderIds(new Set());
    refetchOrders();
    refetchSummary();
    refetchInvoices();
    setInspectingInvoiceId(newInvoice.id);
  };

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title={`Billing — ${companyName}`} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Back navigation & Page Header */}
        <div className="flex items-center gap-2 text-xs text-[#78857a]">
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1 hover:text-[#294d33] font-bold"
          >
            <ArrowLeft size={14} />
            <span>Back to Company Billing</span>
          </Link>
          <span>/</span>
          <span className="font-mono text-[#26352a]">{companyName}</span>
        </div>

        <PageHeader
          title={companyName}
          description="Review uninvoiced confirmed catering orders, generate internal invoices, and track settlements."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                icon={<RefreshCw size={14} className={isFetchingOrders ? "animate-spin" : ""} />}
                onClick={() => {
                  refetchSummary();
                  refetchOrders();
                  refetchInvoices();
                }}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {/* ── Company Summary & Contact Info Card ─────────────────────────── */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#eee9dc] pb-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#294d33] text-white font-serif font-black text-lg shadow-2xs">
                {companyName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-serif text-xl font-black text-[#26352a] tracking-tight">
                  {companyName}
                </h3>
                <p className="font-mono text-xs text-[#78857a]">Company ID: {companyId}</p>
              </div>
            </div>

            {/* Metrics Chips */}
            {summaryData && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-[#eae5d8] bg-[#fbfaf6] px-3.5 py-2 text-xs">
                  <span className="text-[#78857a] block text-[10px] font-bold uppercase">
                    Uninvoiced Orders
                  </span>
                  <span className="font-serif text-base font-black text-[#e27d34]">
                    {summaryData.uninvoicedOrderCount} (${parseFloat(summaryData.uninvoicedAmount || "0").toFixed(2)})
                  </span>
                </div>

                <div className="rounded-2xl border border-[#eae5d8] bg-[#fbfaf6] px-3.5 py-2 text-xs">
                  <span className="text-[#78857a] block text-[10px] font-bold uppercase">
                    Open Invoices
                  </span>
                  <span className="font-serif text-base font-black text-[#b85614]">
                    {summaryData.openInvoiceCount} (${parseFloat(summaryData.openInvoiceAmount || "0").toFixed(2)})
                  </span>
                </div>

                <div className="rounded-2xl border border-[#294d33]/20 bg-[#294d33]/5 px-3.5 py-2 text-xs">
                  <span className="text-[#294d33] block text-[10px] font-bold uppercase">
                    Settled Amount
                  </span>
                  <span className="font-serif text-base font-black text-[#294d33]">
                    ${parseFloat(summaryData.paidAmount || "0").toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-[#eee9dc] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("UNINVOICED")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "UNINVOICED"
                ? "bg-[#294d33] text-white shadow-xs"
                : "bg-white text-[#5c685e] hover:bg-[#fbfaf6] border border-[#d9d2c2]"
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>Uninvoiced Confirmed Orders ({uninvoicedOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("INVOICES")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "INVOICES"
                ? "bg-[#294d33] text-white shadow-xs"
                : "bg-white text-[#5c685e] hover:bg-[#fbfaf6] border border-[#d9d2c2]"
            }`}
          >
            <Receipt size={14} />
            <span>Company Invoices ({invoices.length})</span>
          </button>
        </div>

        {/* ── TAB 1: Uninvoiced Confirmed Orders ───────────────────────────── */}
        {activeTab === "UNINVOICED" && (
          <div className="space-y-4">
            {/* Action & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={uninvoicedOrders.length === 0}
                >
                  {selectedOrderIds.size === uninvoicedOrders.length && uninvoicedOrders.length > 0
                    ? "Deselect All"
                    : "Select All On Page"}
                </Button>
                <span className="text-xs text-[#78857a]">
                  {selectedOrderIds.size} of {uninvoicedOrders.length} selected
                </span>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
                />
                <input
                  type="text"
                  placeholder="Search order number..."
                  value={ordersSearch}
                  onChange={(e) => {
                    setOrdersSearch(e.target.value);
                    setOrdersPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-[#d9d2c2] bg-white pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
                />
              </div>
            </div>

            {/* Sticky/Floating Invoice Creation Prompt */}
            {selectedOrders.length > 0 && (
              <div className="sticky top-2 z-10 rounded-2xl border border-[#294d33] bg-[#294d33] p-4 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white font-bold text-sm">
                    {selectedOrders.length}
                  </div>
                  <div>
                    <p className="font-serif font-black text-base">
                      {selectedOrders.length} {selectedOrders.length === 1 ? "order" : "orders"} selected for invoicing
                    </p>
                    <p className="text-xs text-white/80">
                      Eligible confirmed orders ready to be grouped into an immutable invoice
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-[10px] text-white/70 uppercase block">Invoice Total</span>
                    <span className="font-serif text-xl font-black text-white">${selectedTotal}</span>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => setShowCreateInvoiceModal(true)}
                    className="bg-white text-[#294d33] hover:bg-white/90 border-0 font-bold shadow-md cursor-pointer"
                    icon={<PlusCircle size={15} />}
                  >
                    Create Invoice
                  </Button>
                </div>
              </div>
            )}

            {/* Uninvoiced Orders Table */}
            {loadingOrders ? (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-8 animate-pulse space-y-4">
                <div className="h-6 bg-[#f3efe6] rounded w-1/4" />
                <div className="h-40 bg-[#fbfaf6] rounded-2xl" />
              </div>
            ) : isOrdersError ? (
              <div className="rounded-3xl border border-[#ffdada] bg-[#fff5f5] p-8 text-center space-y-3">
                <AlertCircle size={32} className="mx-auto text-[#a34747]" />
                <h3 className="font-bold text-base text-[#a34747]">
                  Failed to Load Uninvoiced Orders
                </h3>
                <p className="text-xs text-[#5c685e] max-w-md mx-auto">
                  {getErrorMessage(ordersError, "Unable to load uninvoiced confirmed orders.")}
                </p>
                <Button variant="secondary" onClick={() => refetchOrders()}>
                  Try Again
                </Button>
              </div>
            ) : uninvoicedOrders.length === 0 ? (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
                <EmptyState
                  icon={<CheckCircle2 size={32} />}
                  title="No Uninvoiced Orders"
                  description="All confirmed orders for this company have already been invoiced."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-[#d9d2c2] bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#eee9dc] bg-[#fbfaf6] text-[#78857a] font-bold text-[11px] uppercase tracking-wider">
                          <th className="p-4 pl-6 w-10">
                            <input
                              type="checkbox"
                              checked={
                                selectedOrderIds.size === uninvoicedOrders.length &&
                                uninvoicedOrders.length > 0
                              }
                              onChange={handleSelectAll}
                              className="h-4 w-4 rounded border-[#d9d2c2] text-[#294d33] focus:ring-[#294d33] cursor-pointer"
                            />
                          </th>
                          <th className="p-4">Order Number</th>
                          <th className="p-4">Employee</th>
                          <th className="p-4">Delivery Date</th>
                          <th className="p-4">Delivery Time</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Order Total</th>
                          <th className="p-4 pr-6 text-right">Invoice Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eee9dc]">
                        {uninvoicedOrders.map((order) => {
                          const isSelected = selectedOrderIds.has(order.id);
                          return (
                            <tr
                              key={order.id}
                              onClick={() => toggleOrderSelection(order.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-[#294d33]/5" : "hover:bg-[#fbfaf6]"
                              }`}
                            >
                              <td className="p-4 pl-6" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleOrderSelection(order.id)}
                                  className="h-4 w-4 rounded border-[#d9d2c2] text-[#294d33] focus:ring-[#294d33] cursor-pointer"
                                />
                              </td>
                              <td className="p-4 font-mono font-bold text-[#26352a]">
                                {order.orderNumber}
                              </td>
                              <td className="p-4 font-semibold text-[#26352a]">
                                {order.employeeName}
                              </td>
                              <td className="p-4 text-[#5c685e]">{order.deliveryDate}</td>
                              <td className="p-4 text-[#5c685e] font-mono">{order.deliveryTime}</td>
                              <td className="p-4">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#294d33]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#294d33] border border-[#294d33]/20">
                                  CONFIRMED
                                </span>
                              </td>
                              <td className="p-4 text-right font-serif text-sm font-black text-[#26352a]">
                                ${parseFloat(order.total || "0").toFixed(2)}
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#f3efe6] px-2.5 py-0.5 text-[10px] font-bold text-[#78857a] border border-[#d9d2c2]">
                                  Not Invoiced
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {uninvoicedData?.meta && (
                  <Pagination
                    page={ordersPage}
                    totalPages={uninvoicedData.meta.totalPages}
                    total={uninvoicedData.meta.total}
                    limit={uninvoicedData.meta.limit}
                    hasNextPage={uninvoicedData.meta.hasNextPage}
                    hasPreviousPage={uninvoicedData.meta.hasPreviousPage}
                    onPageChange={(p) => setOrdersPage(p)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Company Invoices ──────────────────────────────────────── */}
        {activeTab === "INVOICES" && (
          <div className="space-y-4">
            {loadingInvoices ? (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-8 animate-pulse space-y-4">
                <div className="h-6 bg-[#f3efe6] rounded w-1/4" />
                <div className="h-32 bg-[#fbfaf6] rounded-2xl" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
                <EmptyState
                  icon={<Receipt size={32} />}
                  title="No Invoices Issued Yet"
                  description="Select confirmed orders from the Uninvoiced tab to generate this company's first internal invoice."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-[#d9d2c2] bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#eee9dc] bg-[#fbfaf6] text-[#78857a] font-bold text-[11px] uppercase tracking-wider">
                        <th className="p-4 pl-6">Invoice Number</th>
                        <th className="p-4">Issued Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Subtotal</th>
                        <th className="p-4 text-right">Adjustments</th>
                        <th className="p-4 text-right">Net Total</th>
                        <th className="p-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee9dc]">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#fbfaf6] transition-colors">
                          <td className="p-4 pl-6 font-mono font-bold text-[#26352a]">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-4 text-[#5c685e]">
                            {new Date(inv.issuedAt || inv.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="p-4">
                            <InvoiceStatusBadge status={inv.status} />
                          </td>
                          <td className="p-4 text-right font-mono text-[#5c685e]">
                            ${parseFloat(inv.subtotal || "0").toFixed(2)}
                          </td>
                          <td className="p-4 text-right font-mono text-[#b85614]">
                            {parseFloat(inv.adjustmentTotal || "0") !== 0
                              ? `${parseFloat(inv.adjustmentTotal) > 0 ? "+" : ""}$${parseFloat(
                                  inv.adjustmentTotal
                                ).toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="p-4 text-right font-serif text-sm font-black text-[#26352a]">
                            ${parseFloat(inv.total || "0").toFixed(2)}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setInspectingInvoiceId(inv.id)}
                              >
                                View Detail
                              </Button>
                              {inv.status === "OPEN" && (
                                <Button
                                  size="sm"
                                  onClick={() => setPayingInvoice(inv)}
                                  icon={<CheckCircle2 size={13} />}
                                >
                                  Pay
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invoicesData?.meta && (
                <Pagination
                  page={invoicesPage}
                  totalPages={invoicesData.meta.totalPages}
                  total={invoicesData.meta.total}
                  limit={invoicesData.meta.limit}
                  hasNextPage={invoicesData.meta.hasNextPage}
                  hasPreviousPage={invoicesData.meta.hasPreviousPage}
                  onPageChange={(p) => setInvoicesPage(p)}
                />
              )}
            </div>
          )}
        </div>
      )}
      </main>

      {/* Create Invoice Confirmation Modal */}
      {showCreateInvoiceModal && (
        <CreateInvoiceModal
          open={showCreateInvoiceModal}
          onClose={() => setShowCreateInvoiceModal(false)}
          companyId={companyId}
          companyName={companyName}
          selectedOrders={selectedOrders}
          onInvoiceCreated={handleInvoiceCreated}
        />
      )}

      {/* Invoice Detail Drawer */}
      {inspectingInvoiceId && (
        <InvoiceDetailDrawer
          open={Boolean(inspectingInvoiceId)}
          onClose={() => setInspectingInvoiceId(null)}
          invoiceId={inspectingInvoiceId}
        />
      )}

      {/* Mark Paid Modal */}
      {payingInvoice && (
        <MarkPaidConfirmModal
          open={Boolean(payingInvoice)}
          onClose={() => setPayingInvoice(null)}
          invoice={payingInvoice}
          onSuccess={() => {
            refetchInvoices();
            refetchSummary();
          }}
        />
      )}
    </ProtectedRoute>
  );
}
