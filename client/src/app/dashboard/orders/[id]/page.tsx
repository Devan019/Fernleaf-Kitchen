"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AdminOverrideModal } from "@/features/orders/AdminOverrideModal";
import { CancelOrderModal } from "@/features/orders/CancelOrderModal";
import { OrderTimeline } from "@/features/orders/OrderTimeline";
import {
  useAdminOverrideDelivery,
  useCancelOrder,
  useOrder,
  usePlaceOrder,
} from "@/features/orders/useOrders";
import { getErrorMessage } from "@/lib/utils/errors";
import type { AdminOverrideDeliveryRequest, OrderStatus } from "@/types";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  MapPin,
  Receipt,
  Send,
  ShieldAlert,
  Trash2,
  Truck,
  User,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_BADGE_MAP: Record<
  OrderStatus,
  { variant: "active" | "inactive" | "kitchen" | "dispatch" | "default"; label: string }
> = {
  DRAFT: { variant: "default", label: "Draft" },
  PLACED: { variant: "kitchen", label: "Placed" },
  CONFIRMED: { variant: "active", label: "Confirmed" },
  DELIVERED: { variant: "dispatch", label: "Delivered" },
  CANCELLED: { variant: "inactive", label: "Cancelled" },
  REJECTED: { variant: "inactive", label: "Rejected" },
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = String(params?.id || params?.orderId || "");

  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  const { data: order, isLoading, isError, error } = useOrder(orderId);

  // Mutations
  const placeOrderMutation = usePlaceOrder();
  const cancelOrderMutation = useCancelOrder();
  const overrideDeliveryMutation = useAdminOverrideDelivery();

  // Modals
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handlePlaceDraft = async () => {
    setActionError(null);
    try {
      await placeOrderMutation.mutateAsync(orderId);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to place draft order."));
    }
  };

  const handleCancelOrder = async (id: string, reason?: string) => {
    setActionError(null);
    try {
      await cancelOrderMutation.mutateAsync({ id, reason });
      setCancelModalOpen(false);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to cancel order."));
    }
  };

  const handleApplyOverride = async (data: AdminOverrideDeliveryRequest) => {
    setActionError(null);
    try {
      await overrideDeliveryMutation.mutateAsync({ id: orderId, data });
      setOverrideModalOpen(false);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to apply delivery override."));
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole={["ADMIN", "KITCHEN"]}>
        <Header title="Order Details" />
        <main className="flex-1 p-8 space-y-6">
          <div className="h-8 w-48 bg-[#eae5d8] rounded-xl animate-pulse" />
          <div className="h-48 bg-white rounded-3xl border border-[#d9d2c2] animate-pulse" />
        </main>
      </ProtectedRoute>
    );
  }

  if (isError || !order) {
    return (
      <ProtectedRoute requiredRole={["ADMIN", "KITCHEN"]}>
        <Header title="Order Not Found" />
        <main className="flex-1 p-8">
          <div className="rounded-2xl bg-[#fff5f5] p-6 text-sm text-[#a34747] border border-[#ffdada] space-y-3">
            <p className="font-bold text-base">Error Loading Order</p>
            <p>{getErrorMessage(error, "The requested order could not be retrieved or does not exist.")}</p>
            <Button
              variant="secondary"
              icon={<ArrowLeft size={14} />}
              onClick={() => router.push("/dashboard/orders")}
            >
              Back to Orders
            </Button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const badge = STATUS_BADGE_MAP[order.status] ?? { variant: "default", label: order.status };
  const isDraft = order.status === "DRAFT";
  const isDelivered = order.status === "DELIVERED";
  const isCancelled = order.status === "CANCELLED";

  const canCancel = isAdmin && !isDelivered && !isCancelled;

  return (
    <ProtectedRoute requiredRole={["ADMIN", "KITCHEN"]}>
      <Header title={order.orderNumber} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Navigation Back */}
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#5c685e] hover:text-[#26352a] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Orders Roster
          </Link>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="rounded-2xl bg-[#fff5f5] p-4 text-xs text-[#a34747] border border-[#ffdada] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={18} className="shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-[#a34747] font-bold hover:underline"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#294d33] text-[#d8bd83] shadow-md border border-white/10 font-serif text-2xl font-bold">
              <Receipt size={26} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-serif text-[#26352a]">
                  {order.orderNumber}
                </h1>
                <Badge variant={badge.variant}>{badge.label}</Badge>
                {order.isInvoiced && (
                  <span className="rounded bg-[#294d33]/10 text-[#294d33] px-2 py-0.5 text-xs font-bold">
                    Invoiced
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-[#78857a] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-[#294d33]" />
                  {order.employeeName}
                </span>
                <Link
                  href={`/dashboard/companies/${order.companyId}`}
                  className="flex items-center gap-1.5 text-[#294d33] hover:underline font-semibold"
                >
                  <Building2 size={13} />
                  {order.companyName}
                </Link>
                <span className="flex items-center gap-1.5 font-mono">
                  <Calendar size={13} className="text-[#294d33]" />
                  Delivery: {order.deliveryDate} @ {order.deliveryTime ?? "12:00"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isDraft && (
              <Button
                variant="primary"
                icon={<Send size={14} />}
                onClick={handlePlaceDraft}
                loading={placeOrderMutation.isPending}
              >
                Place Draft Order
              </Button>
            )}

            {isAdmin && !isDelivered && !isCancelled && (
              <Button
                variant="secondary"
                icon={<Truck size={14} />}
                onClick={() => setOverrideModalOpen(true)}
              >
                Admin Delivery Override
              </Button>
            )}

            {canCancel && (
              <Button
                variant="ghost"
                icon={<Trash2 size={14} className="text-[#a34747]" />}
                onClick={() => setCancelModalOpen(true)}
              >
                Cancel Order
              </Button>
            )}
          </div>
        </div>

        {/* Timeline Lifecycle */}
        <OrderTimeline order={order} />

        {/* ── Main Details Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ── Left 2 Columns: Order Lines & Item Snapshots ───────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                  <UtensilsCrossed size={15} className="text-[#294d33]" />
                  Ordered Items & Snapshot Pricing
                </h3>
                <span className="font-mono text-xs text-[#78857a]">
                  {order.lines.length} Line Item(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Order line items">
                  <thead>
                    <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                        Dish & Options
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-[#5c685e] uppercase">
                        Unit Snapshot
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-[#5c685e] uppercase">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee9dc]">
                    {order.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-[#fbfaf6]">
                        {/* Dish & Options */}
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-xs text-[#26352a]">{line.dishName}</p>
                          {/* Combinations and options snapshot */}
                          {line.combinations && line.combinations.length > 0 && (
                            <div className="mt-1 space-y-1 pl-2 border-l-2 border-[#294d33]/30">
                              {line.combinations.map((comb) => (
                                <div key={comb.id} className="text-[11px] text-[#5c685e]">
                                  {comb.options?.map((opt) => (
                                    <p key={opt.id}>
                                      • {opt.optionGroupName}: <strong>{opt.optionName}</strong>
                                      {opt.portionSizeName && ` (${opt.portionSizeName})`}
                                      {Number(opt.finalPrice) > 0 && (
                                        <span className="text-[#78857a] ml-1 font-mono">
                                          (+${Number(opt.finalPrice).toFixed(2)})
                                        </span>
                                      )}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-3.5 font-mono text-xs text-[#5c685e]">
                          {line.dishSku || "—"}
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-3.5 font-mono font-bold text-xs text-[#26352a]">
                          {line.quantity}
                        </td>

                        {/* Unit Price */}
                        <td className="px-4 py-3.5 font-mono text-xs text-[#5c685e]">
                          ${Number(line.unitPrice).toFixed(2)}
                        </td>

                        {/* Line Total */}
                        <td className="px-4 py-3.5 font-mono font-bold text-xs text-[#26352a] text-right">
                          ${Number(line.lineTotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Right Column: Delivery & Financials ─────────────────────────── */}
          <div className="space-y-6">
            {/* Delivery Address Card */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                  <MapPin size={15} className="text-[#294d33]" />
                  Delivery Destination
                </h3>
              </div>

              <div className="space-y-3 text-xs text-[#5c685e]">
                {order.deliveryAddress ? (
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#26352a] flex items-center gap-1.5">
                      📍 {order.deliveryAddress.deliveryAddressLabel ?? "Corporate Location"}
                    </p>
                    <p>{order.deliveryAddress.deliveryStreet} {order.deliveryAddress.deliveryUnit ? `(${order.deliveryAddress.deliveryUnit})` : ""}</p>
                    <p>{order.deliveryAddress.deliveryCity}, <span className="font-mono font-bold">{order.deliveryAddress.deliveryPostcode}</span></p>
                  </div>
                ) : (
                  <p className="text-[#9fa89e] italic">Standard Company Address</p>
                )}

                <div className="pt-2 border-t border-[#eae5d8] space-y-2">
                  <div>
                    <span className="text-[#78857a] text-[11px] block">Packaging Type:</span>
                    <p className="font-semibold text-[#26352a]">📦 {order.packagingType ?? "ECO_BOX"}</p>
                  </div>

                  {order.deliveryInstructions && (
                    <div className="rounded-xl bg-[#fbfaf6] p-3 border border-[#eae5d8]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
                        Driver Instructions:
                      </span>
                      <p className="text-xs text-[#26352a] mt-1 leading-relaxed">
                        &quot;{order.deliveryInstructions}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                  <CreditCard size={15} className="text-[#294d33]" />
                  Payment & Invoice
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#5c685e]">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">${Number(order.subtotal).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-base font-bold text-[#26352a] pt-2 border-t border-[#eae5d8]">
                  <span>Total Billable:</span>
                  <span className="font-mono text-[#294d33]">${Number(order.total).toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-[#eae5d8]">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbfaf6] border border-[#eae5d8]">
                    <span className="text-xs font-medium text-[#26352a]">Invoicing Status:</span>
                    {order.isInvoiced ? (
                      <span className="rounded bg-[#294d33]/10 text-[#294d33] px-2.5 py-1 text-xs font-bold">
                        ✓ Invoiced
                      </span>
                    ) : (
                      <span className="rounded bg-[#d8bd83]/20 text-[#8c6b24] px-2.5 py-1 text-xs font-bold">
                        Pending Invoice
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Admin Override Delivery Modal */}
      {overrideModalOpen && (
        <AdminOverrideModal
          open={overrideModalOpen}
          onClose={() => setOverrideModalOpen(false)}
          order={order}
          onSubmit={handleApplyOverride}
          loading={overrideDeliveryMutation.isPending}
        />
      )}

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <CancelOrderModal
          open={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          order={order}
          onConfirm={handleCancelOrder}
          loading={cancelOrderMutation.isPending}
        />
      )}
    </ProtectedRoute>
  );
}
