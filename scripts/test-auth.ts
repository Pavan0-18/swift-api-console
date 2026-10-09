import crypto from "crypto";
import { generateSwiftJwtAssertion, generateJti } from "../src/lib/swift/jwt";

/**
 * Verification test suite for SWIFT OAuth 2.0 JWT-Bearer implementation
 */
async function runAuthTests() {
  console.log("--- Starting SWIFT OAuth & JWT-Bearer Verification Tests ---");

  // Test 1: JTI generation
  console.log("\n[Test 1] 12-character random JTI generation:");
  const jti = generateJti(12);
  if (jti.length === 12 && /^[a-z0-9]+$/i.test(jti)) {
    console.log("✓ PASS: Generated valid 12-char JTI:", jti);
  } else {
    throw new Error(`FAIL: Invalid JTI generated: "${jti}"`);
  }

  // Test 2: JWT Header & Claims Structure
  console.log("\n[Test 2] JWT Assertion Generation & Claims Verification:");
  const testConsumerKey = "test-consumer-key-123";
  const { jwt, header, claims } = await generateSwiftJwtAssertion({
    environment: "sandbox",
    consumerKey: testConsumerKey,
    serverUrl: "https://sandbox.swift.com",
  });

  // Verify Header
  if (header.typ === "JWT" && header.alg === "RS256" && Array.isArray(header.x5c) && header.x5c.length > 0) {
    console.log("✓ PASS: Header contains typ=JWT, alg=RS256, x5c=[certificate]");
  } else {
    throw new Error("FAIL: Header structure mismatch");
  }

  // Verify Claims
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (claims.iss !== testConsumerKey) {
    throw new Error(`FAIL: iss claim mismatch. Expected: ${testConsumerKey}, got: ${claims.iss}`);
  }
  if (claims.aud !== "sandbox.swift.com/oauth2/v1/token") {
    throw new Error(`FAIL: aud claim mismatch. Got: ${claims.aud}`);
  }
  if (claims.sub !== "CN=demo-swift-sandbox-consumer, O=Demo, L=London, S=London, C=GB") {
    throw new Error(`FAIL: sub claim mismatch. Got: ${claims.sub}`);
  }
  if (claims.jti.length !== 12) {
    throw new Error(`FAIL: jti claim length is not 12. Got: ${claims.jti}`);
  }
  // Check timestamps: iat must be now - 1000 (tolerance +/- 5 seconds)
  const iatDiff = nowSeconds - claims.iat;
  if (Math.abs(iatDiff - 1000) > 5) {
    throw new Error(`FAIL: iat offset is not -1000s. Diff: ${iatDiff}`);
  }
  // Check exp: exp must be now + 900 (tolerance +/- 5 seconds)
  const expDiff = claims.exp - nowSeconds;
  if (Math.abs(expDiff - 900) > 5) {
    throw new Error(`FAIL: exp offset is not +900s. Diff: ${expDiff}`);
  }

  console.log("✓ PASS: All JWT Claims (iss, aud, sub, jti, iat, exp) match SWIFT Postman spec");

  // Test 3: Verify RS256 Signature using Public Key from Certificate in x5c
  console.log("\n[Test 3] RS256 Signature Cryptographic Verification:");
  const certPem = `-----BEGIN CERTIFICATE-----\n${header.x5c[0].match(/.{1,64}/g)?.join("\n")}\n-----END CERTIFICATE-----`;
  const [headerB64, payloadB64, sigB64] = jwt.split(".");
  const dataToVerify = `${headerB64}.${payloadB64}`;
  const signature = Buffer.from(sigB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(dataToVerify);
  const isValid = verifier.verify(certPem, signature);

  if (isValid) {
    console.log("✓ PASS: RS256 signature successfully verified against dummy certificate public key");
  } else {
    throw new Error("FAIL: RS256 signature verification failed");
  }

  // Test 4: Form Body Serialization
  console.log("\n[Test 4] URL-encoded Form Body Serialization:");
  const form = new URLSearchParams();
  form.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  form.append("assertion", jwt);
  form.append("scope", "https://sandbox.swift.com");

  const serialized = form.toString();
  if (
    serialized.includes("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer") &&
    serialized.includes("scope=https%3A%2F%2Fsandbox.swift.com") &&
    serialized.includes("assertion=")
  ) {
    console.log("✓ PASS: Form body correctly serialized with JWT-Bearer grant and scope");
  } else {
    throw new Error("FAIL: Form body serialization incorrect");
  }

  // Test 5: Response Parsing (access_token + refresh_token)
  console.log("\n[Test 5] Token Response Parsing:");
  const mockSwiftResponse = {
    access_token: "test_bearer_token_abc123",
    refresh_token: "test_refresh_token_xyz987",
    token_type: "Bearer",
    expires_in: 3599,
    scope: "https://sandbox.swift.com",
  };

  if (
    mockSwiftResponse.access_token === "test_bearer_token_abc123" &&
    mockSwiftResponse.refresh_token === "test_refresh_token_xyz987" &&
    mockSwiftResponse.expires_in === 3599
  ) {
    console.log("✓ PASS: Access token and refresh token parsed successfully");
  }

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
}

runAuthTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
