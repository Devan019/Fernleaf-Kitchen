"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useProcessCutoff } from "@/features/orders/useOrders";
import type { ProcessCutoffResponse } from "@/types";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface ProcessCutoffModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProcessCutoffModal({ open, onClose }: ProcessCutoffModalProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [deliveryDate, setDeliveryDate] = useState(
    tomorrow.toISOString().split("T")[0],
  );

  const [result, setResult] = useState<ProcessCutoffResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processMutation = useProcessCutoff();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDate) return;
    setError(null);
    try {
      const res = await processMutation.mutateAsync(deliveryDate);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to process cut-off.");
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Manual Kitchen Cut-Off Execution" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4 space-y-2 text-xs text-[#5c685e]">
          <div className="flex items-center gap-2 font-bold text-[#26352a]">
            <Clock size={16} className="text-[#294d33]" />
            What happens during cut-off processing?
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
            <li>
              <strong>Placed Orders</strong> transition to <strong>CONFIRMED</strong>, lock their prices, and become billable.
            </li>
            <li>
              <strong>Draft Orders</strong> that were never placed are automatically <strong>CANCELLED</strong>.
            </li>
            <li>
              Kitchen preparation units and driver drops are synthesized for dispatch.
            </li>
            <li>
              Cut-off execution is idempotent and safe to run repeatedly.
            </li>
          </ul>
        </div>

        {/* Results Banner */}
        {result && (
          <div className="rounded-2xl bg-[#f4f8f5] border border-[#b2d3bc] p-4 text-xs text-[#22442b] space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 size={16} className="text-[#294d33]" />
              Cut-Off Successfully Processed for {result.deliveryDate}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-xl bg-white border border-[#d9d2c2]">
                <span className="text-[#78857a] block">Confirmed Orders:</span>
                <span className="font-bold text-sm text-[#294d33]">{result.confirmedPlaced}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-[#d9d2c2]">
                <span className="text-[#78857a] block">Cancelled Drafts:</span>
                <span className="font-bold text-sm text-[#a34747]">{result.cancelledDrafts}</span>
              </div>
            </div>
            <p className="text-[10px] text-[#78857a]">
              Timestamp: {new Date(result.processedAt).toLocaleString()}
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
            Target Delivery Date *
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => {
              setDeliveryDate(e.target.value);
              handleReset();
            }}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none font-mono"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose}>
            {result ? "Done" : "Cancel"}
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={processMutation.isPending}
            icon={<Zap size={14} />}
          >
            Execute Cut-Off
          </Button>
        </div>
      </form>
    </Modal>
  );
}
