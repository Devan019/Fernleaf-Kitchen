import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DeliveryDrop, DeliveryDropStatus } from "@/types";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Navigation,
  Package,
  ShoppingBag,
  Truck,
  User,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useMarkDropOutForDelivery, useMarkDropReady } from "./useDispatch";
import { getErrorMessage } from "@/lib/utils/errors";

export function getDropStatusConfig(
  status: DeliveryDropStatus,
  canMarkReady?: boolean
): { label: string; bg: string; text: string; border: string } {
  if (status === "KITCHEN_READY") {
    if (canMarkReady) {
      return {
        label: "Kitchen Ready",
        bg: "bg-[#eaf0eb]",
        text: "text-[#294d33]",
        border: "border-[#c4d7c8]",
      };
    }
    return {
      label: "Kitchen Pending",
      bg: "bg-[#fffbf0]",
      text: "text-[#b45309]",
      border: "border-[#fde68a]",
    };
  }

  if (status === "DISPATCH_READY") {
    return {
      label: "Dispatch Ready",
      bg: "bg-[#eaf0eb]",
      text: "text-[#294d33]",
      border: "border-[#c4d7c8]",
    };
  }

  if (status === "OUT_FOR_DELIVERY") {
    return {
      label: "Out for Delivery",
      bg: "bg-[#e6f0fa]",
      text: "text-[#1d64b2]",
      border: "border-[#bad4f5]",
    };
  }

  return {
    label: "Delivered",
    bg: "bg-[#f5f1e6]",
    text: "text-[#5c685e]",
    border: "border-[#d9d2c2]",
  };
}

interface DispatchDropCardProps {
  drop: DeliveryDrop;
  onAssignDriver: (drop: DeliveryDrop) => void;
  onViewDetails: (dropId: string) => void;
}

