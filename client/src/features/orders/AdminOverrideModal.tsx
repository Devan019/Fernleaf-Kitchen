"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useCompanyAddresses } from "@/features/companies/useCompanies";
import type { AdminOverrideDeliveryRequest, OrderDetail } from "@/types";
import { AlertTriangle, ShieldAlert, Truck } from "lucide-react";
import { useEffect, useState } from "react";

const PACKAGING_OPTIONS = [
  { value: "ECO_BOX", label: "Eco-Friendly Compostable Box" },
  { value: "PREMIUM_TRAY", label: "Premium Catering Tray" },
  { value: "STANDARD_BAG", label: "Standard Sealed Paper Bag" },
  { value: "HOT_BOX", label: "Insulated Thermal Box" },
  { value: "CUSTOM", label: "Custom Corporate Packaging" },
];

interface AdminOverrideModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderDetail;
  onSubmit: (data: AdminOverrideDeliveryRequest) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function AdminOverrideModal({
  open,
  onClose,
  order,
  onSubmit,
  loading = false,
  serverError,
}: AdminOverrideModalProps) {
  const { data: addresses = [] } = useCompanyAddresses(order.companyId);

  const [deliveryTime, setDeliveryTime] = useState(order.deliveryTime ?? "12:00");
  const [deliveryAddressId, setDeliveryAddressId] = useState(
    order.deliveryAddress?.deliveryAddressId ?? "",
  );
  const [packagingType, setPackagingType] = useState(order.packagingType ?? "ECO_BOX");
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    order.deliveryInstructions ?? "",
  );

  useEffect(() => {
    if (order) {
      setDeliveryTime(order.deliveryTime ?? "12:00");
      setDeliveryAddressId(order.deliveryAddress?.deliveryAddressId ?? "");
      setPackagingType(order.packagingType ?? "ECO_BOX");
      setDeliveryInstructions(order.deliveryInstructions ?? "");
    }
  }, [order, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AdminOverrideDeliveryRequest = {
      deliveryTime: deliveryTime || undefined,
      deliveryAddressId: deliveryAddressId || undefined,
      packagingType: packagingType || undefined,
      deliveryInstructions: deliveryInstructions.trim() || undefined,
    };
    await onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Admin Delivery Override • ${order.orderNumber}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Warning Badge */}
        <div className="rounded-2xl bg-[#fff8e6] border border-[#ffd880] p-3.5 space-y-1 text-[#8a6000]">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle size={16} className="text-[#d48806]" />
            Administrative Override Action
          </div>
          <p className="text-[11px] leading-relaxed">
            This override updates delivery parameters after cut-off without altering historical dish price snapshots. The change will immediately update kitchen preparation and delivery driver routing.
          </p>
        </div>

        {/* Delivery Time */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
            Requested Delivery Time (HH:mm)
          </label>
          <input
            type="time"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none font-mono"
          />
        </div>

        {/* Delivery Address */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
            Company Delivery Address
          </label>
          <select
            value={deliveryAddressId}
            onChange={(e) => setDeliveryAddressId(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
          >
            <option value="">Select an address...</option>
            {addresses.map((addr) => (
              <option key={addr.id} value={addr.id}>
                📍 {addr.label} — {addr.street}, {addr.postcode}
              </option>
            ))}
          </select>
        </div>

        {/* Packaging Type */}
        <div>
          <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
            Packaging Preference
          </label>
          <select
            value={packagingType}
            onChange={(e) => setPackagingType(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-white px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
          >
            {PACKAGING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Delivery Instructions */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-[#4c594f]">
            Specific Delivery Instructions
          </label>
          <textarea
            rows={3}
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            placeholder="e.g. Leave with concierge on Floor 2, buzzer 4."
            className="w-full rounded-xl border border-[#d9d2c2] bg-white p-2.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Apply Override
          </Button>
        </div>
      </form>
    </Modal>
  );
}
