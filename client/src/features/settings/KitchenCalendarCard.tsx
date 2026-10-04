import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AddHolidayModal } from "./AddHolidayModal";
import { useDeleteKitchenHoliday, useUpdateKitchenSettings } from "./useSettings";
import { getErrorMessage } from "@/lib/utils/errors";
import type { DayOfWeek, KitchenHoliday, KitchenSettings } from "@/types";
import {
  Calendar,
  CalendarCheck,
  CalendarOff,
  Check,
  CheckCircle2,
  Info,
  PlusCircle,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

const ALL_WEEKDAYS: { id: DayOfWeek; label: string; short: string }[] = [
  { id: "MONDAY", label: "Monday", short: "Mon" },
  { id: "TUESDAY", label: "Tuesday", short: "Tue" },
  { id: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { id: "THURSDAY", label: "Thursday", short: "Thu" },
  { id: "FRIDAY", label: "Friday", short: "Fri" },
  { id: "SATURDAY", label: "Saturday", short: "Sat" },
  { id: "SUNDAY", label: "Sunday", short: "Sun" },
];

interface KitchenCalendarCardProps {
  settings: KitchenSettings;
  holidays: KitchenHoliday[];
}

export function KitchenCalendarCard({ settings, holidays }: KitchenCalendarCardProps) {
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>(settings.workingDays);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<KitchenHoliday | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateSettingsMutation = useUpdateKitchenSettings();
  const deleteHolidayMutation = useDeleteKitchenHoliday();

  // Check if working days have unsaved modifications
  const hasUnsavedDays = useMemo(() => {
    const current = new Set(settings.workingDays);
    if (workingDays.length !== current.size) return true;
    return workingDays.some((d) => !current.has(d));
  }, [workingDays, settings.workingDays]);

  const toggleDay = (day: DayOfWeek) => {
    setSaveSuccess(false);
    setSaveError(null);
    if (workingDays.includes(day)) {
      if (workingDays.length <= 1) {
        setSaveError("At least one working day is required for kitchen operations.");
        return;
      }
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSaveWorkingDays = async () => {
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await updateSettingsMutation.mutateAsync({
        workingDays,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to update working days."));
    }
  };

  const handleConfirmDeleteHoliday = async () => {
    if (!deletingHoliday) return;
    try {
      await deleteHolidayMutation.mutateAsync(deletingHoliday.id);
      setDeletingHoliday(null);
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to remove kitchen holiday."));
    }
  };

  // Group holidays by Year
  const sortedHolidays = useMemo(() => {
    return [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays]);

  return (
    <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 sm:p-8 shadow-xs space-y-8">
      {/* Section Title */}
      <div className="flex items-start justify-between gap-4 border-b border-[#eee9dc] pb-4">
        <div>
          <h3 className="font-serif text-xl font-black text-[#26352a] tracking-tight flex items-center gap-2">
            <CalendarCheck size={20} className="text-[#294d33]" />
            <span>Kitchen Calendar</span>
          </h3>
          <p className="text-xs text-[#5c685e] mt-1">
            Configure active kitchen production days and registered annual closure dates.
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
          <span>Kitchen working days updated successfully!</span>
        </div>
      )}

      {/* ── Sub-Section 1: Working Days ────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="font-serif font-black text-base text-[#26352a]">Working Days</h4>
          <p className="text-xs text-[#78857a]">
            Kitchen working days are used when calculating backwards order cut-off deadlines.
          </p>
        </div>

        {/* Weekday Selector Chips / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {ALL_WEEKDAYS.map((day) => {
            const isSelected = workingDays.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? "border-[#294d33] bg-[#294d33] text-white shadow-xs"
                    : "border-[#d9d2c2] bg-[#fbfaf6] text-[#78857a] hover:bg-[#ede8db]"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  {isSelected && <Check size={13} className="shrink-0" />}
                  <span>{day.short}</span>
                </div>
                <span className={`text-[10px] mt-0.5 ${isSelected ? "text-white/80" : "text-[#9fa89e]"}`}>
                  {isSelected ? "Open" : "Closed"}
                </span>
              </button>
            );
          })}
        </div>

        {hasUnsavedDays && (
          <div className="flex items-center justify-between rounded-2xl bg-[#fff9f5] border border-[#f5d0b5] p-3 text-xs text-[#b85614]">
            <div className="flex items-center gap-2">
              <Info size={15} />
              <span>You have unsaved changes to working days.</span>
            </div>
            <Button
              size="sm"
              onClick={handleSaveWorkingDays}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Working Days"}
            </Button>
          </div>
        )}
      </div>

      <hr className="border-[#eee9dc]" />

      {/* ── Sub-Section 2: Kitchen Holidays ────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="font-serif font-black text-base text-[#26352a]">Kitchen Holidays</h4>
            <p className="text-xs text-[#78857a]">
              Scheduled closure dates where food is not produced. Order cut-off skips these dates.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={<PlusCircle size={14} />}
          >
            Add Holiday
          </Button>
        </div>

        {/* Holiday Cards List */}
        {sortedHolidays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9d2c2] bg-[#fbfaf6] p-8 text-center space-y-2">
            <CalendarOff size={28} className="mx-auto text-[#78857a]" />
            <p className="font-bold text-xs text-[#26352a]">No Kitchen Holidays Registered</p>
            <p className="text-[11px] text-[#78857a] max-w-sm mx-auto">
              Add planned kitchen public holidays, seasonal closures, or maintenance days.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedHolidays.map((holiday) => {
              const d = new Date(holiday.date);
              const day = d.getDate();
              const month = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
              const year = d.getFullYear();

              return (
                <div
                  key={holiday.id}
                  className="group rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6] p-4 flex items-start justify-between gap-3 hover:border-[#294d33]/40 hover:bg-white transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    {/* Calendar Badge */}
                    <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-[#eae5d8] px-2.5 py-1.5 text-center shadow-2xs min-w-11">
                      <span className="text-[10px] font-black uppercase text-[#e27d34] leading-tight">
                        {month}
                      </span>
                      <span className="font-serif font-black text-base text-[#26352a] leading-tight">
                        {day}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <p className="font-serif font-black text-xs text-[#26352a] leading-snug">
                        {holiday.name}
                      </p>
                      <p className="text-[10px] text-[#78857a] font-mono">{holiday.date} ({year})</p>
                      {holiday.description && (
                        <p className="text-[10px] text-[#5c685e] line-clamp-1">{holiday.description}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeletingHoliday(holiday)}
                    title="Remove holiday"
                    className="p-1.5 rounded-lg text-[#78857a] hover:bg-[#fff5f5] hover:text-[#a34747] transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      {showAddModal && (
        <AddHolidayModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          existingDates={holidays.map((h) => h.date)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingHoliday && (
        <Modal
          open={Boolean(deletingHoliday)}
          onClose={() => setDeletingHoliday(null)}
          title="Remove Kitchen Holiday"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#5c685e]">
              Are you sure you want to remove the kitchen holiday for{" "}
              <strong className="text-[#26352a]">{deletingHoliday.name}</strong> ({deletingHoliday.date})?
            </p>
            <p className="text-[11px] text-[#78857a]">
              Future backwards cut-off calculations will consider this date a normal working day if it falls on an active weekday.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingHoliday(null)}
                disabled={deleteHolidayMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteHoliday}
                disabled={deleteHolidayMutation.isPending}
                className="bg-[#a34747] hover:bg-[#853434] text-white"
              >
                {deleteHolidayMutation.isPending ? "Removing..." : "Remove Holiday"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
