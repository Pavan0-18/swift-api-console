import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold font-mono uppercase tracking-wider transition-colors select-none",
  {
    variants: {
      variant: {
        default: "border-blue-200 bg-blue-50 text-blue-700",
        secondary: "border-slate-200 bg-slate-100 text-slate-700",
        destructive: "border-red-200 bg-red-50 text-red-700",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200 bg-amber-50 text-amber-700",
        outline: "text-slate-600 border-slate-300 bg-white",
        get: "border-emerald-300 bg-emerald-100 text-emerald-800 font-bold",
        post: "border-blue-300 bg-blue-100 text-blue-800 font-bold",
        put: "border-amber-300 bg-amber-100 text-amber-800 font-bold",
        delete: "border-red-300 bg-red-100 text-red-800 font-bold",
        patch: "border-purple-300 bg-purple-100 text-purple-800 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
