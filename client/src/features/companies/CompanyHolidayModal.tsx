"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type {
  CompanyHoliday,
  CreateHolidayRequest,
  UpdateHolidayRequest,
} from "@/types";
import { Calendar, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

interface CompanyHolidayModalProps {
  open: boolean;
  onClose: () => void;
  holiday?: CompanyHoliday | null;
  onSubmit: (data: CreateHolidayRequest | UpdateHolidayRequest) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function CompanyHolidayModal({
  open,
  onClose,
  holiday,
  onSubmit,
  loading = false,
  serverError,
}: CompanyHolidayModalProps) {
  const isEdit = Boolean(holiday);

  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (holiday) {
      setDate(holiday.date.split("T")[0]);
      setName(holiday.name);
      setDescription(holiday.description ?? "");
    } else {
      const today = new Date().toISOString().split("T")[0];
      setDate(today);
      setName("");
      setDescription("");
    }
    setErrors({});
  }, [holiday, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!date) newErrors.date = "Holiday date is required";
    if (!name.trim()) newErrors.name = "Holiday name is required (e.g. Christmas Day)";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: CreateHolidayRequest = {
      date,
      name: name.trim(),
      description: description.trim() || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Company Holiday" : "Add Delivery Holiday"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="rounded-xl bg-[#294d33]/5 border border-[#294d33]/15 p-3 text-xs text-[#294d33] flex items-start gap-2.5">
          <Calendar size={16} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Registered company holidays block all lunchtime food deliveries on the selected date for this company.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
              Holiday Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: "" }));
              }}
              className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
              required
            />
            {errors.date && (
              <p className="text-xs text-[#a34747] font-medium mt-1">{errors.date}</p>
            )}
          </div>

          <Input
            label="Holiday Name *"
            placeholder="e.g. Christmas Day, New Year Closure"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            error={errors.name}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-[#4c594f]">
            Description / Reason (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Company-wide bank holiday office closure."
            className="w-full rounded-xl border border-[#d9d2c2] bg-white p-2.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {isEdit ? "Save Changes" : "Register Holiday"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
