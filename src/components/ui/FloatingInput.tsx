import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, helperText, error, id, value, placeholder, ...props }, ref) => {
    const inputId = id || React.useId();
    const isFilled = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className="relative pt-1.5">
        <div className="relative flex items-center">
          <input
            id={inputId}
            ref={ref}
            value={value}
            placeholder={placeholder || " "}
            className={cn(
              "peer w-full rounded-md border bg-white px-3 py-2.5 text-xs font-mono text-slate-900 transition-all focus:outline-none",
              error
                ? "border-red-400 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                : "border-slate-300 hover:border-slate-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]",
              className
            )}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute left-2.5 top-0 -translate-y-1/2 bg-white px-1.5 text-[11px] font-medium font-sans transition-all pointer-events-none",
              error
                ? "text-red-600"
                : "text-slate-600 peer-focus:text-[#800020] peer-focus:font-semibold"
            )}
          >
            {label}
          </label>
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

FloatingInput.displayName = "FloatingInput";
