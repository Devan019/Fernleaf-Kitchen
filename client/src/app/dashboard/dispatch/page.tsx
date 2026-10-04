"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AssignDriverModal } from "@/features/dispatch/AssignDriverModal";
import { DispatchDropCard } from "@/features/dispatch/DispatchDropCard";
import { DropDetailDrawer } from "@/features/dispatch/DropDetailDrawer";
import { useDispatchBoard, useDispatchDrivers } from "@/features/dispatch/useDispatch";
import { getErrorMessage } from "@/lib/utils/errors";
import type { DeliveryDrop, DeliveryDropStatus } from "@/types";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Navigation,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  User,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function offsetDate(dateStr: string, days: number): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return dateStr;
  }
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
    const formatted = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).toUpperCase();
    return `${dayName} · ${formatted}`;
  } catch {
    return dateStr;
  }
}

export default function DispatchBoardPage() {
  const [deliveryDate, setDeliveryDate] = useState<string>(getTodayStr());
  const [statusFilter, setStatusFilter] = useState<
    DeliveryDropStatus | "KITCHEN_PENDING" | "ALL"
  >("ALL");
  const [driverFilter, setDriverFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modals state
  const [assigningDrop, setAssigningDrop] = useState<DeliveryDrop | null>(null);
  const [inspectingDropId, setInspectingDropId] = useState<string | null>(null);

  // Fetch Dispatch Board with background polling
  const {
    data: boardData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDispatchBoard(
    { deliveryDate },
    { refetchInterval: 25000 }
  );

  // Fetch Drivers for dropdown filter
  const { data: driversData } = useDispatchDrivers();
  const drivers = driversData ?? [];

  const drops = boardData?.drops ?? [];

  // Metrics
  const metrics = useMemo(() => {
    const totalDrops = drops.length;
    const totalOrders = drops.reduce((acc, d) => acc + (d.ordersCount || 0), 0);
    const kitchenPending = drops.filter(
      (d) => d.status === "KITCHEN_READY" && !d.canMarkReady
    ).length;
    const kitchenReady = drops.filter(
      (d) => d.status === "KITCHEN_READY" && d.canMarkReady
    ).length;
    const dispatchReady = drops.filter((d) => d.status === "DISPATCH_READY").length;
    const outForDelivery = drops.filter((d) => d.status === "OUT_FOR_DELIVERY").length;
    const delivered = drops.filter((d) => d.status === "DELIVERED").length;
    const unassigned = drops.filter((d) => !d.driver && d.status !== "DELIVERED").length;
    return {
      totalDrops,
      totalOrders,
      kitchenPending,
      kitchenReady,
      dispatchReady,
      outForDelivery,
      delivered,
      unassigned,
    };
  }, [drops]);

  // Filtered Drops
  const filteredDrops = useMemo(() => {
    return drops.filter((drop) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCompany = drop.company.name.toLowerCase().includes(q);
        const matchStreet = (drop.address.street || "").toLowerCase().includes(q);
        const matchCity = (drop.address.city || "").toLowerCase().includes(q);
        const matchDriver = (drop.driver?.name || "").toLowerCase().includes(q);
        if (!matchCompany && !matchStreet && !matchCity && !matchDriver) return false;
      }

      // Status
      if (statusFilter === "KITCHEN_PENDING") {
        if (drop.status !== "KITCHEN_READY" || drop.canMarkReady) return false;
      } else if (statusFilter === "KITCHEN_READY") {
        if (drop.status !== "KITCHEN_READY" || !drop.canMarkReady) return false;
      } else if (statusFilter !== "ALL") {
        if (drop.status !== statusFilter) return false;
      }

      // Driver
      if (driverFilter === "UNASSIGNED") {
        if (drop.driver) return false;
      } else if (driverFilter !== "ALL") {
        if (drop.driver?.id !== driverFilter) return false;
      }

      return true;
    });
  }, [drops, search, statusFilter, driverFilter]);

  return (
    <ProtectedRoute requiredRole={["ADMIN", "DISPATCH"]}>
      <Header title="Dispatch Board" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Dispatch Board"
          description="Manage today's delivery drops, driver assignments, and vehicle route fulfillment."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                icon={<RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />}
                onClick={() => refetch()}
              >
                Refresh Board
              </Button>
            </div>
          }
        />

        {/* ── Primary Delivery Date Navigation Control ─────────────────────── */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Previous Day */}
          <button
            type="button"
            onClick={() => setDeliveryDate((prev) => offsetDate(prev, -1))}
            className="flex items-center gap-1.5 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 py-2 text-xs font-bold text-[#26352a] hover:bg-[#ede8db] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <ChevronLeft size={16} />
            <span>Previous Day</span>
          </button>

          {/* Center Date & Total Counts */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center">
            <div>
              <p className="font-serif text-lg font-black text-[#26352a] tracking-wide">
                {formatDisplayDate(deliveryDate)}
              </p>
              <p className="text-xs font-bold text-[#294d33] flex items-center justify-center gap-1.5">
                <span>{metrics.totalDrops} Drops</span>
                <span className="text-[#9fa89e]">·</span>
                <span>{metrics.totalOrders} Total Orders</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="h-9 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs font-semibold text-[#26352a] focus:border-[#294d33] focus:outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setDeliveryDate(getTodayStr())}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  deliveryDate === getTodayStr()
                    ? "bg-[#294d33] text-white shadow-xs"
                    : "bg-[#f3efe6] text-[#5c685e] hover:bg-[#ede8db]"
                }`}
              >
                Today
              </button>
            </div>
          </div>

          {/* Next Day */}
          <button
            type="button"
            onClick={() => setDeliveryDate((prev) => offsetDate(prev, 1))}
            className="flex items-center gap-1.5 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 py-2 text-xs font-bold text-[#26352a] hover:bg-[#ede8db] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <span>Next Day</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── Operational Drop Status Metric Counters ──────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Total Drops</span>
              <Truck size={13} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#26352a]">{metrics.totalDrops}</p>
            <p className="text-[10px] text-[#78857a] mt-0.5">{metrics.totalOrders} attached orders</p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Kitchen Pending</span>
              <Clock size={13} className="text-[#b45309]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#b45309]">{metrics.kitchenPending}</p>
            <p className="text-[10px] text-[#78857a] mt-0.5">Cooking in kitchen</p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Kitchen Ready</span>
              <CheckCircle2 size={13} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#294d33]">{metrics.kitchenReady}</p>
            <p className="text-[10px] text-[#78857a] mt-0.5">Ready for packaging</p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Dispatch Ready</span>
              <Package size={13} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#294d33]">{metrics.dispatchReady}</p>
            <p className="text-[10px] text-[#78857a] mt-0.5">Packed & staged</p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Out for Delivery</span>
              <Navigation size={13} className="text-[#1d64b2]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#1d64b2]">{metrics.outForDelivery}</p>
            <p className="text-[10px] text-[#78857a] mt-0.5">In transit on route</p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Delivered</span>
              <CheckCircle2 size={13} className="text-[#5c685e]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#5c685e]">{metrics.delivered}</p>
            <p className="text-[10px] text-[#78857a] mt-0.5">Completed at destination</p>
          </div>
        </div>

        {/* ── Status Tabs & Secondary Filters Bar ──────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 w-full lg:w-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                statusFilter === "ALL"
                  ? "border-[#294d33] bg-[#294d33] text-white"
                  : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
              }`}
            >
              All Drops ({drops.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("KITCHEN_PENDING")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                statusFilter === "KITCHEN_PENDING"
                  ? "border-[#b45309] bg-[#b45309] text-white"
                  : "border-[#d9d2c2] bg-white text-[#b45309] hover:bg-[#fffbf0]"
              }`}
            >
              Kitchen Pending ({metrics.kitchenPending})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("KITCHEN_READY")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                statusFilter === "KITCHEN_READY"
                  ? "border-[#294d33] bg-[#294d33] text-white"
                  : "border-[#d9d2c2] bg-white text-[#294d33] hover:bg-[#fbfaf6]"
              }`}
            >
              Kitchen Ready ({metrics.kitchenReady})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("DISPATCH_READY")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                statusFilter === "DISPATCH_READY"
                  ? "border-[#294d33] bg-[#294d33] text-white"
                  : "border-[#d9d2c2] bg-white text-[#294d33] hover:bg-[#fbfaf6]"
              }`}
            >
              Dispatch Ready ({metrics.dispatchReady})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("OUT_FOR_DELIVERY")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                statusFilter === "OUT_FOR_DELIVERY"
                  ? "border-[#1d64b2] bg-[#1d64b2] text-white"
                  : "border-[#d9d2c2] bg-white text-[#1d64b2] hover:bg-[#f0f6fc]"
              }`}
            >
              Out for Delivery ({metrics.outForDelivery})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("DELIVERED")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                statusFilter === "DELIVERED"
                  ? "border-[#26352a] bg-[#26352a] text-white"
                  : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
              }`}
            >
              Delivered ({metrics.delivered})
            </button>
          </div>

          {/* Search & Driver Dropdown */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
            {/* Driver Filter */}
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] focus:border-[#294d33] focus:outline-none"
            >
              <option value="ALL">All Drivers</option>
              <option value="UNASSIGNED">⚠️ Unassigned Only ({metrics.unassigned})</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  🚗 {d.name}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
              />
              <input
                type="text"
                placeholder="Search company, address, or driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#d9d2c2] bg-white pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Main Dispatch Board Drops Grid ──────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl border border-[#d9d2c2] bg-white p-5 animate-pulse space-y-3"
              >
                <div className="h-5 bg-[#f3efe6] rounded w-1/3" />
                <div className="h-4 bg-[#f3efe6] rounded w-2/3" />
                <div className="h-20 bg-[#fbfaf6] rounded-xl" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-[#ffdada] bg-[#fff5f5] p-8 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-[#a34747]" />
            <h3 className="font-bold text-base text-[#a34747]">
              Failed to Load Dispatch Board
            </h3>
            <p className="text-xs text-[#5c685e] max-w-md mx-auto">
              {getErrorMessage(error, "Could not retrieve delivery drops for this date.")}
            </p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : drops.length === 0 ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
            <EmptyState
              icon={<Truck size={32} />}
              title={`No Delivery Drops Scheduled for ${formatDisplayDate(deliveryDate)}`}
              description="Confirmed orders sharing the same delivery address, date, and arrival time are automatically grouped into drops."
            />
          </div>
        ) : filteredDrops.length === 0 ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
            <EmptyState
              icon={<Filter size={28} />}
              title="No delivery drops match your active filters"
              description="Try adjusting your status filter, assigned driver selection, or search query."
              action={
                <Button
                  variant="secondary"
                  icon={<RotateCcw size={14} />}
                  onClick={() => {
                    setStatusFilter("ALL");
                    setDriverFilter("ALL");
                    setSearch("");
                  }}
                >
                  Reset Filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDrops.map((drop) => (
              <DispatchDropCard
                key={drop.id}
                drop={drop}
                onAssignDriver={(d) => setAssigningDrop(d)}
                onViewDetails={(dropId) => setInspectingDropId(dropId)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Driver Assignment Modal */}
      {assigningDrop && (
        <AssignDriverModal
          open={Boolean(assigningDrop)}
          onClose={() => setAssigningDrop(null)}
          drop={assigningDrop}
        />
      )}

      {/* Drop Detail Drawer */}
      {inspectingDropId && (
        <DropDetailDrawer
          open={Boolean(inspectingDropId)}
          onClose={() => setInspectingDropId(null)}
          dropId={inspectingDropId}
        />
      )}
    </ProtectedRoute>
  );
}
