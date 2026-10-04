import clsx from "clsx";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#294d33] text-white hover:bg-[#203c28] shadow-[0_2px_8px_rgba(41,77,51,0.20)] hover:shadow-[0_4px_14px_rgba(41,77,51,0.28)] focus-visible:ring-[#315d3c] disabled:bg-[#7e9985] disabled:shadow-none",
  secondary:
    "bg-[#fbfaf6]/90 text-[#26352a] border border-[#d9d2c2] hover:bg-[#eae5d8] hover:border-[#c8c0ad] focus-visible:ring-[#315d3c] shadow-sm disabled:opacity-50",
  danger:
    "bg-[#a34747] text-white hover:bg-[#8c3a3a] shadow-sm focus-visible:ring-[#bd6a6a] disabled:bg-[#d49e9e]",
  ghost:
    "text-[#4c594f] hover:bg-[#eae5d8]/70 hover:text-[#26352a] focus-visible:ring-[#315d3c] disabled:opacity-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-11 px-5 text-sm rounded-xl",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  ),
);

Button.displayName = "Button";
