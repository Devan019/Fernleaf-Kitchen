import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import type { KitchenUnit, KitchenUnitOperationalStatus, KitchenUnitStatus } from "@/types";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Play,
  ShieldAlert,
  User,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCompleteKitchenUnit, useStartKitchenUnit } from "./useKitchen";
import { getErrorMessage } from "@/lib/utils/errors";

const SLA_BADGE_CONFIG: Record<
  KitchenUnitOperationalStatus,
  { bg: string; text: string; border: string; label: string; icon: any }
> = {
  ON_TRACK: {
    bg: "bg-[#294d33]/10",
    text: "text-[#294d33]",
    border: "border-[#294d33]/20",
    label: "On Track",
    icon: CheckCircle2,
  },
  AT_RISK: {
    bg: "bg-[#fff9f0]",
    text: "text-[#d97706]",
    border: "border-[#fcd34d]",
    label: "At Risk (<15m)",
    icon: AlertTriangle,
  },
  LATE: {
    bg: "bg-[#fff5f5]",
    text: "text-[#dc2626]",
    border: "border-[#fca5a5]",
    label: "LATE / OVERDUE",
    icon: AlertCircle,
  },
  COMPLETED: {
    bg: "bg-[#f5f1e6]",
    text: "text-[#78857a]",
    border: "border-[#eae5d8]",
    label: "Done",
    icon: Check,
  },
};

interface KitchenPrepUnitCardProps {
  unit: KitchenUnit;
  onForceCompleteOrder?: (orderId: string, orderNumber: string) => void;
}

