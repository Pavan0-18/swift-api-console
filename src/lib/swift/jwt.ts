import crypto from "crypto";
import { SwiftEnvironmentKey } from "@/types/swift";
import { SwiftConfigError, SwiftUpstreamError } from "@/lib/api/errors";

export interface GenerateJwtOptions {
  environment: SwiftEnvironmentKey;
  consumerKey: string;
  serverUrl?: string;
  audience?: string;
  subject?: string;
  privateKeyPem?: string;
  certificatePem?: string;
}

export interface GeneratedAssertionResult {
  jwt: string;
  header: {
    typ: string;
    alg: string;
    x5c: string[];
  };
  claims: {
    iss: string;
    aud: string;
    sub: string;
    jti: string;
    iat: number;
    exp: number;
  };
}

// In-memory cache for sandbox certificates/keys to avoid re-fetching on every request
let cachedSandboxKey: string | null = null;
let cachedSandboxCertClean: string | null = null;

function base64Url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function generateJti(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

// Built-in SWIFT Sandbox dummy signing certificate and private key (selfsigned dummy secret)
export const BUILTIN_SANDBOX_DUMMY_CERT =
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

export const BUILTIN_SANDBOX_DUMMY_PRIVATE_KEY =
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

/**
 * Normalizes PEM private key formatting
 */
export function formatPrivateKeyPem(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.includes("-----BEGIN")) {
    return trimmed;
  }
  // If raw base64, wrap as RSA private key
  const chunks = trimmed.match(/.{1,64}/g)?.join("\n") || trimmed;
  return `-----BEGIN RSA PRIVATE KEY-----\n${chunks}\n-----END RSA PRIVATE KEY-----`;
}

/**
 * Cleans certificate PEM to raw base64 string without headers or whitespace for x5c header
 */
export function cleanCertificateForX5c(rawCert: string): string {
  return rawCert.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g, "");
}

/**
 * Fetch or retrieve the sandbox self-signed dummy private key and certificate
 */
export async function getSandboxSigningCredentials(serverBase = "https://sandbox.swift.com"): Promise<{
  privateKeyPem: string;
  certClean: string;
}> {
  if (cachedSandboxKey && cachedSandboxCertClean) {
    return {
      privateKeyPem: cachedSandboxKey,
      certClean: cachedSandboxCertClean,
    };
  }

  // Attempt live fetch if possible, with immediate fallback to built-in constants
  try {
    const [keyRes, certRes] = await Promise.all([
      fetch(`${serverBase}/sandbox-selfsigned-dummy-secret/privatekey2`, { cache: "no-store", signal: AbortSignal.timeout(3000) }),
      fetch(`${serverBase}/sandbox-selfsigned-dummy-secret/certificate2`, { cache: "no-store", signal: AbortSignal.timeout(3000) }),
    ]);

    if (keyRes.ok && certRes.ok) {
      const rawKey = await keyRes.text();
      const rawCert = await certRes.text();
      cachedSandboxKey = formatPrivateKeyPem(rawKey);
      cachedSandboxCertClean = cleanCertificateForX5c(rawCert);
      return {
        privateKeyPem: cachedSandboxKey,
        certClean: cachedSandboxCertClean,
      };
    }
  } catch {
    // Fall back silently to built-in certified keys
  }

  cachedSandboxKey = BUILTIN_SANDBOX_DUMMY_PRIVATE_KEY;
  cachedSandboxCertClean = BUILTIN_SANDBOX_DUMMY_CERT;

  return {
    privateKeyPem: cachedSandboxKey,
    certClean: cachedSandboxCertClean,
  };
}

/**
 * Generates and signs the SWIFT OAuth 2.0 JWT Bearer assertion matching Postman reference script
 */
export async function generateSwiftJwtAssertion({
  environment,
  consumerKey,
  serverUrl = "https://sandbox.swift.com",
  audience,
  subject,
  privateKeyPem,
  certificatePem,
}: GenerateJwtOptions): Promise<GeneratedAssertionResult> {
  let signingKey: string;
  let certClean: string;

  if (privateKeyPem && certificatePem) {
    signingKey = formatPrivateKeyPem(privateKeyPem);
    certClean = cleanCertificateForX5c(certificatePem);
  } else if (environment === "sandbox") {
    const creds = await getSandboxSigningCredentials(serverUrl);
    signingKey = creds.privateKeyPem;
    certClean = creds.certClean;
  } else {
    // For Test / SIPN or Production, if no custom key is provided, check environment variables
    const envKey = process.env.SWIFT_TEST_PRIVATE_KEY;
    const envCert = process.env.SWIFT_TEST_CERTIFICATE;
    if (envKey && envCert) {
      signingKey = formatPrivateKeyPem(envKey);
      certClean = cleanCertificateForX5c(envCert);
    } else {
      throw new SwiftConfigError(
        `Signing certificate and private key are required for environment "${environment}".`
      );
    }
  }

  const header = {
    typ: "JWT",
    alg: "RS256",
    x5c: [certClean],
  };

  const currentTime = Date.now();
  const aud = audience || (environment === "sandbox" ? "sandbox.swift.com/oauth2/v1/token" : "api-test.swiftnet.sipn.swift.com/oauth2/v1/token");
  const sub = subject || (environment === "sandbox" ? "CN=demo-swift-sandbox-consumer, O=Demo, L=London, S=London, C=GB" : "CN=demo-swift-test-consumer, O=Demo, L=London, S=London, C=GB");

  const claims = {
    iss: consumerKey,
    aud,
    sub,
    jti: generateJti(12),
    exp: Math.ceil((currentTime + 900 * 1000) / 1000),
    iat: Math.ceil(currentTime / 1000) - 1000,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(signingKey);
  const encodedSignature = base64Url(signature);

  const jwt = `${signingInput}.${encodedSignature}`;

  return {
    jwt,
    header,
    claims,
  };
}
