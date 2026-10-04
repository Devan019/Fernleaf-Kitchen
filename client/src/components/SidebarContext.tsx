"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface SidebarContextValue {
  mobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  mobileSidebarOpen: false,
  openMobileSidebar: () => {},
  closeMobileSidebar: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <SidebarContext.Provider
      value={{ mobileSidebarOpen, openMobileSidebar, closeMobileSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  return useContext(SidebarContext);
}
