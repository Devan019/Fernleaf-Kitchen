import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCreateAdjustment } from "./useBilling";
import { getErrorMessage } from "@/lib/utils/errors";
import type { BillingAdjustmentType, InvoiceDetail } from "@/types";
import { DollarSign, PlusCircle, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface AddAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail;
  onSuccess?: () => void;
}

export function AddAdjustmentModal({
  open,
  onClose,
  invoice,
  onSuccess,
}: AddAdjustmentModalProps) {
  const [orderId, setOrderId] = useState(invoice.lines[0]?.orderId || "");
  const [type, setType] = useState<BillingAdjustmentType>("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const adjustmentMutation = useCreateAdjustment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orderId) {
      setError("Please select an invoiced order to adjust.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid positive adjustment amount.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for the adjustment.");
      return;
    }

    try {
      await adjustmentMutation.mutateAsync({
        invoiceId: invoice.id,
        payload: {
          orderId,
          type,
          amount: parseFloat(amount).toFixed(2),
          reason: reason.trim(),
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to record billing adjustment."));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Billing Adjustment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-[#5c685e]">
          Post-invoice adjustments (credits or debits) modify the net invoice balance without altering the historical line snapshot.
        </p>

        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Invoiced Order Target */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#26352a]">
            Target Invoiced Order <span className="text-[#a34747]">*</span>
          </label>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] focus:border-[#294d33] focus:outline-none"
            required
          >
            {invoice.lines.map((line) => (
              <option key={line.orderId} value={line.orderId}>
                {line.orderNumber} — {line.employeeName} (${parseFloat(line.amount).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        {/* Adjustment Type & Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#26352a]">
              Adjustment Type <span className="text-[#a34747]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("CREDIT")}
                className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                  type === "CREDIT"
                    ? "border-[#294d33] bg-[#294d33] text-white shadow-xs"
                    : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
                }`}
              >
                CREDIT (-)
              </button>
              <button
                type="button"
                onClick={() => setType("DEBIT")}
                className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                  type === "DEBIT"
                    ? "border-[#e27d34] bg-[#e27d34] text-white shadow-xs"
                    : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
                }`}
              >
                DEBIT (+)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#26352a]">
              Amount ($) <span className="text-[#a34747]">*</span>
            </label>
            <div className="relative">
              <DollarSign
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78857a]"
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white pl-8 pr-3 text-xs text-[#26352a] focus:border-[#294d33] focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#26352a]">
            Adjustment Reason <span className="text-[#a34747]">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Short delivery of 2 portions, order cancellation credit..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={adjustmentMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={adjustmentMutation.isPending}
            icon={<PlusCircle size={15} />}
          >
            {adjustmentMutation.isPending ? "Recording..." : "Save Adjustment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
