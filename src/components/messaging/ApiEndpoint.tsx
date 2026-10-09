"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { NormalizedEndpoint } from "@/lib/swift/openapi/types";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ApiEndpointProps {
  endpoint: NormalizedEndpoint;
  isSelected?: boolean;
  onSelect: (endpoint: NormalizedEndpoint) => void;
}

export function ApiEndpoint({ endpoint, isSelected = false, onSelect }: ApiEndpointProps) {
  const method = endpoint.method.toLowerCase();

  return (
    <button
      type="button"
      onClick={() => onSelect(endpoint)}
      className={cn(
        "w-full flex items-center justify-between p-2 rounded text-left transition-all border group text-xs",
        isSelected
          ? "bg-blue-50/70 border-blue-300 shadow-xs text-blue-950 font-medium"
          : "border-slate-200/70 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Badge
          variant={method as "get" | "post" | "put" | "delete" | "patch"}
          className="text-[10px] px-1.5 py-0 font-mono uppercase shrink-0"
        >
          {endpoint.method}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs text-slate-900 truncate font-semibold">
            {endpoint.path}
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">{endpoint.summary}</div>
        </div>
      </div>
      <ChevronRight
        className={cn(
          "h-3.5 w-3.5 shrink-0 transition-transform text-slate-400 group-hover:text-slate-600",
          isSelected && "text-blue-600 translate-x-0.5"
        )}
      />
    </button>
  );
}
