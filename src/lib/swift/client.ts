import { isSignatureRequired } from "./signature";

export type SwiftEnvironment = "sandbox" | "test" | "live";

export interface SwiftRequestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  accessToken?: string;
  environment?: SwiftEnvironment;
}

export interface SwiftApiResponse<T = unknown> {
  status: number;
  durationMs: number;
  success: boolean;
  data?: T;
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
 * Resolves path template e.g. "/v2/fin/messages/{distribution-id}" with actual parameters.
 */
export function resolvePath(pathTemplate: string, params: Record<string, string | number> = {}): string {
  let resolved = pathTemplate;
  for (const [key, val] of Object.entries(params)) {
    const encoded = encodeURIComponent(String(val).trim());
    resolved = resolved.replace(new RegExp(`\\{${key}\\}`, "g"), encoded);
  }
  return resolved;
}

/**
 * Builds query string, formatting arrays as comma-separated values (e.g. distribution-id=44984189500,44984189501).
 */
export function buildQueryString(params: Record<string, unknown> = {}): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val)) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val.join(","))}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * Sanitizes any URLs returned by SWIFT Live host into local/selected environment paths.
 */
export function sanitizeSwiftHref(href: string): string {
  if (!href) return "";
  try {
    const url = new URL(href);
    return url.pathname.replace(/^\/alliancecloud\//, "");
  } catch {
    return href.replace(/^https?:\/\/[^/]+\/alliancecloud\//, "");
  }
}

/**
 * Shared SWIFT HTTP Client Engine
 */
export async function executeSwiftRequest<T = Record<string, unknown>>(
  config: SwiftRequestConfig
): Promise<SwiftApiResponse<T>> {
  const startTime = Date.now();
  const env = config.environment || "sandbox";

  // 1. Resolve path and query
  const cleanPath = config.path.startsWith("/") ? config.path.slice(1) : config.path;
  const versionedPath = cleanPath.startsWith("v2/") || cleanPath.startsWith("v1/") ? cleanPath : `v2/${cleanPath}`;
  const resolvedPath = resolvePath(versionedPath, config.pathParams || {});
  const queryString = buildQueryString(config.queryParams as Record<string, unknown>);
  const fullEndpoint = `/api/swift/${resolvedPath}${queryString}`;

  // 2. Prepare headers
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-SWIFT-Environment": env,
  };

  if (config.accessToken) {
    headers["Authorization"] = `Bearer ${config.accessToken}`;
  }

  let bodyStr: string | undefined = undefined;
  if (config.body && ["POST", "PUT", "PATCH"].includes(config.method.toUpperCase())) {
    headers["Content-Type"] = "application/json";
    bodyStr = typeof config.body === "string" ? config.body : JSON.stringify(config.body);
  }

  try {
    const res = await fetch(fullEndpoint, {
      method: config.method,
      headers,
      body: bodyStr,
    });

    const durationMs = Date.now() - startTime;
    const json = await res.json().catch(() => ({}));

    // Handle 204 No Content
    if (res.status === 204) {
      return {
        status: 204,
        durationMs,
        success: true,
        data: { status: "acknowledged", message: "Action accepted (HTTP 204 No Content)" } as unknown as T,
        raw: json,
      };
    }

    let parsedData: unknown = json;
    if (json && typeof json === "object" && "data" in json) {
      parsedData = json.data;
    }

    return {
      status: res.status,
      durationMs,
      success: res.ok,
      data: parsedData as T,
      error: !res.ok
        ? {
            code: (json.error?.code as string) || "SWIFT_ERROR",
            message:
              (json.error?.message as string) ||
              (json.message as string) ||
              `Request rejected with status ${res.status}`,
            details: json,
          }
        : undefined,
      signatureInfo: json.signatureInfo,
      raw: json,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      status: 500,
      durationMs,
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: (err as Error).message || "Network error connecting to SWIFT gateway proxy",
      },
    };
  }
}
