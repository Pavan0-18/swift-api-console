"use client";

import * as React from "react";
import { Layers, ShieldCheck, Zap, Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function OverviewMetrics() {
  const metrics = [
    {
      title: "OpenAPI Operations",
      value: "40",
      detail: "Spec Version 2.1.1",
      icon: Layers,
      color: "text-blue-400",
    },
    {
      title: "Messaging Protocols",
      value: "3 Services",
      detail: "FIN (MT), InterAct (MX), FileAct",
      icon: Zap,
      color: "text-indigo-400",
    },
    {
      title: "Security Gateway",
      value: "OAuth 2.0",
      detail: "Server-side proxy & token isolation",
      icon: ShieldCheck,
      color: "text-emerald-400",
    },
    {
      title: "Active Environments",
      value: "Sandbox & Test",
      detail: "Production disabled by default",
      icon: Server,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.title} className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {m.title}
                </p>
                <p className="text-xl font-bold text-white mt-1">{m.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{m.detail}</p>
              </div>
              <div className={`p-2.5 rounded-md bg-slate-800/80 border border-slate-700/50 ${m.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
