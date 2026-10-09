"use client";

import * as React from "react";
import { NormalizedEndpoint } from "@/lib/swift/openapi/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Copy, Check, Clock, FileCode, AlertCircle, Code, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RequestResponseViewerProps {
  endpoint: NormalizedEndpoint;
}

export function RequestResponseViewer({ endpoint }: RequestResponseViewerProps) {
  const [params, setParams] = React.useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"params" | "body" | "headers">("params");
  const [activeResponseTab, setActiveResponseTab] = React.useState<"body" | "headers">("body");

  // Response state
  const [isLoading, setIsLoading] = React.useState(false);
  const [responseResult, setResponseResult] = React.useState<{
    status?: number;
    durationMs?: number;
    headers?: Record<string, string>;
    response?: unknown;
    error?: { code: string; message: string; details?: unknown };
  } | null>(null);

  // Initialize payload templates
  React.useEffect(() => {
    setResponseResult(null);
    setParams({});

    if (endpoint.path.includes("/fin/messages")) {
      // Provide a clean MT103 template helper for FIN messages
      const mt103Payload = {
        sender: "BANKBEBBAXXX",
        receiver: "BANKUS33AXXX",
        service: "swift.fin",
        messageType: "fin.103",
        payload: "{1:F01BANKBEBBAXXX0000000000}{2:I103BANKUS33XXXXN}{4:\n:20:PAYREF-20261009\n:23B:CRED\n:32A:261009EUR50000,\n:50K:/12345678\nCUSTOMER SENDER\n:59:/87654321\nBENEFICIARY RECEIVER\n:71A:SHA\n-}",
      };
      setRequestBody(JSON.stringify(mt103Payload, null, 2));
      setActiveTab("body");
    } else if (endpoint.requestBody?.content) {
      const jsonContent = endpoint.requestBody.content["application/json"];
      if (jsonContent?.example) {
        setRequestBody(JSON.stringify(jsonContent.example, null, 2));
      } else if (jsonContent?.schema?.properties) {
        const template: Record<string, unknown> = {};
        Object.entries(jsonContent.schema.properties).forEach(([key, prop]) => {
          template[key] =
            prop.example !== undefined
              ? prop.example
              : prop.type === "integer"
              ? 1
              : prop.type === "boolean"
              ? true
              : `sample_${key}`;
        });
        setRequestBody(JSON.stringify(template, null, 2));
      } else {
        setRequestBody("{\n  \n}");
      }
      setActiveTab(endpoint.parameters.length > 0 ? "params" : "body");
    } else {
      setRequestBody("");
      setActiveTab("params");
    }
  }, [endpoint]);

  const handleParamChange = (name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteRequest = async () => {
    setIsLoading(true);
    setResponseResult(null);

    try {
      let resolvedPath = endpoint.path;
      const queryParams: Record<string, string> = {};

      endpoint.parameters.forEach((param) => {
        const val = params[param.name];
        if (param.in === "path" && val) {
          resolvedPath = resolvedPath.replace(`{${param.name}}`, encodeURIComponent(val));
        } else if (param.in === "query" && val) {
          queryParams[param.name] = val;
        }
      });

      const cleanProxyPath = resolvedPath.startsWith("/") ? resolvedPath.slice(1) : resolvedPath;
      const proxyUrl = new URL(`/api/swift/${cleanProxyPath}`, window.location.origin);
      Object.entries(queryParams).forEach(([k, v]) => proxyUrl.searchParams.append(k, v));

      let parsedBody: unknown = undefined;
      if (["post", "put", "patch"].includes(endpoint.method) && requestBody.trim()) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch {
          parsedBody = requestBody;
        }
      }

      const res = await fetch(proxyUrl.toString(), {
        method: endpoint.method.toUpperCase(),
        headers: { "Content-Type": "application/json" },
        body: parsedBody !== undefined ? JSON.stringify(parsedBody) : undefined,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setResponseResult({
          status: res.status,
          error: json.error || { code: "REQUEST_FAILED", message: "Request failed" },
        });
      } else {
        setResponseResult({
          status: json.data?.status || 200,
          durationMs: json.data?.durationMs || 0,
          headers: json.data?.headers || {},
          response: json.data?.response,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error executing request";
      setResponseResult({
        status: 500,
        error: { code: "EXECUTION_ERROR", message: msg },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const method = endpoint.method.toLowerCase();
  const hasRequestBody = ["post", "put", "patch"].includes(method);

  return (
    <div className="space-y-4">
      {/* Endpoint URL Bar & Action */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Badge
            variant={method as "get" | "post" | "put" | "delete" | "patch"}
            className="text-xs px-2.5 py-1 font-mono uppercase font-bold self-start sm:self-auto"
          >
            {endpoint.method}
          </Badge>

          <div className="flex-1 font-mono text-xs text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 truncate">
            {endpoint.path}
          </div>

          <Button
            size="default"
            onClick={handleExecuteRequest}
            isLoading={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs px-4 self-end sm:self-auto"
          >
            <Send className="mr-1.5 h-3.5 w-3.5 fill-current" />
            Send Request
          </Button>
        </div>

        <div className="mt-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">{endpoint.summary}</span>
          {endpoint.description && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              {endpoint.description}
            </p>
          )}
        </div>
      </div>

      {/* Request Configuration Card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("params")}
            className={cn(
              "px-3 py-2 font-medium transition-colors border-b-2",
              activeTab === "params"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            Parameters ({endpoint.parameters.length})
          </button>

          {hasRequestBody && (
            <button
              type="button"
              onClick={() => setActiveTab("body")}
              className={cn(
                "px-3 py-2 font-medium transition-colors border-b-2",
                activeTab === "body"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              Body Payload (JSON)
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "params" && (
            <div>
              {endpoint.parameters.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    <div className="col-span-4">Parameter</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-6">Value</div>
                  </div>

                  {endpoint.parameters.map((param) => (
                    <div
                      key={param.name}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded border border-slate-100 bg-slate-50/50"
                    >
                      <div className="col-span-4 font-mono text-xs text-slate-800 font-medium truncate">
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                        {param.description && (
                          <span className="block text-[10px] text-slate-400 truncate font-normal">
                            {param.description}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1">
                          {param.in}
                        </Badge>
                      </div>
                      <div className="col-span-6">
                        <Input
                          placeholder={`Enter ${param.name}`}
                          value={params[param.name] || ""}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2 font-mono">
                  No query or path parameters required.
                </div>
              )}
            </div>
          )}

          {activeTab === "body" && hasRequestBody && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Request Payload (application/json)</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] text-blue-600 hover:text-blue-700"
                  onClick={() => handleCopySnippet(requestBody)}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy Payload
                </Button>
              </div>
              <textarea
                rows={9}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full rounded border border-slate-300 bg-slate-50 p-2.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:bg-white transition-colors"
                spellCheck="false"
              />
            </div>
          )}
        </div>
      </div>

      {/* Response Panel */}
      {responseResult && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Response Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Response
              </span>
              {responseResult.status && (
                <Badge
                  variant={responseResult.status < 300 ? "success" : "destructive"}
                  className="font-mono text-xs px-2"
                >
                  {responseResult.status} {responseResult.status < 300 ? "OK" : "Error"}
                </Badge>
              )}
            </div>

            {responseResult.durationMs !== undefined && (
              <div className="flex items-center gap-1 text-xs font-mono text-slate-500">
                <Clock className="h-3 w-3" />
                <span>{responseResult.durationMs}ms</span>
              </div>
            )}
          </div>

          {/* Response Body & Headers */}
          <div className="p-4">
            {responseResult.error ? (
              <div className="p-3 rounded border border-red-200 bg-red-50 text-red-800 font-mono text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>[{responseResult.error.code}] {responseResult.error.message}</span>
                </div>
                {responseResult.error.details ? (
                  <pre className="text-[11px] text-slate-800 overflow-x-auto p-2 bg-white rounded border border-red-200">
                    {JSON.stringify(responseResult.error.details, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Response Body</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] text-blue-600 hover:text-blue-700"
                    onClick={() => handleCopySnippet(JSON.stringify(responseResult.response, null, 2))}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy JSON
                  </Button>
                </div>
                <pre className="p-3 rounded border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900 overflow-x-auto max-h-96">
                  {JSON.stringify(responseResult.response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
