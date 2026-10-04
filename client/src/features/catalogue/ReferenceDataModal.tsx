"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  useAllergens,
  useCreateAllergen,
  useCreateDietaryTag,
  useDietaryTags,
  useUpdateAllergen,
  useUpdateDietaryTag,
} from "@/features/catalogue/useCatalogue";
import { getErrorMessage } from "@/lib/utils/errors";
import type { Allergen, DietaryTag } from "@/types";
import { Leaf, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface ReferenceDataModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReferenceDataModal({ open, onClose }: ReferenceDataModalProps) {
  const [activeTab, setActiveTab] = useState<"allergens" | "dietary">("allergens");

  const { data: rawAllergens, isLoading: loadingAllergens } = useAllergens({
    enabled: open,
  });
  const { data: rawDietary, isLoading: loadingDietary } = useDietaryTags({
    enabled: open,
  });

  const allergens: Allergen[] = Array.isArray(rawAllergens)
    ? rawAllergens
    : Array.isArray((rawAllergens as any)?.data)
      ? (rawAllergens as any).data
      : [];

  const dietaryTags: DietaryTag[] = Array.isArray(rawDietary)
    ? rawDietary
    : Array.isArray((rawDietary as any)?.data)
      ? (rawDietary as any).data
      : [];

  const createAllergenMutation = useCreateAllergen();
  const updateAllergenMutation = useUpdateAllergen();
  const createDietaryMutation = useCreateDietaryTag();
  const updateDietaryMutation = useUpdateDietaryTag();

  const [newName, setNewName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setErrorMsg(null);
    try {
      if (activeTab === "allergens") {
        await createAllergenMutation.mutateAsync({ name: newName.trim() });
      } else {
        await createDietaryMutation.mutateAsync({ name: newName.trim() });
      }
      setNewName("");
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to create item."));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reference Data Management" size="md">
      <div className="space-y-4">
        {/* Sub-tabs */}
        <div className="flex rounded-xl bg-[#eae5d8]/70 p-1 border border-[#d9d2c2]">
          <button
            onClick={() => {
              setActiveTab("allergens");
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "allergens"
                ? "bg-[#294d33] text-white shadow-xs"
                : "text-[#5c685e] hover:text-[#26352a]"
            }`}
          >
            <ShieldAlert size={14} />
            Allergens ({allergens.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("dietary");
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "dietary"
                ? "bg-[#294d33] text-white shadow-xs"
                : "text-[#5c685e] hover:text-[#26352a]"
            }`}
          >
            <Leaf size={14} />
            Dietary Tags ({dietaryTags.length})
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
            {errorMsg}
          </div>
        )}

        {/* Add new inline form */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder={
              activeTab === "allergens"
                ? "Add allergen (e.g. Peanuts, Dairy, Shellfish)..."
                : "Add dietary tag (e.g. Vegan, Gluten-Free, Halal)..."
            }
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="text-xs"
          />
          <Button
            type="submit"
            icon={<Plus size={14} />}
            loading={createAllergenMutation.isPending || createDietaryMutation.isPending}
            disabled={!newName.trim()}
          >
            Add
          </Button>
        </form>

        {/* List of items */}
        <div className="divide-y divide-[#eae5d8] rounded-xl border border-[#d9d2c2] bg-white max-h-64 overflow-y-auto">
          {activeTab === "allergens" ? (
            loadingAllergens ? (
              <p className="p-4 text-xs text-center text-[#78857a]">Loading allergens...</p>
            ) : allergens.length === 0 ? (
              <p className="p-4 text-xs text-center text-[#78857a]">No allergens created yet.</p>
            ) : (
              allergens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 text-xs hover:bg-[#fbfaf6] transition-colors"
                >
                  <span className="font-semibold text-[#26352a]">⚠️ {item.name}</span>
                </div>
              ))
            )
          ) : loadingDietary ? (
            <p className="p-4 text-xs text-center text-[#78857a]">Loading dietary tags...</p>
          ) : dietaryTags.length === 0 ? (
            <p className="p-4 text-xs text-center text-[#78857a]">No dietary tags created yet.</p>
          ) : (
            dietaryTags.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 text-xs hover:bg-[#fbfaf6] transition-colors"
              >
                <span className="font-semibold text-[#26352a]">🌱 {item.name}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
