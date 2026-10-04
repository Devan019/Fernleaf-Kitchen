"use client";

import { useAuth } from "@/features/auth/AuthContext";
import { NAV_ITEMS } from "@/lib/navigation";
import type { UserRole } from "@/types";
import clsx from "clsx";
import {
  ChevronLeft,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Sidebar State ────────────────────────────────────────────────────────────

type SidebarState = "expanded" | "icon" | "hidden";

function useSidebarState() {
  const [state, setState] = useState<SidebarState>("expanded");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-state") as SidebarState | null;
    if (stored) setState(stored);
    setMounted(true);
  }, []);

  const cycle = () => {
    setState((prev) => {
      const next: SidebarState =
        prev === "expanded" ? "icon" : prev === "icon" ? "hidden" : "expanded";
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const { state, cycle, open, mounted } = useSidebarState();

  if (!mounted) return null;

  const role = currentUser?.role as UserRole | undefined;
  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.allowedRoles.includes(role),
  );

  // ── Hidden state: only show the open button ──────────────────────────────
  if (state === "hidden") {
    return (
      <div className="fixed left-0 top-0 z-40 flex h-16 items-center px-3">
        <button
          onClick={open}
          aria-label="Open sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Menu size={18} />
        </button>
      </div>
    );
  }

  const expanded = state === "expanded";

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col bg-slate-900 text-slate-100 transition-all duration-200 ease-in-out shrink-0",
        expanded ? "w-60" : "w-16",
      )}
    >
      {/* Logo */}
      <div
        className={clsx(
          "flex h-16 items-center border-b border-slate-800",
          expanded ? "px-5 gap-3" : "justify-center",
        )}
      >
        <span className="text-emerald-400 text-xl shrink-0">🍃</span>
        {expanded && (
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate leading-tight">
              Fernleaf Kitchen
            </p>
            <p className="text-xs text-slate-400 truncate">Operations Panel</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
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
              title={expanded ? undefined : item.label}
              className={clsx(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                !expanded && "justify-center",
              )}
            >
              <Icon size={18} className="shrink-0" />
              {expanded && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + collapse */}
      <div className="border-t border-slate-800 px-2 py-3 space-y-1">
        {/* Collapse button */}
        <button
          onClick={cycle}
          aria-label={expanded ? "Minimize sidebar" : "Hide sidebar"}
          title={expanded ? "Minimize sidebar" : "Hide sidebar"}
          className={clsx(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
            !expanded && "justify-center",
          )}
        >
          {expanded ? (
            <>
              <PanelLeftClose size={18} className="shrink-0" />
              <span>Collapse</span>
            </>
          ) : (
            <PanelLeftOpen size={18} />
          )}
        </button>

        {/* User info */}
        {expanded && currentUser && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-white truncate">
              {currentUser.name}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {currentUser.role}
            </p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => logout()}
          aria-label="Log out"
          title={expanded ? undefined : "Log out"}
          className={clsx(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-colors",
            !expanded && "justify-center",
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {expanded && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