export function KitchenPrepUnitCard({
  unit,
  onForceCompleteOrder,
}: KitchenPrepUnitCardProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  const startMutation = useStartKitchenUnit();
  const completeMutation = useCompleteKitchenUnit();

  const [mutationError, setMutationError] = useState<string | null>(null);

  const slaConfig = SLA_BADGE_CONFIG[unit.operationalStatus] ?? SLA_BADGE_CONFIG.ON_TRACK;
  const SlaIcon = slaConfig.icon;

  const isPending = unit.status === "PENDING";
  const isStarted = unit.status === "STARTED";
  const isDone = unit.status === "DONE";

  const handleStart = async () => {
    setMutationError(null);
    try {
      await startMutation.mutateAsync(unit.unitId);
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to start unit."));
    }
  };

  const handleComplete = async () => {
    setMutationError(null);
    try {
      await completeMutation.mutateAsync(unit.unitId);
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to mark unit as done."));
    }
  };

  // Format planned time strings
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  const kitchenReadyTime = formatTime(unit.plannedKitchenReadyAt);

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-xs transition-all flex flex-col justify-between ${
        unit.operationalStatus === "LATE"
          ? "border-[#f87171] ring-2 ring-[#f87171]/20 bg-[#fffdfd]"
          : unit.operationalStatus === "AT_RISK"
          ? "border-[#fcd34d] ring-1 ring-[#fcd34d]/40"
          : isDone
          ? "border-[#eae5d8] opacity-85 bg-[#faf8f4]"
          : "border-[#d9d2c2] hover:border-[#294d33]/40 hover:shadow-md"
      }`}
    >
      <div>
        {/* Top Header: SLA Badge + Station Tag + Status */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#eee9dc]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold border ${slaConfig.bg} ${slaConfig.text} ${slaConfig.border}`}
            >
              <SlaIcon size={12} />
              <span>{slaConfig.label}</span>
            </span>

            <span className="rounded-md bg-[#f3efe6] px-2 py-0.5 text-[10px] font-bold text-[#5c685e] border border-[#e5dfd2]">
              📍 {unit.station?.name || "Unassigned"}
            </span>
          </div>

          <span
            className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-md ${
              isDone
                ? "bg-[#294d33]/15 text-[#294d33]"
                : isStarted
                ? "bg-[#e27d34]/15 text-[#e27d34]"
                : "bg-[#78857a]/15 text-[#5c685e]"
            }`}
          >
            {unit.status}
          </span>
        </div>

        {/* Error Banner if action failed */}
        {mutationError && (
          <div className="mt-2 rounded-lg bg-[#fff5f5] p-2 text-[11px] text-[#a34747] border border-[#ffdada] flex items-center justify-between">
            <span>{mutationError}</span>
            <button
              type="button"
              onClick={() => setMutationError(null)}
              className="text-[#a34747] font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dish Name & Quantity Multiplier */}
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="text-base font-extrabold text-[#26352a] leading-tight">
              {unit.dish.name}
            </h4>
            {unit.dish.sku && (
              <span className="font-mono text-[10px] text-[#78857a] block">
                {unit.dish.sku}
              </span>
            )}
          </div>

          <span className="flex h-9 min-w-[42px] items-center justify-center rounded-xl bg-[#294d33] font-mono text-base font-black text-white shadow-xs px-2 shrink-0">
            ×{unit.quantity}
          </span>
        </div>

        {/* Option Combinations Breakdown */}
        {unit.selectedOptions && unit.selectedOptions.length > 0 && (
          <div className="mt-3 rounded-xl bg-[#fbfaf6] p-2.5 border border-[#eee9dc] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857a] block">
              Options & Portions:
            </span>
            <div className="flex flex-wrap gap-1">
              {unit.selectedOptions.map((opt) => (
                <span
                  key={opt.optionId}
                  className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs font-medium text-[#26352a] border border-[#d9d2c2] shadow-2xs"
                >
                  <span className="text-[#78857a] text-[10px]">{opt.optionGroupName}:</span>
                  <span className="font-bold text-[#294d33]">{opt.optionName}</span>
                  {opt.portionSizeName && (
                    <span className="text-[10px] text-[#60492c]">({opt.portionSizeName})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Order Reference, Customer, Delivery Context */}
        <div className="mt-3 pt-2.5 border-t border-[#eee9dc] space-y-1.5 text-xs text-[#5c685e]">
          <div className="flex items-center justify-between">
            <Link
              href={`/dashboard/orders/${unit.orderId}`}
              className="inline-flex items-center gap-1 font-mono font-bold text-xs text-[#294d33] hover:underline"
              title="View full order details"
            >
              <span>{unit.orderNumber}</span>
              <ExternalLink size={11} />
            </Link>

            <span className="font-mono font-semibold text-[11px] text-[#26352a]">
              ⏰ Delivery: {unit.deliveryTime || "12:00"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#5c685e] truncate">
            <User size={12} className="text-[#294d33] shrink-0" />
            <span className="font-medium text-[#26352a] truncate">{unit.employee.name}</span>
            <span className="text-[#9fa89e]">·</span>
            <span className="truncate flex items-center gap-1">
              <Building2 size={11} className="text-[#78857a]" />
              {unit.company.name}
            </span>
          </div>

          {/* Planned Kitchen Ready Time Indicator */}
          {kitchenReadyTime && (
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <span className="text-[#78857a]">Kitchen Ready Target:</span>
              <span
                className={`font-mono font-bold ${
                  unit.operationalStatus === "LATE"
                    ? "text-[#dc2626]"
                    : unit.operationalStatus === "AT_RISK"
                    ? "text-[#d97706]"
                    : "text-[#294d33]"
                }`}
              >
                {kitchenReadyTime}
              </span>
            </div>
          )}

          {/* Timestamps if started / completed */}
          {unit.startedAt && (
            <div className="text-[10px] text-[#78857a] font-mono">
              Started: {formatTime(unit.startedAt)}
              {unit.startedByUser?.name && ` by ${unit.startedByUser.name}`}
            </div>
          )}
          {unit.completedAt && (
            <div className="text-[10px] text-[#294d33] font-mono font-medium">
              Completed: {formatTime(unit.completedAt)}
              {unit.completedByUser?.name && ` by ${unit.completedByUser.name}`}
            </div>
          )}
        </div>
      </div>

      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-[#eee9dc] space-y-2">
        <div className="flex items-center gap-2">
          {isPending && (
            <>
              <button
                type="button"
                onClick={handleStart}
                disabled={startMutation.isPending || completeMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#294d33] py-2 text-xs font-bold text-white hover:bg-[#1e3825] transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Play size={13} />
                <span>{startMutation.isPending ? "Starting..." : "Start"}</span>
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={startMutation.isPending || completeMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] py-2 text-xs font-bold text-[#26352a] hover:bg-[#ede8db] transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                title="Finish unit directly"
              >
                <Check size={13} className="text-[#294d33]" />
                <span>{completeMutation.isPending ? "Completing..." : "Mark Done"}</span>
              </button>
            </>
          )}

          {isStarted && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#294d33] py-2.5 text-xs font-bold text-white hover:bg-[#1e3825] transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 size={15} className="text-[#d8bd83]" />
              <span>{completeMutation.isPending ? "Completing..." : "Mark Done"}</span>
            </button>
          )}

          {isDone && (
            <div className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#f3efe6] py-2 text-xs font-bold text-[#78857a] border border-[#e5dfd2]">
              <Check size={14} className="text-[#294d33]" />
              <span>Completed</span>
            </div>
          )}
        </div>

        {/* Admin Force Complete Order Button */}
        {isAdmin && !isDone && onForceCompleteOrder && (
          <button
            type="button"
            onClick={() => onForceCompleteOrder(unit.orderId, unit.orderNumber)}
            className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-[#78857a] hover:text-[#a34747] transition-colors py-1 cursor-pointer"
          >
            <Zap size={11} />
            <span>Admin: Force Complete Order</span>
          </button>
        )}
      </div>
    </div>
  );
}
