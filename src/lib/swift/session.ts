import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { SwiftSessionData, SwiftSessionPublic } from "@/types/swift";

export const SESSION_COOKIE_NAME = "swift_session_token";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "swift-api-console-super-secure-session-secret-key-32bytes";
  // Ensure the key is at least 32 bytes for A256GCM
  const encoded = new TextEncoder().encode(secret.padEnd(32, "!").slice(0, 32));
  return encoded;
}

export async function encryptSession(data: SwiftSessionData): Promise<string> {
  const secretKey = getSecretKey();
  const jwt = await new EncryptJWT({ ...data })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(data.expiresAt)
    .encrypt(secretKey);

  return jwt;
}

export async function decryptSession(token: string): Promise<SwiftSessionData | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtDecrypt(token, secretKey);
    return {
      accessToken: payload.accessToken as string,
      tokenType: payload.tokenType as string,
      environment: payload.environment as SwiftSessionData["environment"],
      consumerKeyMasked: payload.consumerKeyMasked as string,
      expiresAt: Number(payload.expiresAt),
      connectedAt: Number(payload.connectedAt),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SwiftSessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await decryptSession(sessionCookie);
  if (!session) return null;

  // Check if expired
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt && session.expiresAt <= now) {
    return null;
  }

  return session;
}

export async function getPublicSession(): Promise<SwiftSessionPublic> {
  const session = await getSession();
  if (!session) {
    return { connected: false };
  }

  return {
    connected: true,
    environment: session.environment,
    consumerKeyMasked: session.consumerKeyMasked,
    expiresAt: session.expiresAt,
    connectedAt: session.connectedAt,
  };
}

export async function setSessionCookie(encryptedToken: string, maxAgeSeconds: number = 3600 * 8): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encryptedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
