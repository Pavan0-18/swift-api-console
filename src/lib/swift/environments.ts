import { SwiftEnvironmentConfig, SwiftEnvironmentKey } from "@/types/swift";

export const SWIFT_ENVIRONMENTS: Record<SwiftEnvironmentKey, SwiftEnvironmentConfig> = {
  sandbox: {
    key: "sandbox",
    label: "Sandbox",
    baseUrl:
      process.env.SWIFT_SANDBOX_BASE_URL || "https://sandbox.swift.com/alliancecloud/v2",
    oauthTokenUrl:
      process.env.SWIFT_SANDBOX_OAUTH_URL || "https://sandbox.swift.com/oauth2/v1/token",
    enabled: true,
    description: "SWIFT Developer Sandbox environment for simulated testing and mock operations.",
    color: "emerald",
  },
  test: {
    key: "test",
    label: "Test / Pilot (SIPN)",
    baseUrl:
      process.env.SWIFT_TEST_BASE_URL ||
      "https://api-test.swiftnet.sipn.swift.com/alliancecloud-test/v2",
    oauthTokenUrl:
      process.env.SWIFT_TEST_OAUTH_URL ||
      "https://api-test.swiftnet.sipn.swift.com/oauth2/v1/token",
    enabled: true,
    description: "SWIFT Test environment connected to SIPN test network.",
    color: "amber",
  },
  production: {
    key: "production",
    label: "Production (Live)",
    baseUrl:
      process.env.SWIFT_PROD_BASE_URL ||
      "https://api.swiftnet.sipn.swift.com/alliancecloud/v2",
    oauthTokenUrl:
      process.env.SWIFT_PROD_OAUTH_URL ||
      "https://api.swiftnet.sipn.swift.com/oauth2/v1/token",
    // Production is strictly disabled by default
    enabled: process.env.ENABLE_SWIFT_PRODUCTION === "true",
    description: "Live SWIFT Alliance Cloud Production network. Restricted.",
    color: "rose",
  },
};

export function getEnvironmentConfig(env: SwiftEnvironmentKey): SwiftEnvironmentConfig {
  const config = SWIFT_ENVIRONMENTS[env];
  if (!config) {
    throw new Error(`Invalid SWIFT environment: "${env}". Allowed: sandbox, test, production`);
  }
  return config;
}

export function getActiveEnvironments(): SwiftEnvironmentConfig[] {
  return Object.values(SWIFT_ENVIRONMENTS).filter((e) => e.enabled);
}

export function isEnvironmentEnabled(env: SwiftEnvironmentKey): boolean {
  return SWIFT_ENVIRONMENTS[env]?.enabled ?? false;
}
