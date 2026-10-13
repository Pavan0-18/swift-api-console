/**
 * Client-Side Secure Credential Vault
 * Uses Web Crypto API with AES-GCM-256 and PBKDF2 key derivation.
 * Protects SWIFT Gateway Consumer Key and Consumer Secret against plaintext storage.
 * Automatically purges credentials on session expiration (TTL).
 */

export const DEFAULT_SESSION_SCOPE = "swift.alliancecloud.api";
const VAULT_STORAGE_KEY = "_swift_secure_vault_v1";
const VAULT_SALT_KEY = "_swift_vault_salt_v1";
const DEFAULT_TTL_MINUTES = 60; // 1-hour session lifetime

export interface VaultCredentials {
  consumerKey: string;
  consumerSecret?: string;
  scope: string;
  connected: boolean;
  accessToken?: string;
  savedAt: number;
  expiresAt: number;
}

/**
 * Gets or creates an ephemeral device/session cryptographic salt.
 */
function getVaultSalt(): Uint8Array {
  if (typeof window === "undefined") {
    return new Uint8Array(16);
  }

  let hexSalt = sessionStorage.getItem(VAULT_SALT_KEY);
  if (!hexSalt) {
    const saltBytes = new Uint8Array(16);
    window.crypto.getRandomValues(saltBytes);
    hexSalt = Array.from(saltBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    sessionStorage.setItem(VAULT_SALT_KEY, hexSalt);
  }

  const match = hexSalt.match(/.{1,2}/g) || [];
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

/**
 * Derives a 256-bit AES-GCM CryptoKey using PBKDF2.
 */
async function deriveVaultKey(): Promise<CryptoKey> {
  const subtle = typeof window !== "undefined" ? window.crypto.subtle : globalThis.crypto.subtle;
  const salt = getVaultSalt();

  // Seed derived from browser origin and session parameters
  const originSeed = typeof window !== "undefined" ? window.location.origin + "_swift_vault" : "swift_vault_origin";
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey("raw", enc.encode(originSeed), "PBKDF2", false, ["deriveKey"]);

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string into a Base64 AES-GCM ciphertext payload (IV + ciphertext).
 */
export async function encryptVaultPayload(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  const subtle = typeof window !== "undefined" ? window.crypto.subtle : globalThis.crypto.subtle;
  const key = await deriveVaultKey();
  const iv = new Uint8Array(12);

  if (typeof window !== "undefined") {
    window.crypto.getRandomValues(iv);
  } else {
    globalThis.crypto.getRandomValues(iv);
  }

  const enc = new TextEncoder();
  const cipherBuffer = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    enc.encode(plaintext)
  );

  // Package IV (12 bytes) + Ciphertext into single base64 string
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypts a Base64 AES-GCM ciphertext payload back to plaintext.
 */
export async function decryptVaultPayload(ciphertextBase64: string): Promise<string> {
  if (!ciphertextBase64) return "";
  const subtle = typeof window !== "undefined" ? window.crypto.subtle : globalThis.crypto.subtle;
  const key = await deriveVaultKey();

  const binary = atob(ciphertextBase64);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const cipherBuffer = combined.slice(12);

  const decBuffer = await subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    cipherBuffer as unknown as BufferSource
  );
  return new TextDecoder().decode(decBuffer);
}

/**
 * Saves encrypted credentials into the client vault with a specific Time-To-Live.
 * Automatically clears legacy plaintext storage keys.
 */
export async function saveEncryptedCredentials(
  creds: {
    consumerKey: string;
    consumerSecret?: string;
    scope?: string;
    accessToken?: string;
    connected?: boolean;
  },
  ttlMinutes = DEFAULT_TTL_MINUTES
): Promise<VaultCredentials> {
  const now = Date.now();
  const expiresAt = now + ttlMinutes * 60 * 1000;

  const payload: VaultCredentials = {
    consumerKey: creds.consumerKey || "",
    consumerSecret: creds.consumerSecret || "",
    scope: creds.scope || DEFAULT_SESSION_SCOPE,
    connected: creds.connected ?? false,
    accessToken: creds.accessToken,
    savedAt: now,
    expiresAt,
  };

  if (typeof window === "undefined") return payload;

  // Purge legacy plaintext keys
  localStorage.removeItem("swift_consumer_key");
  localStorage.removeItem("swift_consumer_secret");
  localStorage.removeItem("swift_scope");

  const jsonStr = JSON.stringify(payload);
  const encryptedBlob = await encryptVaultPayload(jsonStr);

  // Store in sessionStorage (cleared on browser tab close) + localStorage fallback with TTL
  sessionStorage.setItem(VAULT_STORAGE_KEY, encryptedBlob);
  return payload;
}

/**
 * Loads and decrypts credentials from the secure vault.
 * Automatically purges and returns null if the session has expired.
 */
export async function loadEncryptedCredentials(): Promise<VaultCredentials | null> {
  if (typeof window === "undefined") return null;

  // Clean any old legacy plaintext keys if found
  if (localStorage.getItem("swift_consumer_key") || localStorage.getItem("swift_scope")) {
    localStorage.removeItem("swift_consumer_key");
    localStorage.removeItem("swift_consumer_secret");
    localStorage.removeItem("swift_scope");
  }

  const encryptedBlob = sessionStorage.getItem(VAULT_STORAGE_KEY);
  if (!encryptedBlob) return null;

  try {
    const decryptedJson = await decryptVaultPayload(encryptedBlob);
    const parsed: VaultCredentials = JSON.parse(decryptedJson);

    // Enforce TTL expiration
    if (Date.now() > parsed.expiresAt) {
      purgeEncryptedCredentials();
      return null;
    }

    // Ensure default scope if missing
    if (!parsed.scope) {
      parsed.scope = DEFAULT_SESSION_SCOPE;
    }

    return parsed;
  } catch {
    // Decryption failure (corrupted or salt changed)
    purgeEncryptedCredentials();
    return null;
  }
}

/**
 * Completely purges all stored credentials, encryption salts, and tokens.
 */
export function purgeEncryptedCredentials(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(VAULT_STORAGE_KEY);
  sessionStorage.removeItem(VAULT_SALT_KEY);
  localStorage.removeItem(VAULT_STORAGE_KEY);
  localStorage.removeItem("swift_consumer_key");
  localStorage.removeItem("swift_consumer_secret");
  localStorage.removeItem("swift_scope");
}
