"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { usePreviewEmployeeCategory, usePreviewEmployeeMenu } from "@/features/menu/useMenu";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  Building2,
  Flame,
  Lock,
  Search,
  Snowflake,
  Sparkles,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";

interface MenuPreviewModalProps {
  open: boolean;
  onClose: () => void;
}

export function MenuPreviewModal({ open, onClose }: MenuPreviewModalProps) {
  const [employeeId, setEmployeeId] = useState("emp_001");
  const [searchEmployeeId, setSearchEmployeeId] = useState("emp_001");
  const [targetCategoryId, setTargetCategoryId] = useState("");

  const {
    data: menuData,
    isLoading: loadingMenu,
    isError: isMenuError,
    error: menuError,
    refetch,
  } = usePreviewEmployeeMenu(searchEmployeeId, Boolean(searchEmployeeId));

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) return;
    setSearchEmployeeId(employeeId.trim());
  };

  return (
    <Modal open={open} onClose={onClose} title="Customer Employee Menu Preview" size="lg">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Controls */}
        <form
          onSubmit={handleSimulate}
          className="flex flex-col sm:flex-row gap-3 rounded-2xl bg-[#f5f1e6]/70 p-3.5 border border-[#eae5d8]"
        >
          <div className="flex-1">
            <Input
              placeholder="Enter Customer Employee ID (e.g. emp_001)..."
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="text-xs"
            />
          </div>
          <Button
            type="submit"
            icon={<Search size={14} />}
            loading={loadingMenu}
            disabled={!employeeId.trim()}
          >
            Simulate Menu
          </Button>
        </form>

        {/* Output */}
        {loadingMenu ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="loader mb-2" />
            <p className="text-xs text-[#78857a]">
              Resolving dynamic price tiers, corporate restrictions & category structures...
            </p>
          </div>
        ) : isMenuError ? (
          <div className="rounded-2xl bg-[#fff5f5] p-6 text-center text-[#a34747] border border-[#ffdada]">
            {getErrorMessage(menuError, "Failed to load employee menu simulation.")}
          </div>
        ) : !menuData ? (
          <div className="rounded-2xl border border-dashed border-[#d9d2c2] p-8 text-center text-[#78857a] text-xs">
            Enter an Employee ID to simulate their live ordering portal.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Employee Context Banner */}
            <div className="flex items-center justify-between rounded-2xl bg-[#172e1f] p-4 text-white shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#294d33] border border-white/15 text-[#d8bd83]">
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9eb6a3] uppercase tracking-wider font-semibold">
                      Corporate Client
                    </span>
                    <span className="rounded bg-[#294d33] px-2 py-0.2 text-[10px] font-mono text-[#d8bd83] border border-white/10">
                      {menuData.employee.companyId}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#fbfaf6]">
                    {menuData.employee.companyName}
                  </h3>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1.5 justify-end text-xs text-[#9eb6a3]">
                  <User size={12} />
                  <span>{menuData.employee.name}</span>
                </div>
                <span className="font-mono text-[11px] text-[#d8bd83]">
                  {menuData.employee.id}
                </span>
              </div>
            </div>

            {/* Categories & Dishes */}
            {menuData.categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9d2c2] p-8 text-center bg-[#fbfaf6]">
                <UtensilsCrossed size={24} className="mx-auto text-[#9fa89e] mb-2" />
                <p className="text-sm font-semibold text-[#26352a]">No Menu Categories Available</p>
                <p className="text-xs text-[#78857a] mt-1">
                  Either no categories are published, or this employee&apos;s company has restricted
                  visibility.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {menuData.categories.map((category) => (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#eae5d8] pb-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-base font-bold text-[#26352a]">
                          {category.name}
                        </h4>
                        {category.isSecret && (
                          <Badge variant="kitchen">
                            <span className="flex items-center gap-1 text-[10px]">
                              <Lock size={10} />
                              Secret Link Only
                            </span>
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-[#78857a]">
                        {category.dishes?.length ?? 0} items
                      </span>
                    </div>

                    {/* Dishes in this category */}
                    {!category.dishes || category.dishes.length === 0 ? (
                      <p className="text-xs text-[#9fa89e] italic py-2">
                        No dishes currently active in this category.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {category.dishes.map((dish) => (
                          <div
                            key={dish.id}
                            className="flex gap-3.5 rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs hover:border-[#b7b6aa] transition-all"
                          >
                            <div className="h-16 w-16 rounded-xl bg-[#eae5d8] shrink-0 overflow-hidden flex items-center justify-center border border-[#eae5d8]">
                              {dish.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={dish.imageUrl}
                                  alt={dish.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <UtensilsCrossed size={16} className="text-[#9fa89e]" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className="font-semibold text-xs text-[#26352a] truncate">
                                  {dish.name}
                                </p>
                                <span className="font-mono text-xs font-bold text-[#294d33] shrink-0">
                                  ${Number(dish.price ?? 0).toFixed(2)}
                                </span>
                              </div>

                              {dish.description && (
                                <p className="text-[11px] text-[#78857a] line-clamp-1 mt-0.5">
                                  {dish.description}
                                </p>
                              )}

                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <span className="flex items-center gap-0.5 text-[10px] text-[#5c685e]">
                                  {dish.temperature === "HOT" ? (
                                    <Flame size={10} className="text-[#f3a762]" />
                                  ) : (
                                    <Snowflake size={10} className="text-[#7bc0ea]" />
                                  )}
                                  {dish.temperature}
                                </span>

                                {dish.dietaryTags?.map((d) => (
                                  <span
                                    key={d.id}
                                    className="rounded bg-[#294d33]/10 px-1 text-[9px] font-semibold text-[#294d33]"
                                  >
                                    {d.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-[#eae5d8]">
          <Button variant="secondary" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
}
