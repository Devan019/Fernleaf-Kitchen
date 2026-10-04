"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AddAdjustmentModal } from "@/features/billing/AddAdjustmentModal";
import { InvoiceStatusBadge } from "@/features/billing/InvoiceStatusBadge";
import { MarkPaidConfirmModal } from "@/features/billing/MarkPaidConfirmModal";
import { useInvoice } from "@/features/billing/useBilling";
import { getErrorMessage } from "@/lib/utils/errors";
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
  Scale,
  ShieldAlert,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = String(params?.invoiceId || "");

  const [showPayModal, setShowPayModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const {
    data: invoice,
    isLoading,
    isError,
    error,
    refetch,
  } = useInvoice(invoiceId);

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title={invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice Detail"} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#78857a]">
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1 hover:text-[#294d33] font-bold"
          >
            <ArrowLeft size={14} />
            <span>Company Billing</span>
          </Link>
          {invoice && (
            <>
              <span>/</span>
              <Link
                href={`/dashboard/billing/${invoice.companyId}`}
                className="hover:text-[#294d33]"
              >
                {invoice.company.name}
              </Link>
              <span>/</span>
              <span className="font-mono text-[#26352a] font-bold">{invoice.invoiceNumber}</span>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-8 animate-pulse space-y-6">
            <div className="h-10 bg-[#f3efe6] rounded w-1/3" />
            <div className="h-32 bg-[#fbfaf6] rounded-2xl" />
            <div className="h-48 bg-[#f3efe6] rounded-2xl" />
          </div>
        ) : isError || !invoice ? (
          <div className="rounded-3xl border border-[#ffdada] bg-[#fff5f5] p-12 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-[#a34747]" />
            <h3 className="font-bold text-base text-[#a34747]">Invoice Not Found</h3>
            <p className="text-xs text-[#5c685e] max-w-sm mx-auto">
              {getErrorMessage(error, "Unable to load invoice details.")}
            </p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Page Header */}
            <PageHeader
              title={`Invoice ${invoice.invoiceNumber}`}
              description={`Official internal catering invoice for ${invoice.company.name}.`}
              actions={
                <div className="flex items-center gap-2.5">
                  {invoice.status === "OPEN" && (
                    <Button
                      onClick={() => setShowPayModal(true)}
                      icon={<CheckCircle2 size={15} />}
                      className="shadow-sm"
                    >
                      Mark as Paid
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => setShowAdjustmentModal(true)}
                    icon={<PlusCircle size={14} />}
                  >
                    Add Adjustment
                  </Button>
                </div>
              }
            />

            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Invoice Meta & Status */}
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#eee9dc] pb-3">
                  <span className="text-xs font-bold text-[#78857a] uppercase">Invoice Status</span>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#78857a]">Issued Date:</span>
                    <span className="font-bold text-[#26352a]">
                      {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {invoice.paidAt && (
                    <div className="flex items-center justify-between text-[#294d33]">
                      <span className="font-semibold">Paid Date:</span>
                      <span className="font-bold">
                        {new Date(invoice.paidAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[#78857a]">Invoiced Orders:</span>
                    <span className="font-bold text-[#26352a]">
                      {invoice.lines.length} {invoice.lines.length === 1 ? "order" : "orders"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Company & Billing Contact */}
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#78857a] uppercase flex items-center gap-1.5 border-b border-[#eee9dc] pb-3">
                  <Building2 size={13} className="text-[#294d33]" />
                  <span>Client & Billing Contact</span>
                </span>

                <div className="space-y-1.5 text-xs">
                  <p className="font-serif font-black text-base text-[#26352a]">
                    {invoice.company.name}
                  </p>
                  <p className="font-bold text-[#5c685e]">
                    Contact: {invoice.company.billingContactName || "Accounts Payable"}
                  </p>
                  {invoice.company.billingContactEmail && (
                    <p className="text-[11px] text-[#78857a] flex items-center gap-1">
                      <Mail size={11} />
                      <span className="font-mono">{invoice.company.billingContactEmail}</span>
                    </p>
                  )}
                  {invoice.company.billingContactPhone && (
                    <p className="text-[11px] text-[#78857a] flex items-center gap-1">
                      <Phone size={11} />
                      <span>{invoice.company.billingContactPhone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="rounded-3xl border border-[#294d33]/20 bg-[#fbfaf6] p-6 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#5c685e] uppercase tracking-wider block border-b border-[#eae5d8] pb-3">
                  Financial Breakdown
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5c685e]">Subtotal:</span>
                    <span className="font-mono font-bold text-[#26352a]">
                      ${parseFloat(invoice.subtotal || "0").toFixed(2)}
                    </span>
                  </div>

                  {parseFloat(invoice.adjustmentTotal || "0") !== 0 && (
                    <div className="flex items-center justify-between text-[#b85614]">
                      <span>Adjustments (Debits/Credits):</span>
                      <span className="font-mono font-bold">
                        {parseFloat(invoice.adjustmentTotal) > 0 ? "+" : ""}
                        ${parseFloat(invoice.adjustmentTotal || "0").toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-[#eee9dc] pt-2">
                    <span className="font-bold text-sm text-[#26352a]">Net Total Due:</span>
                    <span className="font-serif text-2xl font-black text-[#294d33]">
                      ${parseFloat(invoice.total || "0").toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoiced Orders Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-black text-[#26352a] flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-[#294d33]" />
                  <span>Invoiced Orders ({invoice.lines.length})</span>
                </h3>
                <span className="text-xs text-[#78857a]">
                  Financial snapshot locked at invoice generation
                </span>
              </div>

              <div className="overflow-hidden rounded-3xl border border-[#d9d2c2] bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#eee9dc] bg-[#fbfaf6] text-[#78857a] font-bold text-[11px] uppercase tracking-wider">
                        <th className="p-4 pl-6">Order Number</th>
                        <th className="p-4">Employee</th>
                        <th className="p-4">Delivery Date</th>
                        <th className="p-4 text-right">Invoiced Amount</th>
                        <th className="p-4 pr-6 text-right">Audit & Adjustments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee9dc]">
                      {invoice.lines.map((line) => {
                        const lineAdjustments = invoice.adjustments.filter(
                          (a) => a.orderId === line.orderId
                        );
                        const hasAdj = lineAdjustments.length > 0;

                        return (
                          <tr key={line.id} className="hover:bg-[#fbfaf6] transition-colors">
                            <td className="p-4 pl-6 font-mono font-bold text-[#26352a]">
                              {line.orderNumber}
                            </td>
                            <td className="p-4 font-semibold text-[#26352a]">
                              {line.employeeName}
                            </td>
                            <td className="p-4 text-[#5c685e]">{line.deliveryDate}</td>
                            <td className="p-4 text-right font-mono font-bold text-[#26352a]">
                              ${parseFloat(line.amount).toFixed(2)}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              {hasAdj ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#fff5ec] px-2.5 py-0.5 text-[10px] font-bold text-[#b85614] border border-[#e27d34]/20">
                                  <Scale size={11} />
                                  <span>{lineAdjustments.length} Adjustment(s)</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#78857a] font-mono">
                                  Locked Snapshot
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Adjustments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-black text-[#26352a] flex items-center gap-2">
                  <Scale size={16} className="text-[#294d33]" />
                  <span>Audit Adjustments ({invoice.adjustments.length})</span>
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAdjustmentModal(true)}
                  icon={<PlusCircle size={14} />}
                >
                  Record Adjustment
                </Button>
              </div>

              {invoice.adjustments.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#d9d2c2] bg-white p-8 text-center text-xs text-[#78857a]">
                  No debits or credits recorded against this invoice.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-[#d9d2c2] bg-white shadow-xs divide-y divide-[#eee9dc]">
                  {invoice.adjustments.map((adj) => (
                    <div key={adj.id} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              adj.type === "CREDIT"
                                ? "bg-[#294d33]/10 text-[#294d33] border border-[#294d33]/20"
                                : "bg-[#e27d34]/10 text-[#b85614] border border-[#e27d34]/20"
                            }`}
                          >
                            {adj.type}
                          </span>
                          <span className="font-mono font-bold text-xs text-[#26352a]">
                            {adj.orderNumber || `Order ${adj.orderId}`}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold text-sm ${
                            adj.type === "CREDIT" ? "text-[#294d33]" : "text-[#b85614]"
                          }`}
                        >
                          {adj.type === "CREDIT" ? "-" : "+"}${parseFloat(adj.amount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-[#5c685e]">“{adj.reason}”</p>
                      <p className="text-[10px] text-[#78857a]">
                        Recorded by {adj.createdByUser?.name || "Admin"} on{" "}
                        {new Date(adj.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Pay Confirmation Modal */}
      {showPayModal && invoice && (
        <MarkPaidConfirmModal
          open={showPayModal}
          onClose={() => setShowPayModal(false)}
          invoice={invoice}
          onSuccess={() => refetch()}
        />
      )}

      {/* Add Adjustment Modal */}
      {showAdjustmentModal && invoice && (
        <AddAdjustmentModal
          open={showAdjustmentModal}
          onClose={() => setShowAdjustmentModal(false)}
          invoice={invoice}
          onSuccess={() => refetch()}
        />
      )}
    </ProtectedRoute>
  );
}
