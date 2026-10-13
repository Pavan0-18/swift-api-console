import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import crypto from "crypto";

// Built-in SWIFT Sandbox dummy credentials
const BUILTIN_SANDBOX_DUMMY_CERT =
  "MIIDqTCCApGgAwIBAgIUAT3MDEXQcHr/CRS5/VEdlCvWmK4wDQYJKoZIhvcNAQEL" +
  "BQAwZDELMAkGA1UEBhMCR0IxDzANBgNVBAgMBkxvbmRvbjEPMA0GA1UEBwwGTG9u" +
  "ZG9uMQ0wCwYDVQQKDAREZW1vMSQwIgYDVQQDDBtkZW1vLXN3aWZ0LXNhbmRib3gt" +
  "Y29uc3VtZXIwHhcNMjUwMTI0MTExMTI1WhcNMzUwMTIyMTExMTI1WjBkMQswCQYD" +
  "VQQGEwJHQjEPMA0GA1UECAwGTG9uZG9uMQ8wDQYDVQQHDAZMb25kb24xDTALBgNV" +
  "BAoMBERlbW8xJDAiBgNVBAMMG2RlbW8tc3dpZnQtc2FuZGJveC1jb25zdW1lcjCC" +
  "ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAL2T+CrNSnO9cyjydVXFl+Fh" +
  "Ptw1tOLH7LPS2I6ghTAq8uiSi72QjnBBtLRs21ARGm+y0/8KPIq5InzJEzsmK+BN" +
  "RkvxC60gOeOeaX/5DvuiIPE8oLOKC6c48nXzRrOjRJf9G6DwyMB8TyJgLfOuyC4m" +
  "kG2cyhJBfwI5XXI8F9NreMNJndjwusPc+XPr5z/W99ibOwjWzaXEiGmq2F7ofKT7" +
  "spezsDCtdd30CxPboM0loEWsmqo9u4IUm1aB5+uJAEDJCm4cMQYo6tiTTVl/fBkF" +
  "U3foqUFcgjRV5wSSSIB3VS1xKm3xcP9olCblJk/t+7EjfQAwA7eLVJj85qEMC5EC" +
  "AwEAAaNTMFEwHQYDVR0OBBYEFIzooI+eOXfcp2hu3INDN3o77faTMB8GA1UdIwQY" +
  "MBaAFIzooI+eOXfcp2hu3INDN3o77faTMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZI" +
  "hvcNAQELBQADggEBAG3YgyvqMkG6RWCU2WHbVLZXb21UedCN6Aj5sW0HKsOxotZk" +
  "n2/0/PhU7qvauy6WUYAycoiWc60AjJ1z+69+9sjWIOOctvcuHrZ1LOHXWaocdyUC" +
  "0dkfkYrFsFX1MVgd8Hf7tSQdqVsS+4t6mmW9ZmSAPB8fXMX9uswItNXT9bvFDmMu" +
  "zDLvWDcOr5/Qs0IEAPC6LFiQCorH9jwmg3RlIMHimDQrhQ10VLT/1/wJM3aM06Lt" +
  "jmlvoX7pClDK3XMJrZiv3fp0SzruB2iMHCNoSZ1SXYeAE8XFXBKyf8a92l4ljsZK" +
  "7iGXp27wlxq2l8SOTcL/9n4KUjiEGF5hjhq+J04=";

