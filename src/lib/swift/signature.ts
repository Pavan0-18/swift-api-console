export interface SignatureGenerationOptions {
  bodyString: string;
  path: string; // e.g. "/v2/fin/messages" or "v2/fin/messages"
  environment?: "sandbox" | "test" | "live";
  customCert?: string;
  customPrivateKey?: string;
  subjectDn?: string;
}

export interface SignatureResult {
  signatureJwt: string;
  digest: string;
  audience: string;
  jti: string;
  iat: number;
  exp: number;
  header: Record<string, unknown>;
  claims: Record<string, unknown>;
}

function base64Url(input: string | Uint8Array): string {
  let base64: string;
  if (typeof input === "string") {
    base64 = btoa(unescape(encodeURIComponent(input)));
  } else {
    let binary = "";
    const len = input.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(input[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function generateRandomJti(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return res;
}

/**
 * Calculates Base64 SHA-256 digest of payload string per SWIFT Getting Started guide.
 */
export async function calculateSha256Digest(payloadString: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadString || "");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const binaryString = String.fromCharCode(...hashArray);
  return btoa(binaryString);
}

/**
 * Normalizes the audience URL without the scheme.
 */
export function formatAudienceUrl(path: string, environment: "sandbox" | "test" | "live" = "sandbox"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const fullPath = cleanPath.startsWith("/v2") || cleanPath.startsWith("/v1") ? cleanPath : `/v2${cleanPath}`;

  switch (environment) {
    case "test":
      return `api-test.swiftnet.sipn.swift.com/alliancecloud${fullPath}`;
    case "live":
      return `api.swiftnet.sipn.swift.com/alliancecloud${fullPath}`;
    case "sandbox":
    default:
      return `sandbox.swift.com/alliancecloud${fullPath}`;
  }
}

/**
 * Checks if a given HTTP method and path requires X-SWIFT-Signature non-repudiation header.
 */
export function isSignatureRequired(method: string, path: string): boolean {
  const m = method.toUpperCase();
  if (m !== "POST") return false;

  const normalized = path.replace(/^\/alliancecloud/, "").replace(/^\/v[12]/, "");
  return (
    normalized === "/fin/messages" ||
    normalized === "/fin/messages/batch" ||
    normalized === "/interact/messages" ||
    normalized === "/interact/messages/batch" ||
    normalized === "/fileact/transfers"
  );
}
