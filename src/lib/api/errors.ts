export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code = "INTERNAL_ERROR", status = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class SwiftAuthError extends AppError {
  constructor(message = "Unable to authenticate with SWIFT API Gateway.", details?: unknown) {
    super(message, "SWIFT_AUTH_FAILED", 401, details);
  }
}

export class SwiftConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "SWIFT_CONFIG_ERROR", 400, details);
  }
}

export class SwiftValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 422, details);
  }
}

export class SwiftSessionError extends AppError {
  constructor(message = "No active SWIFT session. Please connect with credentials.", details?: unknown) {
    super(message, "UNAUTHORIZED_SESSION", 401, details);
  }
}

export class SwiftUpstreamError extends AppError {
  constructor(message: string, status = 502, details?: unknown) {
    super(message, "SWIFT_UPSTREAM_ERROR", status, details);
  }
}

// Redaction utility to prevent secrets from leaking into error responses or logs
export function sanitizeLogData<T>(data: T): T {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  const sensitiveKeys = [
    "consumerSecret",
    "consumer_secret",
    "client_secret",
    "access_token",
    "accessToken",
    "authorization",
    "password",
    "secret",
    "token",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