const BUILTIN_SANDBOX_DUMMY_PRIVATE_KEY =
  "-----BEGIN RSA PRIVATE KEY-----\n" +
  "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC9k/gqzUpzvXMo\n" +
  "8nVVxZfhYT7cNbTix+yz0tiOoIUwKvLokou9kI5wQbS0bNtQERpvstP/CjyKuSJ8\n" +
  "yRM7JivgTUZL8QutIDnjnml/+Q77oiDxPKCzigunOPJ180azo0SX/Rug8MjAfE8i\n" +
  "YC3zrsguJpBtnMoSQX8COV1yPBfTa3jDSZ3Y8LrD3Plz6+c/1vfYmzsI1s2lxIhp\n" +
  "qthe6Hyk+7KXs7AwrXXd9AsT26DNJaBFrJqqPbuCFJtWgefriQBAyQpuHDEGKOrY\n" +
  "k01Zf3wZBVN36KlBXII0VecEkkiAd1UtcSpt8XD/aJQm5SZP7fuxI30AMAO3i1SY\n" +
  "/OahDAuRAgMBAAECggEBAIrwSj4cTMd8fkzxPVtKQGC2o5pCZjqaqXi1O290Z4iA\n" +
  "wZv/4xhgPHQ7Q5PEAAuzLTvVxRcyymIlAwiPWV/NPvTZzX5Uv+j3KFYQwGNBBmEX\n" +
  "VqtWcrSCpL2+t7wIOrXnH5uAreIK9iZUNK8N7D+exilErC8ZbONqSwo3Pqw9LH0O\n" +
  "EP0QnrdiXTcyLKoO4mOHKr0xKlKPL95GMBJv49qaaVu1YiDx7Oq5pZPkWfYS01yu\n" +
  "k2oomVsXbNUiOVmJXIriqUoSKsE6etFUm9AM2BjH1Kk0wOKsu5Jpc/fdkO6Tz644\n" +
  "uu7nIJp+oTyP1fYI0Y2aIcG5LJFL/2cNlefB0p9Hz5ECgYEA3b9rFiOvC+tMHr4r\n" +
  "rk2YFCOduiV9hAB7/7TjId8/ePYygAthjF+/sgL6cr18o5kdK/yFTlyMgprSb7Pl\n" +
  "4EqF86i62MJk8jSflJRoYfftqCN57n28Z/SKNCVkEG7o6Tpwji203zsTbjxeuXEn\n" +
  "e60qJn8SIGZ2OMvULEADS/4JMsUCgYEA2tx2TiUq+XYhnsjl80sFz2zClCrypHF1\n" +
  "47itLdvkfwVooEMerjgiPzPBXu6kUAmnx7imQNnoKceLmmWdojib4gUtXTl6n3oi\n" +
  "eCUXRHITopaTBWIjx3wSI5Uw7eF8ayHjO0Gqe9+PTkObEdvnccY3O9LKgoqeKgLW\n" +
  "KsltL6DD0l0CgYEA1yquVkU5zW775bjR2cghESmeGsnWCQgPSgfTfUKK7Gy4g9aH\n" +
  "SRZ/g9OwATYsgvJHhC77ixXyoahpGUqOfBzT7aKD62B1Yy/8yMdYofdY/BWwcuI+\n" +
  "twBqOj8t4WQ9TFIQdWWUZCeGqyiZIYfSsAdPJxuWEypY/LOLpYRXrp1Jf6ECgYEA\n" +
  "0ZqkXvDvuFwvlK+YsqneFap2q4p6OY1EN2SNzsayjgfzDNFbV8UA34DEqBNrIBAv\n" +
  "NHKeHqvS0fh+tc6t6kfG2u7UZF0BGCzTSDdVkkKilWsZwOUdmRY1FQj0BE6YZs3c\n" +
  "nsqj6ODRkUXkBHWTsf4AtfWJ5v20vk1bKT0hqaSRBi0CgYALldsijmjapH58psSe\n" +
  "7irTjE9fDYjlUtyHFSsV4DJ5q0EFN9uG9dLsXfoMY75mgAslE6/DdHuQkTf/DVe4\n" +
  "O2eCS3EYqa+TmxduF3VLeIqBanYpeyshy+T8hwRe2ofD2AV4igb4zkBZjWNXfaWL\n" +
  "SMSCfzhQD7I6I/VOqyd3cqZvEg==\n" +
  "-----END RSA PRIVATE KEY-----";

function base64Url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function generateSecureJti(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return res;
}

/**
 * Checks if an operation requires X-SWIFT-Signature non-repudiation header.
 */
