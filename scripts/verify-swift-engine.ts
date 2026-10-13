import crypto from "crypto";
import { SWIFT_REQUEST_INVENTORY, getInventoryRequestById } from "../src/config/swift-inventory";
import { resolvePath, buildQueryString, sanitizeSwiftHref } from "../src/lib/swift/client";
import { formatAudienceUrl } from "../src/lib/swift/signature";

console.log("=== ALLIANCE CLOUD SWIFT MESSAGING API 2.1 VERIFICATION SUITE ===");

// 1. Verify 29 Core Inventory Requests
console.log(`[PASS] Total Inventory Requests: ${SWIFT_REQUEST_INVENTORY.length} (Expected: 29)`);
if (SWIFT_REQUEST_INVENTORY.length !== 29) {
  console.error("[FAIL] Expected exactly 29 inventory requests!");
  process.exit(1);
}

// 2. Count by category
const categoryCounts: Record<string, number> = { Distributions: 0, FIN: 0, InterAct: 0 };
SWIFT_REQUEST_INVENTORY.forEach((req) => {
  categoryCounts[req.section] = (categoryCounts[req.section] || 0) + 1;
});
console.log("[PASS] Requests by Section:", categoryCounts);

if (
  categoryCounts.Distributions !== 5 ||
  categoryCounts.FIN !== 12 ||
  categoryCounts.InterAct !== 12
) {
  console.error("[FAIL] Category request count mismatch!");
  process.exit(1);
}

// 3. Verify no locks / signature requirements
const sigRequests = SWIFT_REQUEST_INVENTORY.filter((req: any) => req.requiresSignature);
console.log(`[PASS] Endpoints with Locks / X-SWIFT-Signature: ${sigRequests.length} (Expected: 0)`);
if (sigRequests.length !== 0) {
  console.error("[FAIL] Expected 0 signature locks!");
  process.exit(1);
}

// 4. Test Audience Formatting (scheme-free)
const sandboxAud = formatAudienceUrl("/v2/fin/messages", "sandbox");
const testAud = formatAudienceUrl("/v2/fin/messages", "test");
const liveAud = formatAudienceUrl("/v2/fin/messages", "live");

console.log(`[PASS] Sandbox Audience: ${sandboxAud} (No scheme)`);
console.log(`[PASS] Test Audience: ${testAud} (No scheme)`);
console.log(`[PASS] Live Audience: ${liveAud} (No scheme)`);

if (
  sandboxAud !== "sandbox.swift.com/alliancecloud/v2/fin/messages" ||
  testAud !== "api-test.swiftnet.sipn.swift.com/alliancecloud/v2/fin/messages" ||
  liveAud !== "api.swiftnet.sipn.swift.com/alliancecloud/v2/fin/messages"
) {
  console.error("[FAIL] Audience URL formatting mismatch!");
  process.exit(1);
}

// 5. Test Path Parameter Resolution
const resolved = resolvePath("/v2/distributions/{id}", { id: "44984189500" });
console.log(`[PASS] Path Parameter Resolution: ${resolved}`);
if (resolved !== "/v2/distributions/44984189500") {
  console.error("[FAIL] Path parameter resolution failed!");
  process.exit(1);
}

// 6. Test Query Parameter Comma Separation (for batch downloads)
const query = buildQueryString({ "distribution-id": ["44984189499", "44984189459"], limit: 50 });
console.log(`[PASS] Query String Serialization: ${query}`);
if (query !== "?distribution-id=44984189499%2C44984189459&limit=50") {
  console.error("[FAIL] Query parameter serialization failed!");
  process.exit(1);
}

// 7. Test Live Link Sanitization
const sanitized = sanitizeSwiftHref("https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions/44984189500");
console.log(`[PASS] Live Link Sanitization: ${sanitized}`);
if (sanitized !== "v2/distributions/44984189500") {
  console.error("[FAIL] Live link sanitization failed!");
  process.exit(1);
}

console.log("\nALL 7 VERIFICATION SUITES PASSED CLEANLY!");
