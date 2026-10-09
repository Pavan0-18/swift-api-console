import { NextRequest, NextResponse } from "next/server";
import { generateSwiftJwtAssertion } from "@/lib/swift/jwt";
import { getEnvironmentConfig } from "@/lib/swift/environments";
import { SwiftEnvironmentKey } from "@/types/swift";

/**
 * DEV-ONLY debug route — shows exactly what the app sends to SWIFT and what SWIFT returns.
 * Only active when NODE_ENV !== "production".
 *
 * POST /api/auth/debug
 * Body: { environment, consumerKey, consumerSecret, scope?, subject?, privateKeyPem?, certificatePem? }
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    environment = "sandbox",
    consumerKey = "",
    consumerSecret = "",
    scope = "",
    subject,
    privateKeyPem,
    certificatePem,
  } = body as {
    environment: SwiftEnvironmentKey;
    consumerKey: string;
    consumerSecret: string;
    scope?: string;
    subject?: string;
    privateKeyPem?: string;
    certificatePem?: string;
  };

  const envConfig = getEnvironmentConfig(environment);
  const tokenUrl = envConfig.oauthTokenUrl;

  const serverUrl =
    environment === "sandbox"
      ? "https://sandbox.swift.com"
      : envConfig.baseUrl.replace(/\/alliancecloud.*$/i, "");

  const audience =
    environment === "sandbox"
      ? "sandbox.swift.com/oauth2/v1/token"
      : `${new URL(tokenUrl).host}/oauth2/v1/token`;

  // Generate JWT
  let jwtResult: Awaited<ReturnType<typeof generateSwiftJwtAssertion>> | null = null;
  let jwtError: string | null = null;

  try {
    jwtResult = await generateSwiftJwtAssertion({
      environment,
      consumerKey,
      serverUrl,
      audience,
      subject,
      privateKeyPem,
      certificatePem,
    });
  } catch (err) {
    jwtError = err instanceof Error ? err.message : String(err);
  }

  if (!jwtResult) {
    return NextResponse.json({
      stage: "jwt_generation",
      error: jwtError,
      tokenUrl,
      serverUrl,
      audience,
    });
  }

  // Build request to SWIFT
  const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const bodyParams = new URLSearchParams();
  bodyParams.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  bodyParams.append("assertion", jwtResult.jwt);
  if (scope && scope.trim() !== "") bodyParams.append("scope", scope.trim());

  const outboundHeaders: Record<string, string> = {
    Authorization: `Basic ${basicAuth}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    "User-Agent": "PostmanRuntime/7.39.0",
  };

  let upstreamStatus: number | null = null;
  let upstreamBody: unknown = null;
  let networkError: string | null = null;

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: outboundHeaders,
      body: bodyParams.toString(),
      cache: "no-store",
    });
    upstreamStatus = res.status;
    const text = await res.text();
    try {
      upstreamBody = JSON.parse(text);
    } catch {
      upstreamBody = text;
    }
  } catch (err) {
    networkError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    stage: "complete",
    tokenUrl,
    serverUrl,
    audience,
    outboundRequest: {
      method: "POST",
      url: tokenUrl,
      headers: {
        ...outboundHeaders,
        // Redact the actual Basic auth value
        Authorization: `Basic [base64(consumerKey:consumerSecret)]`,
      },
      bodyParams: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: "[JWT — see jwtDebug below]",
        scope,
      },
    },
    jwtDebug: {
      header: jwtResult.header,
      claims: jwtResult.claims,
      // Show the first/last 20 chars of the JWT for verification without exposing the full token
      jwtPreview: `${jwtResult.jwt.slice(0, 40)}...${jwtResult.jwt.slice(-20)}`,
    },
    upstreamResponse: {
      status: upstreamStatus,
      body: upstreamBody,
      networkError,
    },
  });
}
