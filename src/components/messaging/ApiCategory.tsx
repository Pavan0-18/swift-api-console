"use client";

import * as React from "react";
import { ApiCategoryGroup, NormalizedEndpoint } from "@/lib/swift/openapi/types";
import { ApiEndpoint } from "./ApiEndpoint";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ApiCategoryProps {
  category: ApiCategoryGroup;
  selectedEndpointId?: string;
  onSelectEndpoint: (endpoint: NormalizedEndpoint) => void;
}

export function ApiCategory({
  category,
  selectedEndpointId,
  onSelectEndpoint,
}: ApiCategoryProps) {
  const [expandedSubCats, setExpandedSubCats] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    category.subCategories.forEach((sub) => {
      initial[sub.id] = true;
    });
    return initial;
  });

  const toggleSub = (subId: string) => {
    setExpandedSubCats((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  return (
    <div className="space-y-3">
      <div className="border-b border-slate-200 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">{category.name}</h2>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {category.endpoints.length} operations
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{category.description}</p>
      </div>

      <div className="space-y-3">
        {category.subCategories.map((sub) => {
          const isExpanded = expandedSubCats[sub.id] ?? true;

          return (
            <div key={sub.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
              <button
                type="button"
                onClick={() => toggleSub(sub.id)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 mb-2 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-blue-600" />
                  <span>{sub.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400">
                    {sub.endpoints.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-1 pt-0.5">
                  {sub.endpoints.map((ep) => (
                    <ApiEndpoint
                      key={ep.id}
                      endpoint={ep}
                      isSelected={selectedEndpointId === ep.id}
                      onSelect={onSelectEndpoint}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