export function DispatchDropCard({
  drop,
  onAssignDriver,
  onViewDetails,
}: DispatchDropCardProps) {
  const markReadyMutation = useMarkDropReady();
  const markOutMutation = useMarkDropOutForDelivery();

  const [error, setError] = useState<string | null>(null);

  const statusConfig = getDropStatusConfig(drop.status, drop.canMarkReady);

  const isKitchenReady = drop.status === "KITCHEN_READY";
  const isDispatchReady = drop.status === "DISPATCH_READY";
  const isOutForDelivery = drop.status === "OUT_FOR_DELIVERY";
  const isDelivered = drop.status === "DELIVERED";

  const handleMarkReady = async () => {
    setError(null);
    try {
      await markReadyMutation.mutateAsync(drop.id);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to mark drop as dispatch ready."));
    }
  };

  const handleMarkOut = async () => {
    setError(null);
    try {
      await markOutMutation.mutateAsync(drop.id);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to mark drop out for delivery."));
    }
  };

  return (
    <div className="rounded-2xl border border-[#d9d2c2] bg-white p-5 shadow-xs hover:border-[#294d33]/40 hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Header: Time, Company, Status */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#eee9dc]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#294d33] px-3 py-1 font-mono text-xs font-black text-white shadow-xs">
                <Clock size={13} className="text-[#d8bd83]" />
                {drop.deliveryTime}
              </span>

              <span className="rounded-md bg-[#f3efe6] px-2 py-0.5 text-[11px] font-bold text-[#294d33] border border-[#e5dfd2]">
                {drop.ordersCount} {drop.ordersCount === 1 ? "Order" : "Orders"}
              </span>
            </div>

            <h4 className="font-extrabold text-base text-[#26352a] flex items-center gap-1.5 pt-0.5">
              <Building2 size={15} className="text-[#78857a]" />
              <span>{drop.company.name}</span>
            </h4>
          </div>

          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Action Error Banner */}
        {error && (
          <div className="mt-2 rounded-lg bg-[#fff5f5] p-2 text-[11px] text-[#a34747] border border-[#ffdada] flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-[#a34747] font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Destination & Drop-off details */}
        <div className="mt-3 space-y-1.5 text-xs text-[#5c685e]">
          <p className="flex items-start gap-1.5 leading-tight">
            <MapPin size={13} className="text-[#294d33] shrink-0 mt-0.5" />
            <span className="font-medium text-[#26352a]">
              {drop.address.street || "Company Destination"}
              {drop.address.unit && ` (${drop.address.unit})`}
              {drop.address.city && `, ${drop.address.city}`}
            </span>
          </p>

          {drop.address.deliveryInstructions && (
            <p className="flex items-center gap-1.5 text-[11px] text-[#78857a] italic truncate">
              <FileText size={11} className="shrink-0" />
              <span className="truncate">"{drop.address.deliveryInstructions}"</span>
            </p>
          )}
        </div>

        {/* Assigned Driver Box */}
        <div className="mt-3 rounded-xl bg-[#fbfaf6] p-2.5 border border-[#eee9dc] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#294d33]/10 text-[#294d33]">
              <Truck size={14} />
            </div>
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-[#78857a] block">Driver:</span>
              <span className="text-xs font-semibold text-[#26352a] truncate block">
                {drop.driver?.name || (
                  <span className="text-[#a05a18] font-normal italic">Unassigned</span>
                )}
              </span>
            </div>
          </div>

          {!isDelivered && (
            <button
              type="button"
              onClick={() => onAssignDriver(drop)}
              className="rounded-lg border border-[#d9d2c2] bg-white px-2.5 py-1 text-[11px] font-bold text-[#294d33] hover:bg-[#ede8db] transition-all cursor-pointer shadow-2xs"
            >
              {drop.driver ? "Change" : "Assign"}
            </button>
          )}
        </div>

        {/* SLA On Time indicator if delivered */}
        {isDelivered && (
          <div className="mt-3 pt-2 border-t border-[#eee9dc] flex items-center justify-between text-xs">
            <span className="text-[#78857a]">SLA Result:</span>
            {drop.isOnTime ? (
              <span className="text-[#294d33] font-bold flex items-center gap-1 text-[11px] bg-[#294d33]/10 px-2 py-0.5 rounded">
                <CheckCircle2 size={12} />
                <span>ON TIME</span>
              </span>
            ) : (
              <span className="text-[#dc2626] font-bold flex items-center gap-1 text-[11px] bg-[#dc2626]/10 px-2 py-0.5 rounded">
                <AlertCircle size={12} />
                <span>LATE DELIVERY</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-[#eee9dc] space-y-2">
        {isKitchenReady && (
          <>
            {!drop.canMarkReady ? (
              <button
                type="button"
                disabled={true}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#fde68a] bg-[#fffbf0] py-2.5 text-xs font-bold text-[#b45309] shadow-2xs cursor-not-allowed opacity-90"
              >
                <Clock size={14} className="text-[#d97706] animate-pulse" />
                <span>Kitchen Pending (In Preparation)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMarkReady}
                disabled={markReadyMutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#294d33] py-2.5 text-xs font-bold text-white hover:bg-[#1e3825] transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Package size={14} className="text-[#d8bd83]" />
                <span>{markReadyMutation.isPending ? "Packing..." : "Mark Dispatch Ready"}</span>
              </button>
            )}
          </>
        )}

        {isDispatchReady && (
          <>
            {!drop.driver ? (
              <button
                type="button"
                onClick={() => onAssignDriver(drop)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#d97706] bg-[#fffbf0] py-2.5 text-xs font-bold text-[#b45309] hover:bg-[#faeee5] transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <UserPlus size={14} />
                <span>Assign Driver Before Dispatch</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMarkOut}
                disabled={markOutMutation.isPending || !drop.canMarkOutForDelivery}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1d64b2] py-2.5 text-xs font-bold text-white hover:bg-[#154d8a] transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Navigation size={14} />
                <span>
                  {markOutMutation.isPending ? "Dispatching..." : "Mark Out for Delivery"}
                </span>
              </button>
            )}
          </>
        )}

        {isOutForDelivery && (
          <div className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#e6f0fa] py-2 text-xs font-bold text-[#1d64b2] border border-[#bad4f5]">
            <Truck size={14} className="animate-pulse" />
            <span>Out for Delivery with {drop.driver?.name || "Driver"}</span>
          </div>
        )}

        {isDelivered && (
          <div className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#f3efe6] py-2 text-xs font-bold text-[#5c685e] border border-[#e5dfd2]">
            <Check size={14} className="text-[#294d33]" />
            <span>Delivered</span>
          </div>
        )}

        {/* View Details Drawer Trigger */}
        <button
          type="button"
          onClick={() => onViewDetails(drop.id)}
          className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-[#5c685e] hover:text-[#26352a] py-1 cursor-pointer"
        >
          <span>View Drop Specifications & Attached Orders →</span>
        </button>
      </div>
    </div>
  );
}
