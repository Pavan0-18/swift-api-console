"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogOut, Key, ShieldCheck } from "lucide-react";
import { SwiftSessionPublic, ApiResponse } from "@/types/swift";
import { toast } from "sonner";

interface ConnectionStatusProps {
  onOpenAuth?: () => void;
}

export function ConnectionStatus({ onOpenAuth }: ConnectionStatusProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ApiResponse<SwiftSessionPublic>>({
    queryKey: ["swift-session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Disconnected credentials");
      queryClient.invalidateQueries({ queryKey: ["swift-session"] });
    },
    onError: () => {
      toast.error("Failed to disconnect");
    },
  });

  const session = data?.data;
  const isConnected = session?.connected;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
        <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
        Checking session...
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>No Active Token</span>
        </div>
        {onOpenAuth && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={onOpenAuth}
          >
            <Key className="mr-1 h-3 w-3" />
            Set Credentials
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
        </span>
        <span className="font-semibold uppercase">{session.environment}</span>
        {session.consumerKeyMasked && (
          <span className="text-slate-500 border-l border-emerald-200 pl-2">
            {session.consumerKeyMasked}
          </span>
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50"
        title="Clear token session"
        onClick={() => logoutMutation.mutate()}
        isLoading={logoutMutation.isPending}
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
