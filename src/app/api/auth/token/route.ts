import { NextRequest } from "next/server";
import { connectSwiftSchema } from "@/lib/validation/auth";
import { getAccessToken, DEFAULT_SWIFT_SCOPE } from "@/lib/swift/auth";
import { encryptSession, setSessionCookie } from "@/lib/swift/session";
import { successResponse, errorResponse } from "@/lib/api/response";
import { SwiftValidationError } from "@/lib/api/errors";
import { maskString } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      throw new SwiftValidationError("Request body is required and must be valid JSON.");
    }

    const validationResult = connectSwiftSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const issues = validationResult.error.flatten();
      const firstError = Object.values(issues.fieldErrors)[0]?.[0] || "Invalid credentials input.";
      throw new SwiftValidationError(firstError, issues);
    }

    const {
      environment,
      mode,
      consumerKey,
      consumerSecret,
      scope,
      subject,
      directToken,
      privateKeyPem,
      certificatePem,
    } = validationResult.data;

    let accessToken: string;
    let refreshToken: string | undefined;
    let tokenType = "Bearer";
    let expiresIn = 3600;
    let maskedKey = "direct_token";

    if (mode === "token" && directToken) {
      // Direct Bearer token provided by developer
      accessToken = directToken.trim().replace(/^Bearer\s+/i, "");
      maskedKey = maskString(accessToken, 6, 6);
      expiresIn = 3600 * 24;
    } else if (mode === "simulate") {
      // Simulated Sandbox Session for local UI testing
      accessToken = `simulated_swift_token_${environment}_${Date.now()}`;
      maskedKey = "simulated_key";
      expiresIn = 3600 * 12;
    } else {
      // Standard OAuth 2.0 JWT-Bearer assertion flow against SWIFT API Gateway
      const tokenResult = await getAccessToken({
        environment,
        consumerKey: consumerKey!,
        consumerSecret: consumerSecret!,
        scope,
        subject,
        privateKeyPem,
        certificatePem,
      });

      accessToken = tokenResult.access_token;
      refreshToken = tokenResult.refresh_token;
      tokenType = tokenResult.token_type || "Bearer";
      expiresIn = tokenResult.expires_in || 3600;
      maskedKey = maskString(consumerKey!, 4, 4);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = nowSeconds + expiresIn;

    // Create encrypted server session token
    const encryptedToken = await encryptSession({
      accessToken,
      refreshToken,
      tokenType,
      environment,
      consumerKeyMasked: maskedKey,
      expiresAt,
      connectedAt: nowSeconds,
    });

    // Set secure httpOnly cookie
    await setSessionCookie(encryptedToken, expiresIn);

    // Return connection summary
    return successResponse({
      connected: true,
      environment,
      consumerKeyMasked: maskedKey,
      expiresIn,
      expiresAt,
      connectedAt: nowSeconds,
      hasRefreshToken: Boolean(refreshToken),
    });
  } catch (error) {
    return errorResponse(error, "Failed to authenticate with SWIFT API Gateway.");
  }
}
