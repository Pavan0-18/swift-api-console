"use client";

import * as React from "react";
import {
  Layers,
  FileText,
  MessageSquare,
  FolderArchive,
  Search,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onCategorySelect: (categoryId: string) => void;
  selectedCategory: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function Sidebar({
  onCategorySelect,
  selectedCategory = "distributions",
  searchQuery = "",
  onSearchChange,
}: SidebarProps) {
  const apiCategories = [
    {
      id: "distributions",
      name: "Distributions",
      icon: Layers,
      count: 4,
      desc: "Polling, ACKs & NAKs",
    },
    {
      id: "fin",
      name: "FIN Messaging",
      icon: FileText,
      count: 14,
      desc: "MT messages, reports, archives",
    },
    {
      id: "interact",
      name: "InterAct",
      icon: MessageSquare,
      count: 13,
      desc: "MX & XML messaging",
    },
    {
      id: "fileact",
      name: "FileAct",
      icon: FolderArchive,
      count: 9,
      desc: "Bulk file transfers & reports",
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-[calc(100vh-3.25rem)]">
      {/* Search Input */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="search"
            placeholder="Filter operations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Services
        </div>

        <div className="mt-1 space-y-1">
          {apiCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategorySelect(cat.id)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-all border text-xs",
                  isSelected
                    ? "bg-blue-50/80 text-blue-900 border-blue-200 font-semibold"
                    : "border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isSelected ? "text-blue-600" : "text-slate-400"
                    )}
                  />
                  <div className="truncate">
                    <div className="truncate font-medium">{cat.name}</div>
                    <div className="text-[10px] text-slate-500 truncate font-normal">{cat.desc}</div>
                  </div>
                </div>
                <Badge
                  variant={isSelected ? "default" : "secondary"}
                  className="ml-1 text-[10px] px-1.5 py-0 h-4 font-mono font-normal shrink-0"
                >
                  {cat.count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spec Info Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>OpenAPI 3.0.2</span>
          <a
            href="https://developer.swift.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            SWIFT Hub
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </aside>
  );
}
