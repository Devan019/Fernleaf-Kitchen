"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { CompanyBillingCard } from "@/features/billing/CompanyBillingCard";
import { InvoiceDetailDrawer } from "@/features/billing/InvoiceDetailDrawer";
import { InvoiceStatusBadge } from "@/features/billing/InvoiceStatusBadge";
import { MarkPaidConfirmModal } from "@/features/billing/MarkPaidConfirmModal";
import { useCompanyBilling, useInvoices } from "@/features/billing/useBilling";
import { getErrorMessage } from "@/lib/utils/errors";
import type { InvoiceStatus, InvoiceSummary } from "@/types";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  Filter,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const LIMIT = 12;

export default function CompanyBillingPage() {
  const [activeTab, setActiveTab] = useState<"COMPANIES" | "INVOICES">("COMPANIES");

  // Companies Tab State
  const [companyPage, setCompanyPage] = useState(1);
  const [companySearch, setCompanySearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<"ALL" | "UNINVOICED" | "OPEN_INVOICES">("ALL");

  // Invoices Tab State
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | "ALL">("ALL");

  // Modals & Drawers
  const [inspectingInvoiceId, setInspectingInvoiceId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceSummary | null>(null);

  // Query Companies Summaries
  const {
    data: companiesData,
    isLoading: loadingCompanies,
    isError: isCompaniesError,
    error: companiesError,
    refetch: refetchCompanies,
    isFetching: isFetchingCompanies,
  } = useCompanyBilling({
    page: companyPage,
    limit: LIMIT,
    search: companySearch || undefined,
    hasUninvoicedOrders: companyFilter === "UNINVOICED" ? true : undefined,
    hasOpenInvoices: companyFilter === "OPEN_INVOICES" ? true : undefined,
  });

  // Query Invoices
  const {
    data: invoicesData,
    isLoading: loadingInvoices,
    isError: isInvoicesError,
    error: invoicesError,
    refetch: refetchInvoices,
    isFetching: isFetchingInvoices,
  } = useInvoices({
    page: invoicePage,
    limit: LIMIT,
    search: invoiceSearch || undefined,
    status: invoiceStatus !== "ALL" ? invoiceStatus : undefined,
  });

  // Compute Overall Overview Metrics from Loaded Data
  const companies = companiesData?.data ?? [];
  const overviewMetrics = useMemo(() => {
    let totalUninvoicedCount = 0;
    let totalUninvoicedAmount = 0;
    let totalOpenInvoicesCount = 0;
    let totalOpenInvoicesAmount = 0;
    let totalPaidInvoicesAmount = 0;
    let companiesWithOutstanding = 0;

    companies.forEach((c) => {
      const uninvoiced = parseFloat(c.uninvoicedAmount || "0");
      const openInv = parseFloat(c.openInvoiceAmount || "0");
      const paid = parseFloat(c.paidAmount || "0");

      totalUninvoicedCount += c.uninvoicedOrderCount || 0;
      totalUninvoicedAmount += uninvoiced;
      totalOpenInvoicesCount += c.openInvoiceCount || 0;
      totalOpenInvoicesAmount += openInv;
      totalPaidInvoicesAmount += paid;

      if (c.uninvoicedOrderCount > 0 || c.openInvoiceCount > 0) {
        companiesWithOutstanding++;
      }
    });

    return {
      companiesWithOutstanding,
      totalUninvoicedCount,
      totalUninvoicedAmount: totalUninvoicedAmount.toFixed(2),
      totalOpenInvoicesCount,
      totalOpenInvoicesAmount: totalOpenInvoicesAmount.toFixed(2),
      totalPaidInvoicesAmount: totalPaidInvoicesAmount.toFixed(2),
    };
  }, [companies]);

  const invoices = invoicesData?.data ?? [];

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title="Company Billing" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Company Billing"
          description="Manage confirmed orders, invoices, and company payments."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                icon={
                  <RefreshCw
                    size={14}
                    className={
                      isFetchingCompanies || isFetchingInvoices ? "animate-spin" : ""
                    }
                  />
                }
                onClick={() => {
                  refetchCompanies();
                  refetchInvoices();
                }}
              >
                Refresh Billing
              </Button>
            </div>
          }
        />

        {/* ── Overview Summary Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Outstanding Accounts</span>
              <Building2 size={13} className="text-[#e27d34]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#26352a]">
              {overviewMetrics.companiesWithOutstanding}
            </p>
            <p className="text-[10px] text-[#78857a] mt-0.5">
              Companies with open balance
            </p>
          </div>

          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Uninvoiced Confirmed</span>
              <FileSpreadsheet size={13} className="text-[#e27d34]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#e27d34]">
              ${overviewMetrics.totalUninvoicedAmount}
            </p>
            <p className="text-[10px] text-[#78857a] mt-0.5">
              {overviewMetrics.totalUninvoicedCount} confirmed orders ready to invoice
            </p>
          </div>

          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Outstanding Invoices</span>
              <Receipt size={13} className="text-[#b85614]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#b85614]">
              ${overviewMetrics.totalOpenInvoicesAmount}
            </p>
            <p className="text-[10px] text-[#78857a] mt-0.5">
              {overviewMetrics.totalOpenInvoicesCount} open invoices awaiting settlement
            </p>
          </div>

          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Settled Invoices</span>
              <CheckCircle2 size={13} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#294d33]">
              ${overviewMetrics.totalPaidInvoicesAmount}
            </p>
            <p className="text-[10px] text-[#78857a] mt-0.5">
              Collected & settled
            </p>
          </div>
        </div>

        {/* ── Main View Switcher Tabs ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-[#eee9dc] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("COMPANIES")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "COMPANIES"
                ? "bg-[#294d33] text-white shadow-xs"
                : "bg-white text-[#5c685e] hover:bg-[#fbfaf6] border border-[#d9d2c2]"
            }`}
          >
            <Building2 size={14} />
            <span>Companies Overview</span>
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
            <span>All Invoices</span>
          </button>
        </div>

        {/* ── TAB 1: Companies Overview ─────────────────────────────────────── */}
        {activeTab === "COMPANIES" && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Quick Filter Buttons */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyFilter("ALL");
                    setCompanyPage(1);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    companyFilter === "ALL"
                      ? "border-[#294d33] bg-[#294d33] text-white"
                      : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
                  }`}
                >
                  All Companies
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompanyFilter("UNINVOICED");
                    setCompanyPage(1);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    companyFilter === "UNINVOICED"
                      ? "border-[#e27d34] bg-[#e27d34] text-white"
                      : "border-[#d9d2c2] bg-white text-[#e27d34] hover:bg-[#fff9f5]"
                  }`}
                >
                  Has Uninvoiced Orders
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompanyFilter("OPEN_INVOICES");
                    setCompanyPage(1);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    companyFilter === "OPEN_INVOICES"
                      ? "border-[#b85614] bg-[#b85614] text-white"
                      : "border-[#d9d2c2] bg-white text-[#b85614] hover:bg-[#fff9f5]"
                  }`}
                >
                  Has Open Invoices
                </button>
              </div>

              {/* Company Search */}
              <div className="relative w-full sm:w-72">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
                />
                <input
                  type="text"
                  placeholder="Search company by name..."
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setCompanyPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-[#d9d2c2] bg-white pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
                />
              </div>
            </div>

            {/* Companies Grid */}
            {loadingCompanies ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-56 rounded-3xl border border-[#d9d2c2] bg-white p-6 animate-pulse space-y-4"
                  >
                    <div className="h-6 bg-[#f3efe6] rounded w-1/2" />
                    <div className="h-20 bg-[#fbfaf6] rounded-2xl" />
                    <div className="h-9 bg-[#f3efe6] rounded-xl" />
                  </div>
                ))}
              </div>
            ) : isCompaniesError ? (
              <div className="rounded-3xl border border-[#ffdada] bg-[#fff5f5] p-8 text-center space-y-3">
                <AlertCircle size={32} className="mx-auto text-[#a34747]" />
                <h3 className="font-bold text-base text-[#a34747]">
                  Failed to Load Companies Billing
                </h3>
                <p className="text-xs text-[#5c685e] max-w-md mx-auto">
                  {getErrorMessage(companiesError, "Unable to retrieve company billing records.")}
                </p>
                <Button variant="secondary" onClick={() => refetchCompanies()}>
                  Try Again
                </Button>
              </div>
            ) : companies.length === 0 ? (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
                <EmptyState
                  icon={<Building2 size={32} />}
                  title="No companies found"
                  description="All corporate catering clients are currently up to date with no matching records."
                />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {companies.map((summary) => (
                    <CompanyBillingCard key={summary.company.id} summary={summary} />
                  ))}
                </div>

                {companiesData?.meta && (
                  <Pagination
                    page={companyPage}
                    totalPages={companiesData.meta.totalPages}
                    total={companiesData.meta.total}
                    limit={companiesData.meta.limit}
                    hasNextPage={companiesData.meta.hasNextPage}
                    hasPreviousPage={companiesData.meta.hasPreviousPage}
                    onPageChange={(p) => setCompanyPage(p)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Invoices List ─────────────────────────────────────────── */}
        {activeTab === "INVOICES" && (
          <div className="space-y-4">
            {/* Invoices Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceStatus("ALL");
                    setInvoicePage(1);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    invoiceStatus === "ALL"
                      ? "border-[#294d33] bg-[#294d33] text-white"
                      : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
                  }`}
                >
                  All Invoices
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInvoiceStatus("OPEN");
                    setInvoicePage(1);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    invoiceStatus === "OPEN"
                      ? "border-[#e27d34] bg-[#e27d34] text-white"
                      : "border-[#d9d2c2] bg-white text-[#b85614] hover:bg-[#fff9f5]"
                  }`}
                >
                  Unpaid (Open)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInvoiceStatus("PAID");
                    setInvoicePage(1);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    invoiceStatus === "PAID"
                      ? "border-[#294d33] bg-[#294d33] text-white"
                      : "border-[#d9d2c2] bg-white text-[#294d33] hover:bg-[#fbfaf6]"
                  }`}
                >
                  Paid
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
                />
                <input
                  type="text"
                  placeholder="Search invoice number..."
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-[#d9d2c2] bg-white pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
                />
              </div>
            </div>

            {/* Invoices Table */}
            {loadingInvoices ? (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-8 animate-pulse space-y-4">
                <div className="h-6 bg-[#f3efe6] rounded w-1/4" />
                <div className="h-32 bg-[#fbfaf6] rounded-2xl" />
              </div>
            ) : isInvoicesError ? (
              <div className="rounded-3xl border border-[#ffdada] bg-[#fff5f5] p-8 text-center space-y-3">
                <AlertCircle size={32} className="mx-auto text-[#a34747]" />
                <h3 className="font-bold text-base text-[#a34747]">Failed to Load Invoices</h3>
                <p className="text-xs text-[#5c685e] max-w-md mx-auto">
                  {getErrorMessage(invoicesError, "Unable to retrieve invoice list.")}
                </p>
                <Button variant="secondary" onClick={() => refetchInvoices()}>
                  Try Again
                </Button>
              </div>
            ) : invoices.length === 0 ? (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
                <EmptyState
                  icon={<Receipt size={32} />}
                  title="No Invoices Found"
                  description="Invoices created from confirmed orders will appear here for audit and settlement."
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
                          <th className="p-4">Company</th>
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
                            <td className="p-4 font-bold text-[#26352a]">
                              <Link
                                href={`/dashboard/billing/${inv.companyId}`}
                                className="hover:underline hover:text-[#294d33]"
                              >
                                {inv.company.name}
                              </Link>
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
                    page={invoicePage}
                    totalPages={invoicesData.meta.totalPages}
                    total={invoicesData.meta.total}
                    limit={invoicesData.meta.limit}
                    hasNextPage={invoicesData.meta.hasNextPage}
                    hasPreviousPage={invoicesData.meta.hasPreviousPage}
                    onPageChange={(p) => setInvoicePage(p)}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>

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
            refetchCompanies();
          }}
        />
      )}
    </ProtectedRoute>
  );
}
