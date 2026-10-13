import * as React from "react";
import { Send, Clock, Eye, BookOpen } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { FloatingTextarea } from "@/components/ui/FloatingTextarea";
import { MeaningfulOutput, SwiftExecutionResult } from "@/components/messaging/MeaningfulOutput";
import { InventoryRequest } from "@/config/swift-inventory";
import { executeSwiftRequest } from "@/lib/swift/client";
import { useSwiftAuth } from "@/context/SwiftAuthContext";
import { ApiExplanationModal } from "@/components/messaging/ApiExplanationModal";

interface InventoryRequestRunnerProps {
  request: InventoryRequest;
}

export function InventoryRequestRunner({ request }: InventoryRequestRunnerProps) {
  const { auth, setShowAuthModal } = useSwiftAuth();
  const [searchParams] = useSearchParams();

  // State
  const [showDocModal, setShowDocModal] = React.useState(false);
  const [pathVariables, setPathVariables] = React.useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = React.useState<Record<string, string>>({});
  const [bodyString, setBodyString] = React.useState<string>("");

  const [isExecuting, setIsExecuting] = React.useState(false);
  const [result, setResult] = React.useState<SwiftExecutionResult | null>(null);

  // Initialize values when request or URL parameters change
  React.useEffect(() => {
    setResult(null);

    const initialPath: Record<string, string> = {};
    if (request.pathVariables) {
      Object.keys(request.pathVariables).forEach((k) => {
        const fromUrl = searchParams.get(k) || searchParams.get("id") || "";
        initialPath[k] = fromUrl;
      });
    }
    setPathVariables(initialPath);

    const initialQuery: Record<string, string> = {};
    if (request.queryParams) {
      Object.keys(request.queryParams).forEach((k) => {
        const fromUrl = searchParams.get(k);
        if (fromUrl !== null && fromUrl !== undefined) {
          initialQuery[k] = fromUrl;
        } else if (k === "limit") {
          initialQuery[k] = "50";
        } else if (k === "offset") {
          initialQuery[k] = "0";
        } else {
          initialQuery[k] = "";
        }
      });
    }
    setQueryParams(initialQuery);

    if (request.defaultBody !== undefined) {
      if (typeof request.defaultBody === "string") {
        setBodyString(request.defaultBody);
      } else {
        setBodyString(JSON.stringify(request.defaultBody, null, 2));
      }
    } else {
      setBodyString("");
    }
  }, [request, searchParams]);

  const handleExecute = async () => {
    // Validate required path variables
    if (request.pathVariables) {
      for (const key of Object.keys(request.pathVariables)) {
        if (!pathVariables[key]?.trim()) {
          toast.error(`Please enter required path variable :${key}`);
          return;
        }
      }
    }

    setIsExecuting(true);
    setResult(null);

    let parsedBody: unknown = undefined;
    if (bodyString && ["POST", "PUT", "PATCH"].includes(request.method)) {
      try {
        parsedBody = JSON.parse(bodyString);
      } catch {
        parsedBody = bodyString;
      }
    }

    const standardPathTemplate = request.urlTemplate.replace(/:([a-zA-Z0-9_-]+)/g, "{$1}");

    const res = await executeSwiftRequest({
      method: request.method,
      path: standardPathTemplate,
      pathParams: pathVariables,
      queryParams,
      body: parsedBody,
      accessToken: auth.accessToken,
      environment: "sandbox",
    });

    setResult(res as SwiftExecutionResult);
    setIsExecuting(false);

    if (res.success) {
      toast.success(`${request.name} executed successfully (HTTP ${res.status})`);
    } else {
      toast.error(`SWIFT rejected request (${res.status})`);
    }
  };

  const hasPathVars = request.pathVariables && Object.keys(request.pathVariables).length > 0;
  const hasQueryParams = request.queryParams && Object.keys(request.queryParams).length > 0;
  const hasBody = ["POST", "PUT", "PATCH"].includes(request.method) && request.bodyMode !== "none";

  return (
    <div className="space-y-6 w-full">
      {/* REQUEST PARAMETERS */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden w-full">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#800020]/30 text-[#800020] bg-white font-mono text-[10px] py-0 h-4">
                API #{request.id}
              </Badge>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#800020]">
                {request.section}
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">{request.name}</h2>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setShowDocModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium bg-[#800020] text-white hover:bg-[#66001a] transition-all shadow-2xs cursor-pointer mr-1"
              title="Explain this API: business purpose, payload structure & response envelope"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Explain API</span>
            </button>
            <Badge
              variant="outline"
              className={`font-mono text-xs px-2 py-0.5 uppercase ${
                request.method === "POST"
                  ? "bg-[#800020] text-white border-[#800020]"
                  : request.method === "GET"
                  ? "bg-slate-100 text-slate-800 border-slate-300"
                  : "bg-blue-100 text-blue-800 border-blue-300"
              }`}
            >
              {request.method}
            </Badge>
            <span className="text-slate-600 font-semibold text-xs">{request.urlTemplate}</span>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {request.description && (
            <p className="text-xs text-slate-600 leading-relaxed font-sans">{request.description}</p>
          )}

          {/* Path Variables */}
          {hasPathVars && (
            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold text-[#800020] uppercase block">
                Path Variables
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(request.pathVariables || {}).map(([key]) => (
                  <FloatingInput
                    key={key}
                    label={`:${key} *`}
                    value={pathVariables[key] || ""}
                    onChange={(e) => setPathVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Enter ${key}...`}
                    helperText={`Required URL path parameter :${key}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters */}
          {hasQueryParams && (
            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold text-[#800020] uppercase block">
                Query Parameters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(request.queryParams || {}).map(([key]) => (
                  <FloatingInput
                    key={key}
                    label={`?${key}`}
                    value={queryParams[key] || ""}
                    onChange={(e) => setQueryParams((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={
                      key === "distribution-id"
                        ? "e.g. 44984189498,44984189499"
                        : `Enter ${key}...`
                    }
                    helperText={
                      key === "distribution-id"
                        ? "Comma-separated distribution IDs"
                        : key === "limit"
                        ? "Results limit (max 200, default 50)"
                        : key === "offset"
                        ? "Offset results to skip (default 0)"
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Request Body */}
          {hasBody && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#800020] uppercase">
                Request Payload (Body)
              </span>
              <FloatingTextarea
                label="Request Payload Body"
                rows={7}
                value={bodyString}
                onChange={(e) => setBodyString(e.target.value)}
                placeholder="{ ... }"
                helperText="JSON body formatted according to SWIFT Alliance Cloud 2.1 specification"
              />
            </div>
          )}

          {/* Execution Button */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
              {!auth.connected && (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  ⚠️ No Bearer Token.
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="underline text-[#800020] hover:text-[#66001a]"
                  >
                    Authenticate
                  </button>
                </span>
              )}
            </div>

            <Button
              size="default"
              onClick={handleExecute}
              isLoading={isExecuting}
              className="bg-[#800020] hover:bg-[#66001a] text-white font-mono text-xs px-6 py-2 shadow-xs cursor-pointer"
            >
              <Send className="mr-1.5 h-3.5 w-3.5 fill-current" />
              Execute Request #{request.id}
            </Button>
          </div>
        </div>
      </section>

      {/* RESPONSE DETAILS */}
      <MeaningfulOutput
        result={result}
        defaultService={request.section.toUpperCase()}
      />

      {/* API EXPLANATION MODAL */}
      <ApiExplanationModal
        requestId={request.id}
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
      />
    </div>
  );
}
