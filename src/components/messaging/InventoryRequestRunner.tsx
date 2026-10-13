import * as React from "react";
import { Send, Clock, BookOpen, ShieldCheck, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
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

interface InventoryRequestRunnerProps {
  request: InventoryRequest;
}

export function InventoryRequestRunner({ request }: InventoryRequestRunnerProps) {
  const { auth, setShowAuthModal } = useSwiftAuth();
  const [searchParams] = useSearchParams();

  // State
  const [pathVariables, setPathVariables] = React.useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = React.useState<Record<string, string>>({});
  const [bodyString, setBodyString] = React.useState<string>("");
  const [showPreReqScript, setShowPreReqScript] = React.useState(false);
  const [copiedScript, setCopiedScript] = React.useState(false);

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

            {/* Pre-request Script Notice & Viewer for Non-Repudiation Endpoints (ACK, NAK, PATCH distributions, FIN, InterAct) */}
            {(request.slug === "dist-post-ack" ||
              request.slug === "dist-post-nak" ||
              request.slug === "dist-patch-batch" ||
              request.slug === "fin-post-message-single" ||
              request.slug === "fin-post-messages-batch" ||
              request.slug === "interact-post-message-single" ||
              request.slug === "interact-post-messages-batch") && (
              <div className="rounded-lg bg-[#800020]/5 border border-[#800020]/20 text-xs font-mono text-slate-700 overflow-hidden transition-all">
                <div className="p-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#800020]" />
                    <span className="font-bold text-[#800020]">
                      {request.slug === "dist-post-ack"
                        ? "Pre-request script for Ack active"
                        : request.slug === "dist-post-nak"
                        ? "Pre-request script for Nak active"
                        : request.slug === "dist-patch-batch"
                        ? "Pre-request script for Patch (Ack/Nak) active"
                        : "Pre-request script active"}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white text-[#800020] border-[#800020]/30 py-0 h-4">
                      Non-Repudiation
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      Auto-attaches <code className="bg-white px-1 py-0.5 rounded border border-[#800020]/20 font-bold text-[#800020]">X-SWIFT-Signature</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPreReqScript((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#800020] hover:underline cursor-pointer"
                    >
                      {showPreReqScript ? (
                        <>
                          <span>Hide Script</span>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          <span>View Postman Script</span>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {showPreReqScript && (
                  <div className="px-3 pb-3 pt-1 border-t border-[#800020]/15 space-y-2 bg-white/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        SWIFT Postman Collection Pre-request Script
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const scriptText = `var signature = CustomGlobalFunctions.createNRSignature("sub", "privateKey", "publicKey");\npm.request.removeHeader("X-SWIFT-Signature");\npm.request.headers.add({key: "X-SWIFT-Signature", value: signature});`;
                          navigator.clipboard.writeText(scriptText);
                          setCopiedScript(true);
                          toast.success("Pre-request script copied");
                          setTimeout(() => setCopiedScript(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-[#800020] hover:underline font-semibold cursor-pointer"
                      >
                        {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>Copy Script</span>
                      </button>
                    </div>

                    <pre className="p-2.5 rounded border border-[#800020]/15 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`var signature = CustomGlobalFunctions.createNRSignature("sub", "privateKey", "publicKey");
pm.request.removeHeader("X-SWIFT-Signature");
pm.request.headers.add({key: "X-SWIFT-Signature", value: signature});`}
                    </pre>

                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                      Executed automatically upon clicking <strong>Execute Request</strong>: minifies payload (if present), generates SHA-256 Base64 digest, signs the RS256 JWT assertion, and attaches the <code>X-SWIFT-Signature</code> header.
                    </p>
                  </div>
                )}
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
        requestBody={bodyString}
        requestMethod={request.method}
        requestName={request.name}
      />
    </div>
  );
}
