import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import type { OrderDetail, OrderSummary } from "@/types";
import {
  Clock,
  Flame,
  Layers,
  Package,
  Sparkles,
  UtensilsCrossed,
  CheckCircle2,
  Users,
} from "lucide-react";
import { useMemo } from "react";

interface KitchenProductionSummaryProps {
  orders: OrderSummary[];
  deliveryDate: string;
}

export function KitchenProductionSummary({
  orders,
  deliveryDate,
}: KitchenProductionSummaryProps) {
  // Fetch details for all orders for aggregate tally
  const orderIds = useMemo(() => orders.map((o) => o.id), [orders]);

  const { data: orderDetailsList = [], isLoading } = useQuery({
    queryKey: ["orders", "production-batch", orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      const details = await Promise.all(
        orderIds.map((id) =>
          ordersApi.getById(id).catch(() => null)
        )
      );
      return details.filter((d): d is OrderDetail => d !== null);
    },
    enabled: orderIds.length > 0,
  });

  // Aggregations
  const { dishAggregates, timeSlotAggregates, packagingAggregates, totalPortions } =
    useMemo(() => {
      const dishesMap: Record<
        string,
        {
          dishId: string;
          dishName: string;
          dishSku?: string;
          totalQuantity: number;
          optionsTally: Record<string, { optionName: string; count: number }>;
          timeSlots: Record<string, number>;
        }
      > = {};

      const timeSlotsMap: Record<
        string,
        { time: string; orderCount: number; dishCount: number; orders: string[] }
      > = {};

      const packagingMap: Record<string, number> = {};
      let totalPortionsCount = 0;

      for (const order of orderDetailsList) {
        const time = order.deliveryTime || "12:00";
        const pkg = order.packagingType || "ECO_BOX";

        packagingMap[pkg] = (packagingMap[pkg] || 0) + 1;

        if (!timeSlotsMap[time]) {
          timeSlotsMap[time] = { time, orderCount: 0, dishCount: 0, orders: [] };
        }
        timeSlotsMap[time].orderCount += 1;
        timeSlotsMap[time].orders.push(order.orderNumber);

        for (const line of order.lines) {
          totalPortionsCount += line.quantity;
          timeSlotsMap[time].dishCount += line.quantity;

          if (!dishesMap[line.dishName]) {
            dishesMap[line.dishName] = {
              dishId: line.dishId,
              dishName: line.dishName,
              dishSku: line.dishSku,
              totalQuantity: 0,
              optionsTally: {},
              timeSlots: {},
            };
          }

          dishesMap[line.dishName].totalQuantity += line.quantity;
          dishesMap[line.dishName].timeSlots[time] =
            (dishesMap[line.dishName].timeSlots[time] || 0) + line.quantity;

          // Process options in combinations
          if (line.combinations) {
            for (const comb of line.combinations) {
              const combQty = comb.quantity || 1;
              if (comb.options) {
                for (const opt of comb.options) {
                  const key = opt.portionSizeName
                    ? `${opt.optionName} (${opt.portionSizeName})`
                    : opt.optionName;
                  if (!dishesMap[line.dishName].optionsTally[key]) {
                    dishesMap[line.dishName].optionsTally[key] = {
                      optionName: key,
                      count: 0,
                    };
                  }
                  dishesMap[line.dishName].optionsTally[key].count += combQty;
                }
              }
            }
          }
        }
      }

      return {
        dishAggregates: Object.values(dishesMap).sort(
          (a, b) => b.totalQuantity - a.totalQuantity
        ),
        timeSlotAggregates: Object.values(timeSlotsMap).sort((a, b) =>
          a.time.localeCompare(b.time)
        ),
        packagingAggregates: Object.entries(packagingMap),
        totalPortions: totalPortionsCount,
      };
    }, [orderDetailsList]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[#d9d2c2] bg-white p-8 text-center space-y-3">
        <div className="h-6 w-48 bg-[#f3efe6] rounded-md animate-pulse mx-auto" />
        <div className="h-4 w-72 bg-[#f3efe6] rounded-md animate-pulse mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="h-24 bg-[#fbfaf6] rounded-2xl animate-pulse" />
          <div className="h-24 bg-[#fbfaf6] rounded-2xl animate-pulse" />
          <div className="h-24 bg-[#fbfaf6] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6] p-12 text-center">
        <UtensilsCrossed size={36} className="mx-auto text-[#78857a] mb-2" />
        <h3 className="text-base font-bold font-serif text-[#26352a]">
          No Production Requirements
        </h3>
        <p className="text-xs text-[#5c685e] max-w-sm mx-auto mt-1">
          There are no scheduled catering orders for {deliveryDate}. Select another working date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Production KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#294d33]/20 bg-[#294d33] p-4 text-white shadow-xs">
          <div className="flex items-center justify-between text-[#d8bd83] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Portions To Cook
            </span>
            <Flame size={18} />
          </div>
          <p className="text-3xl font-extrabold font-serif">{totalPortions}</p>
          <p className="text-[11px] text-[#e0ded8] mt-0.5">
            Across {orders.length} orders for {deliveryDate}
          </p>
        </div>

        <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78857a] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Unique Dish Recipes
            </span>
            <UtensilsCrossed size={16} className="text-[#294d33]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#26352a]">
            {dishAggregates.length}
          </p>
          <p className="text-[11px] text-[#78857a] mt-0.5">
            Active catalogue items
          </p>
        </div>

        <div className="rounded-2xl border border-[#d9d2c2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78857a] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Delivery Windows
            </span>
            <Clock size={16} className="text-[#e27d34]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#26352a]">
            {timeSlotAggregates.length} slots
          </p>
          <p className="text-[11px] text-[#78857a] mt-0.5">
            Sorted chronologically
          </p>
        </div>
      </div>

      {/* Main Aggregated Dishes Prep Tally */}
      <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#eee9dc]">
          <div>
            <h3 className="text-base font-bold font-serif text-[#26352a] flex items-center gap-2">
              <UtensilsCrossed size={18} className="text-[#294d33]" />
              Dish & Recipe Production Tally
            </h3>
            <p className="text-xs text-[#5c685e]">
              Aggregated batch prep requirements for morning and lunch kitchen assembly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dishAggregates.map((dish) => {
            const options = Object.values(dish.optionsTally);
            return (
              <div
                key={dish.dishName}
                className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#eee9dc]">
                    <div>
                      <h4 className="font-bold text-sm text-[#26352a]">
                        {dish.dishName}
                      </h4>
                      {dish.dishSku && (
                        <span className="font-mono text-[10px] text-[#78857a]">
                          {dish.dishSku}
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center justify-center rounded-xl bg-[#294d33] px-3 py-1 font-mono text-base font-extrabold text-white shadow-xs">
                      ×{dish.totalQuantity}
                    </span>
                  </div>

                  {/* Options Breakdown */}
                  {options.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <span className="text-[11px] font-semibold text-[#5c685e] uppercase tracking-wider block">
                        Options & Portions Breakdown:
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {options.map((opt) => (
                          <span
                            key={opt.optionName}
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-medium text-[#26352a] border border-[#d9d2c2] shadow-2xs"
                          >
                            <span>{opt.optionName}</span>
                            <span className="font-bold text-[#294d33] bg-[#294d33]/10 px-1.5 py-0.2 rounded">
                              {opt.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery Slot Breakdown for this dish */}
                <div className="mt-3 pt-2.5 border-t border-[#eee9dc] flex items-center justify-between text-[11px] text-[#5c685e]">
                  <span>Delivery Schedule:</span>
                  <div className="flex items-center gap-2">
                    {Object.entries(dish.timeSlots).map(([slot, qty]) => (
                      <span
                        key={slot}
                        className="font-mono font-semibold text-[#26352a] bg-white px-1.5 py-0.5 rounded border border-[#e5dfd2]"
                      >
                        ⏰ {slot}: <span className="text-[#294d33]">{qty}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Windows & Packaging Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delivery Windows Breakdown */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold font-serif text-[#26352a] flex items-center gap-2">
            <Clock size={16} className="text-[#294d33]" />
            Delivery Slots Timeline
          </h3>

          <div className="space-y-2.5">
            {timeSlotAggregates.map((slot) => (
              <div
                key={slot.time}
                className="flex items-center justify-between rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded-lg bg-[#294d33] text-white px-2.5 py-1 font-mono text-xs font-bold">
                    ⏰ {slot.time}
                  </span>
                  <span className="text-xs font-semibold text-[#26352a]">
                    {slot.orderCount} {slot.orderCount === 1 ? "order" : "orders"}
                  </span>
                </div>

                <span className="font-mono text-xs font-bold text-[#294d33] bg-[#294d33]/10 px-2 py-0.5 rounded">
                  {slot.dishCount} total dishes
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Packaging Supplies Tally */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold font-serif text-[#26352a] flex items-center gap-2">
            <Package size={16} className="text-[#294d33]" />
            Packaging Containers Needed
          </h3>

          <div className="space-y-2.5">
            {packagingAggregates.map(([pkgType, count]) => (
              <div
                key={pkgType}
                className="flex items-center justify-between rounded-xl bg-[#fbfaf6] p-3 border border-[#eee9dc]"
              >
                <span className="text-xs font-semibold text-[#26352a] flex items-center gap-1.5">
                  📦 {pkgType}
                </span>
                <span className="font-mono text-xs font-bold text-[#294d33] bg-white px-2.5 py-1 rounded-lg border border-[#d9d2c2]">
                  {count} containers
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
