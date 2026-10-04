import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAssignDriver, useDispatchDrivers } from "./useDispatch";
import { getErrorMessage } from "@/lib/utils/errors";
import type { DeliveryDrop } from "@/types";
import { Check, Search, ShieldAlert, User, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";

interface AssignDriverModalProps {
  open: boolean;
  onClose: () => void;
  drop: DeliveryDrop;
}

export function AssignDriverModal({ open, onClose, drop }: AssignDriverModalProps) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: driversData, isLoading: loadingUsers } = useDispatchDrivers();
  const assignDriverMutation = useAssignDriver();

  const drivers = driversData ?? [];

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers;
    const q = search.toLowerCase();
    return drivers.filter(
      (d) => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const handleSelectDriver = async (driverId: string) => {
    setError(null);
    try {
      await assignDriverMutation.mutateAsync({ dropId: drop.id, driverId });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to assign driver."));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign Driver to Delivery Drop" size="sm">
      <div className="space-y-4">
        {/* Drop Info Callout */}
        <div className="rounded-2xl bg-[#fbfaf6] p-3.5 border border-[#eae5d8] text-xs space-y-1">
          <div className="flex items-center justify-between font-semibold text-[#26352a]">
            <span>🏢 {drop.company.name}</span>
            <span className="font-mono text-[#294d33]">⏰ {drop.deliveryTime}</span>
          </div>
          <p className="text-[11px] text-[#78857a] truncate">
            📍 {drop.address.street || "Company Address"}, {drop.address.city || ""}
          </p>
          <p className="text-[11px] text-[#5c685e]">
            {drop.ordersCount} {drop.ordersCount === 1 ? "order" : "orders"} attached to this drop
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada] flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Driver */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]" />
          <input
            type="text"
            placeholder="Search driver by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#d9d2c2] bg-white pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#294d33] focus:outline-none"
          />
        </div>

        {/* Driver List */}
        <div className="max-h-60 overflow-y-auto divide-y divide-[#eee9dc] rounded-2xl border border-[#d9d2c2] bg-white">
          {loadingUsers ? (
            <div className="p-4 text-center text-xs text-[#78857a] animate-pulse">
              Loading available drivers...
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#78857a]">
              No active drivers found. Create driver staff users under User Management.
            </div>
          ) : (
            filteredDrivers.map((driver) => {
              const isSelected = drop.driver?.id === driver.id;
              return (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => handleSelectDriver(driver.id)}
                  disabled={assignDriverMutation.isPending}
                  className={`flex w-full items-center justify-between p-3 text-left transition-colors cursor-pointer hover:bg-[#fbfaf6] ${
                    isSelected ? "bg-[#294d33]/5 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#294d33]/10 text-[#294d33] text-xs font-bold font-serif">
                      {driver.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#26352a]">{driver.name}</p>
                      <p className="text-[10px] text-[#78857a] font-mono">{driver.email}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 rounded-md bg-[#294d33] px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                      <Check size={11} />
                      <span>Current</span>
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose} disabled={assignDriverMutation.isPending}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
