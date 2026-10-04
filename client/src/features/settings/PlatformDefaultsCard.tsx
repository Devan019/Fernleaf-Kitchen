import { Button } from "@/components/ui/Button";
import { useUpdateKitchenSettings } from "./useSettings";
import { getErrorMessage } from "@/lib/utils/errors";
import type { KitchenSettings } from "@/types";
import { CheckCircle2, Globe2, ShieldAlert } from "lucide-react";
import { useState } from "react";

const COMMON_TIMEZONES = [
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

interface PlatformDefaultsCardProps {
  settings: KitchenSettings;
}

export function PlatformDefaultsCard({ settings }: PlatformDefaultsCardProps) {
  const [timezone, setTimezone] = useState<string>(settings.timezone || "Europe/London");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateSettingsMutation = useUpdateKitchenSettings();
  const hasChanges = timezone !== settings.timezone;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateSettingsMutation.mutateAsync({
        timezone,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to update platform timezone."));
    }
  };

  return (
    <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#eee9dc] pb-4">
        <div>
          <h3 className="font-serif text-xl font-black text-[#26352a] tracking-tight flex items-center gap-2">
            <Globe2 size={20} className="text-[#294d33]" />
            <span>Platform Defaults</span>
          </h3>
          <p className="text-xs text-[#5c685e] mt-1">
            Operational timezone and system-wide regional timing parameters.
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
          <span>Platform timezone updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#26352a] flex items-center justify-between">
            <span>Operating Timezone</span>
            <span className="text-[11px] font-mono text-[#78857a]">Current: {settings.timezone}</span>
          </label>
          <select
            value={timezone}
            onChange={(e) => {
              setSaveSuccess(false);
              setTimezone(e.target.value);
            }}
            className="h-11 w-full rounded-2xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] font-bold focus:border-[#294d33] focus:outline-none cursor-pointer"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#78857a]">
            Determines the exact operational clock for order cut-off evaluations, kitchen prep scheduling, and delivery timestamps.
          </p>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            type="submit"
            disabled={!hasChanges || updateSettingsMutation.isPending}
            className="shadow-xs"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Platform Defaults"}
          </Button>
        </div>
      </form>
    </div>
  );
}
