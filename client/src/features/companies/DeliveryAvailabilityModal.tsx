"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useDeliveryAvailability } from "@/features/companies/useCompanies";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

interface DeliveryAvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

export function DeliveryAvailabilityModal({
  open,
  onClose,
  companyId,
  companyName,
}: DeliveryAvailabilityModalProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [selectedDate, setSelectedDate] = useState(
    tomorrow.toISOString().split("T")[0],
  );

  const { data: availability, isLoading, isError, error } = useDeliveryAvailability(
    companyId,
    selectedDate,
    open,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Delivery Availability Checker • ${companyName}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-[#5c685e] leading-relaxed">
          Verify whether catering deliveries can be scheduled for <strong>{companyName}</strong> on a given date based on their working days calendar and holiday schedule.
        </p>

        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
            Test Target Delivery Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Results Card */}
        <div className="rounded-2xl border p-4 transition-all">
          {isLoading ? (
            <div className="flex items-center gap-3 text-xs text-[#78857a] py-2">
              <div className="w-4 h-4 border-2 border-[#294d33] border-t-transparent rounded-full animate-spin" />
              <span>Checking delivery calendar & holidays...</span>
            </div>
          ) : isError ? (
            <div className="text-xs text-[#a34747]">
              Error evaluating availability: {(error as any)?.message ?? "Server error"}
            </div>
          ) : availability ? (
            availability.allowed ? (
              <div className="flex items-start gap-3 text-[#22442b]">
                <CheckCircle2 size={20} className="text-[#294d33] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-[#1e3c26]">
                    Delivery Available
                  </h4>
                  <p className="text-[11px] text-[#3e6847] mt-0.5">
                    {selectedDate} is an active operational delivery day for {companyName}. Kitchen prep & dispatch can proceed normally.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-[#a34747]">
                <XCircle size={20} className="text-[#a34747] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-[#822c2c]">
                    Delivery Blocked
                  </h4>
                  <p className="text-[11px] text-[#9c4242] mt-0.5">
                    {availability.reason || `Target date ${selectedDate} is not available for deliveries.`}
                  </p>
                </div>
              </div>
            )
          ) : null}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#eae5d8]">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
