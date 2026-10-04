import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  allowedRoles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["ADMIN", "KITCHEN", "DISPATCH", "DRIVER"],
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: Users,
    allowedRoles: ["ADMIN"],
  },
];
