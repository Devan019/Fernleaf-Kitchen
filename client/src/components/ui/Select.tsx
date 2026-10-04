import clsx from "clsx";
import { forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold tracking-wide text-[#4c594f]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            "h-10 w-full rounded-xl border bg-white px-3.5 text-sm text-[#26352a] transition-all",
            "focus:outline-none focus:ring-4 focus:ring-[#315d3c]/10 focus:border-[#315d3c]",
            error
              ? "border-[#bd6a6a] ring-2 ring-[#bd6a6a]/15 focus:ring-[#bd6a6a]/15"
              : "border-[#d9d2c2] hover:border-[#b7b6aa]",
            "disabled:cursor-not-allowed disabled:bg-[#f5f2e9] disabled:text-[#888f86]",
            className,
          )}
          aria-describedby={error ? `${selectId}-error` : undefined}
          aria-invalid={error ? true : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-[#b24e4e]" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-[#78857a]">{hint}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
