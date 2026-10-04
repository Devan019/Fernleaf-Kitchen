"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { PriceResolutionPlaygroundModal } from "@/features/pricing/PriceResolutionPlaygroundModal";
import { PriceTierFormModal } from "@/features/pricing/PriceTierFormModal";
import {
  useCreatePriceTier,
  useDeletePriceTier,
  usePriceTiers,
  useSetDefaultTier,
  useUpdatePriceTier,
} from "@/features/pricing/usePricing";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  CreatePriceTierRequest,
  PriceDerivationType,
  PriceTier,
  UpdatePriceTierRequest,
} from "@/types";
import {
  BadgeDollarSign,
  Calculator,
  ChevronRight,
  Layers,
  Pencil,
  Percent,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function derivationBadge(type: PriceDerivationType, tier: PriceTier) {
  if (type === "COST_MULTIPLIER") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#294d33]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#22442b] border border-[#294d33]/25">
        <Calculator size={12} className="text-[#294d33]" />
        Cost × {Number(tier.multiplier ?? 1).toFixed(2)}
      </span>
    );
  }
  if (type === "TIER_PERCENTAGE") {
    const isDiscount = Number(tier.percentage ?? 0) < 0;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c8a96b]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#8c6b29] border border-[#c8a96b]/35">
        <Percent size={12} />
        {tier.baseTierName ?? "Base"} {isDiscount ? "" : "+"}
        {Number(tier.percentage ?? 0).toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#35617a]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#244c63] border border-[#35617a]/30">
      <Sparkles size={12} />
      Manual Overrides
    </span>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data: tiersData, isLoading, isError, error } = usePriceTiers({
    page,
    limit: LIMIT,
    search: search.trim() || undefined,
    isActive: statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
  });

  const tiers = tiersData?.data ?? [];

  // Mutations
  const createTierMutation = useCreatePriceTier();
  const updateTierMutation = useUpdatePriceTier("");
  const deleteTierMutation = useDeletePriceTier();
  const setDefaultMutation = useSetDefaultTier();

  // Modals
  const [tierFormOpen, setTierFormOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PriceTier | null>(null);
  const [tierFormError, setTierFormError] = useState<string | null>(null);

  const [deleteTierItem, setDeleteTierItem] = useState<PriceTier | null>(null);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  const handleCreateOrUpdateTier = async (
    data: CreatePriceTierRequest | UpdatePriceTierRequest,
  ) => {
    setTierFormError(null);
    try {
      if (editingTier) {
        await updateTierMutation.mutateAsync({
          id: editingTier.id,
          data: data as UpdatePriceTierRequest,
        });
      } else {
        await createTierMutation.mutateAsync(data as CreatePriceTierRequest);
      }
      setTierFormOpen(false);
      setEditingTier(null);
    } catch (err) {
      setTierFormError(getErrorMessage(err, "Failed to save price tier."));
    }
  };

  const handleSetDefault = async (tier: PriceTier, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setDefaultMutation.mutateAsync(tier.id);
    } catch {
      // error
    }
  };

  const handleDelete = async () => {
    if (!deleteTierItem) return;
    try {
      await deleteTierMutation.mutateAsync(deleteTierItem.id);
      setDeleteTierItem(null);
    } catch {
      // error
    }
  };

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title="Pricing" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <PageHeader
          title="Customer Price Tiers & Rules"
          description="Manage contract pricing tiers, cost-based margin rules, ancestor tier derivations, and item-level price overrides."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                icon={<Play size={14} />}
                onClick={() => setPlaygroundOpen(true)}
              >
                Pricing Playground
              </Button>
              {isAdmin && (
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => {
                    setEditingTier(null);
                    setTierFormError(null);
                    setTierFormOpen(true);
                  }}
                >
                  Create Price Tier
                </Button>
              )}
            </div>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78857a]"
            />
            <input
              type="text"
              placeholder="Search tiers by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] pl-9 pr-3.5 text-xs text-[#26352a] placeholder-[#9fa89e] transition-all focus:border-[#315d3c] focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
              setPage(1);
            }}
            className="h-10 rounded-xl border border-[#d9d2c2] bg-[#fbfaf6] px-3 text-xs text-[#26352a] transition-all focus:border-[#315d3c] focus:outline-none self-end sm:self-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        {/* Tiers Table Card */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(38,53,42,0.04)] overflow-hidden">
          {isError && (
            <div className="px-6 py-4 text-sm text-[#a34747] bg-[#fff5f5] border-b border-[#ffdada]">
              {getErrorMessage(error, "Failed to load pricing tiers.")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Customer pricing tiers">
              <thead>
                <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Tier Name
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Derivation Method
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Companies
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Dish Overrides
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Default
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9dc]">
                {isLoading ? (
                  <TableSkeleton rows={5} cols={7} />
                ) : tiers.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<BadgeDollarSign size={24} />}
                        title="No price tiers found"
                        description={
                          search
                            ? "No tiers match your search filter."
                            : "Create your first corporate price tier to establish automated billing markups."
                        }
                        action={
                          isAdmin ? (
                            <Button
                              icon={<Plus size={15} />}
                              onClick={() => {
                                setEditingTier(null);
                                setTierFormError(null);
                                setTierFormOpen(true);
                              }}
                            >
                              Create Price Tier
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  tiers.map((tier) => (
                    <tr
                      key={tier.id}
                      onClick={() => router.push(`/dashboard/pricing/tiers/${tier.id}`)}
                      className="hover:bg-[#f6f2e8] transition-colors cursor-pointer group"
                    >
                      {/* Name & Description */}
                      <td className="px-6 py-4 font-medium text-[#26352a]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm group-hover:text-[#294d33] transition-colors">
                              {tier.name}
                            </span>
                            {tier.isDefault && (
                              <span className="flex items-center gap-1 rounded bg-[#c8a96b]/20 px-2 py-0.2 text-[10px] font-bold text-[#8c6b29]">
                                <Star size={10} className="fill-[#8c6b29]" />
                                Default
                              </span>
                            )}
                          </div>
                          {tier.description && (
                            <p className="text-xs text-[#78857a] line-clamp-1 mt-0.5">
                              {tier.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Derivation Badge */}
                      <td className="px-6 py-4">{derivationBadge(tier.derivationType, tier)}</td>

                      {/* Companies Count */}
                      <td className="px-6 py-4 text-xs font-semibold text-[#5c685e]">
                        {tier.companiesCount ?? 0} clients
                      </td>

                      {/* Overrides Count */}
                      <td className="px-6 py-4 text-xs font-mono text-[#5c685e]">
                        {tier.dishOverridesCount ?? 0} overrides
                      </td>

                      {/* Default Toggle Button */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {tier.isDefault ? (
                          <span className="text-xs font-bold text-[#8c6b29] flex items-center gap-1">
                            <Star size={12} className="fill-[#8c6b29]" />
                            System Default
                          </span>
                        ) : isAdmin ? (
                          <button
                            onClick={(e) => handleSetDefault(tier, e)}
                            className="text-xs text-[#78857a] hover:text-[#294d33] hover:underline cursor-pointer"
                          >
                            Set Default
                          </button>
                        ) : (
                          <span className="text-xs text-[#9fa89e]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <Badge variant={tier.isActive ? "active" : "inactive"}>
                          {tier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-6 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => router.push(`/dashboard/pricing/tiers/${tier.id}`)}
                            title="Inspect Tier Dishes & Overrides"
                            className="flex h-8 px-2.5 items-center gap-1 rounded-lg border border-transparent text-[#294d33] hover:border-[#d9d2c2] hover:bg-white text-xs font-semibold transition-all shadow-xs"
                          >
                            <Layers size={13} />
                            <span className="hidden sm:inline">Pricing Table</span>
                            <ChevronRight size={14} />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                aria-label={`Edit ${tier.name}`}
                                onClick={() => {
                                  setEditingTier(tier);
                                  setTierFormError(null);
                                  setTierFormOpen(true);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#78857a] hover:border-[#d9d2c2] hover:bg-white hover:text-[#26352a] transition-all shadow-xs"
                              >
                                <Pencil size={14} />
                              </button>
                              {!tier.isDefault && (
                                <button
                                  aria-label={`Delete ${tier.name}`}
                                  onClick={() => setDeleteTierItem(tier)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#78857a] hover:border-[#ffdada] hover:bg-[#fff5f5] hover:text-[#a34747] transition-all shadow-xs"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {tiersData && tiersData.meta.totalPages > 1 && (
            <Pagination
              page={tiersData.meta.page}
              totalPages={tiersData.meta.totalPages}
              hasNextPage={tiersData.meta.hasNextPage}
              hasPreviousPage={tiersData.meta.hasPreviousPage}
              total={tiersData.meta.total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      </main>

      {/* Tier Create/Edit Modal */}
      <PriceTierFormModal
        open={tierFormOpen}
        onClose={() => setTierFormOpen(false)}
        tier={editingTier}
        onSubmit={handleCreateOrUpdateTier}
        loading={createTierMutation.isPending || updateTierMutation.isPending}
        serverError={tierFormError}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTierItem !== null}
        onClose={() => setDeleteTierItem(null)}
        onConfirm={handleDelete}
        loading={deleteTierMutation.isPending}
        title="Delete Price Tier?"
        description={
          deleteTierItem
            ? `Are you sure you want to delete ${deleteTierItem.name}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Tier"
      />

      {/* Resolution Playground */}
      <PriceResolutionPlaygroundModal
        open={playgroundOpen}
        onClose={() => setPlaygroundOpen(false)}
      />
    </ProtectedRoute>
  );
}
