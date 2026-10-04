"use client";

import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, useSidebarContext } from "@/components/SidebarContext";
import { AppBackground } from "@/components/ui/AppBackground";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { mobileSidebarOpen, closeMobileSidebar } = useSidebarContext();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppBackground variant="muted" className="h-screen overflow-hidden">
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </AppBackground>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
