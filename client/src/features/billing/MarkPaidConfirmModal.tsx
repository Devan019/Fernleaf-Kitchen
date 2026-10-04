import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { usePayInvoice } from "./useBilling";
import { getErrorMessage } from "@/lib/utils/errors";
import type { InvoiceDetail, InvoiceSummary } from "@/types";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface MarkPaidConfirmModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail | InvoiceSummary;
  onSuccess?: () => void;
}

export function MarkPaidConfirmModal({
  open,
  onClose,
  invoice,
  onSuccess,
}: MarkPaidConfirmModalProps) {
  const [error, setError] = useState<string | null>(null);
  const payMutation = usePayInvoice();

  const handleConfirmPay = async () => {
    setError(null);
    try {
      await payMutation.mutateAsync(invoice.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to mark invoice as paid."));
    }
  };

  const lineCount =
    "lines" in invoice
      ? invoice.lines.length
      : "linesCount" in invoice
      ? invoice.linesCount || 0
      : 1;

  return (
    <Modal open={open} onClose={onClose} title="Confirm Invoice Settlement" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-[#294d33]/5 p-4 border border-[#294d33]/15">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#294d33] text-white">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#5c685e]">Settlement Action</p>
            <p className="font-serif text-sm font-black text-[#26352a]">
              Mark invoice <span className="font-mono">{invoice.invoiceNumber}</span> as paid?
            </p>
          </div>
        </div>

        {/* Invoice Summary Data */}
        <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-[#eee9dc] pb-2">
            <span className="text-[#78857a]">Company:</span>
            <span className="font-bold text-[#26352a]">{invoice.company.name}</span>
          </div>

          <div className="flex items-center justify-between border-b border-[#eee9dc] pb-2">
            <span className="text-[#78857a]">Orders Invoiced:</span>
            <span className="font-bold text-[#26352a]">
              {lineCount} {lineCount === 1 ? "order" : "orders"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[#78857a]">Invoice Total:</span>
            <span className="font-serif text-base font-black text-[#294d33]">
              ${parseFloat(invoice.total || "0").toFixed(2)}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={payMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPay}
            disabled={payMutation.isPending}
            icon={<CheckCircle2 size={15} />}
          >
            {payMutation.isPending ? "Recording Payment..." : "Confirm & Mark Paid"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
