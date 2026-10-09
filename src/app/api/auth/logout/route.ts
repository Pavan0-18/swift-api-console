import { clearSessionCookie } from "@/lib/swift/session";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function POST() {
  try {
    await clearSessionCookie();
    return successResponse({ disconnected: true });
  } catch (error) {
    return errorResponse(error, "Failed to clear SWIFT session.");
  }
}
