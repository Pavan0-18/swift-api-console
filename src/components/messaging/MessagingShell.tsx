"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthToolbar } from "@/components/auth/AuthToolbar";
import { ApiCategory } from "./ApiCategory";
import { RequestResponseViewer } from "./RequestResponseViewer";
import { ApiCategoryGroup, NormalizedEndpoint } from "@/lib/swift/openapi/types";
import { ApiResponse } from "@/types/swift";
import { Terminal, Layers, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MessagingShell() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("distributions");
  const [selectedEndpoint, setSelectedEndpoint] = React.useState<NormalizedEndpoint | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isAuthOpen, setIsAuthOpen] = React.useState<boolean>(false);

  const { data, isLoading, isError } = useQuery<ApiResponse<{
    totalEndpoints: number;
    categories: ApiCategoryGroup[];
  }>>({
    queryKey: ["openapi-categories"],
    queryFn: async () => {
      const res = await fetch("/api/openapi/endpoints");
      if (!res.ok) throw new Error("Failed to load OpenAPI definitions");
      return res.json();
    },
  });

  const categories = data?.data?.categories || [];
  const currentCategoryGroup = categories.find(
    (c) => c.id.toLowerCase() === selectedCategory.toLowerCase()
  ) || categories[0];

  // If search query is active, filter all endpoints across categories
  const filteredEndpoints = React.useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const matches: NormalizedEndpoint[] = [];
    categories.forEach((cat) => {
      cat.endpoints.forEach((ep) => {
        if (
          ep.path.toLowerCase().includes(q) ||
          ep.summary.toLowerCase().includes(q) ||
          ep.operationId.toLowerCase().includes(q) ||
          (ep.subCategory && ep.subCategory.toLowerCase().includes(q))
        ) {
          matches.push(ep);
        }
      });
    });
    return matches;
  }, [searchQuery, categories]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedEndpoint(null);
    setSearchQuery("");
  };

  const handleEndpointSelect = (endpoint: NormalizedEndpoint) => {
    setSelectedEndpoint(endpoint);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DashboardHeader onToggleAuth={() => setIsAuthOpen(!isAuthOpen)} />
      <AuthToolbar isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <div className="flex-1 flex min-h-0">
        {/* Category & Endpoint Sidebar */}
        <Sidebar
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Workspace */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          <div className="max-w-5xl mx-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-slate-500 font-mono text-xs">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping mr-2" />
                Loading SWIFT OpenAPI spec...
              </div>
            ) : isError ? (
              <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700 font-mono text-xs">
                Failed to load OpenAPI endpoints.
              </div>
            ) : selectedEndpoint !== null ? (
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedEndpoint(null)}
                  className="text-xs font-mono text-slate-500 hover:text-blue-600 mb-3 flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to {currentCategoryGroup?.name || "Operations"}
                </button>
                <RequestResponseViewer endpoint={selectedEndpoint} />
              </div>
            ) : filteredEndpoints ? (
              /* Search results view */
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Search Results for &quot;{searchQuery}&quot;
                  </h2>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {filteredEndpoints.length} matched
                  </Badge>
                </div>

                {filteredEndpoints.length > 0 ? (
                  <div className="space-y-1.5">
                    {filteredEndpoints.map((ep) => (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => handleEndpointSelect(ep)}
                        className="w-full flex items-center justify-between p-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-left transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge
                            variant={ep.method.toLowerCase() as "get" | "post" | "put" | "delete" | "patch"}
                            className="text-[10px] uppercase font-mono"
                          >
                            {ep.method}
                          </Badge>
                          <div className="truncate">
                            <span className="font-mono text-xs text-slate-900 font-semibold mr-2">
                              {ep.path}
                            </span>
                            <span className="text-[11px] text-slate-500">{ep.summary}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-6 text-center">
                    No operations matched your search.
                  </div>
                )}
              </div>
            ) : currentCategoryGroup ? (
              /* Category Overview */
              <div className="space-y-4">
                <ApiCategory
                  category={currentCategoryGroup}
                  selectedEndpointId={selectedEndpoint ? (selectedEndpoint as NormalizedEndpoint).id : undefined}
                  onSelectEndpoint={handleEndpointSelect}
                />
              </div>
            ) : (
              /* Empty Shell */
              <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-slate-200 rounded-lg p-8 text-center bg-white">
                <Terminal className="h-8 w-8 text-slate-400 mb-2" />
                <h2 className="text-sm font-semibold text-slate-800">SWIFT API Tester</h2>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Select an operation from the sidebar to inspect schemas and send requests.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
