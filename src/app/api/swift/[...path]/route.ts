import { NextRequest } from "next/server";
import { getSession } from "@/lib/swift/session";
import { SwiftClient } from "@/lib/swift/client";
import { successResponse, errorResponse } from "@/lib/api/response";
import { SwiftSessionError } from "@/lib/api/errors";

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

async function handleSwiftProxy(request: NextRequest, { params }: RouteParams) {
  try {
    const { path } = await params;
    const session = await getSession();

    if (!session || !session.accessToken) {
      throw new SwiftSessionError("No active SWIFT session. Please connect your credentials or start a simulated session.");
    }

    const swiftPath = "/" + path.join("/");
    const method = request.method.toUpperCase() as "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

    // Handle offline simulated mode
    if (session.accessToken.startsWith("simulated_swift_token_")) {
      const startTime = Date.now();
      let simulatedResponse: unknown;

      if (swiftPath.startsWith("/distributions")) {
        simulatedResponse = {
          total: 2,
          limit: 50,
          distributions: [
            {
              id: "dist_20261009_001",
              service: "swift.fin",
              type: "fin.103",
              direction: "INBOUND",
              status: "AVAILABLE",
              sender: "BANKBEBBAXXX",
              receiver: "BANKUS33AXXX",
              created_at: new Date().toISOString(),
            },
            {
              id: "dist_20261009_002",
              service: "swift.interact",
              type: "pacs.008.001.08",
              direction: "INBOUND",
              status: "AVAILABLE",
              sender: "DEUTDEDDXXXX",
              receiver: "BANKUS33AXXX",
              created_at: new Date().toISOString(),
            },
          ],
        };
      } else if (swiftPath.startsWith("/fin/messages")) {
        simulatedResponse = {
          message_id: `fin_msg_${Date.now()}`,
          service: "swift.fin",
          message_type: "fin.103",
          status: "ACCEPTED",
          reference: "PAYREF-20261009",
          transmission_time: new Date().toISOString(),
          ack_received: true,
        };
      } else if (swiftPath.startsWith("/interact/messages")) {
        simulatedResponse = {
          message_id: `interact_msg_${Date.now()}`,
          service: "swift.interact",
          message_type: "pacs.008.001.08",
          status: "DELIVERED",
          transmission_time: new Date().toISOString(),
        };
      } else if (swiftPath.startsWith("/fileact/transfers")) {
        simulatedResponse = {
          transfer_id: `fa_transfer_${Date.now()}`,
          service: "swift.fileact",
          status: "IN_PROGRESS",
          file_name: "PAYMENTS_BULK_20261009.xml",
          file_size_bytes: 1048576,
          created_at: new Date().toISOString(),
        };
      } else {
        simulatedResponse = {
          operation: `${method} ${swiftPath}`,
          status: "SUCCESS",
          environment: session.environment,
          simulated: true,
          timestamp: new Date().toISOString(),
        };
      }

      return successResponse({
        path: swiftPath,
        method,
        environment: session.environment,
        status: method === "POST" ? 201 : 200,
        durationMs: Date.now() - startTime + 35,
        headers: {
          "content-type": "application/json",
          "x-swift-correlation-id": `sim-${Date.now()}`,
        },
        response: simulatedResponse,
      });
    }

    // Live Gateway Execution
    const client = new SwiftClient(session.environment, session.accessToken);

    // Extract query parameters
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    // Pass through relevant custom headers
    const customHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower.startsWith("x-") ||
        lower === "accept" ||
        lower === "content-type" ||
        lower === "cache-control"
      ) {
        customHeaders[key] = value;
      }
    });

    // Read request body if present
    let body: unknown = undefined;
    if (["POST", "PUT", "PATCH"].includes(method)) {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = await request.json().catch(() => ({}));
      } else {
        body = await request.text().catch(() => "");
      }
    }

    const result = await client.request({
      method,
      path: swiftPath,
      queryParams,
      headers: customHeaders,
      body,
    });

    return successResponse({
      path: swiftPath,
      method,
      environment: session.environment,
      status: result.status,
      durationMs: result.durationMs,
      headers: result.headers,
      response: result.data,
    });
  } catch (error) {
    return errorResponse(error, "SWIFT Messaging request failed.");
  }
}

export async function GET(req: NextRequest, ctx: RouteParams) {
  return handleSwiftProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  return handleSwiftProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteParams) {
  return handleSwiftProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteParams) {
  return handleSwiftProxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteParams) {
  return handleSwiftProxy(req, ctx);
}
