import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useForceCompleteOrder } from "./useKitchen";
import { getErrorMessage } from "@/lib/utils/errors";
import { useState } from "react";

interface ForceCompleteModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
}

export function ForceCompleteModal({
  open,
  onClose,
  orderId,
  orderNumber,
}: ForceCompleteModalProps) {
  const forceCompleteMutation = useForceCompleteOrder();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    try {
      await forceCompleteMutation.mutateAsync(orderId);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to force-complete order kitchen units."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Force Complete Order Kitchen Work"
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-2xl bg-[#fff9f0] p-4 border border-[#fae2c5] text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#a05a18] font-bold">
            <AlertTriangle size={16} />
            <span>Administrative Force-Complete Override</span>
          </div>
          <p className="text-[#60492c] leading-relaxed">
            Are you sure you want to force complete all remaining kitchen preparation units for order{" "}
            <span className="font-mono font-bold text-[#26352a]">{orderNumber}</span>?
          </p>
          <p className="text-[#78857a] text-[11px]">
            This will mark every incomplete unit as <span className="font-semibold text-[#294d33]">DONE</span>, set the order's <span className="font-semibold text-[#294d33]">kitchenReadyAt</span> timestamp, and flag the drop for dispatch.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#eae5d8]">
          <Button variant="secondary" onClick={onClose} disabled={forceCompleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CheckCircle2 size={15} />}
            onClick={handleConfirm}
            loading={forceCompleteMutation.isPending}
          >
            Force Complete All Units
          </Button>
        </div>
      </div>
    </Modal>
  );
}
