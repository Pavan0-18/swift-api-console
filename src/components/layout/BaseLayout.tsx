import * as React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  FileText,
  Layers,
  MessageSquare,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Globe,
  KeyRound,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSwiftAuth } from "@/context/SwiftAuthContext";
import { CredentialsModal } from "@/components/auth/CredentialsModal";
import { SWIFT_REQUEST_INVENTORY, InventoryRequest } from "@/config/swift-inventory";
import { ApiExplanationModal } from "@/components/messaging/ApiExplanationModal";

export function BaseLayout() {
  const { auth, setShowAuthModal } = useSwiftAuth();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedEnv, setSelectedEnv] = React.useState<"sandbox" | "test" | "live">("sandbox");
  const [explainingReqId, setExplainingReqId] = React.useState<number | null>(null);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    Distributions: true,
    FIN: true,
    InterAct: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sec]: !prev[sec],
    }));
  };

  // Operational sidebar categories: Distributions, FIN (MT), and InterAct (MX)
  // (FileAct and Authorization are excluded from sidebar)
  const sections: Array<{
    name: "Distributions" | "FIN" | "InterAct";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { name: "Distributions", label: "Distributions", icon: Layers },
    { name: "FIN", label: "FIN Messaging (MT)", icon: FileText },
    { name: "InterAct", label: "InterAct (MX / ISO 20022)", icon: MessageSquare },
  ];

  const filtered = searchQuery.trim()
    ? SWIFT_REQUEST_INVENTORY.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          r.urlTemplate.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          r.section.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          String(r.id) === searchQuery.trim() ||
          `#${r.id}` === searchQuery.trim()
      )
    : [];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100/70 font-sans text-slate-900 select-none">
      {/* Top Header */}
      <header className="h-14 border-b border-[#800020]/20 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-[#800020] text-white font-mono font-bold flex items-center justify-center text-sm shadow-xs">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-[#800020]">SWIFT Messaging Tester</h1>
              <Badge variant="outline" className="border-[#800020]/30 text-[#800020] text-[10px] font-mono py-0 h-4 bg-[#800020]/5">
                Alliance Cloud 2.1
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Interactive Alliance Cloud Distributions, FIN & InterAct API Console
            </p>
          </div>
        </div>

        {/* Header Right: Environment Selector + Credentials */}
        <div className="flex items-center gap-3">
          {/* Environment Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-mono">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value as "sandbox" | "test" | "live")}
              className="bg-transparent border-none text-xs font-mono font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="sandbox">Sandbox (sandbox.swift.com)</option>
              <option value="test">Test/Pilot (yet to implement)</option>
              <option value="live">Live (yet to implement)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono transition-all shadow-2xs ${
              auth.connected
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold"
                : "bg-white border-[#800020]/30 text-[#800020] hover:bg-[#800020]/5"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5 text-[#800020]" />
            <span>{auth.connected ? "Token Active" : "Set Credentials"}</span>
            <span
              className={`h-2 w-2 rounded-full ${
                auth.connected ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-200" : "bg-amber-400"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Body Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-72 md:w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto z-20">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="search"
                placeholder={`Filter ${SWIFT_REQUEST_INVENTORY.length} SWIFT APIs...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-white border-slate-200 placeholder:text-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Navigation List */}
          <div className="p-3 space-y-4 flex-1 select-text overflow-y-auto">
            {searchQuery.trim() ? (
              /* Filtered Search Results */
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block px-1">
                  Matching Requests ({filtered.length})
                </span>
                {filtered.map((req) => (
                  <NavLink
                    key={req.id}
                    to={`/req/${req.id}`}
                    className={({ isActive }) =>
                      `group w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all ${
                        isActive
                          ? "bg-[#800020] text-white font-semibold shadow-xs"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    <div className="truncate pr-2">
                      <span className="block truncate font-medium text-xs">
                        #{req.id} {req.name.replace(/^[A-Z]+ — /, "")}
                      </span>
                      <span className="text-[10px] font-mono opacity-80">{req.urlTemplate}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Explain this API endpoint"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExplainingReqId(req.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-[#800020] hover:bg-slate-200/60 transition-colors group-hover:opacity-100 opacity-80"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono uppercase px-1 py-0 h-4 border-slate-200"
                      >
                        {req.method}
                      </Badge>
                    </div>
                  </NavLink>
                ))}
              </div>
            ) : (
              /* Grouped Sections: Distributions, FIN, InterAct */
              sections.map((sec) => {
                const isExpanded = expandedSections[sec.name] ?? false;
                const reqs = SWIFT_REQUEST_INVENTORY.filter((r) => r.section === sec.name);
                const Icon = sec.icon;

                return (
                  <div key={sec.name} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.name)}
                      className="w-full flex items-center justify-between px-2 py-1 text-left text-[11px] font-mono font-bold uppercase tracking-wider text-[#800020] hover:bg-[#800020]/5 rounded transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {sec.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                          {reqs.length}
                        </Badge>
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="space-y-0.5 pl-1">
                        {reqs.map((req) => (
                          <NavLink
                            key={req.id}
                            to={`/req/${req.id}`}
                            className={({ isActive }) =>
                              `group w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all ${
                                isActive
                                  ? "bg-[#800020] text-white font-semibold shadow-xs"
                                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              }`
                            }
                          >
                            <span className="truncate pr-1.5 text-xs">
                              <span className="font-mono text-slate-400 mr-1 text-[11px]">#{req.id}</span>
                              {req.name.replace(/^[A-Z]+ — /, "")}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                title="Explain this API endpoint"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setExplainingReqId(req.id);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-[#800020] hover:bg-slate-200/60 transition-colors group-hover:opacity-100 opacity-80"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono uppercase px-1 py-0 h-4 border-slate-200"
                              >
                                {req.method}
                              </Badge>
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {SWIFT_REQUEST_INVENTORY.length} Verified APIs
            </span>
            <a
              href="https://developer.swift.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#800020] hover:underline flex items-center gap-1 font-semibold"
            >
              SWIFT Hub <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-y-auto bg-slate-50 select-text">
          <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Credentials Modal */}
      <CredentialsModal />

      {/* Endpoint Explanation Modal */}
      <ApiExplanationModal
        requestId={explainingReqId}
        isOpen={explainingReqId !== null}
        onClose={() => setExplainingReqId(null)}
      />
    </div>
  );
}
