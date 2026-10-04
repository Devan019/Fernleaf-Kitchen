"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  KITCHEN: "Kitchen Staff",
  DISPATCH: "Dispatch Coordinator",
  DRIVER: "Delivery Driver",
};

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Welcome banner */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {greeting}, {currentUser?.name?.split(" ")[0]} 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back to Fernleaf Kitchen Operations.
          </p>
        </div>

        {/* Role card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <LayoutDashboard size={18} className="text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Your Role
              </p>
            </div>
            <p className="text-lg font-semibold text-slate-800">
              {currentUser?.role
                ? (ROLE_LABELS[currentUser.role] ?? currentUser.role)
                : "—"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{currentUser?.email}</p>
          </div>
        </div>

        {/* Quick actions — only show useful ones based on role */}
        {currentUser?.role === "ADMIN" && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/users">
                <Button icon={<Users size={15} />} variant="secondary">
                  Manage Users
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
