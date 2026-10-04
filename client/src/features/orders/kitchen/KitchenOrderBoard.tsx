import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useCompanies } from "@/features/companies/useCompanies";
import { KitchenOrderCard } from "@/features/orders/kitchen/KitchenOrderCard";
import { KitchenProductionSummary } from "@/features/orders/kitchen/KitchenProductionSummary";
import { useOrders } from "@/features/orders/useOrders";
import type { OrderStatus, OrderSummary } from "@/types";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Layers,
  LayoutGrid,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";

// Helper for date formatting
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

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function KitchenOrderBoard() {
  // Navigation Date state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to a sensible current date or fallback to today
    return getTodayStr();
  });

  // View Mode: 'orders' or 'production'
  const [viewMode, setViewMode] = useState<"orders" | "production">("orders");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TO_PREPARE" | "ALL">("ALL");
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState<string>("ALL");
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");

  // Fetch all orders for this specific date (limit up to 100 per day for kitchen prep)
  const { data: ordersData, isLoading, isError, refetch } = useOrders({
    deliveryDateFrom: selectedDate,
    deliveryDateTo: selectedDate,
    limit: 100,
  });

  const { data: companiesData } = useCompanies({ limit: 100 });
  const companies = companiesData?.data ?? [];

  const rawOrders = ordersData?.data ?? [];

  // Filtered orders for UI display
  const filteredOrders = useMemo(() => {
    return rawOrders
      .filter((order) => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchNum = order.orderNumber.toLowerCase().includes(q);
          const matchEmp = order.employeeName.toLowerCase().includes(q);
          const matchCmp = order.companyName.toLowerCase().includes(q);
          if (!matchNum && !matchEmp && !matchCmp) return false;
        }

        // Status Filter
        if (statusFilter === "TO_PREPARE") {
          if (order.status !== "PLACED" && order.status !== "CONFIRMED") return false;
        } else if (statusFilter !== "ALL") {
          if (order.status !== statusFilter) return false;
        }

        // Delivery Time
        if (deliveryTimeFilter !== "ALL") {
          const time = order.deliveryTime || "12:00";
          if (time !== deliveryTimeFilter) return false;
        }

        // Company
        if (companyFilter !== "ALL") {
          if (order.companyId !== companyFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Chronological sort by delivery time
        const timeA = a.deliveryTime || "12:00";
        const timeB = b.deliveryTime || "12:00";
        return timeA.localeCompare(timeB);
      });
  }, [rawOrders, search, statusFilter, deliveryTimeFilter, companyFilter]);

  // Status Counts for current date
  const statusCounts = useMemo(() => {
    const total = rawOrders.length;
    const toPrepare = rawOrders.filter(
      (o) => o.status === "PLACED" || o.status === "CONFIRMED"
    ).length;
    const confirmed = rawOrders.filter((o) => o.status === "CONFIRMED").length;
    const placed = rawOrders.filter((o) => o.status === "PLACED").length;
    const delivered = rawOrders.filter((o) => o.status === "DELIVERED").length;
    const drafts = rawOrders.filter((o) => o.status === "DRAFT").length;
    return { total, toPrepare, confirmed, placed, delivered, drafts };
  }, [rawOrders]);

  // Unique delivery times for filter
  const deliveryTimes = useMemo(() => {
    const set = new Set<string>();
    rawOrders.forEach((o) => {
      if (o.deliveryTime) set.add(o.deliveryTime);
    });
    return Array.from(set).sort();
  }, [rawOrders]);

  const handlePrevDay = () => {
    setSelectedDate((prev) => offsetDate(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => offsetDate(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(getTodayStr());
  };

  return (
    <>
      <Header title="Kitchen Orders" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Kitchen Orders"
          description="Orders requiring preparation and dispatch. View delivery schedules and batch dish quantities."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant={selectedDate === getTodayStr() ? "primary" : "secondary"}
                icon={<Calendar size={14} />}
                onClick={handleToday}
              >
                Today
              </Button>
            </div>
          }
        />

        {/* ── Primary Date Navigation Bar ──────────────────────────────────── */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Previous Day Button */}
          <button
            type="button"
            onClick={handlePrevDay}
            className="flex items-center gap-1.5 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 py-2 text-xs font-bold text-[#26352a] hover:bg-[#ede8db] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <ChevronLeft size={16} />
            <span>Previous Day</span>
          </button>

          {/* Central Date Display & Quick Picker */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center">
            <div>
              <p className="font-serif text-lg font-bold text-[#26352a] tracking-wide">
                {formatDisplayDate(selectedDate)}
              </p>
              <p className="text-xs font-semibold text-[#294d33]">
                {rawOrders.length} {rawOrders.length === 1 ? "order" : "orders"} scheduled
              </p>
            </div>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs font-medium text-[#26352a] focus:border-[#294d33] focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Next Day Button */}
          <button
            type="button"
            onClick={handleNextDay}
            className="flex items-center gap-1.5 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 py-2 text-xs font-bold text-[#26352a] hover:bg-[#ede8db] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <span>Next Day</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── Operational Status Counters ─────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              statusFilter === "ALL"
                ? "border-[#294d33] bg-[#294d33] text-white"
                : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
            }`}
          >
            <span>ALL</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              statusFilter === "ALL" ? "bg-white/20 text-white" : "bg-[#f3efe6] text-[#26352a]"
            }`}>
              {statusCounts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("TO_PREPARE")}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              statusFilter === "TO_PREPARE"
                ? "border-[#e27d34] bg-[#e27d34] text-white"
                : "border-[#d9d2c2] bg-white text-[#e27d34] hover:bg-[#fff9f5]"
            }`}
          >
            <span>🍳 TO PREPARE</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              statusFilter === "TO_PREPARE" ? "bg-white/20 text-white" : "bg-[#faeee5] text-[#e27d34]"
            }`}>
              {statusCounts.toPrepare}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("CONFIRMED")}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              statusFilter === "CONFIRMED"
                ? "border-[#294d33] bg-[#294d33] text-white"
                : "border-[#d9d2c2] bg-white text-[#294d33] hover:bg-[#fbfaf6]"
            }`}
          >
            <span>CONFIRMED</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              statusFilter === "CONFIRMED" ? "bg-white/20 text-white" : "bg-[#eaf0eb] text-[#294d33]"
            }`}>
              {statusCounts.confirmed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("PLACED")}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              statusFilter === "PLACED"
                ? "border-[#60492c] bg-[#60492c] text-white"
                : "border-[#d9d2c2] bg-white text-[#60492c] hover:bg-[#fbfaf6]"
            }`}
          >
            <span>PLACED</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              statusFilter === "PLACED" ? "bg-white/20 text-white" : "bg-[#f5ece0] text-[#60492c]"
            }`}>
              {statusCounts.placed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("DELIVERED")}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              statusFilter === "DELIVERED"
                ? "border-[#315d3c] bg-[#315d3c] text-white"
                : "border-[#d9d2c2] bg-white text-[#5c685e] hover:bg-[#fbfaf6]"
            }`}
          >
            <span>DELIVERED</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              statusFilter === "DELIVERED" ? "bg-white/20 text-white" : "bg-[#f3efe6] text-[#26352a]"
            }`}>
              {statusCounts.delivered}
            </span>
          </button>
        </div>

        {/* ── View Toggle & Secondary Filters Bar ─────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Segmented View Mode Control */}
          <div className="flex items-center rounded-2xl bg-[#eee9dc] p-1 shadow-inner w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("orders")}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "orders"
                  ? "bg-white text-[#26352a] shadow-xs"
                  : "text-[#5c685e] hover:text-[#26352a]"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Orders ({filteredOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("production")}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "production"
                  ? "bg-white text-[#26352a] shadow-xs"
                  : "text-[#5c685e] hover:text-[#26352a]"
              }`}
            >
              <UtensilsCrossed size={14} className="text-[#e27d34]" />
              <span>Production Prep Sheet</span>
            </button>
          </div>

          {/* Search & Operational Filters */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
            {/* Search */}
            <div className="relative flex-1 sm:w-60">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
              />
              <input
                type="text"
                placeholder="Search order or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#294d33] focus:outline-none"
              />
            </div>

            {/* Delivery Time Slot Filter */}
            {deliveryTimes.length > 0 && (
              <select
                value={deliveryTimeFilter}
                onChange={(e) => setDeliveryTimeFilter(e.target.value)}
                className="h-10 rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] transition-all focus:border-[#294d33] focus:outline-none"
              >
                <option value="ALL">All Delivery Times</option>
                {deliveryTimes.map((time) => (
                  <option key={time} value={time}>
                    ⏰ {time}
                  </option>
                ))}
              </select>
            )}

            {/* Company Filter */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-10 rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] transition-all focus:border-[#294d33] focus:outline-none max-w-[160px]"
            >
              <option value="ALL">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Main Board Content ──────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-[#d9d2c2] bg-white p-5 animate-pulse space-y-3"
              >
                <div className="h-5 bg-[#f3efe6] rounded w-1/3" />
                <div className="h-4 bg-[#f3efe6] rounded w-2/3" />
                <div className="h-24 bg-[#fbfaf6] rounded-xl" />
              </div>
            ))}
          </div>
        ) : viewMode === "production" ? (
          <KitchenProductionSummary
            orders={filteredOrders}
            deliveryDate={selectedDate}
          />
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-[#d9d2c2] bg-white p-12">
            <EmptyState
              icon={<UtensilsCrossed size={28} />}
              title={`No orders found for ${formatDisplayDate(selectedDate)}`}
              description={
                search || statusFilter !== "ALL" || deliveryTimeFilter !== "ALL"
                  ? "Try resetting your search or status filters."
                  : "No customer orders require preparation on this date."
              }
              action={
                search || statusFilter !== "ALL" ? (
                  <Button
                    variant="secondary"
                    icon={<RotateCcw size={14} />}
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                      setDeliveryTimeFilter("ALL");
                      setCompanyFilter("ALL");
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredOrders.map((order) => (
              <KitchenOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
