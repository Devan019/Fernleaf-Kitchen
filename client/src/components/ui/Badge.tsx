import clsx from "clsx";

type BadgeVariant = "active" | "inactive" | "admin" | "kitchen" | "dispatch" | "driver" | "default";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  admin: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  kitchen: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  dispatch: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  driver: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  default: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
