import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { MarkPaidConfirmModal } from "./MarkPaidConfirmModal";
import { AddAdjustmentModal } from "./AddAdjustmentModal";
import { useInvoice } from "./useBilling";
import { getErrorMessage } from "@/lib/utils/errors";
import type { InvoiceDetail } from "@/types";
import {
  AlertCircle,
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
import { useState } from "react";

interface InvoiceDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  invoiceId: string | null;
}

export function InvoiceDetailDrawer({
  open,
  onClose,
  invoiceId,
}: InvoiceDetailDrawerProps) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const {
    data: invoice,
    isLoading,
    isError,
    error,
    refetch,
  } = useInvoice(invoiceId || "");

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice Details"}
        size="lg"
      >
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-20 bg-[#f3efe6] rounded-2xl" />
            <div className="h-40 bg-[#fbfaf6] rounded-2xl" />
            <div className="h-32 bg-[#f3efe6] rounded-2xl" />
          </div>
        ) : isError || !invoice ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-[#a34747]" />
            <h3 className="font-bold text-base text-[#a34747]">Failed to Load Invoice</h3>
            <p className="text-xs text-[#5c685e] max-w-sm mx-auto">
              {getErrorMessage(error, "Unable to retrieve invoice record.")}
            </p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Top Status & Header Card */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee9dc] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-black text-[#26352a]">
                      {invoice.invoiceNumber}
                    </span>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className="text-xs text-[#78857a] mt-0.5">
                    Issued on {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Primary Pay Action */}
                {invoice.status === "OPEN" ? (
                  <Button
                    onClick={() => setShowPayModal(true)}
                    icon={<CheckCircle2 size={15} />}
                    className="shadow-sm"
                  >
                    Mark as Paid
                  </Button>
                ) : invoice.status === "PAID" ? (
                  <div className="flex items-center gap-1.5 rounded-2xl bg-[#294d33]/10 px-3.5 py-2 text-xs font-bold text-[#294d33] border border-[#294d33]/20">
                    <CheckCircle2 size={15} />
                    <span>
                      Paid on{" "}
                      {invoice.paidAt
                        ? new Date(invoice.paidAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Record"}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Company & Billing Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#78857a] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={12} className="text-[#294d33]" />
                    <span>Company</span>
                  </span>
                  <p className="font-serif font-black text-sm text-[#26352a]">
                    {invoice.company.name}
                  </p>
                  <p className="font-mono text-[11px] text-[#78857a]">ID: {invoice.company.id}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#78857a] uppercase tracking-wider flex items-center gap-1.5">
                    <User size={12} className="text-[#294d33]" />
                    <span>Billing Contact</span>
                  </span>
                  <p className="font-bold text-[#26352a]">
                    {invoice.company.billingContactName || "Standard Accounts Dept."}
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
            </div>

            {/* Financial Summary Card */}
            <div className="rounded-3xl border border-[#294d33]/20 bg-[#fbfaf6] p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#5c685e] uppercase tracking-wider">
                Financial Breakdown
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#5c685e]">Subtotal ({invoice.lines.length} Invoiced Orders):</span>
                  <span className="font-mono font-bold text-[#26352a]">
                    ${parseFloat(invoice.subtotal || "0").toFixed(2)}
                  </span>
                </div>

                {parseFloat(invoice.adjustmentTotal || "0") !== 0 && (
                  <div className="flex items-center justify-between text-[#b85614]">
                    <span>Adjustments Total (Debits / Credits):</span>
                    <span className="font-mono font-bold">
                      {parseFloat(invoice.adjustmentTotal) > 0 ? "+" : ""}
                      ${parseFloat(invoice.adjustmentTotal || "0").toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-[#eee9dc] pt-2.5">
                  <span className="font-bold text-sm text-[#26352a]">Net Total Due:</span>
                  <span className="font-serif text-2xl font-black text-[#294d33]">
                    ${parseFloat(invoice.total || "0").toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoiced Orders (Lines) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-black text-sm text-[#26352a] flex items-center gap-1.5">
                  <FileSpreadsheet size={15} className="text-[#294d33]" />
                  <span>Invoiced Orders ({invoice.lines.length})</span>
                </h4>
                <span className="text-[11px] text-[#78857a]">
                  Snapshot locked at creation
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#d9d2c2] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#eee9dc] bg-[#fbfaf6] text-[#78857a] font-bold text-[11px] uppercase">
                        <th className="p-3 pl-4">Order Number</th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Delivery Date</th>
                        <th className="p-3 text-right">Invoiced Amount</th>
                        <th className="p-3 pr-4 text-right">Status / Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee9dc]">
                      {invoice.lines.map((line) => {
                        // Check if this order has adjustments
                        const orderAdjustments = invoice.adjustments.filter(
                          (a) => a.orderId === line.orderId
                        );
                        const hasAdjustment = orderAdjustments.length > 0;

                        return (
                          <tr key={line.id} className="hover:bg-[#fbfaf6] transition-colors">
                            <td className="p-3 pl-4 font-mono font-bold text-[#26352a]">
                              {line.orderNumber}
                            </td>
                            <td className="p-3 text-[#26352a]">{line.employeeName}</td>
                            <td className="p-3 text-[#5c685e]">
                              {line.deliveryDate}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-[#26352a]">
                              ${parseFloat(line.amount).toFixed(2)}
                            </td>
                            <td className="p-3 pr-4 text-right">
                              {hasAdjustment ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#fff5ec] px-2 py-0.5 text-[10px] font-bold text-[#b85614] border border-[#e27d34]/20">
                                  <Scale size={10} />
                                  <span>Adjusted</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#78857a] font-mono">
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

            {/* Billing Adjustments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-black text-sm text-[#26352a] flex items-center gap-1.5">
                  <Scale size={15} className="text-[#294d33]" />
                  <span>Billing Adjustments ({invoice.adjustments.length})</span>
                </h4>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAdjustmentModal(true)}
                  icon={<PlusCircle size={13} />}
                >
                  Add Adjustment
                </Button>
              </div>

              {invoice.adjustments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d9d2c2] p-4 text-center text-xs text-[#78857a]">
                  No debits or credits recorded. The invoice reflects original snapshotted amounts.
                </div>
              ) : (
                <div className="divide-y divide-[#eee9dc] rounded-2xl border border-[#d9d2c2] bg-white text-xs">
                  {invoice.adjustments.map((adj) => (
                    <div key={adj.id} className="p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              adj.type === "CREDIT"
                                ? "bg-[#294d33]/10 text-[#294d33] border border-[#294d33]/20"
                                : "bg-[#e27d34]/10 text-[#b85614] border border-[#e27d34]/20"
                            }`}
                          >
                            {adj.type}
                          </span>
                          <span className="font-mono font-bold text-[#26352a]">
                            {adj.orderNumber || `Order ${adj.orderId}`}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            adj.type === "CREDIT" ? "text-[#294d33]" : "text-[#b85614]"
                          }`}
                        >
                          {adj.type === "CREDIT" ? "-" : "+"}${parseFloat(adj.amount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5c685e]">“{adj.reason}”</p>
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
      </Modal>

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
    </>
  );
}
