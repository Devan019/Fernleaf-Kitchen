import type { UserRole } from "@/types";
import {
  BadgeDollarSign,
  BookOpenCheck,
  Building2,
  ChefHat,
  Flame,
  LayoutDashboard,
  Navigation,
  ShoppingBag,
  Truck,
  Users,
  UtensilsCrossed,
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
    label: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingBag,
    allowedRoles: ["ADMIN", "KITCHEN", "DISPATCH"],
  },
  {
    label: "Kitchen Board",
    href: "/dashboard/kitchen",
    icon: ChefHat,
    allowedRoles: ["ADMIN", "KITCHEN", "DISPATCH"],
  },
  {
    label: "Dispatch Board",
    href: "/dashboard/dispatch",
    icon: Truck,
    allowedRoles: ["ADMIN", "DISPATCH"],
  },
  {
    label: "My Deliveries",
    href: "/dashboard/deliveries/my",
    icon: Navigation,
    allowedRoles: ["DRIVER"],
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
    label: "Companies",
    href: "/dashboard/companies",
    icon: Building2,
    allowedRoles: ["ADMIN", "KITCHEN", "DISPATCH"],
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: Users,
    allowedRoles: ["ADMIN"],
  },
];
