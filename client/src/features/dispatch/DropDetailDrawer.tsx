import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDispatchDrop } from "./useDispatch";
import type { DeliveryDropStatus } from "@/types";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  Package,
  ShoppingBag,
  Truck,
  User,
} from "lucide-react";
import Link from "next/link";

const DROP_STATUS_CONFIG: Record<
  DeliveryDropStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  KITCHEN_READY: {
    label: "Kitchen Ready",
    bg: "bg-[#faeee5]",
    text: "text-[#e27d34]",
    border: "border-[#f5d0b5]",
  },
  DISPATCH_READY: {
    label: "Dispatch Ready",
    bg: "bg-[#eaf0eb]",
    text: "text-[#294d33]",
    border: "border-[#c4d7c8]",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    bg: "bg-[#e6f0fa]",
    text: "text-[#1d64b2]",
    border: "border-[#bad4f5]",
  },
  DELIVERED: {
    label: "Delivered",
    bg: "bg-[#f5f1e6]",
    text: "text-[#5c685e]",
    border: "border-[#d9d2c2]",
  },
};

interface DropDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  dropId: string;
}

export function DropDetailDrawer({ open, onClose, dropId }: DropDetailDrawerProps) {
  const { data: drop, isLoading, isError } = useDispatchDrop(dropId);

  const statusConfig = drop
    ? DROP_STATUS_CONFIG[drop.status] ?? DROP_STATUS_CONFIG.DISPATCH_READY
    : DROP_STATUS_CONFIG.DISPATCH_READY;

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Delivery Drop Specification" size="md">
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[#78857a] animate-pulse">
          Loading delivery drop details...
        </div>
      ) : isError || !drop ? (
        <div className="p-6 text-center text-xs text-[#a34747]">
          Failed to load delivery drop details.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-[#26352a]">
                  ⏰ {drop.deliveryTime}
                </span>
                <span className="text-[#9fa89e]">·</span>
                <span className="font-bold text-sm text-[#26352a]">
                  🏢 {drop.company.name}
                </span>
              </div>

              <span
                className={`rounded-lg px-2.5 py-0.5 text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
              >
                {statusConfig.label}
              </span>
            </div>

            <p className="text-xs text-[#5c685e] flex items-center gap-1.5">
              <MapPin size={13} className="text-[#294d33] shrink-0" />
              <span>
                {drop.address.street || "Company Address"}
                {drop.address.unit && ` (${drop.address.unit})`}, {drop.address.city || ""}{" "}
                {drop.address.postcode || ""}
              </span>
            </p>

            {drop.driver ? (
              <div className="flex items-center gap-1.5 text-xs text-[#294d33] font-semibold pt-1">
                <Truck size={13} />
                <span>Assigned Driver: {drop.driver.name}</span>
              </div>
            ) : (
              <div className="text-xs text-[#a05a18] font-semibold pt-1">
                ⚠️ No Driver Assigned
              </div>
            )}
          </div>

          {/* Standing Driver & Delivery Instructions */}
          {(drop.company.standingDriverInstructions || drop.address.deliveryInstructions) && (
            <div className="rounded-2xl bg-[#fff9f0] p-4 border border-[#fae2c5] space-y-2 text-xs">
              {drop.company.standingDriverInstructions && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#a05a18] block">
                    Company Standing Driver Instructions:
                  </span>
                  <p className="text-[#60492c] italic mt-0.5">
                    "{drop.company.standingDriverInstructions}"
                  </p>
                </div>
              )}

              {drop.address.deliveryInstructions && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#a05a18] block">
                    Address Drop-off Instructions:
                  </span>
                  <p className="text-[#60492c] italic mt-0.5">
                    "{drop.address.deliveryInstructions}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Attached Orders in this Drop */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#eae5d8] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-[#294d33]" />
                <span>Attached Orders in this Drop ({drop.orders.length})</span>
              </h4>
              <span className="text-[11px] text-[#78857a]">Grouped by identical address & time</span>
            </div>

            <div className="divide-y divide-[#eee9dc] rounded-2xl border border-[#d9d2c2] bg-white overflow-hidden">
              {drop.orders.map((order) => (
                <div key={order.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#fbfaf6]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-mono text-xs font-bold text-[#294d33] hover:underline flex items-center gap-1"
                      >
                        <span>{order.orderNumber}</span>
                        <ExternalLink size={10} />
                      </Link>
                      <span className="rounded bg-[#f3efe6] px-1.5 py-0.2 text-[10px] font-mono text-[#5c685e]">
                        {order.packagingType || "ECO_BOX"}
                      </span>
                    </div>

                    <p className="text-xs text-[#26352a] font-medium mt-0.5">
                      👤 {order.employeeName}
                    </p>

                    {order.deliveryInstructions && (
                      <p className="text-[11px] text-[#78857a] italic mt-0.5">
                        "{order.deliveryInstructions}"
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="font-semibold text-xs text-[#26352a]">
                      {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                    </span>
                    {order.total && (
                      <p className="font-mono text-[11px] text-[#78857a]">
                        ${Number(order.total).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Fulfillment & Proof Timeline */}
          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#26352a]">
              Fulfillment Milestones
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-xl bg-[#fbfaf6] p-2.5 border border-[#eee9dc]">
                <span className="text-[#78857a] block">Dispatch Ready:</span>
                <span className="font-mono font-semibold text-[#26352a]">
                  {formatTime(drop.dispatchReadyAt) || "—"}
                </span>
              </div>

              <div className="rounded-xl bg-[#fbfaf6] p-2.5 border border-[#eee9dc]">
                <span className="text-[#78857a] block">Out for Delivery:</span>
                <span className="font-mono font-semibold text-[#26352a]">
                  {formatTime(drop.outForDeliveryAt) || "—"}
                </span>
              </div>

              <div className="rounded-xl bg-[#fbfaf6] p-2.5 border border-[#eee9dc]">
                <span className="text-[#78857a] block">Delivered At:</span>
                <span className="font-mono font-semibold text-[#26352a]">
                  {formatTime(drop.deliveredAt) || "—"}
                </span>
              </div>
            </div>

            {/* On Time / Late Badge */}
            {drop.deliveredAt && (
              <div className="pt-2 flex items-center justify-between border-t border-[#eee9dc]">
                <span className="text-xs text-[#5c685e]">Delivery SLA Result:</span>
                {drop.isOnTime ? (
                  <span className="rounded-lg bg-[#294d33]/15 text-[#294d33] px-2.5 py-1 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>DELIVERED ON TIME</span>
                  </span>
                ) : (
                  <span className="rounded-lg bg-[#dc2626]/15 text-[#dc2626] px-2.5 py-1 text-xs font-bold flex items-center gap-1">
                    <AlertCircle size={13} />
                    <span>LATE DELIVERY</span>
                  </span>
                )}
              </div>
            )}

            {/* Delivery Note & Photo */}
            {drop.deliveredNote && (
              <div className="rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
                  Driver Proof Note:
                </span>
                <p className="text-xs text-[#26352a] italic">"{drop.deliveredNote}"</p>
              </div>
            )}

            {drop.deliveredPhotoUrl && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block flex items-center gap-1">
                  <ImageIcon size={12} />
                  <span>Proof of Delivery Photo:</span>
                </span>
                <img
                  src={drop.deliveredPhotoUrl}
                  alt="Proof of delivery"
                  className="max-h-48 rounded-xl object-cover border border-[#d9d2c2] shadow-xs"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
