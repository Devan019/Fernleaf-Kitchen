"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { useCompanyBilling } from "@/features/billing/useBilling";
import { useCompanies } from "@/features/companies/useCompanies";
import { useDispatchBoard, useDriverTodayDrops } from "@/features/dispatch/useDispatch";
import { useKitchenBoard } from "@/features/kitchen/useKitchen";
import { useOrders } from "@/features/orders/useOrders";
import { useUsers } from "@/features/users/useUsers";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Layers,
  MapPin,
  Navigation,
  Package,
  Receipt,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Truck,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  KITCHEN: "Kitchen Staff",
  DISPATCH: "Dispatch Coordinator",
  DRIVER: "Delivery Driver",
};

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        {/* Welcome banner */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#294d33]/10 px-3 py-1 text-xs font-semibold text-[#294d33] border border-[#294d33]/15">
              <Sparkles size={12} className="text-[#c8a96b]" />
              Fernleaf Kitchen Operations
            </span>
            <span className="text-xs text-[#78857a] font-mono">
              📅{" "}
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#26352a]">
            {greeting}, {currentUser?.name?.split(" ")[0] || "Staff"}
          </h2>
          <p className="mt-1 text-sm text-[#6b776c]">
            {role === "ADMIN" &&
              "High-level operational overview across catering orders, production, dispatch, and billing."}
            {role === "KITCHEN" &&
              "Today's active kitchen workload, station preparation queues, and production milestones."}
            {role === "DISPATCH" &&
              "Today's delivery drops staging, packaging readiness, and driver vehicle routing."}
            {role === "DRIVER" &&
              "Today's assigned catering route stops, destinations, and delivery confirmations."}
          </p>
        </div>

        {/* ── Role-Specific Operational Dashboard Views ────────────────────── */}
        {role === "ADMIN" && <AdminDashboardView />}
        {role === "KITCHEN" && <KitchenDashboardView />}
        {role === "DISPATCH" && <DispatchDashboardView />}
        {role === "DRIVER" && <DriverDashboardView />}
      </main>
    </>
  );
}

// ─── ADMIN DASHBOARD VIEW ──────────────────────────────────────────────────────

