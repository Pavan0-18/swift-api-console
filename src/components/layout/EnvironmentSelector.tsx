"use client";

import * as React from "react";
import { SWIFT_ENVIRONMENTS } from "@/config/swift";
import { SwiftEnvironmentKey } from "@/types/swift";
import { Globe } from "lucide-react";

interface EnvironmentSelectorProps {
  currentEnv?: SwiftEnvironmentKey;
  onSelect?: (env: SwiftEnvironmentKey) => void;
  disabled?: boolean;
}

export function EnvironmentSelector({
  currentEnv = "sandbox",
  onSelect,
  disabled = false,
}: EnvironmentSelectorProps) {
  const environments = Object.values(SWIFT_ENVIRONMENTS);

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-3.5 w-3.5 text-slate-500" />
      <div className="flex rounded border border-slate-300 bg-slate-100 p-0.5 font-mono text-xs">
        {environments.map((env) => {
          const isSelected = currentEnv === env.key;
          const isEnabled = env.enabled;

          return (
            <button
              key={env.key}
              type="button"
              disabled={!isEnabled || disabled}
              onClick={() => isEnabled && onSelect && onSelect(env.key)}
              className={`px-2 py-0.5 rounded transition-all text-xs font-medium ${
                isSelected
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : isEnabled
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 cursor-not-allowed line-through"
              }`}
            >
              {env.label}
              {!isEnabled && " (Disabled)"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
