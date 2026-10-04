import clsx from "clsx";

type BadgeVariant =
  | "active"
  | "inactive"
  | "admin"
  | "kitchen"
  | "dispatch"
  | "driver"
  | "default";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  active: "bg-[#294d33]/12 text-[#22442b] border border-[#294d33]/25",
  inactive: "bg-[#8a8a82]/12 text-[#606059] border border-[#8a8a82]/25",
  admin: "bg-[#294d33] text-[#fbfaf6] border border-[#1f3d27] shadow-xs",
  kitchen: "bg-[#c8a96b]/20 text-[#8c6b29] border border-[#c8a96b]/35",
  dispatch: "bg-[#35617a]/15 text-[#244c63] border border-[#35617a]/30",
  driver: "bg-[#6c487a]/15 text-[#543461] border border-[#6c487a]/30",
  default: "bg-[#eae5d8] text-[#4c594f] border border-[#d9d2c2]",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
