"use client";

import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { AppBackground } from "@/components/ui/AppBackground";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppBackground variant="muted" className="h-screen overflow-hidden">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            {children}
          </div>
        </div>
      </AppBackground>
    </ProtectedRoute>
  );
}
