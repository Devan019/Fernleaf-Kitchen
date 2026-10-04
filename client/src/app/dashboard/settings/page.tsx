"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { KitchenCalendarCard } from "@/features/settings/KitchenCalendarCard";
import { OrderCutoffCard } from "@/features/settings/OrderCutoffCard";
import { PlatformDefaultsCard } from "@/features/settings/PlatformDefaultsCard";
import {
  useKitchenHolidays,
  useKitchenSettings,
} from "@/features/settings/useSettings";
import { getErrorMessage } from "@/lib/utils/errors";
import { AlertCircle, RefreshCw, SlidersHorizontal } from "lucide-react";

export default function SettingsPage() {
  const {
    data: settings,
    isLoading: loadingSettings,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
    isFetching: isFetchingSettings,
  } = useKitchenSettings();

  const {
    data: holidays = [],
    isLoading: loadingHolidays,
    refetch: refetchHolidays,
  } = useKitchenHolidays();

  const isLoading = loadingSettings || loadingHolidays;

  return (
    <ProtectedRoute requiredRole={["ADMIN"]}>
      <Header title="Settings" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8">
        {/* Page Header */}
        <PageHeader
          title="Settings"
          description="Configure platform-wide kitchen and order operations."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                icon={
                  <RefreshCw
                    size={14}
                    className={isFetchingSettings ? "animate-spin" : ""}
                  />
                }
                onClick={() => {
                  refetchSettings();
                  refetchHolidays();
                }}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-64 rounded-3xl border border-[#d9d2c2] bg-white p-8 space-y-4">
              <div className="h-6 bg-[#f3efe6] rounded w-1/4" />
              <div className="h-20 bg-[#fbfaf6] rounded-2xl" />
              <div className="h-10 bg-[#f3efe6] rounded-xl w-1/3" />
            </div>
            <div className="h-56 rounded-3xl border border-[#d9d2c2] bg-white p-8 space-y-4">
              <div className="h-6 bg-[#f3efe6] rounded w-1/4" />
              <div className="h-20 bg-[#fbfaf6] rounded-2xl" />
            </div>
          </div>
        ) : isSettingsError || !settings ? (
          <div className="rounded-3xl border border-[#ffdada] bg-[#fff5f5] p-12 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-[#a34747]" />
            <h3 className="font-bold text-base text-[#a34747]">
              Failed to Load Operational Settings
            </h3>
            <p className="text-xs text-[#5c685e] max-w-md mx-auto">
              {getErrorMessage(settingsError, "Could not retrieve kitchen operational parameters.")}
            </p>
            <Button variant="secondary" onClick={() => refetchSettings()}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-8 max-w-5xl">
            {/* Section 1: Kitchen Calendar */}
            <KitchenCalendarCard settings={settings} holidays={holidays} />

            {/* Section 2: Order Cut-off */}
            <OrderCutoffCard settings={settings} />

            {/* Section 3: Platform Defaults */}
            <PlatformDefaultsCard settings={settings} />
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
