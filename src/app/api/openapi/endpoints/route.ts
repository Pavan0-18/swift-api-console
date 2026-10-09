import { NextRequest } from "next/server";
import { getAllEndpoints, getCategoryGroups, getEndpointById, searchEndpoints } from "@/lib/swift/openapi/registry";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const query = searchParams.get("q");

    if (id) {
      const endpoint = getEndpointById(id);
      if (!endpoint) {
        return errorResponse(new Error(`Endpoint with ID '${id}' not found`), "Endpoint not found");
      }
      return successResponse(endpoint);
    }

    if (query) {
      const results = searchEndpoints(query);
      return successResponse(results);
    }

    const categories = getCategoryGroups();
    const all = getAllEndpoints();

    return successResponse({
      totalEndpoints: all.length,
      categories,
    });
  } catch (error) {
    return errorResponse(error, "Failed to load OpenAPI endpoint registry.");
  }
}
