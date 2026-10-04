"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type {
  CreateDeliveryAddressRequest,
  DeliveryAddress,
  UpdateDeliveryAddressRequest,
} from "@/types";
import { MapPin, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

interface CompanyAddressModalProps {
  open: boolean;
  onClose: () => void;
  address?: DeliveryAddress | null;
  onSubmit: (data: CreateDeliveryAddressRequest | UpdateDeliveryAddressRequest) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
}

export function CompanyAddressModal({
  open,
  onClose,
  address,
  onSubmit,
  loading = false,
  serverError,
}: CompanyAddressModalProps) {
  const isEdit = Boolean(address);

  const [label, setLabel] = useState("");
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (address) {
      setLabel(address.label);
      setStreet(address.street);
      setUnit(address.unit ?? "");
      setCity(address.city);
      setPostcode(address.postcode);
      setDeliveryInstructions(address.deliveryInstructions ?? "");
      setIsDefault(address.isDefault);
    } else {
      setLabel("");
      setStreet("");
      setUnit("");
      setCity("London");
      setPostcode("");
      setDeliveryInstructions("");
      setIsDefault(false);
    }
    setErrors({});
  }, [address, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!label.trim()) newErrors.label = "Address label is required (e.g. HQ Floor 4)";
    if (!street.trim()) newErrors.street = "Street address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!postcode.trim()) newErrors.postcode = "Postcode is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: CreateDeliveryAddressRequest = {
      label: label.trim(),
      street: street.trim(),
      unit: unit.trim() || undefined,
      city: city.trim(),
      postcode: postcode.trim().toUpperCase(),
      deliveryInstructions: deliveryInstructions.trim() || undefined,
      isDefault,
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Delivery Address" : "Add Delivery Address"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <Input
          label="Address Label *"
          placeholder="e.g. HQ Main Reception, Engineering Floor 3"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (errors.label) setErrors((prev) => ({ ...prev, label: "" }));
          }}
          error={errors.label}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Street Address *"
              placeholder="e.g. 100 Innovation Way"
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                if (errors.street) setErrors((prev) => ({ ...prev, street: "" }));
              }}
              error={errors.street}
              required
            />
          </div>

          <Input
            label="Unit / Suite / Floor"
            placeholder="e.g. Floor 4"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="City *"
            placeholder="e.g. London"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
            }}
            error={errors.city}
            required
          />

          <Input
            label="Postcode *"
            placeholder="e.g. EC1A 1BB"
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value);
              if (errors.postcode) setErrors((prev) => ({ ...prev, postcode: "" }));
            }}
            error={errors.postcode}
            className="uppercase font-mono"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-[#4c594f]">
            Specific Delivery Instructions (Optional)
          </label>
          <textarea
            rows={2}
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            placeholder="e.g. Ring side buzzer, ask for catering reception on 4th floor."
            className="w-full rounded-xl border border-[#d9d2c2] bg-white p-2.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#f5f1e6]/60 p-3 border border-[#eae5d8]">
          <div>
            <p className="text-xs font-semibold text-[#26352a]">Primary Default Address</p>
            <p className="text-[11px] text-[#78857a]">
              Used automatically for corporate catering orders unless employee specifies otherwise.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#d9d2c2] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#294d33]" />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {isEdit ? "Save Address" : "Add Address"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