function AdminDashboardView() {
  const todayStr = useMemo(() => getTodayStr(), []);

  // Fetch real metrics from backend
  const { data: ordersData, isLoading: loadingOrders } = useOrders({ limit: 10 });
  const { data: kitchenData, isLoading: loadingKitchen } = useKitchenBoard({
    deliveryDate: todayStr,
  });
  const { data: dispatchData, isLoading: loadingDispatch } = useDispatchBoard({
    deliveryDate: todayStr,
  });
  const { data: billingData, isLoading: loadingBilling } = useCompanyBilling({ limit: 10 });
  const { data: companiesData } = useCompanies({ limit: 1 });
  const { data: usersData } = useUsers({ limit: 1 });

  // Kitchen stats
  const allKitchenUnits = useMemo(() => {
    return (kitchenData?.stations ?? []).flatMap((s) => s.units);
  }, [kitchenData]);

  const kitchenPending = allKitchenUnits.filter((u) => u.status === "PENDING").length;
  const kitchenStarted = allKitchenUnits.filter((u) => u.status === "STARTED").length;
  const kitchenDone = allKitchenUnits.filter((u) => u.status === "DONE").length;
  const kitchenUrgent = allKitchenUnits.filter(
    (u) => (u.operationalStatus === "LATE" || u.operationalStatus === "AT_RISK") && u.status !== "DONE",
  ).length;

  // Dispatch stats
  const drops = dispatchData?.drops ?? [];
  const dispatchReady = drops.filter((d) => d.status === "DISPATCH_READY").length;
  const outForDelivery = drops.filter((d) => d.status === "OUT_FOR_DELIVERY").length;
  const deliveredDrops = drops.filter((d) => d.status === "DELIVERED").length;

  // Billing stats
  const billingSummaries = billingData?.data ?? [];
  const totalUninvoicedOrders = billingSummaries.reduce(
    (acc, b) => acc + (b.uninvoicedOrderCount || 0),
    0,
  );
  const totalOpenInvoices = billingSummaries.reduce(
    (acc, b) => acc + (b.openInvoiceCount || 0),
    0,
  );

  return (
    <div className="space-y-8">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orders Card */}
        <Link
          href="/dashboard/orders"
          className="group rounded-3xl border border-[#d9d2c2] bg-white p-5 shadow-xs hover:border-[#b7b6aa] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-[#78857a] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Catering Orders</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#294d33]/10 text-[#294d33] group-hover:scale-110 transition-transform">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="font-serif text-3xl font-black text-[#26352a]">
            {loadingOrders ? "—" : ordersData?.meta.total ?? 0}
          </p>
          <p className="text-xs text-[#5c685e] mt-1.5 flex items-center justify-between">
            <span>Recent orders logged</span>
            <span className="text-[#294d33] font-semibold group-hover:translate-x-0.5 transition-transform">
              View roster →
            </span>
          </p>
        </Link>

        {/* Kitchen Production Card */}
        <Link
          href="/dashboard/kitchen"
          className="group rounded-3xl border border-[#d9d2c2] bg-white p-5 shadow-xs hover:border-[#b7b6aa] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-[#78857a] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Today&apos;s Kitchen</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e27d34]/10 text-[#e27d34] group-hover:scale-110 transition-transform">
              <ChefHat size={16} />
            </div>
          </div>
          <p className="font-serif text-3xl font-black text-[#26352a]">
            {loadingKitchen ? "—" : allKitchenUnits.length}
          </p>
          <p className="text-xs text-[#5c685e] mt-1.5 flex items-center justify-between">
            <span>
              {kitchenDone}/{allKitchenUnits.length} units done
            </span>
            {kitchenUrgent > 0 ? (
              <span className="text-[#dc2626] font-bold">⚠️ {kitchenUrgent} urgent</span>
            ) : (
              <span className="text-[#294d33] font-semibold">On track →</span>
            )}
          </p>
        </Link>

        {/* Dispatch Drops Card */}
        <Link
          href="/dashboard/dispatch"
          className="group rounded-3xl border border-[#d9d2c2] bg-white p-5 shadow-xs hover:border-[#b7b6aa] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-[#78857a] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Today&apos;s Dispatch</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1d64b2]/10 text-[#1d64b2] group-hover:scale-110 transition-transform">
              <Truck size={16} />
            </div>
          </div>
          <p className="font-serif text-3xl font-black text-[#26352a]">
            {loadingDispatch ? "—" : drops.length}
          </p>
          <p className="text-xs text-[#5c685e] mt-1.5 flex items-center justify-between">
            <span>
              {outForDelivery} in transit · {deliveredDrops} delivered
            </span>
            <span className="text-[#1d64b2] font-semibold group-hover:translate-x-0.5 transition-transform">
              Board →
            </span>
          </p>
        </Link>

        {/* Company Billing Card */}
        <Link
          href="/dashboard/billing"
          className="group rounded-3xl border border-[#d9d2c2] bg-white p-5 shadow-xs hover:border-[#b7b6aa] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-[#78857a] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Billing Queue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8c6b29]/10 text-[#8c6b29] group-hover:scale-110 transition-transform">
              <ReceiptText size={16} />
            </div>
          </div>
          <p className="font-serif text-3xl font-black text-[#26352a]">
            {loadingBilling ? "—" : totalUninvoicedOrders}
          </p>
          <p className="text-xs text-[#5c685e] mt-1.5 flex items-center justify-between">
            <span>{totalOpenInvoices} open invoices</span>
            <span className="text-[#8c6b29] font-semibold group-hover:translate-x-0.5 transition-transform">
              Manage →
            </span>
          </p>
        </Link>
      </div>

      {/* Operational Hub Quick Access */}
      <div className="space-y-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#26352a]">
            Operational Management Modules
          </h3>
          <p className="text-xs text-[#78857a]">
            Centralized access for administration, menu curation, contract pricing, and settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/catalogue"
            className="flex items-center gap-3.5 rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs hover:border-[#294d33] hover:shadow-sm transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#294d33] text-white">
              <UtensilsCrossed size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-[#26352a] group-hover:text-[#294d33]">Catalogue</p>
              <p className="text-[11px] text-[#78857a] truncate">Dishes, options & allergens</p>
            </div>
          </Link>

          <Link
            href="/dashboard/menu"
            className="flex items-center gap-3.5 rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs hover:border-[#35617a] hover:shadow-sm transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#35617a] text-white">
              <BookOpenCheck size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-[#26352a] group-hover:text-[#35617a]">Menu</p>
              <p className="text-[11px] text-[#78857a] truncate">Categories & visibility rules</p>
            </div>
          </Link>

          <Link
            href="/dashboard/pricing"
            className="flex items-center gap-3.5 rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs hover:border-[#8c6b29] hover:shadow-sm transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8c6b29] text-white">
              <BadgeDollarSign size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-[#26352a] group-hover:text-[#8c6b29]">Pricing</p>
              <p className="text-[11px] text-[#78857a] truncate">Tiers, markups & audits</p>
            </div>
          </Link>

          <Link
            href="/dashboard/companies"
            className="flex items-center gap-3.5 rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs hover:border-[#294d33] hover:shadow-sm transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#294d33] text-white">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-[#26352a] group-hover:text-[#294d33]">Companies</p>
              <p className="text-[11px] text-[#78857a] truncate">
                {companiesData?.meta.total ? `${companiesData.meta.total} clients` : "Corporate accounts"}
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/users"
            className="flex items-center gap-3.5 rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs hover:border-[#6c487a] hover:shadow-sm transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6c487a] text-white">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-[#26352a] group-hover:text-[#6c487a]">Staff Users</p>
              <p className="text-[11px] text-[#78857a] truncate">
                {usersData?.meta.total ? `${usersData.meta.total} staff accounts` : "Team & roles"}
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3.5 rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs hover:border-[#5c685e] hover:shadow-sm transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5c685e] text-white">
              <SlidersHorizontal size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-[#26352a] group-hover:text-[#5c685e]">Settings</p>
              <p className="text-[11px] text-[#78857a] truncate">Cut-off times & holidays</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── KITCHEN DASHBOARD VIEW ───────────────────────────────────────────────────

function KitchenDashboardView() {
  const todayStr = useMemo(() => getTodayStr(), []);

  const { data: kitchenData, isLoading, refetch, isFetching } = useKitchenBoard(
    { deliveryDate: todayStr },
    { refetchInterval: 25000 },
  );

  const stations = kitchenData?.stations ?? [];
  const allUnits = useMemo(() => stations.flatMap((s) => s.units), [stations]);

  const total = allUnits.length;
  const pending = allUnits.filter((u) => u.status === "PENDING").length;
  const started = allUnits.filter((u) => u.status === "STARTED").length;
  const done = allUnits.filter((u) => u.status === "DONE").length;
  const atRisk = allUnits.filter(
    (u) => u.operationalStatus === "AT_RISK" && u.status !== "DONE",
  ).length;
  const late = allUnits.filter(
    (u) => u.operationalStatus === "LATE" && u.status !== "DONE",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header CTA Card */}
      <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#294d33] text-[#d8bd83] shadow-md font-serif text-2xl font-bold">
            <ChefHat size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif text-[#26352a]">
              Today&apos;s Kitchen Workload
            </h3>
            <p className="text-xs text-[#5c685e] mt-0.5">
              {total} preparation units scheduled across {stations.length} kitchen stations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Link href="/dashboard/kitchen">
            <Button variant="primary" icon={<ChefHat size={15} />}>
              Open Kitchen Board →
            </Button>
          </Link>
        </div>
      </div>

      {/* Production Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
            Total Units
          </span>
          <p className="text-3xl font-black font-serif text-[#26352a] mt-1">{total}</p>
        </div>

        <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c685e] block">
            Queued (Pending)
          </span>
          <p className="text-3xl font-black font-serif text-[#5c685e] mt-1">{pending}</p>
        </div>

        <div className="rounded-2xl border border-[#e27d34]/20 bg-[#faeee5]/50 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#e27d34] block">
            In Prep (Started)
          </span>
          <p className="text-3xl font-black font-serif text-[#e27d34] mt-1">{started}</p>
        </div>

        <div className="rounded-2xl border border-[#294d33]/20 bg-[#eaf0eb]/50 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#294d33] block">
            Completed (Done)
          </span>
          <p className="text-3xl font-black font-serif text-[#294d33] mt-1">{done}</p>
        </div>

        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            late > 0 || atRisk > 0
              ? "border-[#fca5a5] bg-[#fff5f5] text-[#dc2626]"
              : "border-[#d9d2c2] bg-white text-[#78857a]"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block">
            Urgent SLA (Late / Risk)
          </span>
          <p className="text-3xl font-black font-serif mt-1">{late + atRisk}</p>
        </div>
      </div>

      {/* Stations Breakdown Overview */}
      <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
        <h4 className="font-serif text-base font-bold text-[#26352a]">Active Station Breakdown</h4>
        {stations.length === 0 ? (
          <p className="text-xs text-[#9fa89e] italic">No active stations today.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stations.map((station) => (
              <div
                key={station.id}
                className="rounded-2xl border border-[#eae5d8] bg-[#fbfaf6] p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Flame size={16} className="text-[#294d33]" />
                  <span className="font-bold text-xs text-[#26352a]">{station.name}</span>
                </div>
                <span className="rounded-lg bg-white border border-[#d9d2c2] px-2.5 py-1 text-xs font-mono font-bold text-[#294d33]">
                  {station.unitsCount} units
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DISPATCH DASHBOARD VIEW ──────────────────────────────────────────────────

function DispatchDashboardView() {
  const todayStr = useMemo(() => getTodayStr(), []);

  const { data: dispatchData, isLoading, refetch, isFetching } = useDispatchBoard(
    { deliveryDate: todayStr },
    { refetchInterval: 25000 },
  );

  const drops = dispatchData?.drops ?? [];
  const totalDrops = drops.length;
  const totalOrders = drops.reduce((acc, d) => acc + (d.ordersCount || 0), 0);

  const kitchenReady = drops.filter((d) => d.status === "KITCHEN_READY").length;
  const dispatchReady = drops.filter((d) => d.status === "DISPATCH_READY").length;
  const outForDelivery = drops.filter((d) => d.status === "OUT_FOR_DELIVERY").length;
  const delivered = drops.filter((d) => d.status === "DELIVERED").length;
  const unassigned = drops.filter((d) => !d.driver && d.status !== "DELIVERED").length;

  return (
    <div className="space-y-6">
      {/* Header CTA Card */}
      <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1d64b2] text-white shadow-md font-serif text-2xl font-bold">
            <Truck size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif text-[#26352a]">
              Today&apos;s Dispatch & Delivery Operations
            </h3>
            <p className="text-xs text-[#5c685e] mt-0.5">
              {totalDrops} delivery drops totaling {totalOrders} individual catering orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Link href="/dashboard/dispatch">
            <Button variant="primary" icon={<Truck size={15} />}>
              Open Dispatch Board →
            </Button>
          </Link>
        </div>
      </div>

      {/* Dispatch Drop Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
            Total Drops
          </span>
          <p className="text-3xl font-black font-serif text-[#26352a] mt-1">{totalDrops}</p>
        </div>

        <div className="rounded-2xl border border-[#e27d34]/20 bg-[#faeee5]/40 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#e27d34] block">
            Kitchen Ready (Packaging)
          </span>
          <p className="text-3xl font-black font-serif text-[#e27d34] mt-1">{kitchenReady}</p>
        </div>

        <div className="rounded-2xl border border-[#294d33]/20 bg-[#eaf0eb]/40 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#294d33] block">
            Dispatch Ready (Staged)
          </span>
          <p className="text-3xl font-black font-serif text-[#294d33] mt-1">{dispatchReady}</p>
        </div>

        <div className="rounded-2xl border border-[#1d64b2]/20 bg-[#e6f0fa]/40 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d64b2] block">
            Out for Delivery
          </span>
          <p className="text-3xl font-black font-serif text-[#1d64b2] mt-1">{outForDelivery}</p>
        </div>

        <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c685e] block">
            Delivered
          </span>
          <p className="text-3xl font-black font-serif text-[#5c685e] mt-1">{delivered}</p>
        </div>
      </div>

      {/* Unassigned Warning Alert */}
      {unassigned > 0 && (
        <div className="rounded-2xl bg-[#fff9f0] border border-[#fae2c5] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-[#e27d34]" />
            <p className="text-xs text-[#a05a18] font-bold">
              {unassigned} delivery {unassigned === 1 ? "drop requires" : "drops require"} driver
              assignment before vehicle departure.
            </p>
          </div>
          <Link href="/dashboard/dispatch">
            <Button size="sm" variant="secondary">
              Assign Drivers →
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── DRIVER DASHBOARD VIEW ────────────────────────────────────────────────────

function DriverDashboardView() {
  const { data: todayData, isLoading, refetch, isFetching } = useDriverTodayDrops({
    refetchInterval: 20000,
  });

  const rawDrops = todayData?.drops ?? [];
  const drops = useMemo(() => {
    return [...rawDrops].sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime));
  }, [rawDrops]);

  const total = drops.length;
  const completed = drops.filter((d) => d.status === "DELIVERED").length;
  const remaining = drops.filter((d) => d.status !== "DELIVERED").length;

  // Next delivery stop
  const nextDrop = useMemo(() => {
    return drops.find((d) => d.status !== "DELIVERED") || null;
  }, [drops]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header CTA Card */}
      <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#294d33] text-[#d8bd83] shadow-md font-serif text-2xl font-bold">
            <Navigation size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif text-[#26352a]">My Assigned Route</h3>
            <p className="text-xs text-[#5c685e] mt-0.5">
              {total} scheduled stops today · {remaining} stops remaining.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Link href="/dashboard/my-deliveries">
            <Button variant="primary" icon={<Navigation size={15} />}>
              Open Deliveries →
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
            Assigned Today
          </span>
          <p className="text-3xl font-black font-serif text-[#26352a] mt-1">{total}</p>
        </div>

        <div className="rounded-2xl border border-[#1d64b2]/20 bg-[#e6f0fa]/50 p-4 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d64b2] block">
            Remaining
          </span>
          <p className="text-3xl font-black font-serif text-[#1d64b2] mt-1">{remaining}</p>
        </div>

        <div className="rounded-2xl border border-[#294d33]/20 bg-[#eaf0eb]/50 p-4 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#294d33] block">
            Delivered
          </span>
          <p className="text-3xl font-black font-serif text-[#294d33] mt-1">{completed}</p>
        </div>
      </div>

      {/* Next Delivery Stop Spotlight */}
      {nextDrop ? (
        <div className="rounded-3xl border-2 border-[#1d64b2] bg-white p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[#eee9dc] pb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1d64b2]/10 px-3 py-1 text-xs font-bold text-[#1d64b2]">
              <Clock size={13} />
              Next Stop @ {nextDrop.deliveryTime}
            </span>

            <span className="rounded-md bg-[#f3efe6] px-2 py-0.5 text-xs font-mono font-bold text-[#294d33]">
              {nextDrop.ordersCount} {nextDrop.ordersCount === 1 ? "Meal Order" : "Meal Orders"}
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-lg font-bold text-[#26352a] flex items-center gap-2">
              <Building2 size={18} className="text-[#294d33]" />
              {nextDrop.company.name}
            </h4>
            <p className="text-xs text-[#5c685e] flex items-start gap-1.5">
              <MapPin size={15} className="text-[#294d33] shrink-0 mt-0.5" />
              <span>
                {nextDrop.address.street} {nextDrop.address.unit ? `(${nextDrop.address.unit})` : ""},{" "}
                {nextDrop.address.city} {nextDrop.address.postcode}
              </span>
            </p>
          </div>

          <div className="pt-2">
            <Link href="/dashboard/my-deliveries">
              <Button className="w-full" icon={<CheckCircle2 size={15} />}>
                Go to My Deliveries to Complete Stop →
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-8 text-center">
          <CheckCircle2 size={36} className="mx-auto text-[#294d33] mb-2" />
          <h4 className="font-serif font-bold text-base text-[#26352a]">All Deliveries Complete</h4>
          <p className="text-xs text-[#78857a] mt-1">
            You have completed all scheduled deliveries for today!
          </p>
        </div>
      )}
    </div>
  );
}
