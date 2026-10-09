"use client";

import * as React from "react";
import Link from "next/link";
import { SWIFT_APP_CONFIG } from "@/config/swift";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, FileText, MessageSquare, FolderArchive, ArrowRight } from "lucide-react";

export function QuickNavCards() {
  const iconMap: Record<string, React.ElementType> = {
    Layers,
    FileText,
    MessageSquare,
    FolderArchive,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {SWIFT_APP_CONFIG.supportedServices.map((service) => {
        const Icon = iconMap[service.icon] || Layers;

        return (
          <Link
            key={service.id}
            href={`/dashboard/messaging`}
            className="group block"
          >
            <Card className="h-full border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-white group-hover:text-blue-400 transition-colors">
                        {service.name}
                      </CardTitle>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {service.badge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <CardDescription className="text-xs text-slate-400 leading-relaxed">
                  {service.description}
                </CardDescription>
                <div className="mt-4 flex items-center gap-1 text-xs font-mono text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore Endpoints</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
