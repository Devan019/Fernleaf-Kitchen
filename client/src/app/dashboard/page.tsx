"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import {
  Activity,
  ArrowRight,
  Clock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
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
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Welcome banner */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#294d33]/10 px-3 py-1 text-xs font-semibold text-[#294d33] border border-[#294d33]/15">
              <Sparkles size={12} className="text-[#c8a96b]" />
              Operations Workspace
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#26352a]">
            {greeting}, {currentUser?.name?.split(" ")[0]}
          </h2>
          <p className="mt-1.5 text-sm md:text-base text-[#6b776c]">
            Welcome to the Fernleaf Kitchen centralized operations console.
          </p>
        </div>

        {/* Status / Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {/* Role card */}
          <div className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6]/85 backdrop-blur-md p-6 shadow-[0_8px_30px_rgba(38,53,42,0.04)]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#294d33]/10 border border-[#294d33]/20 text-[#294d33]">
                <ShieldCheck size={20} />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#8a988d]">
                Session
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#78857a]">
              Active Role
            </p>
            <p className="font-serif text-xl font-bold text-[#26352a] mt-0.5">
              {currentUser?.role
                ? (ROLE_LABELS[currentUser.role] ?? currentUser.role)
                : "—"}
            </p>
            <p className="mt-2 text-xs text-[#78857a] truncate font-mono bg-[#f4f0e6] px-2 py-1 rounded-md border border-[#e5dfd0]">
              {currentUser?.email}
            </p>
          </div>

          {/* System status card */}
          <div className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6]/85 backdrop-blur-md p-6 shadow-[0_8px_30px_rgba(38,53,42,0.04)]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#294d33]/10 border border-[#294d33]/20 text-[#294d33]">
                <Activity size={20} />
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#294d33]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#294d33] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#294d33]" />
                </span>
                Active
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#78857a]">
              Operations Status
            </p>
            <p className="font-serif text-xl font-bold text-[#26352a] mt-0.5">
              Online & Synchronized
            </p>
            <p className="mt-2 text-xs text-[#78857a]">
              Secure connection established
            </p>
          </div>

          {/* Shift / Time Card */}
          <div className="rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6]/85 backdrop-blur-md p-6 shadow-[0_8px_30px_rgba(38,53,42,0.04)]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8a96b]/15 border border-[#c8a96b]/30 text-[#8c6b29]">
                <Clock size={20} />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#8a988d]">
                Time
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#78857a]">
              Today
            </p>
            <p className="font-serif text-xl font-bold text-[#26352a] mt-0.5">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="mt-2 text-xs text-[#78857a]">
              Standard kitchen service hours
            </p>
          </div>
        </div>

        {/* Quick Actions & Navigation */}
        {currentUser?.role === "ADMIN" && (
          <div className="mt-10">
            <div className="mb-4">
              <h3 className="font-serif text-lg font-semibold text-[#26352a]">
                Quick Management
              </h3>
              <p className="text-xs text-[#78857a]">
                Direct links to administrative tools and controls.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/dashboard/users"
                className="group flex items-center justify-between rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6]/90 p-5 shadow-sm transition-all hover:bg-white hover:border-[#c5bcab] hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#294d33] text-white shadow-sm transition-transform group-hover:scale-105">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#26352a]">
                      Staff Accounts
                    </p>
                    <p className="text-xs text-[#78857a]">
                      Create, edit & manage staff roles
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-[#78857a] transition-transform group-hover:translate-x-1 group-hover:text-[#294d33]"
                />
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
