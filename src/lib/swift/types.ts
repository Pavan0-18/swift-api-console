export * from "@/types/swift";

export interface SwiftRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  queryParams?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
  environment?: import("@/types/swift").SwiftEnvironmentKey;
}

export interface SwiftLogEntry {
  timestamp: string;
  method: string;
  path: string;
  environment: string;
  status: number;
  durationMs: number;
  correlationId: string;
  maskedConsumerKey?: string;
}
