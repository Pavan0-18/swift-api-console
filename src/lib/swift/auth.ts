import { getEnvironmentConfig, isEnvironmentEnabled } from "./environments";
import { SwiftCredentials, SwiftTokenResponse } from "@/types/swift";
import { SwiftAuthError, SwiftConfigError, SwiftUpstreamError, sanitizeLogData } from "@/lib/api/errors";
import { generateSwiftJwtAssertion } from "./jwt";

export interface GetAccessTokenOptions extends SwiftCredentials {
  scope?: string;
  serverUrl?: string;
}

export const DEFAULT_SWIFT_SCOPE = "";

/**
 * Authenticate with SWIFT API Gateway using OAuth 2.0 JWT Bearer flow (RFC 7523),
 * matching the exact Postman reference script.
 */
export async function getAccessToken({
  environment,
  consumerKey,
  consumerSecret,
  scope,
  subject,
  privateKeyPem,
  certificatePem,
  serverUrl,
}: GetAccessTokenOptions): Promise<SwiftTokenResponse> {
  if (!isEnvironmentEnabled(environment)) {
    throw new SwiftConfigError(
      `Environment "${environment}" is currently disabled or restricted in configuration.`
    );
  }

  const envConfig = getEnvironmentConfig(environment);
  const tokenUrl = envConfig.oauthTokenUrl;

  if (!tokenUrl) {
    throw new SwiftConfigError(`No OAuth Token URL configured for environment "${environment}".`);
  }

  // Derive base server URL and audience according to environment
  const targetServerUrl =
    serverUrl ||
    (environment === "sandbox"
      ? "https://sandbox.swift.com"
      : envConfig.baseUrl.replace(/\/alliancecloud.*$/i, ""));

  const audience =
    environment === "sandbox"
      ? "sandbox.swift.com/oauth2/v1/token"
      : `${new URL(tokenUrl).host}/oauth2/v1/token`;

  // 1. Generate and sign the RS256 JWT assertion with x5c header
  const { jwt } = await generateSwiftJwtAssertion({
    environment,
    consumerKey,
    serverUrl: targetServerUrl,
    audience,
    subject,
    privateKeyPem,
    certificatePem,
  });

  // 2. Prepare HTTP Basic Auth header
  const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  // 3. Prepare URL-encoded form body
  const bodyParams = new URLSearchParams();
  bodyParams.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  bodyParams.append("assertion", jwt);
  if (scope && scope.trim() !== "") {
    bodyParams.append("scope", scope.trim());
  }

  // 4. Execute outbound token request
  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "PostmanRuntime/7.39.0",
      },
      body: bodyParams.toString(),
      cache: "no-store",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Network failure connecting to SWIFT OAuth";
    throw new SwiftUpstreamError(`Failed to reach SWIFT OAuth Gateway at ${tokenUrl}: ${errorMsg}`, 502);
  }

  const responseText = await response.text();
  let responseData: Record<string, unknown>;

  try {
    responseData = JSON.parse(responseText);
  } catch {
    throw new SwiftUpstreamError(
      `SWIFT OAuth Gateway returned invalid non-JSON response (HTTP ${response.status}).`,
      response.status
    );
  }

  if (!response.ok) {
    // Log upstream status and sanitized error safely on server
    console.error(`[SWIFT OAuth Error] HTTP ${response.status}:`, sanitizeLogData(responseData));

    const errorMessage =
      (responseData.error_description as string) ||
      (responseData.message as string) ||
      (responseData.error as string) ||
      `SWIFT OAuth rejected credentials with HTTP ${response.status}`;

    throw new SwiftAuthError(errorMessage, {
      status: response.status,
      swiftError: responseData.error || "unauthorized",
      details: responseData.error_description || undefined,
    });
  }

  if (!responseData.access_token || typeof responseData.access_token !== "string") {
    throw new SwiftAuthError("SWIFT OAuth response did not contain a valid access_token.");
  }

  return {
    access_token: responseData.access_token,
    refresh_token: (responseData.refresh_token as string) || undefined,
    token_type: (responseData.token_type as string) || "Bearer",
    expires_in: typeof responseData.expires_in === "number" ? responseData.expires_in : 3600,
    scope: (responseData.scope as string) || scope,
    jti: (responseData.jti as string) || undefined,
  };
}
