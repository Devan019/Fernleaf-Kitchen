import { useOrder } from "@/features/orders/useOrders";
import type { OrderStatus, OrderSummary } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  Clock,
  MapPin,
  Package,
  User,
  Building2,
  ChevronRight,
  Flame,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Link from "next/link";

const STATUS_BADGE_MAP: Record<
  OrderStatus,
  { variant: "active" | "inactive" | "kitchen" | "dispatch" | "default"; label: string }
> = {
  DRAFT: { variant: "default", label: "Draft" },
  PLACED: { variant: "kitchen", label: "To Prepare (Placed)" },
  CONFIRMED: { variant: "active", label: "Confirmed (Cut-off)" },
  DELIVERED: { variant: "dispatch", label: "Delivered" },
  CANCELLED: { variant: "inactive", label: "Cancelled" },
  REJECTED: { variant: "inactive", label: "Rejected" },
};

interface KitchenOrderCardProps {
  order: OrderSummary;
}

export function KitchenOrderCard({ order }: KitchenOrderCardProps) {
  // Fetch detailed line items & options for this order
  const { data: orderDetail, isLoading } = useOrder(order.id);
  const badge = STATUS_BADGE_MAP[order.status] ?? { variant: "default", label: order.status };

  const lines = orderDetail?.lines ?? [];
  const totalPortions = lines.reduce((acc, l) => acc + (l.quantity || 0), 0);

  return (
    <div className="group rounded-2xl border border-[#d9d2c2] bg-white p-5 shadow-xs hover:border-[#294d33]/40 hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Top Header: Delivery Time + Order Number + Status Badge */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#eee9dc]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#294d33] px-3 py-1 text-xs font-bold text-white shadow-xs font-mono">
              <Clock size={13} className="text-[#d8bd83]" />
              {order.deliveryTime ? order.deliveryTime : "12:00"}
            </span>
            <span className="font-mono text-xs font-bold text-[#26352a] tracking-tight">
              {order.orderNumber}
            </span>
          </div>

          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        {/* Customer & Company */}
        <div className="pt-3 pb-2 flex items-center justify-between text-xs text-[#5c685e]">
          <div className="flex items-center gap-1.5 font-semibold text-[#26352a]">
            <User size={13} className="text-[#294d33]" />
            <span>{order.employeeName}</span>
            <span className="text-[#9fa89e]">·</span>
            <span className="font-normal text-[#5c685e] flex items-center gap-1">
              <Building2 size={12} className="text-[#78857a]" />
              {order.companyName}
            </span>
          </div>

          {totalPortions > 0 && (
            <span className="rounded-md bg-[#f5f1e6] px-2 py-0.5 text-[11px] font-bold text-[#294d33] border border-[#eae5d8]">
              {totalPortions} {totalPortions === 1 ? "dish" : "dishes"}
            </span>
          )}
        </div>

        {/* Dishes & Quantities List */}
        <div className="mt-2 space-y-2.5">
          {isLoading ? (
            <div className="space-y-2 py-3">
              <div className="h-4 bg-[#f3efe6] rounded-md animate-pulse w-3/4" />
              <div className="h-3 bg-[#f3efe6] rounded-md animate-pulse w-1/2" />
            </div>
          ) : lines.length === 0 ? (
            <div className="py-2 text-xs text-[#78857a] italic">
              {order.linesCount ? `${order.linesCount} items in order` : "No items specified"}
            </div>
          ) : (
            lines.map((line) => (
              <div
                key={line.id}
                className="rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc] space-y-1.5"
              >
                {/* Dish Name & Quantity */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 min-w-[28px] items-center justify-center rounded-lg bg-[#294d33]/15 text-[#294d33] font-mono text-xs font-extrabold px-1.5">
                      ×{line.quantity}
                    </span>
                    <span className="font-semibold text-xs text-[#26352a] line-clamp-1">
                      {line.dishName}
                    </span>
                  </div>
                  {line.dishSku && (
                    <span className="text-[10px] font-mono text-[#9fa89e] shrink-0">
                      {line.dishSku}
                    </span>
                  )}
                </div>

                {/* Selected Options */}
                {line.combinations && line.combinations.length > 0 && (
                  <div className="pl-9 space-y-1">
                    {line.combinations.map((comb, cIdx) => (
                      <div key={comb.id || cIdx} className="text-[11px] text-[#5c685e]">
                        {comb.options && comb.options.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {comb.options.map((opt) => (
                              <span
                                key={opt.id}
                                className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#4c594f] border border-[#e5dfd2]"
                              >
                                <span className="font-semibold text-[#294d33]">{opt.optionName}</span>
                                {opt.portionSizeName && (
                                  <span className="text-[9px] text-[#78857a]">({opt.portionSizeName})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Packaging & Delivery Instructions */}
        <div className="mt-3 pt-2.5 border-t border-[#eee9dc] flex flex-col gap-1 text-[11px] text-[#5c685e]">
          <div className="flex items-center gap-1.5">
            <Package size={12} className="text-[#294d33] shrink-0" />
            <span>Packaging:</span>
            <span className="font-semibold text-[#26352a]">
              {order.packagingType || "ECO_BOX"}
            </span>
          </div>

          {orderDetail?.deliveryAddress && (
            <div className="flex items-center gap-1.5 text-[#5c685e] truncate">
              <MapPin size={12} className="text-[#294d33] shrink-0" />
              <span className="truncate">
                {orderDetail.deliveryAddress.deliveryAddressLabel ||
                  orderDetail.deliveryAddress.deliveryStreet ||
                  "HQ Delivery Location"}
              </span>
            </div>
          )}

          {orderDetail?.deliveryInstructions && (
            <div className="flex items-center gap-1.5 text-[#78857a] italic truncate">
              <FileText size={12} className="shrink-0 text-[#9fa89e]" />
              <span className="truncate">"{orderDetail.deliveryInstructions}"</span>
            </div>
          )}
        </div>
      </div>

     
    </div>
  );
}
