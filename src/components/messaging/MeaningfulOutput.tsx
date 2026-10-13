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
  ShieldCheck,
  FileCode,
  Calendar,
  Send,
  Layers,
  Activity,
  Download,
  Check,
  Info,
  Hash,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeSwiftHref } from "@/lib/swift/client";
import { SWIFT_REQUEST_INVENTORY } from "@/config/swift-inventory";
import { convertSwiftPayload, ConvertedPayload } from "@/lib/swift/payload-converter";

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
    sub?: string;
  };
  raw?: unknown;
}

/**
 * Dynamically resolves a SWIFT hypermedia link (href, rel, method) to its corresponding inventory request
 * by matching slugs, eliminating hardcoded index misalignment.
 */
function resolveSwiftNavigationTarget(
  href: string,
  rel?: string
): { targetRequestId: number; extractedId: string } | null {
  const cleanHref = sanitizeSwiftHref(href).replace(/^\//, "");
  const norm = cleanHref.replace(/^v[12]\//, "");

  // 1. Acks: e.g. distributions/44984189499/acks
  const ackMatch = norm.match(/^distributions\/([^/]+)\/acks/i);
  if (ackMatch || rel?.toLowerCase() === "ack" || rel?.toLowerCase() === "acks") {
    const id = ackMatch ? ackMatch[1] : norm.split("/")[1] || "";
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "dist-post-ack");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  // 2. Naks: e.g. distributions/44984189499/naks
  const nakMatch = norm.match(/^distributions\/([^/]+)\/naks/i);
  if (nakMatch || rel?.toLowerCase() === "nak" || rel?.toLowerCase() === "naks") {
    const id = nakMatch ? nakMatch[1] : norm.split("/")[1] || "";
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "dist-post-nak");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  // 3. FIN Transmission Reports: e.g. fin/transmission-reports/44984189499
  const finTransMatch = norm.match(/^fin\/transmission-reports\/([^/]+)/i);
  if (finTransMatch || (rel?.toLowerCase().includes("transmission") && norm.includes("fin"))) {
    const id = finTransMatch ? finTransMatch[1] : norm.split("/").pop() || "";
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "fin-download-transmission-report-single");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  // 4. FIN Delivery Reports: e.g. fin/delivery-reports/44984189499
  const finDelivMatch = norm.match(/^fin\/delivery-reports\/([^/]+)/i);
  if (finDelivMatch) {
    const id = finDelivMatch[1];
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "fin-download-delivery-report-single");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  // 5. FIN Messages: e.g. fin/messages/44984189499
  const finMsgMatch = norm.match(/^fin\/messages\/([^/]+)/i);
  if (finMsgMatch) {
    const id = finMsgMatch[1];
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "fin-download-message-single");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  // 6. InterAct Transmission Reports: e.g. interact/transmission-reports/55001239800
  const iaTransMatch = norm.match(/^interact\/transmission-reports\/([^/]+)/i);
  if (iaTransMatch) {
    const id = iaTransMatch[1];
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "interact-download-transmission-report-single");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  // 7. InterAct Delivery Reports: e.g. interact/delivery-reports/55001239800
  const iaDelivMatch = norm.match(/^interact\/delivery-reports\/([^/]+)/i);
  if (iaDelivMatch) {
    const id = iaDelivMatch[1];
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "interact-download-delivery-report-single");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  // 8. InterAct Messages: e.g. interact/messages/55001239800
  const iaMsgMatch = norm.match(/^interact\/messages\/([^/]+)/i);
  if (iaMsgMatch) {
    const id = iaMsgMatch[1];
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "interact-download-message-single");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  // 9. Single Distribution: e.g. distributions/44984189499
  const distMatch = norm.match(/^distributions\/([^/]+)$/i);
  if (distMatch || rel?.toLowerCase() === "self") {
    const id = distMatch ? distMatch[1] : norm.split("/").pop() || "";
    const req = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "dist-get-single");
    if (req) return { targetRequestId: req.id, extractedId: id };
  }

  return null;
}

export interface MeaningfulOutputProps {
  result: SwiftExecutionResult | null;
  defaultService?: string;
  requestBody?: unknown;
  requestMethod?: string;
  requestName?: string;
}

export function MeaningfulOutput({
  result,
  defaultService,
  requestBody,
  requestMethod,
  requestName,
}: MeaningfulOutputProps) {
  const navigate = useNavigate();
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);
  const [payloadActiveTab, setPayloadActiveTab] = React.useState<"converted" | "raw">("converted");
  const [mtViewMode, setMtViewMode] = React.useState<"table" | "text">("table");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!result) return null;

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
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
  const archiveObj = isObject && (rawData as any).archive ? (rawData as any).archive : {};

  // Extract core SWIFT returned attributes
  const returnedId =
    distObj.id ?? (rawData as any).id ?? (rawData as any).distribution_id ?? (rawData as any).message_id ?? (rawData as any).batch_id;

  const returnedService = distObj.service ?? (rawData as any).service ?? defaultService?.toLowerCase();
  const returnedType = distObj.type ?? (rawData as any).type ?? (msgObj.message_type ? "message" : undefined);
  const returnedCopy =
    typeof distObj.copy === "boolean" ? distObj.copy : typeof (rawData as any).copy === "boolean" ? (rawData as any).copy : undefined;

  const returnedRef =
    distObj.message_cloud_reference ??
    (rawData as any).message_cloud_reference ??
    msgObj.sender_reference ??
    (rawData as any).sender_reference ??
    (rawData as any).cloud_reference;

  const returnedStatus =
    distObj.status ??
    (rawData as any).status ??
    (result.status === 201 ? "Accepted" : result.status === 202 ? "Accepted / Queued" : result.status === 204 ? "Acknowledged" : undefined);

  // Extract Timestamps
  const creationTime = distObj.creation_time ?? (rawData as any).creation_time ?? msgObj.creation_time;
  const receptionTime = distObj.reception_time ?? (rawData as any).reception_time ?? msgObj.reception_time;
  const transmissionTime = distObj.transmission_time ?? (rawData as any).transmission_time ?? reportObj.transmission_time;
  const deliveryTime = reportObj.delivery_time ?? (rawData as any).delivery_time;
  const finReceptionTime = reportObj.fin_reception_time ?? (rawData as any).fin_reception_time;

  // Extract Routing & Network Parameters
  const senderVal = msgObj.sender ?? (rawData as any).sender ?? msgObj.requestor ?? (rawData as any).requestor ?? (distObj as any).source_dn;
  const receiverVal = msgObj.receiver ?? (rawData as any).receiver ?? msgObj.responder ?? (rawData as any).responder ?? (distObj as any).destination_dn;
  const messageTypeVal = msgObj.message_type ?? (rawData as any).message_type ?? (distObj as any).message_type;
  const networkInfo = msgObj.network_info ?? (rawData as any).network_info ?? {};
  const uetrVal = networkInfo.uetr ?? msgObj.uetr ?? (rawData as any).uetr;
  const priorityVal = networkInfo.network_priority ?? (rawData as any).network_priority;
  const serviceCodeVal = msgObj.service_code ?? (rawData as any).service_code;
  const validationIdVal = networkInfo.validation_identifier ?? (rawData as any).validation_identifier;

  // Extract Reports
  const transReport = isObject && (rawData as any).transmission_report ? (rawData as any).transmission_report : null;
  const delivReport =
    isObject && ((rawData as any).delivery_report || (rawData as any).delivery_notification)
      ? (rawData as any).delivery_report || (rawData as any).delivery_notification
      : null;

  // Extract History Logs (Audit Trail)
  const historyLogs: any[] =
    Array.isArray((rawData as any).history_report?.history_logs)
      ? (rawData as any).history_report.history_logs
      : Array.isArray(archiveObj.history_report?.history_logs)
      ? archiveObj.history_report.history_logs
      : Array.isArray((distObj as any).history_logs)
      ? (distObj as any).history_logs
      : [];

  // Extract Payload: check response first, then fallback to request body payload (for POST emissions)
  let rawPayloadString: string | undefined =
    msgObj.payload ??
    reportObj.transmission_report_payload ??
    reportObj.delivery_notification_payload ??
    (rawData as any).payload ??
    (rawData as any).export ??
    archiveObj.message?.payload;

  let isPayloadFromRequest = false;
  if (!rawPayloadString && requestBody) {
    try {
      const parsedReq = typeof requestBody === "string" ? JSON.parse(requestBody) : requestBody;
      if (parsedReq && typeof parsedReq === "object") {
        if ("payload" in parsedReq && typeof (parsedReq as any).payload === "string") {
          rawPayloadString = (parsedReq as any).payload;
          isPayloadFromRequest = true;
        } else if (Array.isArray(parsedReq) && parsedReq[0] && typeof parsedReq[0].payload === "string") {
          rawPayloadString = parsedReq[0].payload;
          isPayloadFromRequest = true;
        }
      }
    } catch {
      // not json body
    }
  }

  // Convert Payload if available
  const convertedPayload: ConvertedPayload | null = rawPayloadString
    ? convertSwiftPayload(rawPayloadString)
    : null;

  // Extract Hypermedia Links
  const returnedLinks: Array<{ rel: string; href: string; method?: string }> = Array.isArray(distObj.links)
    ? distObj.links
    : Array.isArray((rawData as any).links)
    ? (rawData as any).links
    : [];

  // Check Error Details
  const hasErrorDetails = !result.success && result.error;
  const validationErrors: Array<{ field?: string; message?: string; rejected_value?: unknown }> =
    isObject && Array.isArray((rawData as any).details)
      ? (rawData as any).details
      : isObject && Array.isArray((rawData as any).validation_errors)
      ? (rawData as any).validation_errors
      : Array.isArray((result.error?.details as any)?.details)
      ? (result.error?.details as any).details
      : [];

  const hasAnyPrimaryCard =
    returnedId !== undefined ||
    returnedService !== undefined ||
    returnedType !== undefined ||
    returnedCopy !== undefined ||
    returnedRef !== undefined ||
    returnedStatus !== undefined;

  const hasRoutingInfo =
    senderVal !== undefined ||
    receiverVal !== undefined ||
    messageTypeVal !== undefined ||
    uetrVal !== undefined ||
    serviceCodeVal !== undefined;

  const hasTimestamps =
    creationTime !== undefined ||
    receptionTime !== undefined ||
    transmissionTime !== undefined ||
    deliveryTime !== undefined ||
    finReceptionTime !== undefined;

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden transition-all animate-in fade-in-50 duration-200 w-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
            Response
          </span>
          {returnedService && (
            <Badge variant="outline" className="border-[#800020]/30 text-[#800020] bg-white font-mono text-[10px] py-0 h-4 uppercase">
              {returnedService}
            </Badge>
          )}
          <h2 className="text-sm font-bold text-slate-900">
            {result.success ? "Request Completed" : "Execution Error"}
          </h2>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{result.durationMs}ms</span>
          <Badge
            variant={result.success ? "success" : "destructive"}
            className="ml-1 text-[11px] font-mono px-2 py-0.5"
          >
            HTTP {result.status}
          </Badge>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Status Banner */}
        {result.success ? (
          <div className="p-3.5 rounded-md bg-emerald-50/90 border border-emerald-200 flex items-start gap-3 text-emerald-950">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs uppercase font-mono tracking-wider block text-emerald-800">
                  {result.status === 204
                    ? "HTTP 204 No Content (Acknowledged)"
                    : result.status === 201
                    ? "HTTP 201 Created (Message Accepted)"
                    : result.status === 202
                    ? "HTTP 202 Accepted (Batch Queued)"
                    : "HTTP 200 OK (Processed Successfully)"}
                </span>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  Alliance Cloud 2.1
                </span>
              </div>
              <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
                {result.status === 204
                  ? "Distribution acknowledged and successfully removed from the download queue."
                  : result.status === 201
                  ? "Message validated and dispatched into SWIFTNet. Distribution ID assigned."
                  : result.status === 202
                  ? "Batch payload received and queued for asynchronous network transmission."
                  : "Response retrieved successfully from Alliance Cloud API Gateway."}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-md bg-red-50/90 border border-red-200 flex items-start gap-3 text-red-950">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-xs uppercase font-mono tracking-wider block text-red-800">
                HTTP {result.status} Gateway Rejection
              </span>
              <p className="text-xs text-red-900 mt-0.5 font-mono leading-relaxed">
                {result.error?.message || "SWIFT Alliance Cloud rejected the request."}
              </p>
            </div>
          </div>
        )}

        {/* Detailed Error Diagnostics */}
        {hasErrorDetails && (
          <div className="p-4 rounded-md border border-red-200 bg-red-50/40 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-900 uppercase flex items-center gap-1.5 text-xs">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Error Diagnostics & Validation Failures
              </span>
              {result.error?.code && (
                <Badge variant="outline" className="text-[10px] bg-white text-red-700 border-red-300">
                  {result.error.code}
                </Badge>
              )}
            </div>

            {validationErrors.length > 0 && (
              <div className="border border-red-200 rounded overflow-hidden bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-red-100/60 border-b border-red-200 text-red-900 font-bold uppercase">
                    <tr>
                      <th className="p-2">Target Field</th>
                      <th className="p-2">Error Description</th>
                      <th className="p-2">Rejected Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 text-slate-800">
                    {validationErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-red-50/40">
                        <td className="p-2 font-semibold text-red-800">{err.field || "—"}</td>
                        <td className="p-2">{err.message || "Invalid field value"}</td>
                        <td className="p-2 text-slate-500 max-w-xs truncate">{String(err.rejected_value ?? "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pre-request Script: Non-Repudiation Signature Info */}
        {result.signatureInfo?.attached && (
          <div className="p-3.5 rounded-md border border-[#800020]/20 bg-[#800020]/5 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#800020] uppercase flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-4 w-4 text-[#800020]" />
                Pre-request Script: X-SWIFT-Signature (RS256 JWT)
              </span>
              <Badge variant="outline" className="text-[10px] bg-white text-[#800020] border-[#800020]/30 font-mono py-0 h-4">
                Non-Repudiation Attached
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Subject (sub)</span>
                <span className="font-semibold text-slate-800">{result.signatureInfo.sub || "CN=desktop, O=sandbox, O=swift"}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Audience (aud)</span>
                <span className="font-semibold text-slate-800 truncate block" title={result.signatureInfo.aud}>{result.signatureInfo.aud}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Payload Digest (SHA-256 Base64)</span>
                <span className="text-slate-800 break-all">{result.signatureInfo.digest}</span>
              </div>
            </div>
          </div>
        )}

        {/* Primary Resource Breakdown Cards */}
        {result.success && hasAnyPrimaryCard && !isArray && (
          <div className="space-y-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Resource Attributes
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              {returnedId !== undefined && (
                <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Resource / Distribution ID</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-slate-900 text-sm truncate">{String(returnedId)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(returnedId), "id")}
                      className="text-slate-400 hover:text-[#800020] p-0.5 shrink-0 ml-1 cursor-pointer"
                      title="Copy ID"
                    >
                      {copiedKey === "id" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {returnedService !== undefined && (
                <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">SWIFT Service</span>
                  <span className="font-bold text-[#800020] text-sm mt-1 block uppercase">{String(returnedService)}</span>
                </div>
              )}

              {returnedType !== undefined && (
                <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Artifact Type</span>
                  <span className="font-semibold text-slate-800 text-sm mt-1 block capitalize">{String(returnedType)}</span>
                </div>
              )}

              {returnedStatus !== undefined && (
                <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Processing Status</span>
                  <span className="font-semibold text-emerald-800 text-sm mt-1 block">{String(returnedStatus)}</span>
                </div>
              )}

              {returnedCopy !== undefined && (
                <div className="p-3 rounded border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Distribution Mode</span>
                  <span className="font-semibold text-slate-700 text-sm mt-1 block">
                    {returnedCopy ? "Copy Mode" : "Standard Original"}
                  </span>
                </div>
              )}

              {/* Tracking Reference */}
              {returnedRef !== undefined && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 p-3 rounded border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Business Tracking Reference</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs text-slate-900 break-all font-semibold">{String(returnedRef)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(returnedRef), "ref")}
                      className="text-slate-400 hover:text-[#800020] p-0.5 ml-2 shrink-0 cursor-pointer"
                      title="Copy Reference"
                    >
                      {copiedKey === "ref" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Network & Routing Parameters */}
        {hasRoutingInfo && (
          <div className="p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-3 font-mono text-xs">
            <span className="font-bold text-slate-800 uppercase flex items-center gap-1.5 text-xs">
              <Layers className="h-4 w-4 text-[#800020]" />
              Network & Routing Parameters
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {senderVal && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Sender (BIC / DN)</span>
                  <span className="font-semibold text-slate-900 text-xs block mt-0.5 break-all">{senderVal}</span>
                </div>
              )}

              {receiverVal && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Receiver (BIC / DN)</span>
                  <span className="font-semibold text-slate-900 text-xs block mt-0.5 break-all">{receiverVal}</span>
                </div>
              )}

              {messageTypeVal && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Message Standard</span>
                  <span className="font-semibold text-[#800020] text-xs block mt-0.5">{messageTypeVal}</span>
                </div>
              )}

              {uetrVal && (
                <div className="p-2.5 rounded bg-white border border-slate-200 col-span-1 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">UETR (End-to-End Tracking UUID)</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-semibold text-slate-900 text-xs break-all">{uetrVal}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(uetrVal, "uetr")}
                      className="text-slate-400 hover:text-[#800020] p-0.5 ml-1 shrink-0 cursor-pointer"
                      title="Copy UETR"
                    >
                      {copiedKey === "uetr" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              )}

              {priorityVal && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Network Priority</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-0.5">{priorityVal}</span>
                </div>
              )}

              {serviceCodeVal && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Service Code</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-0.5">{serviceCodeVal}</span>
                </div>
              )}

              {validationIdVal && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Validation Identifier</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-0.5">{validationIdVal}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamps Panel */}
        {hasTimestamps && (
          <div className="p-3.5 rounded-md border border-slate-200 bg-white flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Timestamps:
            </span>

            {creationTime && (
              <div>
                <span className="text-slate-400 text-[10px] block">Created</span>
                <span className="text-slate-800 font-semibold">{creationTime}</span>
              </div>
            )}

            {receptionTime && (
              <div>
                <span className="text-slate-400 text-[10px] block">Received</span>
                <span className="text-slate-800 font-semibold">{receptionTime}</span>
              </div>
            )}

            {transmissionTime && (
              <div>
                <span className="text-slate-400 text-[10px] block">Transmitted</span>
                <span className="text-slate-800 font-semibold">{transmissionTime}</span>
              </div>
            )}

            {deliveryTime && (
              <div>
                <span className="text-slate-400 text-[10px] block">Delivered</span>
                <span className="text-slate-800 font-semibold">{deliveryTime}</span>
              </div>
            )}

            {finReceptionTime && (
              <div>
                <span className="text-slate-400 text-[10px] block">FIN Reception</span>
                <span className="text-slate-800 font-semibold">{finReceptionTime}</span>
              </div>
            )}
          </div>
        )}

        {/* Transmission & Delivery Report Verification Panel */}
        {(transReport || delivReport) && (
          <div className="p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-3 font-mono text-xs">
            <span className="font-bold text-slate-800 uppercase flex items-center gap-1.5 text-xs">
              <Activity className="h-4 w-4 text-[#800020]" />
              Network Verification & Delivery Report
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {transReport?.status && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Transmission Status</span>
                  <span className="font-bold text-emerald-700 text-xs block mt-0.5">{transReport.status}</span>
                </div>
              )}

              {delivReport?.delivery_status && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Delivery Status</span>
                  <span className="font-bold text-emerald-700 text-xs block mt-0.5">{delivReport.delivery_status}</span>
                </div>
              )}

              {transReport?.session_number && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Session Number</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-0.5">{transReport.session_number}</span>
                </div>
              )}

              {transReport?.sequence_number && (
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Sequence Number</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-0.5">{transReport.sequence_number}</span>
                </div>
              )}

              {transReport?.network_reason_code && (
                <div className="p-2.5 rounded bg-white border border-slate-200 col-span-1 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Network Reason Code</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-0.5">
                    {transReport.network_reason_code} {transReport.network_reason_description ? `— ${transReport.network_reason_description}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lifecycle Audit History Timeline */}
        {historyLogs.length > 0 && (
          <div className="p-4 rounded-md border border-slate-200 bg-white space-y-3 font-mono text-xs">
            <span className="font-bold text-slate-800 uppercase flex items-center gap-1.5 text-xs">
              <Activity className="h-4 w-4 text-[#800020]" />
              Lifecycle Audit History ({historyLogs.length} Events)
            </span>

            <div className="relative border-l-2 border-[#800020]/20 ml-3 pl-4 space-y-4 py-1">
              {historyLogs.map((log: any, idx: number) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-[#800020] border-2 border-white" />
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 border-[#800020]/30 text-[#800020] bg-white">
                        {log.code || "EVENT"}
                      </Badge>
                      <span className="font-bold text-slate-900 text-xs">{log.label || log.code}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{log.time || "—"}</span>
                  </div>
                  {log.user && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Initiator: <span className="font-semibold text-slate-700">{log.user}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CONVERTED PAYLOAD SECTION (Decoded MT & XML + Raw Base64) */}
        {/* ======================================================== */}
        {convertedPayload && (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-0">
            {/* Payload Header */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[#800020]" />
                <span className="font-bold text-slate-900 text-xs font-mono">
                  {isPayloadFromRequest ? "Transmitted Message Payload" : "Converted Message Payload"}
                </span>

                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono py-0 h-4 ${
                    convertedPayload.format === "swift-mt"
                      ? "border-[#800020]/40 text-[#800020] bg-white"
                      : convertedPayload.format === "xml"
                      ? "border-blue-300 text-blue-700 bg-white"
                      : "border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  {convertedPayload.format === "swift-mt"
                    ? "SWIFT MT (ISO 15022)"
                    : convertedPayload.format === "xml"
                    ? "ISO 20022 XML (InterAct)"
                    : convertedPayload.format.toUpperCase()}
                </Badge>

                {convertedPayload.isBase64 && (
                  <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 bg-emerald-50 border-emerald-300 text-emerald-800">
                    Decoded from Base64
                  </Badge>
                )}
              </div>

              {/* View Selector Tabs & Actions */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPayloadActiveTab("converted")}
                    className={`px-2.5 py-1 rounded transition-colors font-semibold cursor-pointer ${
                      payloadActiveTab === "converted"
                        ? "bg-white text-[#800020] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Converted Output
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayloadActiveTab("raw")}
                    className={`px-2.5 py-1 rounded transition-colors font-semibold cursor-pointer ${
                      payloadActiveTab === "raw"
                        ? "bg-white text-[#800020] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Raw Base64 ({convertedPayload.byteSize} B)
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      payloadActiveTab === "converted"
                        ? convertedPayload.formattedText
                        : convertedPayload.raw,
                      "payload_copy"
                    )
                  }
                  className="h-7 text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                  title="Copy payload text"
                >
                  {copiedKey === "payload_copy" ? <Check className="h-3 w-3 text-emerald-600 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadTextFile(
                      convertedPayload.formattedText,
                      `swift-payload-${returnedId || "message"}.${convertedPayload.format === "xml" ? "xml" : "txt"}`
                    )
                  }
                  className="h-7 text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                  title="Download payload file"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>

            {/* TAB 1: CONVERTED OUTPUT */}
            {payloadActiveTab === "converted" && (
              <div className="p-4 space-y-3">
                {/* MT Payload Layout */}
                {convertedPayload.format === "swift-mt" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-slate-600 uppercase">
                        SWIFT MT Block 4 Content
                      </span>

                      {convertedPayload.mtFields && convertedPayload.mtFields.length > 0 && (
                        <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => setMtViewMode("table")}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              mtViewMode === "table" ? "bg-white text-[#800020] font-bold shadow-2xs" : "text-slate-500"
                            }`}
                          >
                            Tag Breakdown Table ({convertedPayload.mtFields.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMtViewMode("text")}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              mtViewMode === "text" ? "bg-white text-[#800020] font-bold shadow-2xs" : "text-slate-500"
                            }`}
                          >
                            Formatted Text
                          </button>
                        </div>
                      )}
                    </div>

                    {mtViewMode === "table" && convertedPayload.mtFields && convertedPayload.mtFields.length > 0 ? (
                      <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                        <table className="w-full text-left font-mono text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
                            <tr>
                              <th className="p-2.5 font-bold w-20">Tag</th>
                              <th className="p-2.5 font-bold w-56">Field Name</th>
                              <th className="p-2.5 font-bold">Field Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {convertedPayload.mtFields.map((field, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70">
                                <td className="p-2.5 font-bold text-[#800020]">{field.tag}</td>
                                <td className="p-2.5 text-slate-600 font-medium text-[11px]">{field.label}</td>
                                <td className="p-2.5 font-semibold text-slate-900 break-all whitespace-pre-wrap">
                                  {field.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <pre className="p-3.5 rounded border border-slate-200 bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80">
                        {convertedPayload.formattedText}
                      </pre>
                    )}
                  </div>
                )}

                {/* ISO 20022 XML Layout */}
                {convertedPayload.format === "xml" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600">
                      <div className="flex items-center gap-2">
                        {convertedPayload.xmlRoot && (
                          <span className="text-[11px]">
                            Root: <code className="font-bold text-[#800020]">&lt;{convertedPayload.xmlRoot}&gt;</code>
                          </span>
                        )}
                        {convertedPayload.xmlNamespace && (
                          <span className="text-[11px] text-slate-500 truncate max-w-sm" title={convertedPayload.xmlNamespace}>
                            Namespace: {convertedPayload.xmlNamespace}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">Pretty-printed XML</span>
                    </div>

                    <pre className="p-3.5 rounded border border-slate-200 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
                      {convertedPayload.formattedText}
                    </pre>
                  </div>
                )}

                {/* JSON / Text Layout */}
                {convertedPayload.format !== "swift-mt" && convertedPayload.format !== "xml" && (
                  <pre className="p-3.5 rounded border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80">
                    {convertedPayload.formattedText}
                  </pre>
                )}
              </div>
            )}

            {/* TAB 2: RAW BASE64 WIRE PAYLOAD */}
            {payloadActiveTab === "raw" && (
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Base64 Wire Payload ({convertedPayload.byteSize} bytes)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(convertedPayload.raw, "raw_b64")}
                    className="text-[#800020] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedKey === "raw_b64" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    Copy Base64
                  </button>
                </div>
                <pre className="p-3.5 rounded border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 break-all overflow-x-auto max-h-60 whitespace-pre-wrap leading-relaxed">
                  {convertedPayload.raw}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Array or Collection of Results (Distribution Queue or Batch Table) */}
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
                                onClick={() => {
                                  const distSingle = SWIFT_REQUEST_INVENTORY.find((r) => r.slug === "dist-get-single");
                                  navigate(
                                    `/req/${distSingle?.id || 2}?id=${encodeURIComponent(String(dist.id))}&distribution-id=${encodeURIComponent(String(dist.id))}`
                                  );
                                }}
                                className="text-[11px] text-[#800020] hover:underline font-semibold cursor-pointer"
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

        {/* Resource Links from SWIFT Response (Related Actions) */}
        {result.success && returnedLinks.length > 0 && (
          <div className="p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-2">
            <span className="text-xs font-bold text-slate-800 font-mono block">Related Resources & Next Actions</span>
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
                      const target = resolveSwiftNavigationTarget(link.href, link.rel);
                      if (target && target.extractedId) {
                        navigate(
                          `/req/${target.targetRequestId}?id=${encodeURIComponent(target.extractedId)}&distribution-id=${encodeURIComponent(target.extractedId)}`
                        );
                      } else if (target) {
                        navigate(`/req/${target.targetRequestId}`);
                      } else {
                        toast.info(`Target path: ${cleanHref}`);
                      }
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="h-7 text-xs font-mono border-slate-300 text-slate-800 bg-white hover:bg-slate-100 cursor-pointer"
                  >
                    <ArrowUpRight className="mr-1 h-3.5 w-3.5 text-slate-500" />
                    {link.rel.toUpperCase()} ({cleanHref})
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsible Technical Details (Raw JSON Response) */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
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
                  onClick={() => copyToClipboard(JSON.stringify(result.raw, null, 2), "raw_json")}
                  className="text-[#800020] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copiedKey === "raw_json" ? <Check className="h-3 w-3 text-emerald-600 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy JSON
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
