"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { OrderDetail } from "@/types";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface CancelOrderModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderDetail | null;
  onConfirm: (orderId: string, reason?: string) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function CancelOrderModal({
  open,
  onClose,
  order,
  onConfirm,
  loading = false,
  serverError,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    await onConfirm(order.id, reason.trim() || undefined);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cancel Order • ${order?.orderNumber ?? ""}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="rounded-2xl bg-[#fff5f5] border border-[#ffdada] p-4 text-xs text-[#a34747] space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle size={16} />
            Confirm Order Cancellation
          </div>
          <p className="text-[11px] leading-relaxed">
            Are you sure you want to cancel order <strong>{order?.orderNumber}</strong>? This action will halt preparation and drop scheduling.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-[#4c594f]">
            Cancellation Reason (Optional)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Client meeting rescheduled, accidental duplicate, employee absent."
            className="w-full rounded-xl border border-[#d9d2c2] bg-white p-2.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Back
          </Button>
          <Button variant="danger" type="submit" loading={loading}>
            Confirm Cancellation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
