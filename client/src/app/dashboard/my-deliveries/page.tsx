"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DeliverDropModal } from "@/features/dispatch/DeliverDropModal";
import { DropDetailDrawer } from "@/features/dispatch/DropDetailDrawer";
import { useDriverTodayDrops } from "@/features/dispatch/useDispatch";
import { getErrorMessage } from "@/lib/utils/errors";
import type { DeliveryDrop } from "@/types";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function MyDeliveriesPage() {
  const [deliveringDrop, setDeliveringDrop] = useState<DeliveryDrop | null>(null);
  const [inspectingDropId, setInspectingDropId] = useState<string | null>(null);

  const {
    data: todayData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDriverTodayDrops({ refetchInterval: 20000 });

  const rawDrops = todayData?.drops ?? [];

  // Sort strictly by delivery time ascending
  const drops = useMemo(() => {
    return [...rawDrops].sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime));
  }, [rawDrops]);

  const totalDrops = drops.length;
  const completedDrops = drops.filter((d) => d.status === "DELIVERED").length;
  const activeDrops = drops.filter((d) => d.status !== "DELIVERED").length;

  return (
    <ProtectedRoute requiredRole={["DRIVER", "ADMIN"]}>
      <Header title="My Deliveries" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 ">
        {/* Driver Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#eae5d8]">
          <div>
            <h1 className="text-2xl font-black font-serif text-[#26352a]">
              My Deliveries
            </h1>
            <p className="text-xs text-[#5c685e] mt-0.5">
              Today&apos;s personal route schedule and delivery drop confirmations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9d2c2] bg-white px-3 py-1.5 text-xs font-bold text-[#26352a] hover:bg-[#fbfaf6] shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
              <span>Refresh Schedule</span>
            </button>
          </div>
        </div>

        {/* ── Today's Progress Summary ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
              Total Today
            </span>
            <p className="text-2xl font-black font-serif text-[#26352a]">{totalDrops}</p>
          </div>

          <div className="rounded-2xl border border-[#1d64b2]/20 bg-[#e6f0fa] p-3.5 shadow-xs text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d64b2] block">
              Remaining
            </span>
            <p className="text-2xl font-black font-serif text-[#1d64b2]">{activeDrops}</p>
          </div>

          <div className="rounded-2xl border border-[#294d33]/20 bg-[#eaf0eb] p-3.5 shadow-xs text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#294d33] block">
              Delivered
            </span>
            <p className="text-2xl font-black font-serif text-[#294d33]">{completedDrops}</p>
          </div>
        </div>

        {/* ── Driver Drops Timeline List (Mobile First) ───────────────────── */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl border border-[#d9d2c2] bg-white p-5 animate-pulse space-y-3"
              >
                <div className="h-5 bg-[#f3efe6] rounded w-1/4" />
                <div className="h-4 bg-[#f3efe6] rounded w-2/3" />
                <div className="h-10 bg-[#fbfaf6] rounded-xl" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-[#ffdada] bg-[#fff5f5] p-6 text-center space-y-3">
            <AlertCircle size={28} className="mx-auto text-[#a34747]" />
            <h3 className="font-bold text-sm text-[#a34747]">
              Failed to Load Driver Schedule
            </h3>
            <p className="text-xs text-[#5c685e]">
              {getErrorMessage(error, "Could not load assigned drops.")}
            </p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : drops.length === 0 ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-[#294d33] mb-3" />
            <h3 className="text-lg font-bold font-serif text-[#26352a]">
              No Deliveries Scheduled Today
            </h3>
            <p className="text-xs text-[#5c685e] max-w-sm mx-auto mt-1">
              You&apos;re all clear for today! Check back later or contact Dispatch when new catering routes are assigned.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {drops.map((drop, idx) => {
              const isDelivered = drop.status === "DELIVERED";
              const isOutForDelivery = drop.status === "OUT_FOR_DELIVERY";

              return (
                <div
                  key={drop.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all space-y-4 ${
                    isOutForDelivery
                      ? "border-[#1d64b2] ring-2 ring-[#1d64b2]/20 shadow-md"
                      : isDelivered
                      ? "border-[#eae5d8] bg-[#fbfaf6]/70 opacity-90"
                      : "border-[#d9d2c2]"
                  }`}
                >
                  {/* Card Header: Stop Number + Time + Status */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#eee9dc]">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#26352a] text-white font-mono text-xs font-black shadow-xs">
                        #{idx + 1}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#294d33] px-3 py-1 font-mono text-sm font-black text-white shadow-xs">
                        <Clock size={14} className="text-[#d8bd83]" />
                        {drop.deliveryTime}
                      </span>

                      <span className="rounded-md bg-[#f3efe6] px-2 py-0.5 text-xs font-bold text-[#294d33] border border-[#e5dfd2]">
                        {drop.ordersCount} {drop.ordersCount === 1 ? "Order" : "Orders"}
                      </span>
                    </div>

                    {isDelivered ? (
                      <span className="rounded-lg bg-[#294d33]/15 text-[#294d33] px-2.5 py-1 text-xs font-bold flex items-center gap-1">
                        <Check size={13} />
                        <span>Delivered</span>
                      </span>
                    ) : isOutForDelivery ? (
                      <span className="rounded-lg bg-[#1d64b2]/15 text-[#1d64b2] px-2.5 py-1 text-xs font-bold flex items-center gap-1">
                        <Truck size={13} />
                        <span>Out for Delivery</span>
                      </span>
                    ) : (
                      <span className="rounded-lg bg-[#faeee5] text-[#e27d34] px-2.5 py-1 text-xs font-bold border border-[#f5d0b5]">
                        {drop.status}
                      </span>
                    )}
                  </div>

                  {/* Destination Information */}
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold text-[#26352a] flex items-center gap-1.5">
                      <Building2 size={16} className="text-[#294d33]" />
                      <span>{drop.company.name}</span>
                    </h3>

                    <p className="text-xs font-semibold text-[#26352a] flex items-start gap-1.5 leading-snug">
                      <MapPin size={14} className="text-[#294d33] shrink-0 mt-0.5" />
                      <span>
                        {drop.address.street || "Company Destination"}
                        {drop.address.unit && ` (${drop.address.unit})`}
                        {drop.address.city && `, ${drop.address.city}`}
                        {drop.address.postcode && ` ${drop.address.postcode}`}
                      </span>
                    </p>
                  </div>

                  {/* Driver Instructions Banner */}
                  {(drop.company.standingDriverInstructions || drop.address.deliveryInstructions) && (
                    <div className="rounded-xl bg-[#fff9f0] p-3 border border-[#fae2c5] text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a05a18] block flex items-center gap-1">
                        <FileText size={12} />
                        <span>Driver Delivery Notes:</span>
                      </span>
                      {drop.company.standingDriverInstructions && (
                        <p className="text-[#60492c] italic">
                          &quot;{drop.company.standingDriverInstructions}&quot;
                        </p>
                      )}
                      {drop.address.deliveryInstructions && (
                        <p className="text-[#60492c] italic">
                          &quot;{drop.address.deliveryInstructions}&quot;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Delivered Confirmation Info */}
                  {isDelivered && (
                    <div className="rounded-xl bg-[#f5f1e6] p-3 border border-[#eae5d8] text-xs flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-[#5c685e]">
                        <CheckCircle2 size={14} className="text-[#294d33]" />
                        <span>
                          Delivered at{" "}
                          {drop.deliveredAt
                            ? new Date(drop.deliveredAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : drop.deliveryTime}
                        </span>
                      </div>

                      {drop.isOnTime ? (
                        <span className="rounded bg-[#294d33]/10 text-[#294d33] px-2 py-0.5 text-[11px] font-bold">
                          ON TIME
                        </span>
                      ) : (
                        <span className="rounded bg-[#dc2626]/10 text-[#dc2626] px-2 py-0.5 text-[11px] font-bold">
                          LATE
                        </span>
                      )}
                    </div>
                  )}

                  {/* ── Actions ──────────────────────────────────────────────── */}
                  <div className="pt-2 flex items-center gap-2.5">
                    {/* Inspect attached orders */}
                    <button
                      type="button"
                      onClick={() => setInspectingDropId(drop.id)}
                      className="flex-1 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] py-2.5 text-xs font-bold text-[#26352a] hover:bg-[#ede8db] transition-all cursor-pointer shadow-xs text-center"
                    >
                      <span>View Orders ({drop.ordersCount})</span>
                    </button>

                    {/* Complete Delivery Action */}
                    {!isDelivered && (
                      <button
                        type="button"
                        onClick={() => setDeliveringDrop(drop)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#294d33] py-2.5 text-xs font-black text-white hover:bg-[#1e3825] transition-all shadow-md cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 size={15} className="text-[#d8bd83]" />
                        <span>Mark Delivered</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Deliver Drop Confirmation Modal */}
      {deliveringDrop && (
        <DeliverDropModal
          open={Boolean(deliveringDrop)}
          onClose={() => setDeliveringDrop(null)}
          drop={deliveringDrop}
        />
      )}

      {/* Drop Detail Modal */}
      {inspectingDropId && (
        <DropDetailDrawer
          open={Boolean(inspectingDropId)}
          onClose={() => setInspectingDropId(null)}
          dropId={inspectingDropId}
          isDriver={true}
        />
      )}
    </ProtectedRoute>
  );
}
