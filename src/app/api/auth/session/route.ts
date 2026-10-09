import { getPublicSession } from "@/lib/swift/session";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await getPublicSession();
    return successResponse(session);
  } catch (error) {
    return errorResponse(error, "Failed to retrieve SWIFT session state.");
  }
}
