import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCreateInvoice } from "./useBilling";
import { getErrorMessage } from "@/lib/utils/errors";
import type { InvoiceDetail, UninvoicedOrder } from "@/types";
import { Check, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  selectedOrders: UninvoicedOrder[];
  onInvoiceCreated: (invoice: InvoiceDetail) => void;
}

export function CreateInvoiceModal({
  open,
  onClose,
  companyId,
  companyName,
  selectedOrders,
  onInvoiceCreated,
}: CreateInvoiceModalProps) {
  const [error, setError] = useState<string | null>(null);
  const createInvoiceMutation = useCreateInvoice();

  const totalAmount = useMemo(() => {
    return selectedOrders
      .reduce((sum, ord) => sum + parseFloat(ord.total || "0"), 0)
      .toFixed(2);
  }, [selectedOrders]);

  const handleCreate = async () => {
    if (selectedOrders.length === 0) return;
    setError(null);
    try {
      const orderIds = selectedOrders.map((o) => o.id);
      const invoice = await createInvoiceMutation.mutateAsync({
        companyId,
        payload: { orderIds },
      });
      onInvoiceCreated(invoice);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create invoice."));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Company Invoice" size="md">
      <div className="space-y-4">
        {/* Company Header */}
        <div className="rounded-2xl bg-[#fbfaf6] p-4 border border-[#eae5d8] text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-[#26352a]">
            <span>🏢 {companyName}</span>
            <span className="font-mono text-[#294d33]">{selectedOrders.length} Orders Selected</span>
          </div>
          <p className="text-[11px] text-[#78857a]">
            Invoicing locks an immutable financial snapshot of these confirmed orders into an official internal invoice record.
          </p>
        </div>

        {/* Selected Orders List */}
        <div className="max-h-52 overflow-y-auto divide-y divide-[#eee9dc] rounded-2xl border border-[#d9d2c2] bg-white text-xs">
          {selectedOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#26352a]">{order.orderNumber}</span>
                  <span className="text-[11px] text-[#78857a]">· {order.employeeName}</span>
                </div>
                <p className="text-[10px] text-[#78857a]">
                  Delivery: {order.deliveryDate} at {order.deliveryTime}
                </p>
              </div>
              <span className="font-mono font-bold text-[#26352a]">
                ${parseFloat(order.total || "0").toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className="rounded-2xl border border-[#294d33]/20 bg-[#294d33]/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#5c685e]">Invoice Total</p>
            <p className="text-[11px] text-[#78857a]">
              Sum of {selectedOrders.length} confirmed orders
            </p>
          </div>
          <p className="font-serif text-2xl font-black text-[#294d33]">
            ${totalAmount}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={createInvoiceMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createInvoiceMutation.isPending || selectedOrders.length === 0}
            icon={<FileSpreadsheet size={15} />}
          >
            {createInvoiceMutation.isPending ? "Generating Invoice..." : "Create Invoice"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
