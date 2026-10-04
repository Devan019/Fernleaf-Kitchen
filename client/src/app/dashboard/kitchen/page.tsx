"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { ForceCompleteModal } from "@/features/kitchen/ForceCompleteModal";
import { KitchenPrepUnitCard } from "@/features/kitchen/KitchenPrepUnitCard";
import { useKitchenBoard } from "@/features/kitchen/useKitchen";
import { getErrorMessage } from "@/lib/utils/errors";
import type { KitchenUnit, KitchenUnitOperationalStatus } from "@/types";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Flame,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  UtensilsCrossed,
  Zap,
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

export default function KitchenBoardPage() {
  const [deliveryDate, setDeliveryDate] = useState<string>(getTodayStr());
  const [stationFilter, setStationFilter] = useState<string>("ALL");
  const [slaFilter, setSlaFilter] = useState<"ALL" | "URGENT" | "PENDING_STARTED" | "DONE">("ALL");
  const [search, setSearch] = useState("");

  // Force Complete Modal State
  const [forceCompleteTarget, setForceCompleteTarget] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);

  // Fetch Board with automatic 30s background polling
  const {
    data: boardData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useKitchenBoard(
    { deliveryDate },
    { refetchInterval: 25000 }
  );

  const stations = boardData?.stations ?? [];
  const allUnits = useMemo(() => {
    return stations.flatMap((s) => s.units);
  }, [stations]);

  // Derive distinct orders count
  const distinctOrdersCount = useMemo(() => {
    const set = new Set<string>();
    allUnits.forEach((u) => set.add(u.orderId));
    return set.size;
  }, [allUnits]);

  // Operational metrics
  const metrics = useMemo(() => {
    const total = allUnits.length;
    const pending = allUnits.filter((u) => u.status === "PENDING").length;
    const started = allUnits.filter((u) => u.status === "STARTED").length;
    const done = allUnits.filter((u) => u.status === "DONE").length;
    const atRisk = allUnits.filter((u) => u.operationalStatus === "AT_RISK" && u.status !== "DONE").length;
    const late = allUnits.filter((u) => u.operationalStatus === "LATE" && u.status !== "DONE").length;
    return { total, pending, started, done, atRisk, late };
  }, [allUnits]);

  // Filtered stations and units
  const filteredStationGroups = useMemo(() => {
    return stations
      .filter((st) => {
        if (stationFilter === "ALL") return true;
        return st.id === stationFilter;
      })
      .map((st) => {
        const filteredUnits = st.units.filter((unit) => {
          // Search
          if (search.trim()) {
            const q = search.toLowerCase();
            const matchDish = unit.dish.name.toLowerCase().includes(q);
            const matchOrder = unit.orderNumber.toLowerCase().includes(q);
            const matchEmp = unit.employee.name.toLowerCase().includes(q);
            const matchCmp = unit.company.name.toLowerCase().includes(q);
            if (!matchDish && !matchOrder && !matchEmp && !matchCmp) return false;
          }

          // SLA / Operational Filter
          if (slaFilter === "URGENT") {
            if (unit.status === "DONE") return false;
            if (unit.operationalStatus !== "LATE" && unit.operationalStatus !== "AT_RISK") {
              return false;
            }
          } else if (slaFilter === "PENDING_STARTED") {
            if (unit.status === "DONE") return false;
          } else if (slaFilter === "DONE") {
            if (unit.status !== "DONE") return false;
          }

          return true;
        });

        return {
          ...st,
          units: filteredUnits,
          unitsCount: filteredUnits.length,
        };
      })
      .filter((st) => st.units.length > 0 || stationFilter === st.id);
  }, [stations, stationFilter, slaFilter, search]);

  const totalFilteredUnits = filteredStationGroups.reduce(
    (acc, st) => acc + st.units.length,
    0
  );

  return (
    <ProtectedRoute requiredRole={["ADMIN", "KITCHEN", "DISPATCH"]}>
      <Header title="Kitchen Board" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Kitchen Board"
          description="Production schedule for confirmed orders. Track preparation stations, dish multipliers, and SLA milestones."
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
                <span>{distinctOrdersCount} Orders</span>
                <span className="text-[#9fa89e]">·</span>
                <span>{metrics.total} Prep Units</span>
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

        {/* ── Operational Status Metric Counters ───────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Total Units</span>
              <Layers size={13} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#26352a]">{metrics.total}</p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Pending</span>
              <Clock size={13} className="text-[#78857a]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#5c685e]">{metrics.pending}</p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Started</span>
              <Play size={13} className="text-[#e27d34]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#e27d34]">{metrics.started}</p>
          </div>

          <div className="rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs">
            <div className="text-[#78857a] text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Done</span>
              <CheckCircle2 size={13} className="text-[#294d33]" />
            </div>
            <p className="text-2xl font-black font-serif text-[#294d33]">{metrics.done}</p>
          </div>

          <div className={`rounded-2xl border p-3.5 shadow-xs ${
            metrics.atRisk > 0
              ? "border-[#fcd34d] bg-[#fffbf0] text-[#d97706]"
              : "border-[#d9d2c2] bg-white text-[#78857a]"
          }`}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>At Risk (&lt;15m)</span>
              <AlertTriangle size={13} className="text-[#d97706]" />
            </div>
            <p className="text-2xl font-black font-serif">{metrics.atRisk}</p>
          </div>

          <div className={`rounded-2xl border p-3.5 shadow-xs ${
            metrics.late > 0
              ? "border-[#fca5a5] bg-[#fff5f5] text-[#dc2626]"
              : "border-[#d9d2c2] bg-white text-[#78857a]"
          }`}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Late</span>
              <AlertCircle size={13} className="text-[#dc2626]" />
            </div>
            <p className="text-2xl font-black font-serif">{metrics.late}</p>
          </div>
        </div>

        {/* ── Filters & Station Tabs Bar ───────────────────────────────────── */}
        <div className="space-y-3">
          {/* Station Selection Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setStationFilter("ALL")}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                stationFilter === "ALL"
                  ? "border-[#294d33] bg-[#294d33] text-white"
                  : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
              }`}
            >
              All Stations ({allUnits.length})
            </button>

            {stations.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStationFilter(st.id)}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
                  stationFilter === st.id
                    ? "border-[#294d33] bg-[#294d33] text-white"
                    : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
                }`}
              >
                📍 {st.name} ({st.unitsCount})
              </button>
            ))}
          </div>

          {/* SLA Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* SLA Filter Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSlaFilter("ALL")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  slaFilter === "ALL"
                    ? "bg-[#26352a] text-white"
                    : "bg-[#eee9dc] text-[#5c685e] hover:bg-[#e4decb]"
                }`}
              >
                All Work
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter("URGENT")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  slaFilter === "URGENT"
                    ? "bg-[#dc2626] text-white shadow-xs"
                    : "bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca]"
                }`}
              >
                <AlertCircle size={12} />
                <span>Urgent (Late & At Risk)</span>
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter("PENDING_STARTED")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  slaFilter === "PENDING_STARTED"
                    ? "bg-[#e27d34] text-white shadow-xs"
                    : "bg-[#faeee5] text-[#e27d34] hover:bg-[#f5e0d3]"
                }`}
              >
                Pending & In Progress
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter("DONE")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  slaFilter === "DONE"
                    ? "bg-[#294d33] text-white shadow-xs"
                    : "bg-[#eaf0eb] text-[#294d33] hover:bg-[#dce7de]"
                }`}
              >
                Completed
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
              />
              <input
                type="text"
                placeholder="Search dish, order, or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#d9d2c2] bg-white pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#294d33] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Main Production Board Content ────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((stIdx) => (
              <div key={stIdx} className="space-y-3">
                <div className="h-6 w-48 bg-[#f3efe6] rounded-md animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3].map((uIdx) => (
                    <div
                      key={uIdx}
                      className="h-56 rounded-2xl border border-[#d9d2c2] bg-white p-4 animate-pulse space-y-3"
                    >
                      <div className="h-4 bg-[#f3efe6] rounded w-1/3" />
                      <div className="h-5 bg-[#f3efe6] rounded w-2/3" />
                      <div className="h-20 bg-[#fbfaf6] rounded-xl" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-[#ffdada] bg-[#fff5f5] p-8 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-[#a34747]" />
            <h3 className="font-bold text-base text-[#a34747]">
              Failed to Load Kitchen Board
            </h3>
            <p className="text-xs text-[#5c685e] max-w-md mx-auto">
              {getErrorMessage(error, "Could not retrieve kitchen preparation board for this date.")}
            </p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : allUnits.length === 0 ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
            <EmptyState
              icon={<UtensilsCrossed size={32} />}
              title={`No Kitchen Prep Scheduled for ${formatDisplayDate(deliveryDate)}`}
              description="Confirmed catering orders will automatically generate atomic kitchen preparation units grouped by station."
            />
          </div>
        ) : totalFilteredUnits === 0 ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
            <EmptyState
              icon={<Filter size={28} />}
              title="No prep units match your active filters"
              description="Try adjusting your station selection, SLA status, or search query."
              action={
                <Button
                  variant="secondary"
                  icon={<RotateCcw size={14} />}
                  onClick={() => {
                    setStationFilter("ALL");
                    setSlaFilter("ALL");
                    setSearch("");
                  }}
                >
                  Reset Filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-8">
            {filteredStationGroups.map((stationGroup) => (
              <section key={stationGroup.id} className="space-y-4">
                {/* Station Section Header */}
                <div className="flex items-center justify-between border-b-2 border-[#294d33]/20 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#294d33] text-[#d8bd83] shadow-xs">
                      <Flame size={14} />
                    </span>
                    <h3 className="text-base font-black font-serif text-[#26352a] uppercase tracking-wider">
                      {stationGroup.name}
                    </h3>
                  </div>

                  <span className="rounded-full bg-[#f3efe6] px-3 py-1 font-mono text-xs font-black text-[#294d33] border border-[#e5dfd2]">
                    {stationGroup.units.length} {stationGroup.units.length === 1 ? "unit" : "units"}
                  </span>
                </div>

                {/* Station Prep Units Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {stationGroup.units.map((unit) => (
                    <KitchenPrepUnitCard
                      key={unit.unitId}
                      unit={unit}
                      onForceCompleteOrder={(orderId, orderNumber) =>
                        setForceCompleteTarget({ orderId, orderNumber })
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Admin Force Complete Modal */}
      {forceCompleteTarget && (
        <ForceCompleteModal
          open={Boolean(forceCompleteTarget)}
          onClose={() => setForceCompleteTarget(null)}
          orderId={forceCompleteTarget.orderId}
          orderNumber={forceCompleteTarget.orderNumber}
        />
      )}
    </ProtectedRoute>
  );
}
