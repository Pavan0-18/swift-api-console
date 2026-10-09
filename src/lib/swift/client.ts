import { getEnvironmentConfig } from "./environments";
import { SwiftEnvironmentKey } from "@/types/swift";
import { SwiftRequestOptions } from "./types";
import { SwiftUpstreamError } from "@/lib/api/errors";

export interface SwiftApiResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  durationMs: number;
}

/**
 * Backend client for executing requests against the SWIFT Alliance Cloud Messaging API.
 * The browser never calls SWIFT directly; all calls go through this client on the server.
 */
export class SwiftClient {
  private environment: SwiftEnvironmentKey;
  private accessToken: string;
  private baseUrl: string;

  constructor(environment: SwiftEnvironmentKey, accessToken: string) {
    this.environment = environment;
    this.accessToken = accessToken;
    this.baseUrl = getEnvironmentConfig(environment).baseUrl;
  }

  public async request<T = unknown>(options: SwiftRequestOptions): Promise<SwiftApiResponse<T>> {
    const startTime = Date.now();
    const cleanPath = options.path.startsWith("/") ? options.path : `/${options.path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (options.queryParams) {
      Object.entries(options.queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json, application/xml, text/plain, */*",
      "User-Agent": "SWIFT-API-Console/2.1.1",
      ...(options.headers || {}),
    };

    let bodyData: BodyInit | undefined;
    if (options.body) {
      if (typeof options.body === "string") {
        bodyData = options.body;
      } else if (options.body instanceof FormData || options.body instanceof URLSearchParams) {
        bodyData = options.body;
      } else {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        bodyData = JSON.stringify(options.body);
      }
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: options.method || "GET",
        headers,
        body: bodyData,
        cache: "no-store",
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : "Failed to connect to SWIFT API";
      throw new SwiftUpstreamError(
        `SWIFT API Gateway connection failed on [${options.method || "GET"} ${cleanPath}]: ${errorMsg} (${durationMs}ms)`,
        502
      );
    }

    const durationMs = Date.now() - startTime;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    const responseText = await response.text();
    let data: unknown = responseText;

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(responseText);
      } catch {
        // Fallback to text
        data = responseText;
      }
    }

    if (!response.ok) {
      throw new SwiftUpstreamError(
        `SWIFT API returned HTTP ${response.status} ${response.statusText}`,
        response.status,
        typeof data === "object" ? data : { raw: data }
      );
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: data as T,
      durationMs,
    };
  }

  // Convenience shortcuts
  public get<T>(path: string, queryParams?: Record<string, string | number | boolean | undefined>, headers?: Record<string, string>) {
    return this.request<T>({ method: "GET", path, queryParams, headers });
  }

  public post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>({ method: "POST", path, body, headers });
  }

  public put<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>({ method: "PUT", path, body, headers });
  }

  public delete<T>(path: string, headers?: Record<string, string>) {
    return this.request<T>({ method: "DELETE", path, headers });
  }
}
