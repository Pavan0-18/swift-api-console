import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ className, label, helperText, error, id, value, placeholder, ...props }, ref) => {
    const textareaId = id || React.useId();

    return (
      <div className="relative pt-1.5">
        <div className="relative">
          <textarea
            id={textareaId}
            ref={ref}
            value={value}
            placeholder={placeholder || " "}
            className={cn(
              "peer w-full rounded-md border bg-white px-3 py-2.5 text-xs font-mono text-slate-900 leading-relaxed transition-all focus:outline-none resize-y",
              error
                ? "border-red-400 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                : "border-slate-300 hover:border-slate-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]",
              className
            )}
            {...props}
          />
          <label
            htmlFor={textareaId}
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

FloatingTextarea.displayName = "FloatingTextarea";
