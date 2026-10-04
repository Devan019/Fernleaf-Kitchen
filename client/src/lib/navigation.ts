import type { UserRole } from "@/types";
import {
  BadgeDollarSign,
  BookOpenCheck,
  Building2,
  ChefHat,
  LayoutDashboard,
  Navigation,
  ReceiptText,
  ShoppingBag,
  SlidersHorizontal,
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
    allowedRoles: ["ADMIN", "KITCHEN"],
  },
  {
    label: "Kitchen Board",
    href: "/dashboard/kitchen",
    icon: ChefHat,
    allowedRoles: ["ADMIN", "KITCHEN"],
  },
  {
    label: "Dispatch Board",
    href: "/dashboard/dispatch",
    icon: Truck,
    allowedRoles: ["ADMIN", "DISPATCH"],
  },
  {
    label: "My Deliveries",
    href: "/dashboard/my-deliveries",
    icon: Navigation,
    allowedRoles: ["DRIVER"],
  },
  {
    label: "Catalogue",
    href: "/dashboard/catalogue",
    icon: UtensilsCrossed,
    allowedRoles: ["ADMIN", "KITCHEN"],
  },
  {
    label: "Menu",
    href: "/dashboard/menu",
    icon: BookOpenCheck,
    allowedRoles: ["ADMIN", "KITCHEN"],
  },
  {
    label: "Pricing",
    href: "/dashboard/pricing",
    icon: BadgeDollarSign,
    allowedRoles: ["ADMIN"],
  },
  {
    label: "Companies",
    href: "/dashboard/companies",
    icon: Building2,
    allowedRoles: ["ADMIN"],
  },
  {
    label: "Company Billing",
    href: "/dashboard/billing",
    icon: ReceiptText,
    allowedRoles: ["ADMIN"],
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: Users,
    allowedRoles: ["ADMIN"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: SlidersHorizontal,
    allowedRoles: ["ADMIN"],
  },
];
