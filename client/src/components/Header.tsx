"use client";

import { useAuth } from "@/features/auth/AuthContext";
import { useSidebarContext } from "@/components/SidebarContext";
import { ChevronDown, LogOut, Menu, User } from "lucide-react";
import { useRef, useState } from "react";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { currentUser, logout } = useAuth();
  const { openMobileSidebar } = useSidebarContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrator",
    KITCHEN: "Kitchen Staff",
    DISPATCH: "Dispatch",
    DRIVER: "Driver",
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-[#fbfaf6]/80 backdrop-blur-md border-b border-[#d9d2c2] shrink-0 z-20">
      {/* Left: hamburger (mobile/tablet) + page title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — only shown below lg breakpoint */}
        <button
          id="mobile-nav-trigger"
          aria-label="Open navigation menu"
          onClick={openMobileSidebar}
          className="flex lg:hidden h-9 w-9 items-center justify-center rounded-xl text-[#5c685e] hover:bg-[#e8e4d8] hover:text-[#26352a] transition-colors shrink-0"
        >
          <Menu size={20} />
        </button>

        <h1 className="font-serif text-lg sm:text-xl font-semibold text-[#26352a] tracking-tight truncate">
          {title}
        </h1>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            id="user-menu-trigger"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 sm:gap-2.5 rounded-xl border border-[#d9d2c2]/60 bg-white/70 px-2.5 sm:px-3 py-1.5 shadow-sm hover:bg-white hover:border-[#d9d2c2] transition-all"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#294d33] text-[#d8bd83] font-serif text-xs font-semibold shrink-0">
              {currentUser?.name?.charAt(0) ?? <User size={14} />}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-[#26352a] leading-tight">
                {currentUser?.name}
              </p>
              <p className="text-[10px] text-[#78857a] uppercase tracking-wider leading-tight">
                {currentUser?.role ? (roleLabel[currentUser.role] ?? currentUser.role) : ""}
              </p>
            </div>
            <ChevronDown size={14} className="text-[#78857a] hidden sm:block" />
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
                className="absolute right-0 top-full mt-2 z-20 w-52 rounded-2xl border border-[#d9d2c2] bg-[#fbfaf6]/95 backdrop-blur-xl shadow-xl py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-[#eae5d8]">
                  <p className="text-xs font-semibold text-[#26352a]">
                    {currentUser?.name}
                  </p>
                  <p className="text-[10px] text-[#78857a] uppercase tracking-wide mt-0.5">
                    {currentUser?.role ? (roleLabel[currentUser.role] ?? currentUser.role) : ""}
                  </p>
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[#a34747] hover:bg-[#fff0f0] transition-colors"
                >
                  <LogOut size={14} />
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
