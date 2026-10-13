import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface FloatingSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface FloatingSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: FloatingSelectOption[];
  helperText?: string;
  error?: string;
}

export const FloatingSelect = React.forwardRef<HTMLSelectElement, FloatingSelectProps>(
  ({ className, label, options, helperText, error, id, value, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className="relative pt-1.5">
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            value={value}
            className={cn(
              "peer w-full appearance-none rounded-md border bg-white px-3 py-2.5 text-xs font-mono text-slate-900 pr-8 transition-all focus:outline-none cursor-pointer",
              error
                ? "border-red-400 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                : "border-slate-300 hover:border-slate-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.sublabel ? `(${opt.sublabel})` : ""}
              </option>
            ))}
          </select>
          <label
            htmlFor={selectId}
            className={cn(
              "absolute left-2.5 top-0 -translate-y-1/2 bg-white px-1.5 text-[11px] font-medium font-sans transition-all pointer-events-none",
              error
                ? "text-red-600"
                : "text-slate-600 peer-focus:text-[#800020] peer-focus:font-semibold"
            )}
          >
            {label}
          </label>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-slate-400 peer-focus:text-[#800020]" />
        </div>
        {error ? (
          <p className="mt-1 text-[11px] text-red-600 font-mono">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-slate-500 font-mono">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

FloatingSelect.displayName = "FloatingSelect";
