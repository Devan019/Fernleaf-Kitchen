"use client";

import type { OrderDetail, OrderStatus } from "@/types";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileEdit,
  PackageCheck,
  Send,
  Truck,
  XCircle,
} from "lucide-react";

interface OrderTimelineProps {
  order: OrderDetail;
}

const STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: "DRAFT", label: "Draft Created", icon: FileEdit },
  { status: "PLACED", label: "Order Placed", icon: Send },
  { status: "CONFIRMED", label: "Cut-off Confirmed", icon: CheckCircle2 },
  { status: "DELIVERED", label: "Delivered", icon: PackageCheck },
];

export function OrderTimeline({ order }: OrderTimelineProps) {
  const currentStatus = order.status;
  const isCancelled = currentStatus === "CANCELLED";
  const isRejected = currentStatus === "REJECTED";

  const getStepState = (stepStatus: OrderStatus) => {
    if (isCancelled || isRejected) {
      if (stepStatus === "DRAFT") return "completed";
      if (stepStatus === "PLACED" && order.placedAt) return "completed";
      if (stepStatus === "CONFIRMED" && order.confirmedAt) return "completed";
      return "inactive";
    }

    const orderIndexMap: Record<OrderStatus, number> = {
      DRAFT: 0,
      PLACED: 1,
      CONFIRMED: 2,
      DELIVERED: 3,
      CANCELLED: -1,
      REJECTED: -1,
    };

    const currentIdx = orderIndexMap[currentStatus] ?? 0;
    const stepIdx = orderIndexMap[stepStatus] ?? 0;

    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "current";
    return "upcoming";
  };

  return (
    <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
          <Clock size={15} className="text-[#294d33]" />
          Order Lifecycle & Timeline
        </h3>
        <span className="text-[11px] font-mono text-[#78857a]">
          {order.orderNumber}
        </span>
      </div>

      {/* Visual Step Progress */}
      {!isCancelled && !isRejected ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STEPS.map((step, idx) => {
            const state = getStepState(step.status);
            const Icon = step.icon;
            return (
              <div
                key={step.status}
                className={`relative rounded-2xl p-3.5 border transition-all ${
                  state === "current"
                    ? "bg-[#294d33] text-white border-[#294d33] shadow-sm"
                    : state === "completed"
                      ? "bg-[#f5f1e6] text-[#26352a] border-[#eae5d8]"
                      : "bg-[#fbfaf6] text-[#9fa89e] border-[#eee9dc]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon
                    size={16}
                    className={
                      state === "current"
                        ? "text-[#d8bd83]"
                        : state === "completed"
                          ? "text-[#294d33]"
                          : "text-[#9fa89e]"
                    }
                  />
                  <span className="text-xs font-bold">
                    {step.label}
                  </span>
                </div>
                <p className="text-[10px] opacity-80">
                  {step.status === "DRAFT" && order.createdAt && new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {step.status === "PLACED" && (order.placedAt ? new Date(order.placedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Pending submit")}
                  {step.status === "CONFIRMED" && (order.confirmedAt ? new Date(order.confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Awaiting cut-off")}
                  {step.status === "DELIVERED" && (order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "In preparation")}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          isCancelled ? "bg-[#fff5f5] border-[#ffdada] text-[#a34747]" : "bg-[#fff8e6] border-[#ffd880] text-[#8a6000]"
        }`}>
          {isCancelled ? <XCircle size={22} /> : <AlertCircle size={22} />}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider">
              {isCancelled ? "Order Cancelled" : "Order Rejected"}
            </h4>
            <p className="text-[11px] mt-0.5 opacity-90">
              {isCancelled
                ? "This order was cancelled and will not be prepared or delivered."
                : "This order was rejected by administration or kitchen management."}
            </p>
          </div>
        </div>
      )}

      {/* Status History Log */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#eae5d8]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
            Activity Log
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {order.statusHistory.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between p-2 rounded-xl bg-[#fbfaf6] border border-[#eee9dc] text-xs text-[#5c685e]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[10px] text-[#294d33] bg-[#294d33]/10 px-1.5 py-0.5 rounded">
                    {h.toStatus}
                  </span>
                  <span>{h.note || "Status updated"}</span>
                </div>
                <span className="text-[10px] text-[#9fa89e] font-mono">
                  {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
