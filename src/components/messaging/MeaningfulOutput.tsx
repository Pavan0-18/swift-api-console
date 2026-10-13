import * as React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
  Inbox,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeSwiftHref } from "@/lib/swift/client";

export interface SwiftExecutionResult {
  status: number;
  durationMs: number;
  success: boolean;
  data?: any;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  signatureInfo?: {
    attached: boolean;
    digest?: string;
    aud?: string;
    jti?: string;
  };
  raw?: unknown;
}

interface MeaningfulOutputProps {
  result: SwiftExecutionResult | null;
  defaultService?: string;
}

export function MeaningfulOutput({ result }: MeaningfulOutputProps) {
  const navigate = useNavigate();
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);

  if (!result) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const rawData = result.data;
  const isDirectArray = Array.isArray(rawData);
  const isObject = rawData && typeof rawData === "object" && !isDirectArray;

  // Support paginated { distributions: [...] } lists as well as raw arrays
  const isDistributionList = isObject && Array.isArray((rawData as any).distributions);
  const isArray = isDirectArray || isDistributionList;
  const recordList: any[] = isDirectArray
    ? rawData
    : isDistributionList
    ? (rawData as any).distributions
    : [];

  // Handle single responses with nested distribution/message/report structures
  const distObj = isObject && (rawData as any).distribution ? (rawData as any).distribution : isObject ? rawData : {};
  const msgObj = isObject && (rawData as any).message ? (rawData as any).message : {};
  const reportObj =
    isObject && ((rawData as any).transmission_report || (rawData as any).delivery_report || (rawData as any).delivery_notification)
      ? (rawData as any).transmission_report || (rawData as any).delivery_report || (rawData as any).delivery_notification
      : {};

  // Extract real SWIFT returned attributes
  const returnedId =
    distObj.id ?? (rawData as any).id ?? (rawData as any).distribution_id ?? (rawData as any).message_id;

  const returnedService = distObj.service ?? (rawData as any).service;
  const returnedType = distObj.type ?? (rawData as any).type;
  const returnedCopy =
    typeof distObj.copy === "boolean" ? distObj.copy : typeof (rawData as any).copy === "boolean" ? (rawData as any).copy : undefined;

  const returnedRef =
    distObj.message_cloud_reference ??
    (rawData as any).message_cloud_reference ??
    msgObj.sender_reference ??
    (rawData as any).sender_reference ??
    (rawData as any).cloud_reference;

  const returnedStatus = distObj.status ?? (rawData as any).status;
  const returnedPayload =
    msgObj.payload ??
    reportObj.transmission_report_payload ??
    reportObj.delivery_notification_payload ??
    (rawData as any).payload ??
    (rawData as any).export;

  const returnedLinks: Array<{ rel: string; href: string; method?: string }> = Array.isArray(distObj.links)
    ? distObj.links
    : Array.isArray((rawData as any).links)
    ? (rawData as any).links
    : [];

  const hasAnyCard =
    returnedId !== undefined ||
    returnedService !== undefined ||
    returnedType !== undefined ||
    returnedCopy !== undefined ||
    returnedRef !== undefined ||
    returnedStatus !== undefined;

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden transition-all animate-in fade-in-50 duration-200 w-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
            Response
          </span>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">Response Details</h2>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{result.durationMs}ms</span>
          <Badge variant={result.success ? "success" : "destructive"} className="ml-1 text-[11px]">
            HTTP {result.status}
          </Badge>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Status Banner */}
        {result.success ? (
          <div className="p-3.5 rounded-md bg-emerald-50/80 border border-emerald-200 flex items-start gap-3 text-emerald-950">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs uppercase font-mono tracking-wider block text-emerald-800">
                {result.status === 204
                  ? "HTTP 204 No Content"
                  : result.status === 201
                  ? "HTTP 201 Created"
                  : result.status === 202
                  ? "HTTP 202 Accepted"
                  : "HTTP 200 OK"}
              </span>
              <p className="text-xs text-emerald-900 mt-0.5">
                {result.status === 204
                  ? "Action completed successfully. No payload content returned."
                  : "Request processed successfully by SWIFT Alliance Cloud."}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-md bg-red-50/80 border border-red-200 flex items-start gap-3 text-red-950">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs uppercase font-mono tracking-wider block text-red-800">
                HTTP {result.status} Error
              </span>
              <p className="text-xs text-red-900 mt-0.5 font-mono">
                {result.error?.message || "SWIFT Gateway rejected the request."}
              </p>
            </div>
          </div>
        )}

        {/* Array or Collection of Results */}
        {result.success && isArray && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                Returned Records ({recordList.length})
              </span>
            </div>

            {recordList.length === 0 ? (
              <div className="p-6 rounded-md border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-1">
                <Inbox className="h-6 w-6 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Empty Result Set</span>
                <p className="text-[11px] text-slate-500 font-mono">
                  No records currently available in this queue.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
                    <tr>
                      <th className="p-2.5 font-bold">#</th>
                      <th className="p-2.5 font-bold">ID / Reference</th>
                      <th className="p-2.5 font-bold">Service</th>
                      <th className="p-2.5 font-bold">Type</th>
                      <th className="p-2.5 font-bold">Status</th>
                      <th className="p-2.5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {recordList.map((item: any, idx: number) => {
                      const dist = item.distribution || item;
                      const itemId = String(dist.id ?? item.id ?? item.sender_reference ?? idx + 1);
                      const srv = dist.service || item.service || "—";
                      const typ = dist.type || item.type || "—";
                      const st = item.result ?? dist.status ?? (dist.copy ? "Copy" : "Standard");

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2.5 text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{itemId}</td>
                          <td className="p-2.5 uppercase text-[#800020] font-bold">{srv}</td>
                          <td className="p-2.5 capitalize">{typ}</td>
                          <td className="p-2.5">{st}</td>
                          <td className="p-2.5 text-right space-x-1">
                            {dist.id && (
                              <button
                                type="button"
                                onClick={() => navigate(`/req/2?id=${encodeURIComponent(String(dist.id))}`)}
                                className="text-[11px] text-[#800020] hover:underline font-semibold"
                              >
                                View Distribution
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Structured Metric Breakdown Cards */}
        {result.success && hasAnyCard && !isArray && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {returnedId !== undefined && (
              <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Resource ID</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-bold text-slate-900 text-sm truncate">{String(returnedId)}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(returnedId))}
                    className="text-slate-400 hover:text-[#800020] p-0.5 shrink-0 ml-1"
                    title="Copy ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {returnedService !== undefined && (
              <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Service</span>
                <span className="font-bold text-[#800020] text-sm mt-1 block uppercase">{String(returnedService)}</span>
              </div>
            )}

            {returnedType !== undefined && (
              <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Type</span>
                <span className="font-semibold text-slate-800 text-sm mt-1 block capitalize">{String(returnedType)}</span>
              </div>
            )}

            {returnedStatus !== undefined && (
              <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Status</span>
                <span className="font-semibold text-slate-800 text-sm mt-1 block">{String(returnedStatus)}</span>
              </div>
            )}

            {returnedCopy !== undefined && (
              <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Distribution Mode</span>
                <span className="font-semibold text-slate-700 text-sm mt-1 block">
                  {returnedCopy ? "Copy" : "Standard"}
                </span>
              </div>
            )}

            {/* Cloud Reference UUID */}
            {returnedRef !== undefined && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 p-3 rounded border border-slate-200 bg-white shadow-2xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Reference</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-xs text-slate-800 break-all font-semibold">{String(returnedRef)}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(returnedRef))}
                    className="text-slate-400 hover:text-[#800020] p-0.5 ml-2 shrink-0"
                    title="Copy Reference"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State when successful with no data fields */}
        {result.success && !isArray && !hasAnyCard && (
          <div className="p-4 rounded border border-slate-200 bg-slate-50 text-xs font-mono text-slate-600">
            Request completed with status HTTP {result.status}.
          </div>
        )}

        {/* Resource Links from SWIFT Response */}
        {result.success && returnedLinks.length > 0 && (
          <div className="p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-2">
            <span className="text-xs font-bold text-slate-800 font-mono block">Related Resources</span>
            <div className="flex flex-wrap gap-2">
              {returnedLinks.map((link, i) => {
                const cleanHref = sanitizeSwiftHref(link.href);
                return (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (cleanHref.includes("distributions/") && cleanHref.endsWith("/acks")) {
                        const id = cleanHref.split("/")[1];
                        navigate(`/req/3?id=${encodeURIComponent(id || "")}`);
                      } else if (cleanHref.includes("distributions/") && cleanHref.endsWith("/naks")) {
                        const id = cleanHref.split("/")[1];
                        navigate(`/req/4?id=${encodeURIComponent(id || "")}`);
                      } else if (cleanHref.includes("distributions/")) {
                        const id = cleanHref.split("/").pop();
                        navigate(`/req/2?id=${encodeURIComponent(id || "")}`);
                      } else if (cleanHref.includes("fin/messages/")) {
                        const id = cleanHref.split("/").pop();
                        navigate(`/req/6?id=${encodeURIComponent(id || "")}`);
                      } else if (cleanHref.includes("fin/transmission-reports/")) {
                        const id = cleanHref.split("/").pop();
                        navigate(`/req/8?id=${encodeURIComponent(id || "")}`);
                      } else if (cleanHref.includes("interact/messages/")) {
                        const id = cleanHref.split("/").pop();
                        navigate(`/req/16?id=${encodeURIComponent(id || "")}`);
                      } else {
                        toast.info(`Target path: ${cleanHref}`);
                      }
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="h-7 text-xs font-mono border-slate-300 text-slate-800 bg-white hover:bg-slate-100"
                  >
                    <ArrowUpRight className="mr-1 h-3.5 w-3.5 text-slate-500" />
                    {link.rel.toUpperCase()} ({cleanHref})
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Returned Payload (Message / XML / MT Block 4) */}
        {returnedPayload !== undefined && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 font-mono block">Message Payload</span>
              <button
                type="button"
                onClick={() => copyToClipboard(String(returnedPayload))}
                className="text-[11px] font-mono text-[#800020] hover:underline flex items-center gap-1 font-semibold"
              >
                <Copy className="h-3 w-3" /> Copy Payload
              </button>
            </div>
            <pre className="p-3 rounded border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900 overflow-x-auto whitespace-pre-wrap">
              {String(returnedPayload)}
            </pre>
          </div>
        )}

        {/* Collapsible Technical Details */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
          >
            {showTechnicalDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>{showTechnicalDetails ? "Hide Raw Response" : "Raw Response (JSON)"}</span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Payload Content</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(result.raw, null, 2))}
                  className="text-[#800020] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Copy className="h-3 w-3" /> Copy JSON
                </button>
              </div>
              <pre className="p-3 rounded border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 overflow-x-auto max-h-72">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
