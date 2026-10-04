"use client";

import { useAuth } from "@/features/auth/AuthContext";
import { NAV_ITEMS } from "@/lib/navigation";
import type { UserRole } from "@/types";
import clsx from "clsx";
import {
  LogOut,
  Menu,
  PanelLeftClose,
  SidebarClose,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ─── Fernleaf Brand Leaf Icon ──────────────────────────────────────────────────

function FernleafIcon({ className = "h-5 w-5 text-[#d8bd83]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 20C12 20 11.8 12.5 15.5 7" strokeLinecap="round" />
      <path d="M13.5 13C10 10 7 10 5 11" strokeLinecap="round" />
      <path d="M14.2 10C17.2 7.5 19.5 7.5 21 8" strokeLinecap="round" />
      <path d="M12 17C9 14.8 6.8 14.8 5.2 15.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Sidebar State (desktop: expanded -> minimized -> hidden -> expanded) ──────

export type SidebarState = "expanded" | "minimized" | "hidden";

function useDesktopSidebarState() {
  const [state, setState] = useState<SidebarState>("expanded");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-state") as SidebarState | null;
    if (stored && ["expanded", "minimized", "hidden"].includes(stored)) {
      setState(stored);
    }
    setMounted(true);
  }, []);

  const cycle = () => {
    setState((prev) => {
      let next: SidebarState;
      if (prev === "expanded") next = "minimized";
      else if (prev === "minimized") next = "hidden";
      else next = "expanded";

      localStorage.setItem("sidebar-state", next);
      return next;
    });
  };

  const open = () => {
    setState("expanded");
    localStorage.setItem("sidebar-state", "expanded");
  };

  return { state, cycle, open, mounted };
}

// ─── Sidebar Props ─────────────────────────────────────────────────────────────

interface SidebarProps {
  /** Mobile drawer open state (controlled by layout/header) */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const { state, cycle, open, mounted } = useDesktopSidebarState();

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!mounted) return null;

  const role = currentUser?.role as UserRole | undefined;
  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.allowedRoles.includes(role),
  );

  const isExpanded = state === "expanded";
  const isMinimized = state === "minimized";
  const isHidden = state === "hidden";

  // ── Nav items shared between mobile and desktop ────────────────────────────
  const NavItems = ({ compact = false }: { compact?: boolean }) => (
    <nav className="flex-1 overflow-y-auto py-5 space-y-1 px-3 scrollbar-none">
      {visibleItems.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={compact ? item.label : undefined}
            className={clsx(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
              active
                ? "bg-[#2a5035] text-white shadow-md border border-[#41764f]/60 font-semibold"
                : "text-[#b4c7b8] hover:bg-[#1f3c29] hover:text-white",
              compact && "justify-center px-0",
            )}
          >
            <Icon
              size={18}
              className={clsx(
                "shrink-0 transition-transform group-hover:scale-110",
                active ? "text-[#d8bd83]" : "text-[#9cb5a1] group-hover:text-white",
              )}
            />
            {!compact && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  // ── User info block ────────────────────────────────────────────────────────
  const UserInfo = () =>
    currentUser ? (
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5 border border-white/[0.06]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#294d33] font-serif text-xs font-bold text-[#d8bd83] border border-white/10">
          {currentUser.name?.charAt(0) ?? "U"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#fbfaf6] truncate">
            {currentUser.name}
          </p>
          <p className="text-[10px] text-[#9eb6a3] uppercase tracking-wider truncate">
            {currentUser.role}
          </p>
        </div>
      </div>
    ) : null;

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE DRAWER  (visible on < lg screens when mobileOpen=true)
  // ══════════════════════════════════════════════════════════════════════════

  const MobileDrawer = () => (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-[#0f1f14]/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        aria-label="Navigation drawer"
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#172e1f]/98 text-[#e6ece7] border-r border-[#274630] backdrop-blur-xl shadow-[8px_0_40px_rgba(20,40,26,0.35)] transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#25442e] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
              <FernleafIcon className="h-5 w-5 text-[#d8bd83]" />
            </div>
            <div>
              <p className="font-serif font-bold text-sm text-[#fbfaf6] leading-tight tracking-wide">
                Fernleaf Kitchen
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9db7a2] mt-0.5">
                Operations Panel
              </p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#9db7a2] hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <NavItems compact={false} />

        {/* Bottom */}
        <div className="border-t border-[#25442e] p-3 space-y-2 bg-[#14281a]/50">
          <UserInfo />
          <button
            onClick={() => { onMobileClose?.(); logout(); }}
            aria-label="Log out"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#b0a8a8] hover:bg-[#4d1f1f]/60 hover:text-[#ffa8a8] transition-colors cursor-pointer"
          >
            <LogOut size={16} className="shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP SIDEBAR  (hidden < lg, normal sidebar on lg+)
  // ══════════════════════════════════════════════════════════════════════════

  // When hidden on desktop, render small floating expander button
  const DesktopFloatButton = () => (
    <button
      onClick={open}
      aria-label="Open navigation sidebar"
      title="Open navigation sidebar"
      className="hidden lg:flex fixed bottom-4 left-4 z-50 h-11 w-11 items-center justify-center rounded-2xl bg-[#172e1f] text-[#d8bd83] shadow-[0_8px_30px_rgba(20,40,26,0.35)] border border-[#274630] hover:bg-[#203c29] hover:scale-105 transition-all cursor-pointer"
    >
      <FernleafIcon className="h-5 w-5 text-[#d8bd83]" />
    </button>
  );

  return (
    <>
      {/* Mobile drawer (always rendered, visibility driven by mobileOpen) */}
      <MobileDrawer />

      {/* Desktop float button when hidden */}
      {isHidden && <DesktopFloatButton />}

      {/* Desktop sidebar (lg+ only) */}
      {!isHidden && (
        <aside
          className={clsx(
            "hidden lg:flex h-screen flex-col bg-[#172e1f]/95 text-[#e6ece7] border-r border-[#274630] backdrop-blur-xl transition-all duration-200 ease-in-out shrink-0 z-30 shadow-[4px_0_24px_rgba(20,40,26,0.15)]",
            isExpanded ? "w-64" : "w-20",
          )}
        >
          {/* Logo Section */}
          <div
            className={clsx(
              "flex h-16 items-center border-b border-[#25442e] py-4",
              isExpanded ? "px-5 gap-3" : "justify-center px-2",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 shadow-inner">
              <FernleafIcon className="h-5 w-5 text-[#d8bd83]" />
            </div>
            {isExpanded && (
              <div className="min-w-0">
                <p className="font-serif font-bold text-sm text-[#fbfaf6] truncate leading-tight tracking-wide">
                  Fernleaf Kitchen
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#9db7a2] truncate mt-0.5">
                  Operations Panel
                </p>
              </div>
            )}
          </div>

          {/* Nav Section */}
          <NavItems compact={isMinimized} />

          {/* Bottom: user info + cycle button + logout */}
          <div className="border-t border-[#25442e] p-3 space-y-2 bg-[#14281a]/50">
            {/* User preview */}
            {isExpanded && <UserInfo />}

            {/* Actions Row */}
            <div className="flex items-center gap-1.5">
              {/* Cycle state button */}
              <button
                onClick={cycle}
                aria-label={
                  isExpanded
                    ? "Minimize sidebar"
                    : isMinimized
                    ? "Hide sidebar"
                    : "Expand sidebar"
                }
                title={
                  isExpanded
                    ? "Minimize sidebar"
                    : isMinimized
                    ? "Hide sidebar completely"
                    : "Expand sidebar"
                }
                className={clsx(
                  "flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#a7bda9] hover:bg-[#1f3c29] hover:text-white transition-colors cursor-pointer",
                  isMinimized && "justify-center w-full",
                )}
              >
                {isExpanded ? (
                  <>
                    <PanelLeftClose size={16} className="shrink-0" />
                    <span>Minimize</span>
                  </>
                ) : (
                  <SidebarClose size={16} className="shrink-0" />
                )}
              </button>

              {/* Logout button */}
              <button
                onClick={() => logout()}
                aria-label="Log out"
                title="Log out"
                className={clsx(
                  "flex items-center justify-center rounded-lg p-2 text-[#b0a8a8] hover:bg-[#4d1f1f]/60 hover:text-[#ffa8a8] transition-colors cursor-pointer",
                  isExpanded ? "h-8 w-8 shrink-0" : "w-full mt-1",
                )}
              >
                <LogOut size={16} className="shrink-0" />
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
