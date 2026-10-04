"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import {
  useCompany,
  useCompanyAddresses,
  useDeliveryAvailability,
} from "@/features/companies/useCompanies";
import { useEmployees } from "@/features/employees/useEmployees";
import { usePreviewEmployeeMenu } from "@/features/menu/useMenu";
import { DishOptionSelectorModal } from "@/features/orders/DishOptionSelectorModal";
import { useCreateOrder, useCutoffCheck } from "@/features/orders/useOrders";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  CreateOrderLine,
  CreateOrderRequest,
  EmployeeSummary,
  OrderStatus,
} from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Flame,
  Layers,
  MapPin,
  Minus,
  Package,
  Plus,
  Receipt,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Snowflake,
  Trash2,
  Truck,
  User,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PACKAGING_OPTIONS = [
  { value: "ECO_BOX", label: "Eco-Friendly Compostable Box" },
  { value: "PREMIUM_TRAY", label: "Premium Catering Tray" },
  { value: "STANDARD_BAG", label: "Standard Sealed Paper Bag" },
  { value: "HOT_BOX", label: "Insulated Thermal Box" },
  { value: "CUSTOM", label: "Custom Corporate Packaging" },
];

export default function NewOrderPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  // Step 1: Employee Selection
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);

  const { data: employeesData } = useEmployees({
    search: employeeSearch.trim() || undefined,
    limit: 50,
    isActive: true,
  });
  const employees = employeesData?.data ?? [];

  // Step 2: Delivery Date Selection
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [deliveryDate, setDeliveryDate] = useState(
    tomorrow.toISOString().split("T")[0],
  );

  // Backend Cut-off and Company Availability Checks
  const { data: cutoffData, isLoading: loadingCutoff } = useCutoffCheck(
    deliveryDate,
    Boolean(deliveryDate),
  );

  const { data: companyAvailability, isLoading: loadingAvailability } =
    useDeliveryAvailability(
      selectedEmployee?.companyId ?? "",
      deliveryDate,
      Boolean(selectedEmployee?.companyId && deliveryDate),
    );

  // Company Details & Addresses for selected employee
  const { data: company } = useCompany(selectedEmployee?.companyId ?? "");
  const { data: addresses = [] } = useCompanyAddresses(
    selectedEmployee?.companyId ?? "",
  );

  // Step 3 & 4: Employee Menu & Dishes
  const { data: menuPreview, isLoading: loadingMenu } = usePreviewEmployeeMenu(
    selectedEmployee?.id ?? "",
    Boolean(selectedEmployee?.id),
  );

  const [orderLines, setOrderLines] = useState<CreateOrderLine[]>([]);
  const [customizingDish, setCustomizingDish] = useState<any | null>(null);

  // Step 5: Delivery Details
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("12:00");
  const [packagingType, setPackagingType] = useState("ECO_BOX");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Sync defaults when company / employee loads
  useEffect(() => {
    if (company) {
      if (company.deliveryDefaults?.defaultDeliveryTime) {
        setDeliveryTime(company.deliveryDefaults.defaultDeliveryTime);
      }
      if (company.deliveryDefaults?.defaultPackagingType) {
        setPackagingType(company.deliveryDefaults.defaultPackagingType);
      }
      if (company.deliveryDefaults?.standingDriverInstructions) {
        setDeliveryInstructions(company.deliveryDefaults.standingDriverInstructions);
      }
    }
    if (addresses.length > 0) {
      const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
      setDeliveryAddressId(defaultAddr.id);
    }
  }, [company, addresses]);

  // Mutations
  const createOrderMutation = useCreateOrder();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if ordering is blocked
  const isCutoffPassed = cutoffData?.isPastCutoff ?? false;
  const isCompanyClosed = companyAvailability ? !companyAvailability.allowed : false;
  const isOrderBlocked = isCutoffPassed || isCompanyClosed;

  // Flattened catalogue of dishes from menuPreview for quick lookup
  const dishesMap = useMemo(() => {
    const map = new Map<string, any>();
    const categories = menuPreview?.categories ?? [];
    categories.forEach((cat) => {
      (cat.items ?? []).forEach((dish: any) => {
        map.set(dish.id, dish);
      });
    });
    return map;
  }, [menuPreview]);

  // Handle adding line item
  const handleAddLine = (line: CreateOrderLine) => {
    setOrderLines((prev) => [...prev, line]);
  };

  const handleRemoveLine = (index: number) => {
    setOrderLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateLineQty = (index: number, delta: number) => {
    setOrderLines((prev) =>
      prev
        .map((line, idx) => {
          if (idx !== index) return line;
          const newQty = Math.max(1, line.quantity + delta);
          return {
            ...line,
            quantity: newQty,
            combinations: line.combinations?.map((c) => ({ ...c, quantity: newQty })),
          };
        })
        .filter((l) => l.quantity > 0),
    );
  };

  // Calculate estimated order summary on client from menu preview prices
  const orderSummary = useMemo(() => {
    let subtotal = 0;
    orderLines.forEach((line) => {
      const dish = dishesMap.get(line.dishId);
      const basePrice = Number(dish?.price ?? dish?.costPrice ?? 0);
      let linePrice = basePrice;

      line.combinations?.forEach((comb) => {
        (comb.options ?? []).forEach((optChoice) => {
          const group = dish?.optionGroups?.find((g: any) => g.id === optChoice.optionGroupId);
          const option = group?.options?.find((o: any) => o.id === optChoice.optionId);
          if (option) {
            linePrice += Number(option.costPrice ?? 0);
          }
        });
      });

      subtotal += linePrice * line.quantity;
    });

    return {
      subtotal,
      total: subtotal,
    };
  }, [orderLines, dishesMap]);

  // Submit Handler
  const handleSubmitOrder = async (targetStatus: OrderStatus) => {
    if (!selectedEmployee) {
      setSubmitError("Please select an employee.");
      return;
    }
    if (!deliveryDate) {
      setSubmitError("Please select a delivery date.");
      return;
    }
    if (orderLines.length === 0) {
      setSubmitError("Please add at least one dish to the order.");
      return;
    }
    if (isOrderBlocked && !isAdmin) {
      setSubmitError("Cannot place order: Cut-off passed or delivery not available on this date.");
      return;
    }

    setSubmitError(null);

    const payload: CreateOrderRequest = {
      employeeId: selectedEmployee.id,
      deliveryDate,
      deliveryTime: deliveryTime || undefined,
      deliveryAddressId: deliveryAddressId || undefined,
      packagingType: packagingType || undefined,
      deliveryInstructions: deliveryInstructions.trim() || undefined,
      status: targetStatus,
      lines: orderLines,
    };

    try {
      const created = await createOrderMutation.mutateAsync(payload);
      router.push(`/dashboard/orders/${created.id}`);
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Failed to create order."));
    }
  };

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title="Create New Order" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Navigation Back */}
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#5c685e] hover:text-[#26352a] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Orders Roster
          </Link>
        </div>

        <PageHeader
          title="New Catering Order"
          description="Build and place an employee lunch order with customized dish options and live cut-off validation."
        />

        {submitError && (
          <div className="rounded-2xl bg-[#fff5f5] p-4 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2.5">
            <ShieldAlert size={18} className="shrink-0" />
            <span className="font-semibold">{submitError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ── Left 2 Columns: Order Creation Flow ───────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1: Select Employee */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                  <User size={15} className="text-[#294d33]" />
                  Step 1: Select Employee
                </h3>
                {selectedEmployee && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(null);
                      setOrderLines([]);
                    }}
                  >
                    Change Employee
                  </Button>
                )}
              </div>

              {!selectedEmployee ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
                    />
                    <input
                      type="text"
                      placeholder="Search employee by name or corporate email..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setOrderLines([]);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#eee9dc] bg-[#fbfaf6] hover:bg-[#f5f1e6] hover:border-[#d9d2c2] text-left transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-[#d9d2c2] text-[#294d33] font-bold text-xs shadow-inner">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-[#26352a] group-hover:text-[#294d33]">
                              {emp.name}
                            </p>
                            <p className="text-[11px] text-[#78857a] font-mono">
                              {emp.email ?? "No email"} • 🏢 {emp.company?.name}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#294d33] opacity-0 group-hover:opacity-100 transition-opacity">
                          Select →
                        </span>
                      </button>
                    ))}
                    {employees.length === 0 && (
                      <p className="text-xs text-[#9fa89e] italic py-2">
                        No active employees matching search.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-[#26352a]">{selectedEmployee.name}</h4>
                      <p className="text-xs text-[#78857a] font-mono mt-0.5">
                        {selectedEmployee.email} • 🏢 {selectedEmployee.company?.name}
                      </p>
                    </div>
                    <Badge variant="kitchen">
                      {company?.priceTier?.name ? `🏷️ ${company.priceTier.name}` : "Platform Default Tier"}
                    </Badge>
                  </div>

                  {/* Permissions summary */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#eae5d8] text-[11px] text-[#5c685e]">
                    <span className="font-semibold text-[#26352a]">Self-Service Permissions:</span>
                    <span className={selectedEmployee.canChooseDeliveryAddress ? "text-[#294d33] font-medium" : "text-[#9fa89e]"}>
                      {selectedEmployee.canChooseDeliveryAddress ? "✓ Custom Address" : "✕ Fixed Address"}
                    </span>
                    <span className={selectedEmployee.canChangeDeliveryTime ? "text-[#294d33] font-medium" : "text-[#9fa89e]"}>
                      {selectedEmployee.canChangeDeliveryTime ? "✓ Custom Time" : "✕ Fixed Time"}
                    </span>
                    <span className={selectedEmployee.canChangePackaging ? "text-[#294d33] font-medium" : "text-[#9fa89e]"}>
                      {selectedEmployee.canChangePackaging ? "✓ Custom Packaging" : "✕ Standard Packaging"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: Delivery Date & Cut-Off Validation */}
            {selectedEmployee && (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                    <Calendar size={15} className="text-[#294d33]" />
                    Step 2: Delivery Date & Cut-off Status
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="text-xs font-semibold tracking-wide text-[#4c594f] block mb-1.5">
                      Target Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none font-mono"
                      required
                    />
                  </div>

                  {/* Cut-off Feedback Box */}
                  <div className="rounded-2xl border p-3.5 text-xs space-y-1">
                    {loadingCutoff ? (
                      <p className="text-[#78857a]">Checking kitchen cut-off...</p>
                    ) : cutoffData ? (
                      cutoffData.isPastCutoff ? (
                        <div className="text-[#a34747] space-y-0.5">
                          <p className="font-bold flex items-center gap-1.5">
                            <XCircle size={14} />
                            Kitchen Cut-Off Has Passed
                          </p>
                          <p className="text-[11px]">
                            Orders for {deliveryDate} locked at {new Date(cutoffData.cutoffDateTime).toLocaleString()}.
                          </p>
                        </div>
                      ) : (
                        <div className="text-[#22442b] space-y-0.5">
                          <p className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-[#294d33]" />
                            Delivery Date Open
                          </p>
                          <p className="text-[11px] text-[#3e6847]">
                            Cut-off locks at {new Date(cutoffData.cutoffDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} on {new Date(cutoffData.cutoffDateTime).toLocaleDateString()}.
                          </p>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>

                {/* Company Availability Warning */}
                {companyAvailability && !companyAvailability.allowed && (
                  <div className="rounded-2xl bg-[#fff5f5] p-3 border border-[#ffdada] text-xs text-[#a34747] flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{companyAvailability.reason || "Delivery is blocked on this date for this company."}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 & 4: Browse Employee Menu & Select Dishes */}
            {selectedEmployee && (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                      <UtensilsCrossed size={15} className="text-[#294d33]" />
                      Step 3: Browse Menu & Select Items
                    </h3>
                    <p className="text-[11px] text-[#78857a] mt-0.5">
                      Showing dishes visible to {selectedEmployee.company?.name} with active price tier overrides.
                    </p>
                  </div>
                </div>

                {loadingMenu ? (
                  <div className="space-y-3">
                    <div className="h-6 w-32 bg-[#eae5d8] rounded animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="h-28 bg-[#fbfaf6] rounded-2xl border border-[#eae5d8] animate-pulse" />
                      <div className="h-28 bg-[#fbfaf6] rounded-2xl border border-[#eae5d8] animate-pulse" />
                    </div>
                  </div>
                ) : !menuPreview || (menuPreview.categories ?? []).length === 0 ? (
                  <p className="text-xs text-[#9fa89e] italic py-3">
                    No available dishes found for this employee's company and menu configuration.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {(menuPreview.categories ?? []).map((cat) => (
                      <div key={cat.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-[#26352a]">
                            📂 {cat.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#78857a]">
                            ({(cat.items ?? []).length} items)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(cat.items ?? []).map((dish: any) => (
                            <div
                              key={dish.id}
                              className="rounded-2xl border border-[#eae5d8] bg-[#fbfaf6] p-3.5 flex flex-col justify-between hover:border-[#d9d2c2] hover:bg-white transition-all shadow-xs"
                            >
                              <div className="flex gap-3 items-start">
                                <div className="w-12 h-12 rounded-xl bg-white border border-[#d9d2c2] overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
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
                                  <h5 className="font-bold text-xs text-[#26352a] truncate">
                                    {dish.name}
                                  </h5>
                                  <p className="text-[10px] text-[#78857a] line-clamp-1 mt-0.5">
                                    {dish.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono font-bold text-xs text-[#294d33]">
                                      ${Number(dish.price ?? dish.costPrice ?? 0).toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-[#5c685e] flex items-center gap-0.5">
                                      {dish.temperature === "HOT" ? (
                                        <Flame size={10} className="text-[#e27d34]" />
                                      ) : (
                                        <Snowflake size={10} className="text-[#4e9dd8]" />
                                      )}
                                      {dish.temperature}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[#eae5d8]">
                                <span className="text-[10px] text-[#78857a]">
                                  {(dish.optionGroups?.length ?? 0) > 0
                                    ? `${dish.optionGroups.length} option group(s)`
                                    : "Standard item"}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  icon={<Plus size={12} />}
                                  onClick={() => setCustomizingDish(dish)}
                                >
                                  {(dish.optionGroups?.length ?? 0) > 0 ? "Customize" : "Add"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: Delivery Details */}
            {selectedEmployee && (
              <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                    <Truck size={15} className="text-[#294d33]" />
                    Step 4: Delivery Configuration
                  </h3>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Delivery Address */}
                  <div>
                    <label className="font-semibold text-[#4c594f] block mb-1">
                      Delivery Location {selectedEmployee.canChooseDeliveryAddress ? "(Customizable)" : "(Company Enforced)"}
                    </label>
                    {selectedEmployee.canChooseDeliveryAddress ? (
                      <select
                        value={deliveryAddressId}
                        onChange={(e) => setDeliveryAddressId(e.target.value)}
                        className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                      >
                        {addresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            📍 {addr.label} — {addr.street}, {addr.postcode} {addr.isDefault ? "(Default)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#f5f1e6] border border-[#eae5d8] text-[#5c685e]">
                        📍 {addresses.find((a) => a.id === deliveryAddressId)?.label ?? "Default Company Office"} — {addresses.find((a) => a.id === deliveryAddressId)?.street ?? "HQ Address"}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Delivery Time */}
                    <div>
                      <label className="font-semibold text-[#4c594f] block mb-1">
                        Delivery Time {selectedEmployee.canChangeDeliveryTime ? "(Customizable)" : "(Fixed Default)"}
                      </label>
                      {selectedEmployee.canChangeDeliveryTime ? (
                        <input
                          type="time"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none font-mono"
                        />
                      ) : (
                        <div className="p-2.5 rounded-xl bg-[#f5f1e6] border border-[#eae5d8] text-[#5c685e] font-mono">
                          ⏰ {deliveryTime || "12:00"}
                        </div>
                      )}
                    </div>

                    {/* Packaging */}
                    <div>
                      <label className="font-semibold text-[#4c594f] block mb-1">
                        Packaging {selectedEmployee.canChangePackaging ? "(Customizable)" : "(Standard)"}
                      </label>
                      {selectedEmployee.canChangePackaging ? (
                        <select
                          value={packagingType}
                          onChange={(e) => setPackagingType(e.target.value)}
                          className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3.5 text-xs text-[#26352a] focus:border-[#315d3c] focus:outline-none"
                        >
                          {PACKAGING_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-[#f5f1e6] border border-[#eae5d8] text-[#5c685e]">
                          📦 {packagingType}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Instructions */}
                  <div>
                    <label className="font-semibold text-[#4c594f] block mb-1">
                      Delivery Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder="e.g. Leave with security in lobby B."
                      className="w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] p-2.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Sticky Order Summary & Actions ─────────────── */}
          <div className="space-y-6 lg:sticky lg:top-8">
            <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eae5d8] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352a] flex items-center gap-2">
                  <Receipt size={15} className="text-[#294d33]" />
                  Order Summary
                </h3>
                <span className="font-mono text-xs font-bold text-[#294d33] bg-[#294d33]/10 px-2 py-0.5 rounded">
                  {orderLines.reduce((acc, l) => acc + l.quantity, 0)} items
                </span>
              </div>

              {/* Order Lines List */}
              {orderLines.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9fa89e] space-y-1">
                  <ShoppingBag size={24} className="mx-auto text-[#d9d2c2]" />
                  <p>Cart is currently empty.</p>
                  <p className="text-[10px]">Add dishes from the menu on the left.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {orderLines.map((line, idx) => {
                    const dish = dishesMap.get(line.dishId);
                    const basePrice = Number(dish?.price ?? dish?.costPrice ?? 0);
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-[#26352a]">{dish?.name ?? line.dishId}</p>
                            <p className="text-[10px] text-[#78857a] font-mono">
                              ${basePrice.toFixed(2)} each
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-[#9fa89e] hover:text-[#a34747] p-1"
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Selected Options summary */}
                        {line.combinations?.map((comb, cIdx) => (
                          <div key={cIdx} className="text-[11px] text-[#5c685e] space-y-0.5 pl-2 border-l border-[#d9d2c2]">
                            {comb.options?.map((opt, oIdx) => {
                              const group = dish?.optionGroups?.find((g: any) => g.id === opt.optionGroupId);
                              const option = group?.options?.find((o: any) => o.id === opt.optionId);
                              return (
                                <p key={oIdx}>
                                  • {group?.name}: <strong>{option?.name ?? opt.optionId}</strong>
                                </p>
                              );
                            })}
                          </div>
                        ))}

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#eae5d8]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateLineQty(idx, -1)}
                              className="w-6 h-6 rounded-md bg-white border border-[#d9d2c2] flex items-center justify-center text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-semibold w-5 text-center text-xs">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateLineQty(idx, 1)}
                              className="w-6 h-6 rounded-md bg-white border border-[#d9d2c2] flex items-center justify-center text-xs font-bold"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-mono font-bold text-xs text-[#26352a]">
                            ${(basePrice * line.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-1.5 pt-3 border-t border-[#eae5d8] text-xs">
                <div className="flex justify-between text-[#5c685e]">
                  <span>Subtotal:</span>
                  <span className="font-mono">${orderSummary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#26352a] pt-1">
                  <span>Estimated Total:</span>
                  <span className="font-mono text-[#294d33]">${orderSummary.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-[#eae5d8]">
                <Button
                  variant="primary"
                  className="w-full"
                  icon={<Send size={14} />}
                  onClick={() => handleSubmitOrder("PLACED")}
                  loading={createOrderMutation.isPending}
                  disabled={orderLines.length === 0 || !selectedEmployee}
                >
                  Place Order
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleSubmitOrder("DRAFT")}
                  loading={createOrderMutation.isPending}
                  disabled={orderLines.length === 0 || !selectedEmployee}
                >
                  Save as Draft
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dish Customizer Modal */}
      {customizingDish && (
        <DishOptionSelectorModal
          open={Boolean(customizingDish)}
          onClose={() => setCustomizingDish(null)}
          dish={customizingDish}
          onAdd={handleAddLine}
        />
      )}
    </ProtectedRoute>
  );
}
