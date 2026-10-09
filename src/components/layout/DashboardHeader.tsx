"use client";

import * as React from "react";
import Link from "next/link";
import { ConnectionStatus } from "./ConnectionStatus";
import { Terminal, Shield, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  onToggleAuth?: () => void;
}

export function DashboardHeader({ onToggleAuth }: DashboardHeaderProps) {
  return (
    <header className="h-13 border-b border-slate-200 bg-white sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Terminal className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900">
            SWIFT API Tester
          </span>
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-mono text-slate-500 hidden sm:inline">
          Alliance Cloud v2.1.1
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {onToggleAuth && (
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleAuth}
            className="h-7 text-xs font-mono border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Key className="mr-1 h-3 w-3 text-blue-600" />
            Credentials
          </Button>
        )}
        <ConnectionStatus onOpenAuth={onToggleAuth} />
      </div>
    </header>
  );
}
