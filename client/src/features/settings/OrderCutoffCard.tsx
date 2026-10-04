import { Button } from "@/components/ui/Button";
import { useUpdateKitchenSettings } from "./useSettings";
import { getErrorMessage } from "@/lib/utils/errors";
import type { KitchenSettings } from "@/types";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

interface OrderCutoffCardProps {
  settings: KitchenSettings;
}

export function OrderCutoffCard({ settings }: OrderCutoffCardProps) {
  const [cutOffWorkingDays, setCutOffWorkingDays] = useState<number>(
    settings.cutOffWorkingDays
  );
  const [cutOffTime, setCutOffTime] = useState<string>(settings.cutOffTime);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateSettingsMutation = useUpdateKitchenSettings();

  const daysChanged = cutOffWorkingDays !== settings.cutOffWorkingDays;
  const timeChanged = cutOffTime !== settings.cutOffTime;
  const hasUnsavedChanges = daysChanged || timeChanged;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);

    if (cutOffWorkingDays < 0) {
      setSaveError("Cut-off working days must be 0 or greater.");
      return;
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutOffTime)) {
      setSaveError("Cut-off time must be in valid 24-hour HH:mm format (e.g. 16:00).");
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        cutOffWorkingDays,
        cutOffTime,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to update cut-off settings."));
    }
  };

  return (
    <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#eee9dc] pb-4">
        <div>
          <h3 className="font-serif text-xl font-black text-[#26352a] tracking-tight flex items-center gap-2">
            <Clock size={20} className="text-[#294d33]" />
            <span>Order Cut-off Rules</span>
          </h3>
          <p className="text-xs text-[#5c685e] mt-1">
            Configure order lock deadlines and working days calculation rules.
          </p>
        </div>
      </div>

      {saveError && (
        <div className="rounded-2xl bg-[#fff5f5] p-4 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2.5">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-2xl bg-[#294d33]/10 p-4 text-xs text-[#294d33] border border-[#294d33]/20 flex items-center gap-2.5">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Order cut-off rules updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cut-off Working Days */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#26352a] flex items-center justify-between">
              <span>Cut-off Working Days</span>
              <span className="text-[11px] font-mono text-[#78857a]">Current: {settings.cutOffWorkingDays} days</span>
            </label>
            <div className="relative">
              <select
                value={cutOffWorkingDays}
                onChange={(e) => {
                  setSaveSuccess(false);
                  setCutOffWorkingDays(Number(e.target.value));
                }}
                className="h-11 w-full rounded-2xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] font-bold focus:border-[#294d33] focus:outline-none cursor-pointer"
              >
                <option value={0}>0 working days (Same-day cut-off)</option>
                <option value={1}>1 working day prior</option>
                <option value={2}>2 working days prior (Default)</option>
                <option value={3}>3 working days prior</option>
                <option value={4}>4 working days prior</option>
                <option value={5}>5 working days prior</option>
                <option value={6}>6 working days prior</option>
                <option value={7}>7 working days prior</option>
              </select>
            </div>
            <p className="text-[11px] text-[#78857a]">
              Orders lock this many kitchen working days before delivery.
            </p>
          </div>

          {/* Cut-off Time */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#26352a] flex items-center justify-between">
              <span>Cut-off Time (24h)</span>
              <span className="text-[11px] font-mono text-[#78857a]">Current: {settings.cutOffTime}</span>
            </label>
            <div className="relative">
              <input
                type="time"
                value={cutOffTime}
                onChange={(e) => {
                  setSaveSuccess(false);
                  setCutOffTime(e.target.value);
                }}
                className="h-11 w-full rounded-2xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] font-bold focus:border-[#294d33] focus:outline-none cursor-pointer font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-[#78857a]">
              The exact local time when orders stop accepting edits or cancellations.
            </p>
          </div>
        </div>

        {/* Real-time Impact Warnings */}
        {hasUnsavedChanges && (
          <div className="rounded-2xl border border-[#f5d0b5] bg-[#fff9f5] p-4 text-xs text-[#b85614] space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={15} />
              <span>Operational Impact Notice</span>
            </div>
            {daysChanged && (
              <p className="text-[11px]">
                • Changing working days from <strong className="font-mono">{settings.cutOffWorkingDays}</strong> to{" "}
                <strong className="font-mono">{cutOffWorkingDays}</strong> will change when future customer orders become locked.
              </p>
            )}
            {timeChanged && (
              <p className="text-[11px]">
                • Changing cut-off time from <strong className="font-mono">{settings.cutOffTime}</strong> to{" "}
                <strong className="font-mono">{cutOffTime}</strong> will apply to all upcoming delivery dates.
              </p>
            )}
          </div>
        )}

        {/* Illustrative Schedule Example Box */}
        <div className="rounded-2xl border border-[#294d33]/20 bg-[#fbfaf6] p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#294d33] font-bold text-[11px] uppercase tracking-wider">
            <Sparkles size={13} />
            <span>Calculation Rule Summary</span>
          </div>
          <p className="text-[#5c685e] leading-relaxed text-[11px]">
            With <strong className="text-[#26352a]">{cutOffWorkingDays} working days</strong> at{" "}
            <strong className="text-[#26352a]">{cutOffTime}</strong>, a Wednesday delivery locks on{" "}
            <strong className="text-[#26352a]">Monday at {cutOffTime}</strong> (assuming Mon-Fri operations), skipping registered kitchen closure holidays and non-working weekends.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end pt-2">
          <Button
            type="submit"
            disabled={!hasUnsavedChanges || updateSettingsMutation.isPending}
            className="shadow-xs"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Cut-off Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
