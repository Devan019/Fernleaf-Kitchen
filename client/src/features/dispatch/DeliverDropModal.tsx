import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Camera,
  CheckCircle2,
  ImageIcon,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { useDriverDeliverDrop, useDriverUploadPhoto } from "./useDispatch";
import { getErrorMessage } from "@/lib/utils/errors";
import type { DeliveryDrop } from "@/types";

interface DeliverDropModalProps {
  open: boolean;
  onClose: () => void;
  drop: DeliveryDrop;
}

export function DeliverDropModal({ open, onClose, drop }: DeliverDropModalProps) {
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deliverMutation = useDriverDeliverDrop();
  const uploadPhotoMutation = useDriverUploadPhoto();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size exceeds 5MB limit. Please choose a smaller photo.");
        return;
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setError(null);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    let photoUrl: string | undefined = undefined;

    try {
      if (selectedFile) {
        const uploadRes = await uploadPhotoMutation.mutateAsync({
          dropId: drop.id,
          file: selectedFile,
        });
        photoUrl = uploadRes.photoUrl;
      }

      await deliverMutation.mutateAsync({
        dropId: drop.id,
        payload: {
          note: note.trim() || undefined,
          photoUrl,
        },
      });

      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to complete delivery."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Complete Delivery" size="sm">
      <div className="space-y-4">
        {/* Drop Destination Header */}
        <div className="rounded-2xl bg-[#fbfaf6] p-3.5 border border-[#eae5d8] text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-[#26352a]">
            <span>🏢 {drop.company.name}</span>
            <span className="font-mono text-[#294d33]">⏰ {drop.deliveryTime}</span>
          </div>
          <p className="text-[11px] text-[#5c685e]">
            📍 {drop.address.street || "Company Address"}, {drop.address.city || ""}
          </p>
          <p className="text-[11px] text-[#78857a]">
            {drop.ordersCount} {drop.ordersCount === 1 ? "order" : "orders"} in this delivery drop
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Optional Delivery Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#26352a] block">
            Delivery Proof Note <span className="text-[#9fa89e] font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Handed to reception desk, signed by Sarah..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-[#d9d2c2] bg-white p-3 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
          />
        </div>

        {/* Optional Proof of Delivery Photo */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#26352a] block">
            Proof of Delivery Photo <span className="text-[#9fa89e] font-normal">(optional)</span>
          </label>

          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#d9d2c2]">
              <img
                src={previewUrl}
                alt="Delivery proof preview"
                className="w-full h-40 object-cover"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 rounded-xl bg-black/60 p-2 text-white hover:bg-black/80 transition-all cursor-pointer shadow-md"
                title="Remove photo"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d9d2c2] bg-[#fbfaf6] p-4 text-center cursor-pointer hover:border-[#294d33] transition-colors">
              <Camera size={24} className="text-[#294d33] mb-1" />
              <span className="text-xs font-semibold text-[#26352a]">
                Take / Upload Delivery Photo
              </span>
              <span className="text-[10px] text-[#78857a]">JPEG, PNG, WebP up to 5MB</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#eae5d8]">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CheckCircle2 size={16} />}
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            Confirm Delivery
          </Button>
        </div>
      </div>
    </Modal>
  );
}
