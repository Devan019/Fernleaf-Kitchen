"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  useAddOptionToGroup,
  useAddPortionToGroup,
  useCreateOptionGroup,
  useDeleteDishImage,
  useDeleteOptionGroup,
  useDish,
  useOptionGroups,
  useOptions,
  useRemoveOptionFromGroup,
  useRemovePortionFromGroup,
  useReorderGroupOptions,
  useUploadDishImage,
} from "@/features/catalogue/useCatalogue";
import { getErrorMessage } from "@/lib/utils/errors";
import type { Option } from "@/types";
import {
  ArrowDown,
  ArrowUp,
  Flame,
  Image as ImageIcon,
  Layers,
  Plus,
  Scale,
  Snowflake,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

interface DishDetailModalProps {
  dishId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function DishDetailModal({
  dishId,
  open,
  onClose,
  onEdit,
}: DishDetailModalProps) {
  const { data: dish, isLoading, isError, error } = useDish(dishId ?? "");
  const { data: optionGroups = [] } = useOptionGroups(dishId ?? "");
  const { data: allOptionsData } = useOptions(
    { limit: 100 },
    { enabled: Boolean(open && dishId) }
  );
  const allAvailableOptions = allOptionsData?.data ?? [];

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group mutations
  const uploadImageMutation = useUploadDishImage();
  const deleteImageMutation = useDeleteDishImage();
  const createGroupMutation = useCreateOptionGroup(dishId ?? "");
  const deleteGroupMutation = useDeleteOptionGroup(dishId ?? "");
  const addOptionMutation = useAddOptionToGroup(dishId ?? "");
  const removeOptionMutation = useRemoveOptionFromGroup(dishId ?? "");
  const reorderOptionsMutation = useReorderGroupOptions(dishId ?? "");
  const addPortionMutation = useAddPortionToGroup(dishId ?? "");
  const removePortionMutation = useRemovePortionFromGroup(dishId ?? "");

  // UI state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupUsesPortions, setNewGroupUsesPortions] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

  // Add Option to Group submodal/state
  const [selectedGroupIdForOption, setSelectedGroupIdForOption] = useState<string | null>(null);
  const [selectedOptionIdToAdd, setSelectedOptionIdToAdd] = useState("");

  // Add Portion to Group state
  const [selectedGroupIdForPortion, setSelectedGroupIdForPortion] = useState<string | null>(null);
  const [newPortionSizeId, setNewPortionSizeId] = useState("");

  // Confirm delete group
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  if (!open || !dishId) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMutationError(null);
    try {
      await uploadImageMutation.mutateAsync({ id: dishId, file });
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to upload image."));
    }
  };

  const handleImageDelete = async () => {
    setMutationError(null);
    try {
      await deleteImageMutation.mutateAsync(dishId);
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to delete image."));
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setMutationError(null);
    try {
      await createGroupMutation.mutateAsync({
        name: newGroupName.trim(),
        isRequired: newGroupRequired,
        usesPortions: newGroupUsesPortions,
        displayOrder: optionGroups.length + 1,
      });
      setNewGroupName("");
      setNewGroupRequired(false);
      setNewGroupUsesPortions(false);
      setShowAddGroup(false);
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to create option group."));
    }
  };

  const handleAddOptionToGroup = async (groupId: string) => {
    if (!selectedOptionIdToAdd) return;
    setMutationError(null);
    try {
      await addOptionMutation.mutateAsync({
        groupId,
        data: { optionId: selectedOptionIdToAdd },
      });
      setSelectedOptionIdToAdd("");
      setSelectedGroupIdForOption(null);
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to add option to group."));
    }
  };

  const handleMoveOption = async (
    groupId: string,
    options: Option[],
    currentIndex: number,
    direction: "up" | "down",
  ) => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const reordered = [...options];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const optionIds = reordered.map((opt) => opt.id);
    try {
      await reorderOptionsMutation.mutateAsync({ groupId, optionIds });
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to reorder options."));
    }
  };

  const handleAddPortionToGroup = async (groupId: string) => {
    if (!newPortionSizeId.trim()) return;
    setMutationError(null);
    try {
      await addPortionMutation.mutateAsync({
        groupId,
        data: { portionSizeId: newPortionSizeId.trim() },
      });
      setNewPortionSizeId("");
      setSelectedGroupIdForPortion(null);
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to add portion size."));
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await deleteGroupMutation.mutateAsync(groupToDelete);
      setGroupToDelete(null);
    } catch (err) {
      setMutationError(getErrorMessage(err, "Failed to delete group."));
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={dish?.name ?? "Dish Configuration"} size="lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="loader" />
          </div>
        ) : isError || !dish ? (
          <div className="rounded-2xl bg-[#fff5f5] p-6 text-center text-[#a34747] border border-[#ffdada]">
            {getErrorMessage(error, "Failed to load dish details.")}
          </div>
        ) : (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {mutationError && (
              <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
                {mutationError}
              </div>
            )}

            {/* Dish Top Summary Banner */}
            <div className="flex flex-col md:flex-row gap-5 items-start rounded-2xl bg-[#f5f1e6]/60 border border-[#eae5d8] p-4">
              {/* Dish Photo / Upload */}
              <div className="relative group w-32 h-32 rounded-2xl bg-white border border-[#d9d2c2] overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                {dish.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        title="Replace Image"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 w-8 rounded-lg bg-white/90 text-[#26352a] hover:bg-white flex items-center justify-center shadow-md"
                      >
                        <Upload size={14} />
                      </button>
                      <button
                        title="Delete Image"
                        onClick={handleImageDelete}
                        className="h-8 w-8 rounded-lg bg-[#a34747] text-white hover:bg-[#8c3030] flex items-center justify-center shadow-md"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-2 text-center cursor-pointer hover:bg-[#eae5d8]/40 transition-colors w-full h-full"
                  >
                    <ImageIcon size={22} className="text-[#9fa89e] mb-1" />
                    <span className="text-[10px] font-medium text-[#5c685e]">Upload Image</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Dish Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold text-[#294d33] bg-[#294d33]/10 px-2.5 py-0.5 rounded-md border border-[#294d33]/20">
                    {dish.sku}
                  </span>
                  <Badge variant={dish.temperature === "HOT" ? "kitchen" : "dispatch"}>
                    <span className="flex items-center gap-1">
                      {dish.temperature === "HOT" ? <Flame size={12} /> : <Snowflake size={12} />}
                      {dish.temperature}
                    </span>
                  </Badge>
                  <Badge variant={dish.isActive ? "active" : "inactive"}>
                    {dish.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <p className="text-sm text-[#5c685e] line-clamp-2 mt-1">
                  {dish.description || "No description provided."}
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs text-[#5c685e]">
                  <div>
                    <span className="text-[#9fa89e]">Cost Price: </span>
                    <span className="font-semibold text-[#26352a] font-mono">
                      ${Number(dish.costPrice).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9fa89e]">Min Order: </span>
                    <span className="font-semibold text-[#26352a]">
                      {dish.minimumOrderQuantity ?? 1}
                    </span>
                  </div>
                  {dish.kitchenStationId && (
                    <div>
                      <span className="text-[#9fa89e]">Station: </span>
                      <span className="font-semibold text-[#26352a]">
                        {dish.kitchenStation?.name ?? dish.kitchenStationId}
                      </span>
                    </div>
                  )}
                </div>

                {/* Dietary and Allergens Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {dish.dietaryTags?.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-lg bg-[#294d33]/10 px-2 py-0.5 text-[10px] font-semibold text-[#294d33] border border-[#294d33]/20"
                    >
                      🌱 {tag.name}
                    </span>
                  ))}
                  {dish.allergens?.map((allergen) => (
                    <span
                      key={allergen.id}
                      className="rounded-lg bg-[#a34747]/10 px-2 py-0.5 text-[10px] font-semibold text-[#a34747] border border-[#a34747]/20"
                    >
                      ⚠️ {allergen.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Option Groups & Portions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-2">
                <div>
                  <h3 className="font-serif text-base font-semibold text-[#26352a] flex items-center gap-2">
                    <Layers size={17} className="text-[#294d33]" />
                    Configured Option Groups & Portions
                  </h3>
                  <p className="text-xs text-[#78857a]">
                    Customize dish choices, protein selections, dressings, and portion tiers.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={14} />}
                  onClick={() => setShowAddGroup(true)}
                >
                  Add Option Group
                </Button>
              </div>

              {/* Add Option Group Form */}
              {showAddGroup && (
                <form
                  onSubmit={handleCreateGroup}
                  className="rounded-2xl border border-[#c8a96b]/40 bg-[#fefaf0] p-4 space-y-3"
                >
                  <h4 className="text-xs font-bold text-[#8c6b29] uppercase tracking-wider">
                    New Option Group for {dish.name}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <Input
                        label="Group Name *"
                        placeholder="e.g. Choice of Dressing, Extra Protein"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex items-end gap-3 pb-1">
                      <label className="flex items-center gap-2 text-xs text-[#26352a] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newGroupRequired}
                          onChange={(e) => setNewGroupRequired(e.target.checked)}
                          className="rounded border-[#d9d2c2] text-[#294d33] focus:ring-[#294d33]"
                        />
                        Required Selection
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#26352a] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newGroupUsesPortions}
                          onChange={(e) => setNewGroupUsesPortions(e.target.checked)}
                          className="rounded border-[#d9d2c2] text-[#294d33] focus:ring-[#294d33]"
                        />
                        Uses Portions
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => setShowAddGroup(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      type="submit"
                      loading={createGroupMutation.isPending}
                    >
                      Save Group
                    </Button>
                  </div>
                </form>
              )}

              {/* Option Groups List */}
              {optionGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d9d2c2] p-8 text-center bg-[#fbfaf6]/60">
                  <Layers size={24} className="mx-auto text-[#9fa89e] mb-2" />
                  <p className="text-sm font-semibold text-[#26352a]">No Option Groups Attached</p>
                  <p className="text-xs text-[#78857a] mt-1">
                    Option groups allow customers to customize dressings, proteins, side choices,
                    or portion sizes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {optionGroups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs space-y-3"
                    >
                      {/* Group header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-[#26352a]">
                            {group.name}
                          </span>
                          {group.isRequired && (
                            <span className="rounded-md bg-[#c8a96b]/20 px-2 py-0.5 text-[10px] font-bold text-[#8c6b29]">
                              Required
                            </span>
                          )}
                          {group.usesPortions && (
                            <span className="rounded-md bg-[#35617a]/15 px-2 py-0.5 text-[10px] font-bold text-[#244c63] flex items-center gap-1">
                              <Scale size={11} />
                              Portion Sizes Enabled
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedGroupIdForOption(group.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#294d33] hover:text-[#172e1f] bg-[#294d33]/10 hover:bg-[#294d33]/20 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Plus size={13} />
                            Attach Option
                          </button>
                          {group.usesPortions && (
                            <button
                              onClick={() => setSelectedGroupIdForPortion(group.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#35617a] hover:text-[#244c63] bg-[#35617a]/10 hover:bg-[#35617a]/20 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Plus size={13} />
                              Add Portion
                            </button>
                          )}
                          <button
                            onClick={() => setGroupToDelete(group.id)}
                            title="Delete Group"
                            className="h-7 w-7 rounded-lg text-[#a34747] hover:bg-[#fff0f0] flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Attach Option selector inline */}
                      {selectedGroupIdForOption === group.id && (
                        <div className="flex items-center gap-2 bg-[#f5f1e6] p-2.5 rounded-xl border border-[#eae5d8]">
                          <select
                            value={selectedOptionIdToAdd}
                            onChange={(e) => setSelectedOptionIdToAdd(e.target.value)}
                            className="h-9 flex-1 rounded-lg border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a]"
                          >
                            <option value="">Select an option from catalogue...</option>
                            {allAvailableOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name} (${Number(opt.costPrice).toFixed(2)})
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAddOptionToGroup(group.id)}
                            disabled={!selectedOptionIdToAdd}
                          >
                            Attach
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedGroupIdForOption(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      {/* Attach Portion selector inline */}
                      {selectedGroupIdForPortion === group.id && (
                        <div className="flex items-center gap-2 bg-[#f5f1e6] p-2.5 rounded-xl border border-[#eae5d8]">
                          <input
                            type="text"
                            placeholder="Portion ID / Name (e.g. Regular, Large, 500g)"
                            value={newPortionSizeId}
                            onChange={(e) => setNewPortionSizeId(e.target.value)}
                            className="h-9 flex-1 rounded-lg border border-[#d9d2c2] bg-white px-3 text-xs text-[#26352a]"
                          />
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAddPortionToGroup(group.id)}
                            disabled={!newPortionSizeId.trim()}
                          >
                            Add Portion
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedGroupIdForPortion(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      {/* Options table in group */}
                      {group.options && group.options.length > 0 ? (
                        <div className="divide-y divide-[#eee9dc] rounded-xl border border-[#eae5d8] bg-[#fbfaf6] overflow-hidden text-xs">
                          {group.options.map((option, idx) => (
                            <div
                              key={option.id}
                              className="flex items-center justify-between px-3 py-2 hover:bg-[#f6f2e8] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[10px] text-[#9fa89e] w-4">
                                  #{idx + 1}
                                </span>
                                <span className="font-medium text-[#26352a]">{option.name}</span>
                                <span className="font-mono text-[#5c685e] text-[11px]">
                                  +${Number(option.costPrice ?? 0).toFixed(2)} cost
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  disabled={idx === 0}
                                  onClick={() =>
                                    handleMoveOption(group.id, group.options, idx, "up")
                                  }
                                  className="h-6 w-6 rounded flex items-center justify-center text-[#5c685e] hover:bg-[#eae5d8] disabled:opacity-20"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  disabled={idx === group.options.length - 1}
                                  onClick={() =>
                                    handleMoveOption(group.id, group.options, idx, "down")
                                  }
                                  className="h-6 w-6 rounded flex items-center justify-center text-[#5c685e] hover:bg-[#eae5d8] disabled:opacity-20"
                                >
                                  <ArrowDown size={12} />
                                </button>
                                <button
                                  onClick={() =>
                                    removeOptionMutation.mutate({
                                      groupId: group.id,
                                      optionId: option.id,
                                    })
                                  }
                                  className="h-6 w-6 rounded flex items-center justify-center text-[#a34747] hover:bg-[#fff0f0]"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#8a988d] italic px-1">
                          No options attached to this group yet.
                        </p>
                      )}

                      {/* Portions in group if enabled */}
                      {group.usesPortions && group.portions && group.portions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#eee9dc]">
                          <p className="text-[11px] font-bold text-[#5c685e] uppercase tracking-wider mb-1.5">
                            Portion Sizes
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.portions.map((portion) => (
                              <span
                                key={portion.id ?? portion.portionSizeId}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#35617a]/10 px-2.5 py-1 text-xs text-[#244c63] border border-[#35617a]/20"
                              >
                                <span>{portion.name ?? portion.portionSizeId}</span>
                                <button
                                  onClick={() =>
                                    removePortionMutation.mutate({
                                      groupId: group.id,
                                      portionId: portion.id ?? portion.portionSizeId ?? "",
                                    })
                                  }
                                  className="text-[#a34747] hover:font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#eae5d8]">
              <Button variant="secondary" onClick={onEdit}>
                Edit Dish Information
              </Button>
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Option Group */}
      <ConfirmDialog
        open={groupToDelete !== null}
        onClose={() => setGroupToDelete(null)}
        onConfirm={handleDeleteGroup}
        loading={deleteGroupMutation.isPending}
        title="Delete Option Group?"
        description="Are you sure you want to delete this option group? Any attached options will be detached from this dish."
        confirmLabel="Delete Group"
      />
    </>
  );
}
