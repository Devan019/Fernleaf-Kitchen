import type { UserRole } from "@/types";
import {
  BadgeDollarSign,
  BookOpenCheck,
  LayoutDashboard,
  UtensilsCrossed,
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
    label: "Catalogue",
    href: "/dashboard/catalogue",
    icon: UtensilsCrossed,
    allowedRoles: ["ADMIN", "KITCHEN", "DISPATCH"],
  },
  {
    label: "Menu",
    href: "/dashboard/menu",
    icon: BookOpenCheck,
    allowedRoles: ["ADMIN", "KITCHEN", "DISPATCH"],
  },
  {
    label: "Pricing",
    href: "/dashboard/pricing",
    icon: BadgeDollarSign,
    allowedRoles: ["ADMIN", "KITCHEN", "DISPATCH"],
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: Users,
    allowedRoles: ["ADMIN"],
  },
];
