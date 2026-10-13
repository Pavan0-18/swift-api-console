import * as React from "react";
import {
  Eye,
  X,
  Copy,
  Check,
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  Info,
  BookOpen,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SWIFT_API_DOCS, ApiDocDefinition } from "@/config/swift-api-docs";

interface ApiExplanationModalProps {
  requestId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApiExplanationModal({ requestId, isOpen, onClose }: ApiExplanationModalProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "request" | "response" | "payload">("overview");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Close on ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !requestId) return null;

  const doc: ApiDocDefinition | undefined = SWIFT_API_DOCS[requestId];
  if (!doc) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-text animate-in fade-in-50 duration-150">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#800020] text-white flex items-center justify-center shadow-xs shrink-0">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-[#800020]/30 text-[#800020] bg-white font-mono text-[10px] py-0 h-4">
                  API #{doc.id}
                </Badge>
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] py-0 h-4 uppercase ${
                    doc.method === "POST"
                      ? "bg-[#800020] text-white border-[#800020]"
                      : doc.method === "GET"
                      ? "bg-slate-100 text-slate-800 border-slate-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}
                >
                  {doc.method}
                </Badge>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">{doc.urlTemplate}</span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">{doc.name}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            title="Close explanation (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-1 shrink-0 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-[#800020] text-[#800020]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Overview & Purpose
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("request")}
            className={`px-3 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "request"
                ? "border-[#800020] text-[#800020]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            Request & Body
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("response")}
            className={`px-3 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "response"
                ? "border-[#800020] text-[#800020]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Response & Headers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payload")}
            className={`px-3 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "payload"
                ? "border-[#800020] text-[#800020]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            Payload Guide
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-sans leading-relaxed flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  Summary
                </span>
                <p className="text-slate-800 text-xs font-medium">{doc.summary}</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                  Functionality
                </h4>
                <p className="text-slate-700 leading-relaxed">{doc.functionality}</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                  Business Purpose
                </h4>
                <p className="text-slate-700 leading-relaxed">{doc.businessPurpose}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-md border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">
                    Alliance Cloud Lifecycle Step
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#800020] font-mono">
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    <span>{doc.lifecycleStep}</span>
                  </div>
                </div>
                <div className="p-3 rounded-md border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">
                    Service Section
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-800 font-mono">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{doc.section}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REQUEST & BODY */}
          {activeTab === "request" && (
            <div className="space-y-4">
              {/* Path Parameters */}
              {doc.request.pathParams && doc.request.pathParams.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                    Path Parameters
                  </h4>
                  <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-2 font-bold">Parameter</th>
                          <th className="p-2 font-bold">Type</th>
                          <th className="p-2 font-bold">Required</th>
                          <th className="p-2 font-bold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {doc.request.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td className="p-2 font-semibold text-slate-900">:{p.name}</td>
                            <td className="p-2 text-slate-500">{p.type}</td>
                            <td className="p-2 font-semibold text-red-700">{p.required ? "Yes" : "No"}</td>
                            <td className="p-2">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Query Parameters */}
              {doc.request.queryParams && doc.request.queryParams.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                    Query Parameters
                  </h4>
                  <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-2 font-bold">Parameter</th>
                          <th className="p-2 font-bold">Type</th>
                          <th className="p-2 font-bold">Required</th>
                          <th className="p-2 font-bold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {doc.request.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td className="p-2 font-semibold text-slate-900">?{q.name}</td>
                            <td className="p-2 text-slate-500">{q.type}</td>
                            <td className="p-2 font-semibold">{q.required ? "Yes" : "Optional"}</td>
                            <td className="p-2">{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Headers */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                  Required Request Headers
                </h4>
                <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2 font-bold">Header</th>
                        <th className="p-2 font-bold">Sample Value</th>
                        <th className="p-2 font-bold">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {doc.request.headers.map((h) => (
                        <tr key={h.name}>
                          <td className="p-2 font-semibold text-slate-900">{h.name}</td>
                          <td className="p-2 text-slate-600 break-all">{h.value}</td>
                          <td className="p-2">{h.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Request Body */}
              {doc.request.body && doc.request.body.mode !== "none" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                      Request Body ({doc.request.body.contentType || "application/json"})
                    </h4>
                    {doc.request.body.example && (
                      <button
                        type="button"
                        onClick={() => handleCopy(doc.request.body!.example!, "req_body")}
                        className="text-[11px] font-mono text-[#800020] hover:underline flex items-center gap-1 font-semibold"
                      >
                        {copiedKey === "req_body" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        Copy Schema
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs">{doc.request.body.description}</p>
                  {doc.request.body.example && (
                    <pre className="p-3 rounded border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 overflow-x-auto max-h-56">
                      {doc.request.body.example}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESPONSE & HEADERS */}
          {activeTab === "response" && (
            <div className="space-y-4">
              {/* Status Codes */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                  HTTP Status Codes
                </h4>
                <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2 font-bold">Status</th>
                        <th className="p-2 font-bold">Meaning</th>
                        <th className="p-2 font-bold">Scenario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {doc.response.statusCodes.map((s) => (
                        <tr key={s.code}>
                          <td className="p-2 font-bold text-slate-900">
                            <span className={s.code < 300 ? "text-emerald-700" : "text-red-700"}>
                              HTTP {s.code}
                            </span>
                          </td>
                          <td className="p-2 font-semibold">{s.meaning}</td>
                          <td className="p-2">{s.scenario}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Response Headers */}
              {doc.response.headers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                    Response Headers
                  </h4>
                  <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-2 font-bold">Header</th>
                          <th className="p-2 font-bold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {doc.response.headers.map((h) => (
                          <tr key={h.name}>
                            <td className="p-2 font-semibold text-slate-900">{h.name}</td>
                            <td className="p-2">{h.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sample Response JSON */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                    Sample Response Structure
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopy(doc.response.sampleJson, "res_json")}
                    className="text-[11px] font-mono text-[#800020] hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedKey === "res_json" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy Response JSON
                  </button>
                </div>
                <p className="text-slate-600 text-xs">{doc.response.structureDescription}</p>
                <pre className="p-3 rounded border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 overflow-x-auto max-h-64">
                  {doc.response.sampleJson}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: PAYLOAD GUIDE */}
          {activeTab === "payload" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">
                    Payload Format
                  </span>
                  <span className="text-sm font-bold text-[#800020] font-mono mt-0.5 block">
                    {doc.payloadGuide.format}
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-xs border-[#800020]/20 text-[#800020] bg-white">
                  RFC 4648 Base64
                </Badge>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                  Encoding Details
                </h4>
                <p className="text-slate-700 leading-relaxed">{doc.payloadGuide.encodingDescription}</p>
              </div>

              {/* Decoded Sample */}
              {doc.payloadGuide.decodedExample && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                      Decoded Payload Sample
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleCopy(doc.payloadGuide.decodedExample!, "payload_dec")}
                      className="text-[11px] font-mono text-[#800020] hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedKey === "payload_dec" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Copy Payload
                    </button>
                  </div>
                  <pre className="p-3 rounded border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900 overflow-x-auto max-h-60 whitespace-pre-wrap">
                    {doc.payloadGuide.decodedExample}
                  </pre>
                </div>
              )}

              {/* Field Breakdown Table */}
              {doc.payloadGuide.fieldBreakdown && doc.payloadGuide.fieldBreakdown.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider text-[#800020]">
                    Key Fields Breakdown
                  </h4>
                  <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-2 font-bold">Field / Tag</th>
                          <th className="p-2 font-bold">Meaning & Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {doc.payloadGuide.fieldBreakdown.map((f) => (
                          <tr key={f.field}>
                            <td className="p-2 font-semibold text-slate-900 whitespace-nowrap">{f.field}</td>
                            <td className="p-2">{f.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 font-mono text-xs text-slate-500">
          <span>Alliance Cloud 2.1 Specification (17 Feb 2026)</span>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="bg-[#800020] hover:bg-[#66001a] text-white text-xs px-4"
          >
            Close Guide
          </Button>
        </div>
      </div>
    </div>
  );
}
