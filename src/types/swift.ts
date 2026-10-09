export type SwiftEnvironmentKey = "sandbox" | "test" | "production";

export interface SwiftEnvironmentConfig {
  key: SwiftEnvironmentKey;
  label: string;
  baseUrl: string;
  oauthTokenUrl: string;
  enabled: boolean;
  description: string;
  color: string;
}

export interface SwiftCredentials {
  environment: SwiftEnvironmentKey;
  consumerKey: string;
  consumerSecret: string;
  scope?: string;
  subject?: string;
  privateKeyPem?: string;
  certificatePem?: string;
}

export interface SwiftTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  jti?: string;
}

export interface SwiftSessionData {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  environment: SwiftEnvironmentKey;
  consumerKeyMasked: string;
  expiresAt: number;
  connectedAt: number;
}

export interface SwiftSessionPublic {
  connected: boolean;
  environment?: SwiftEnvironmentKey;
  consumerKeyMasked?: string;
  expiresAt?: number;
  connectedAt?: number;
}

export interface SwiftApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | string | unknown[];
  status?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: SwiftApiError;
  timestamp: string;
}
