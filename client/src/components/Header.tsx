"use client";

import { useAuth } from "@/features/auth/AuthContext";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { useRef, useState } from "react";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrator",
    KITCHEN: "Kitchen Staff",
    DISPATCH: "Dispatch",
    DRIVER: "Driver",
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
      {/* Page title */}
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        {/* Notifications (placeholder) */}
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Bell size={18} />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            id="user-menu-trigger"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-md px-3 py-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <User size={16} />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-800 leading-tight">
                {currentUser?.name}
              </p>
              <p className="text-xs text-slate-500 leading-tight">
                {currentUser?.role ? (roleLabel[currentUser.role] ?? currentUser.role) : ""}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              {/* Dropdown */}
              <div
                role="menu"
                aria-labelledby="user-menu-trigger"
                className="absolute right-0 top-full mt-1.5 z-20 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
