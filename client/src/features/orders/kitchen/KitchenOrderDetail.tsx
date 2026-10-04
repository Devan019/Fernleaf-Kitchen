import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrderTimeline } from "@/features/orders/OrderTimeline";
import type { OrderDetail, OrderStatus } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  Layers,
  MapPin,
  Package,
  User,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

interface KitchenOrderDetailProps {
  order: OrderDetail;
}

export function KitchenOrderDetail({ order }: KitchenOrderDetailProps) {
  const router = useRouter();
  const badge = STATUS_BADGE_MAP[order.status] ?? { variant: "default", label: order.status };

  const lines = order.lines ?? [];
  const totalPortions = lines.reduce((acc, l) => acc + (l.quantity || 0), 0);

  return (
    <>
      <Header title={`Kitchen Prep · ${order.orderNumber}`} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Navigation Back */}
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#5c685e] hover:text-[#26352a] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Kitchen Orders Board
          </Link>
        </div>

        {/* ── Kitchen Operational Header ───────────────────────────────────── */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xl font-black text-[#26352a]">
                {order.orderNumber}
              </span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#5c685e] flex-wrap pt-1">
              <span className="inline-flex items-center gap-1.5 font-mono font-bold text-sm bg-[#294d33] text-white px-3 py-1 rounded-xl shadow-xs">
                <Clock size={14} className="text-[#d8bd83]" />
                {order.deliveryTime || "12:00"} DELIVERY
              </span>

              <span className="font-semibold text-xs text-[#26352a] flex items-center gap-1">
                <Calendar size={13} className="text-[#78857a]" />
                {order.deliveryDate}
              </span>

              <span className="text-[#9fa89e]">·</span>

              <span className="font-semibold text-xs text-[#26352a] flex items-center gap-1">
                <User size={13} className="text-[#294d33]" />
                {order.employeeName}
              </span>

              <span className="font-normal text-xs text-[#5c685e] flex items-center gap-1">
                <Building2 size={12} className="text-[#78857a]" />
                {order.companyName}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#eae5d8] bg-[#fbfaf6] px-4 py-2.5 text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
              Total Preparation Count
            </span>
            <span className="text-xl font-black font-serif text-[#294d33]">
              {totalPortions} {totalPortions === 1 ? "portion" : "portions"}
            </span>
          </div>
        </div>

        {/* ── SECTION 1: ITEMS TO PREPARE (Primary / Largest Focus) ────────── */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#eee9dc]">
            <div>
              <h2 className="text-lg font-black font-serif text-[#26352a] flex items-center gap-2">
                <Flame size={20} className="text-[#e27d34]" />
                ITEMS TO PREPARE
              </h2>
              <p className="text-xs text-[#5c685e]">
                Cook and assemble the requested dishes and portion options exactly as specified.
              </p>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#78857a] italic">
              No dish line items found in this order.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {lines.map((line, idx) => (
                <div
                  key={line.id || idx}
                  className="rounded-2xl border-2 border-[#294d33]/20 bg-[#fbfaf6] p-5 shadow-xs space-y-3 hover:border-[#294d33]/40 transition-all"
                >
                  {/* Dish Header with prominent Quantity */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#eae5d8]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 min-w-[48px] items-center justify-center rounded-xl bg-[#294d33] text-white font-mono text-lg font-black px-2.5 shadow-xs">
                        ×{line.quantity}
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-[#26352a]">
                          {line.dishName}
                        </h3>
                        {line.dishSku && (
                          <span className="font-mono text-xs text-[#78857a]">
                            SKU: {line.dishSku}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Option Combinations Breakdown */}
                  {line.combinations && line.combinations.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5c685e] block">
                        Preparation Choices & Combinations:
                      </span>
                      {line.combinations.map((comb, cIdx) => (
                        <div
                          key={comb.id || cIdx}
                          className="rounded-xl bg-white p-3 border border-[#d9d2c2] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            {comb.quantity > 1 && (
                              <span className="rounded-md bg-[#294d33]/15 text-[#294d33] px-1.5 py-0.5 font-mono text-xs font-bold">
                                {comb.quantity} servings:
                              </span>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {comb.options?.map((opt) => (
                                <span
                                  key={opt.id}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#f5f1e6] px-2 py-1 text-xs font-medium text-[#26352a] border border-[#eae5d8]"
                                >
                                  <span className="text-[#78857a] text-[10px]">
                                    {opt.optionGroupName}:
                                  </span>
                                  <span className="font-bold text-[#294d33]">
                                    {opt.optionName}
                                  </span>
                                  {opt.portionSizeName && (
                                    <span className="rounded bg-white px-1 py-0.2 text-[10px] font-semibold text-[#60492c] border border-[#d9d2c2]">
                                      {opt.portionSizeName}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECTION 2 & 3: DELIVERY & CUSTOMER DETAILS ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Delivery Details */}
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold font-serif text-[#26352a] flex items-center gap-2">
              <Package size={18} className="text-[#294d33]" />
              Delivery & Dispatch Instructions
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc]">
                <span className="text-[#78857a]">Target Arrival Time:</span>
                <span className="font-mono font-bold text-sm text-[#26352a]">
                  ⏰ {order.deliveryTime || "12:00"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc]">
                <span className="text-[#78857a]">Packaging Requirement:</span>
                <span className="font-bold text-xs text-[#294d33] bg-[#294d33]/10 px-2 py-0.5 rounded-lg">
                  📦 {order.packagingType || "ECO_BOX"}
                </span>
              </div>

              {order.deliveryAddress && (
                <div className="rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
                    Delivery Drop-Off Location:
                  </span>
                  <p className="font-semibold text-xs text-[#26352a]">
                    📍 {order.deliveryAddress.deliveryAddressLabel || "Company Address"}
                  </p>
                  {order.deliveryAddress.deliveryStreet && (
                    <p className="text-[11px] text-[#5c685e]">
                      {order.deliveryAddress.deliveryStreet}
                      {order.deliveryAddress.deliveryUnit && ` (${order.deliveryAddress.deliveryUnit})`}
                    </p>
                  )}
                  {order.deliveryAddress.deliveryCity && (
                    <p className="text-[11px] text-[#78857a]">
                      {order.deliveryAddress.deliveryCity} {order.deliveryAddress.deliveryPostcode}
                    </p>
                  )}
                </div>
              )}

              {order.deliveryInstructions && (
                <div className="rounded-xl bg-[#fff9f0] p-3 border border-[#fae2c5] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#a05a18] block flex items-center gap-1">
                    <FileText size={12} />
                    Special Kitchen / Delivery Instructions:
                  </span>
                  <p className="text-xs text-[#60492c] italic leading-relaxed">
                    "{order.deliveryInstructions}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold font-serif text-[#26352a] flex items-center gap-2">
              <User size={18} className="text-[#294d33]" />
              Customer & Corporate Client
            </h3>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
                  Employee Customer:
                </span>
                <p className="font-bold text-sm text-[#26352a]">
                  👤 {order.employeeName}
                </p>
              </div>

              <div className="rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
                  Corporate Company:
                </span>
                <p className="font-bold text-sm text-[#26352a]">
                  🏢 {order.companyName}
                </p>
              </div>

              {/* Order Status Timeline (compact) */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block mb-2">
                  Order Status Progression:
                </span>
                <OrderTimeline order={order} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
