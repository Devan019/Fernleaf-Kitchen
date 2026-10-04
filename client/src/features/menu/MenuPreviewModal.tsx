"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useEmployees } from "@/features/employees/useEmployees";
import { usePreviewEmployeeMenu } from "@/features/menu/useMenu";
import { getErrorMessage } from "@/lib/utils/errors";
import type { EmployeeSummary } from "@/types";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  Flame,
  Layers,
  Lock,
  RefreshCw,
  Search,
  Snowflake,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";

interface MenuPreviewModalProps {
  open: boolean;
  onClose: () => void;
}

export function MenuPreviewModal({ open, onClose }: MenuPreviewModalProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeSearch, setEmployeeSearch] = useState<string>("");
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  // Fetch employees list (only when modal is open)
  const {
    data: employeesData,
    isLoading: loadingEmployees,
    isError: isEmployeesError,
    error: employeesError,
    refetch: refetchEmployees,
  } = useEmployees({ limit: 100, isActive: true }, { enabled: open });

  const employees: EmployeeSummary[] = useMemo(() => {
    if (!employeesData?.data) return [];
    return employeesData.data;
  }, [employeesData]);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase().trim();
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.company?.name.toLowerCase().includes(q),
    );
  }, [employees, employeeSearch]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  // Fetch employee menu preview dynamically
  const {
    data: menuData,
    isLoading: loadingMenu,
    isError: isMenuError,
    error: menuError,
  } = usePreviewEmployeeMenu(selectedEmployeeId, Boolean(selectedEmployeeId));

  // Extract categories safely (handling { categories: [...] }, { data: [...] }, or [...])
  const categories = useMemo(() => {
    if (!menuData) return [];
    if (Array.isArray(menuData)) return menuData;
    if (Array.isArray((menuData as any).categories)) return (menuData as any).categories;
    if (Array.isArray((menuData as any).data)) return (menuData as any).data;
    return [];
  }, [menuData]);

  const handleSelectEmployee = (emp: EmployeeSummary) => {
    setSelectedEmployeeId(emp.id);
    setIsSelectorOpen(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preview Employee Menu"
      size="lg"
    >
      <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-1">
        {/* ── Employee Selector Card ── */}
        <div className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6] p-4.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#5c685e] flex items-center gap-1.5">
              <Users size={14} className="text-[#294d33]" />
              Select Employee
            </label>
            {selectedEmployee && (
              <span className="text-[11px] font-semibold text-[#294d33] bg-[#294d33]/10 px-2.5 py-0.5 rounded-full">
                Previewing menu for: <strong className="text-[#172e1f]">{selectedEmployee.name}</strong>
              </span>
            )}
          </div>

          {/* Loading state for employees */}
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-4 text-xs text-[#78857a] gap-2">
              <RefreshCw size={14} className="animate-spin text-[#294d33]" />
              <span>Fetching corporate employees...</span>
            </div>
          ) : isEmployeesError ? (
            <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{getErrorMessage(employeesError, "Failed to load employees list.")}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => refetchEmployees()}>
                Retry
              </Button>
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9d2c2] p-4 text-center text-xs text-[#78857a]">
              No active corporate employees found. Create employee records in the Employees module first.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Selected Employee summary pill or trigger button */}
              <div
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                className="flex items-center justify-between p-3 rounded-xl border border-[#d9d2c2] bg-white hover:border-[#b7b6aa] cursor-pointer transition-all shadow-xs"
              >
                {selectedEmployee ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-[#172e1f] text-[#d8bd83] flex items-center justify-center shrink-0 font-bold text-xs font-serif">
                      {selectedEmployee.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#26352a] truncate">
                          {selectedEmployee.name}
                        </span>
                        {selectedEmployee.company && (
                          <span className="text-[10px] bg-[#f5f1e6] border border-[#eae5d8] px-2 py-0.5 rounded text-[#5c685e] font-medium truncate">
                            {selectedEmployee.company.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#78857a] truncate">
                        {selectedEmployee.email || "No email assigned"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-[#78857a]">
                    <User size={15} className="text-[#9fa89e]" />
                    <span>Choose a corporate employee to preview their live portal...</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5c685e]">
                  <span className="hidden sm:inline text-[11px]">
                    {isSelectorOpen ? "Close list" : "Change employee"}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${isSelectorOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {/* Collapsible search and selection dropdown panel */}
              {isSelectorOpen && (
                <div className="rounded-xl border border-[#d9d2c2] bg-white p-3 shadow-md space-y-2.5 animate-in fade-in duration-150">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78857a]"
                    />
                    <input
                      type="text"
                      placeholder="Search employees by name, email, or company..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#d9d2c2] bg-[#fbfaf6] pl-8.5 pr-3 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-[#f5f1e6]">
                    {filteredEmployees.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#78857a]">
                        No employees found matching &quot;{employeeSearch}&quot;.
                      </p>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isSelected = emp.id === selectedEmployeeId;
                        return (
                          <div
                            key={emp.id}
                            onClick={() => handleSelectEmployee(emp)}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[#294d33]/10 text-[#172e1f] font-semibold"
                                : "hover:bg-[#f6f2e8] text-[#26352a]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-lg bg-[#eae5d8] text-[#26352a] flex items-center justify-center shrink-0 font-bold text-xs">
                                {emp.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold truncate">{emp.name}</span>
                                  {emp.company && (
                                    <span className="text-[10px] bg-white border border-[#d9d2c2] px-1.5 py-0.2 rounded text-[#78857a] truncate">
                                      {emp.company.name}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#78857a] truncate block">
                                  {emp.email || "No email"}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check size={14} className="text-[#294d33] shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Menu Preview Output ── */}
        {!selectedEmployeeId ? (
          <div className="rounded-2xl border border-dashed border-[#d9d2c2] p-12 text-center text-[#78857a] bg-[#fbfaf6]">
            <UtensilsCrossed size={32} className="mx-auto text-[#b7b6aa] mb-3" />
            <h4 className="font-serif text-base font-bold text-[#26352a]">No Employee Selected</h4>
            <p className="text-xs text-[#78857a] max-w-md mx-auto mt-1">
              Select an employee from the dropdown above to preview the exact catalogue categories,
              dishes, and custom tier pricing visible on their portal.
            </p>
          </div>
        ) : loadingMenu ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#294d33] border-t-transparent mb-3" />
            <p className="text-xs font-semibold text-[#26352a]">
              Resolving corporate menu visibility & tier prices...
            </p>
            <p className="text-[11px] text-[#78857a] mt-0.5">
              Applying company restrictions and effective price tiers.
            </p>
          </div>
        ) : isMenuError ? (
          <div className="rounded-2xl bg-[#fff5f5] p-6 text-center text-[#a34747] border border-[#ffdada]">
            <AlertCircle size={24} className="mx-auto text-[#a34747] mb-2" />
            <p className="font-bold text-xs">Failed to load employee menu preview</p>
            <p className="text-[11px] text-[#a34747]/80 mt-1">
              {getErrorMessage(menuError, "Could not resolve menu for selected employee.")}
            </p>
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9d2c2] p-8 text-center bg-[#fbfaf6]">
            <UtensilsCrossed size={24} className="mx-auto text-[#9fa89e] mb-2" />
            <p className="text-sm font-semibold text-[#26352a]">No Menu Categories Available</p>
            <p className="text-xs text-[#78857a] mt-1">
              Either no menu categories are published, or this employee&apos;s company has restricted
              visibility rules configured.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Employee & Company Context Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl bg-[#172e1f] p-4 text-white shadow-md gap-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#294d33] border border-white/15 text-[#d8bd83]">
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#9eb6a3] uppercase tracking-wider font-bold">
                      Corporate Client
                    </span>
                    {selectedEmployee?.companyId && (
                      <span className="rounded bg-[#294d33] px-2 py-0.2 text-[10px] font-mono text-[#d8bd83] border border-white/10">
                        {selectedEmployee.companyId}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#fbfaf6]">
                    {selectedEmployee?.company?.name || "Corporate Customer"}
                  </h3>
                </div>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                <div className="flex items-center gap-1.5 sm:justify-end text-xs text-[#fbfaf6] font-semibold">
                  <User size={13} className="text-[#d8bd83]" />
                  <span>{selectedEmployee?.name || "Employee"}</span>
                </div>
                {selectedEmployee?.id && (
                  <div className="text-[10px] text-[#9eb6a3] mt-0.5">
                    ID: <span className="font-mono text-[#d8bd83]">{selectedEmployee.id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Categories & Dishes */}
            <div className="space-y-6">
              {categories.map((category: any) => {
                const items = category.items ?? category.dishes ?? [];
                return (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#eae5d8] pb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-base font-bold text-[#26352a]">
                          {category.name}
                        </h4>
                        {category.isSecret && (
                          <Badge variant="kitchen">
                            <span className="flex items-center gap-1 text-[10px]">
                              <Lock size={10} />
                              Secret Direct-Link Only
                            </span>
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-[#78857a] font-medium">
                        {items.length} item(s)
                      </span>
                    </div>

                    {/* Dishes in this category */}
                    {items.length === 0 ? (
                      <p className="text-xs text-[#9fa89e] italic py-2">
                        No dishes currently active in this category.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map((dish: any) => (
                          <div
                            key={dish.id}
                            className="flex flex-col justify-between rounded-2xl border border-[#d9d2c2] bg-white p-3.5 shadow-xs hover:border-[#b7b6aa] transition-all"
                          >
                            <div className="flex gap-3.5">
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
                                  <span className="font-mono text-xs font-bold text-[#294d33] shrink-0 bg-[#294d33]/10 px-1.5 py-0.5 rounded">
                                    ${Number(dish.price ?? 0).toFixed(2)}
                                  </span>
                                </div>

                                {dish.description && (
                                  <p className="text-[11px] text-[#78857a] line-clamp-2 mt-0.5">
                                    {dish.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  {dish.sku && (
                                    <span className="font-mono text-[9px] text-[#78857a] bg-[#f5f1e6] px-1 py-0.2 rounded border border-[#eae5d8]">
                                      {dish.sku}
                                    </span>
                                  )}

                                  {dish.temperature && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-[#5c685e]">
                                      {dish.temperature === "HOT" ? (
                                        <Flame size={10} className="text-[#f3a762]" />
                                      ) : (
                                        <Snowflake size={10} className="text-[#7bc0ea]" />
                                      )}
                                      {dish.temperature}
                                    </span>
                                  )}

                                  {dish.dietaryTags?.map((d: any) => (
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

                            {/* Option groups summary */}
                            {dish.optionGroups && dish.optionGroups.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-[#f5f1e6] space-y-1.5">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#78857a]">
                                  <Layers size={11} />
                                  <span>Customizations & Options</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {dish.optionGroups.map((grp: any) => (
                                    <div
                                      key={grp.id}
                                      className="rounded-lg bg-[#fbfaf6] border border-[#eae5d8] px-2 py-1 text-[10px] text-[#26352a]"
                                    >
                                      <span className="font-semibold">{grp.name}:</span>{" "}
                                      <span className="text-[#5c685e]">
                                        {grp.options?.map((o: any) => o.name).join(", ")}
                                      </span>
                                      {grp.portions && grp.portions.length > 0 && (
                                        <span className="text-[9px] text-[#8c6b29] block font-mono">
                                          Portions: {grp.portions.map((p: any) => p.name).join(", ")}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
