import { NextResponse } from "next/server";
import { AppError, sanitizeLogData } from "./errors";
import { ApiResponse, SwiftApiError } from "@/types/swift";

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function errorResponse(
  error: unknown,
  defaultMessage = "An unexpected error occurred."
): NextResponse<ApiResponse<null>> {
  let status = 500;
  let errorPayload: SwiftApiError = {
    code: "INTERNAL_ERROR",
    message: defaultMessage,
  };

  if (error instanceof AppError) {
    status = error.status;
    errorPayload = {
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details ? (sanitizeLogData(error.details) as Record<string, unknown>) : undefined,
    };
  } else if (error instanceof Error) {
    errorPayload = {
      code: "RUNTIME_ERROR",
      message: error.message,
    };
  }

  // Safe console log with redaction
  console.error(`[API Error] [${errorPayload.code}] (${status}):`, sanitizeLogData({
    message: errorPayload.message,
    details: errorPayload.details,
  }));

  return NextResponse.json(
    {
      success: false,
      error: errorPayload,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