function isSignatureOperation(method: string, subPath: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  const clean = subPath.replace(/^v[12]\//, "").replace(/^\//, "");
  return (
    clean === "fin/messages" ||
    clean === "fin/messages/batch" ||
    clean === "interact/messages" ||
    clean === "interact/messages/batch" ||
    clean === "fileact/transfers"
  );
}

/**
 * Generates X-SWIFT-Signature JWT for non-repudiation per Alliance Cloud Getting Started Guide.
 */
function generateSwiftSignature(
  bodyStr: string,
  subPath: string,
  host: string
): { signature: string; digest: string; aud: string; jti: string } {
  const cleanPath = subPath.startsWith("v2") || subPath.startsWith("v1") ? subPath : `v2/${subPath}`;
  const aud = `${host}/alliancecloud/${cleanPath}`;
  const digest = crypto.createHash("sha256").update(bodyStr || "").digest("base64");
  const currentTime = Date.now();
  const jti = generateSecureJti(12);

  const header = {
    alg: "RS256",
    typ: "JWT",
    x5c: [BUILTIN_SANDBOX_DUMMY_CERT],
  };

  const payload = {
    iat: Math.ceil(currentTime / 1000) - 1000,
    exp: Math.ceil((currentTime + 900 * 1000) / 1000),
    jti,
    sub: "CN=demo-swift-sandbox-consumer, O=Demo, L=London, S=London, C=GB",
    aud,
    digest,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const sig = signer.sign(BUILTIN_SANDBOX_DUMMY_PRIVATE_KEY);
  const signature = `${signingInput}.${base64Url(sig)}`;

  return { signature, digest, aud, jti };
}

/**
 * Local SWIFT API Dev Middleware:
 * Generates exact RS256 JWT-Bearer assertion, proxies token & messaging calls, and auto-signs X-SWIFT-Signature.
 */
function swiftDevServerPlugin(): Plugin {
  return {
    name: "swift-dev-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";

        // 1. Auth Token Route: POST /api/auth/token
        if (url.startsWith("/api/auth/token") && req.method === "POST") {
          let bodyStr = "";
          req.on("data", (chunk) => (bodyStr += chunk));
          req.on("end", async () => {
            try {
              const body = JSON.parse(bodyStr || "{}");
              const { consumerKey, consumerSecret, scope, environment = "sandbox" } = body;

              if (!consumerKey || !consumerSecret) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: false, error: { message: "Consumer Key and Secret are required" } }));
                return;
              }

              // Generate JWT Assertion matching Postman
              const currentTime = Date.now();
              const header = {
                typ: "JWT",
                alg: "RS256",
                x5c: [BUILTIN_SANDBOX_DUMMY_CERT],
              };
              const payload = {
                iss: consumerKey,
                aud: "sandbox.swift.com/oauth2/v1/token",
                sub: "CN=demo-swift-sandbox-consumer, O=Demo, L=London, S=London, C=GB",
                jti: generateSecureJti(12),
                exp: Math.ceil((currentTime + 900 * 1000) / 1000),
                iat: Math.ceil(currentTime / 1000) - 1000,
              };

              const encodedHeader = base64Url(JSON.stringify(header));
              const encodedPayload = base64Url(JSON.stringify(payload));
              const signingInput = `${encodedHeader}.${encodedPayload}`;

              const signer = crypto.createSign("RSA-SHA256");
              signer.update(signingInput);
              const signature = signer.sign(BUILTIN_SANDBOX_DUMMY_PRIVATE_KEY);
              const jwt = `${signingInput}.${base64Url(signature)}`;

              // Build URL-encoded form data
              const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
              const bodyParams = new URLSearchParams();
              bodyParams.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
              bodyParams.append("assertion", jwt);
              if (scope && scope.trim()) {
                bodyParams.append("scope", scope.trim());
              }

              const targetUrl = environment === "test"
                ? "https://api-test.swiftnet.sipn.swift.com/oauth2/v1/token"
                : environment === "live"
                ? "https://api.swiftnet.sipn.swift.com/oauth2/v1/token"
                : "https://sandbox.swift.com/oauth2/v1/token";

              const swiftRes = await fetch(targetUrl, {
                method: "POST",
                headers: {
                  Authorization: `Basic ${basicAuth}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                  Accept: "application/json",
                  "User-Agent": "PostmanRuntime/7.39.0",
                },
                body: bodyParams.toString(),
              });

              const swiftText = await swiftRes.text();
              let swiftJson: Record<string, unknown>;
              try {
                swiftJson = JSON.parse(swiftText);
              } catch {
                swiftJson = { error: "invalid_response", raw: swiftText };
              }

              res.statusCode = swiftRes.status;
              res.setHeader("Content-Type", "application/json");

              if (!swiftRes.ok) {
                res.end(
                  JSON.stringify({
                    success: false,
                    error: {
                      code: "SWIFT_AUTH_FAILED",
                      message: (swiftJson.error_description as string) || (swiftJson.message as string) || "Authentication failed",
                      status: swiftRes.status,
                      details: swiftJson,
                    },
                  })
                );
              } else {
                res.end(
                  JSON.stringify({
                    success: true,
                    data: {
                      connected: true,
                      accessToken: swiftJson.access_token,
                      refreshToken: swiftJson.refresh_token,
                      expiresIn: swiftJson.expires_in,
                      scope: swiftJson.scope,
                    },
                  })
                );
              }
            } catch (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: { message: (err as Error).message } }));
            }
          });
          return;
        }

        // 2. Messaging Proxy Route: /api/swift/*
        if (url.startsWith("/api/swift/")) {
          let bodyStr = "";
          req.on("data", (chunk) => (bodyStr += chunk));
          req.on("end", async () => {
            try {
              const subPath = url.replace(/^\/api\/swift\//, "");
              const authHeader = req.headers["authorization"] || "";
              const envHeader = (req.headers["x-swift-environment"] as string) || "sandbox";

              const host = envHeader === "test"
                ? "api-test.swiftnet.sipn.swift.com"
                : envHeader === "live"
                ? "api.swiftnet.sipn.swift.com"
                : "sandbox.swift.com";

              const targetBase = `https://${host}/alliancecloud`;
              const targetUrl = `${targetBase}/${subPath}`;

              const proxyHeaders: Record<string, string> = {
                Accept: req.headers["accept"] || "application/json",
              };
              if (req.headers["content-type"]) {
                proxyHeaders["Content-Type"] = req.headers["content-type"] as string;
              } else if (bodyStr) {
                proxyHeaders["Content-Type"] = "application/json";
              }

              if (authHeader) {
                proxyHeaders["Authorization"] = authHeader as string;
              }

              // Auto-generate X-SWIFT-Signature for the 5 signature-required operations
              let signatureMeta: Record<string, unknown> | null = null;
              if (req.method && isSignatureOperation(req.method, subPath)) {
                const sigData = generateSwiftSignature(bodyStr, subPath, host);
                proxyHeaders["X-SWIFT-Signature"] = sigData.signature;
                signatureMeta = {
                  attached: true,
                  digest: sigData.digest,
                  aud: sigData.aud,
                  jti: sigData.jti,
                };
              }

              const swiftRes = await fetch(targetUrl, {
                method: req.method || "GET",
                headers: proxyHeaders,
                body: ["POST", "PUT", "PATCH"].includes(req.method || "") && bodyStr ? bodyStr : undefined,
              });

              // Handle 204 No Content
              if (swiftRes.status === 204) {
                res.statusCode = 204;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, status: 204, data: { status: "acknowledged", message: "Operation completed successfully (HTTP 204 No Content)" } }));
                return;
              }

              const contentType = swiftRes.headers.get("content-type") || "";
              const resText = await swiftRes.text();
              let resJson: unknown;
              try {
                resJson = JSON.parse(resText);
              } catch {
                resJson = resText;
              }

              res.statusCode = swiftRes.status;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: swiftRes.ok,
                  status: swiftRes.status,
                  data: resJson,
                  signatureInfo: signatureMeta,
                  headers: {
                    contentType,
                  },
                })
              );
            } catch (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: { message: (err as Error).message } }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swiftDevServerPlugin()],
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
