import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCreateKitchenHoliday } from "./useSettings";
import { getErrorMessage } from "@/lib/utils/errors";
import { Calendar, PlusCircle, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface AddHolidayModalProps {
  open: boolean;
  onClose: () => void;
  existingDates?: string[];
}

export function AddHolidayModal({ open, onClose, existingDates = [] }: AddHolidayModalProps) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createHolidayMutation = useCreateKitchenHoliday();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("Please select a valid holiday date.");
      return;
    }
    if (!name.trim()) {
      setError("Please provide a holiday name or title.");
      return;
    }
    if (existingDates.includes(date)) {
      setError(`A kitchen holiday is already registered for ${date}.`);
      return;
    }

    try {
      await createHolidayMutation.mutateAsync({
        date,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to register kitchen holiday."));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Kitchen Holiday" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-[#5c685e]">
          The kitchen is closed on registered holidays. Backwards cut-off date calculations for orders will skip this date.
        </p>

        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Date Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#26352a]">
            Closure Date <span className="text-[#a34747]">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] focus:border-[#294d33] focus:outline-none cursor-pointer"
              required
            />
          </div>
        </div>

        {/* Holiday Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#26352a]">
            Holiday / Closure Name <span className="text-[#a34747]">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Christmas Day Closure, New Year Bank Holiday, Kitchen Maintenance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#26352a]">
            Notes / Description (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Additional context for staff regarding this closure..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-[#d9d2c2] bg-white p-3 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={createHolidayMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createHolidayMutation.isPending}
            icon={<PlusCircle size={15} />}
          >
            {createHolidayMutation.isPending ? "Adding..." : "Add Holiday"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
