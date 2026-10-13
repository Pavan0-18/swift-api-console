/**
 * SWIFT Payload Converter & Decoder Utility
 * Handles RFC 4648 Base64 decoding, SWIFT MT Block 4 tag parsing,
 * ISO 20022 XML indentation, and format detection.
 */

export interface SwiftMtField {
  tag: string;
  label: string;
  value: string;
}

export interface ConvertedPayload {
  isBase64: boolean;
  raw: string;
  decoded: string;
  formattedText: string;
  format: "swift-mt" | "xml" | "json" | "binary" | "text";
  byteSize: number;
  mtFields?: SwiftMtField[];
  xmlRoot?: string;
  xmlNamespace?: string;
}

// Standard SWIFT MT Tag Definitions
const SWIFT_MT_TAG_LABELS: Record<string, string> = {
  ":20:": "Sender's Reference",
  ":21:": "Related Reference",
  ":23B:": "Bank Operation Code",
  ":23E:": "Instruction Code",
  ":25:": "Account Identification",
  ":28D:": "Message Index / Total",
  ":30:": "Execution Date",
  ":32A:": "Value Date, Currency, Amount",
  ":32B:": "Currency Code & Amount",
  ":33B:": "Instructed Amount",
  ":36:": "Exchange Rate",
  ":50A:": "Ordering Customer (BIC)",
  ":50F:": "Ordering Customer (Name & Address)",
  ":50K:": "Ordering Customer (Account)",
  ":50L:": "Ordering Customer Identifier",
  ":50H:": "Ordering Customer Party Identifier",
  ":51A:": "Sending Institution",
  ":52A:": "Ordering Institution (BIC)",
  ":52D:": "Ordering Institution (Name & Address)",
  ":53A:": "Sender's Correspondent (BIC)",
  ":53B:": "Sender's Correspondent (Location)",
  ":53D:": "Sender's Correspondent (Name & Address)",
  ":54A:": "Receiver's Correspondent (BIC)",
  ":54B:": "Receiver's Correspondent (Location)",
  ":54D:": "Receiver's Correspondent (Name & Address)",
  ":56A:": "Intermediary Institution (BIC)",
  ":56D:": "Intermediary Institution (Name & Address)",
  ":57A:": "Account With Institution (BIC)",
  ":57D:": "Account With Institution (Name & Address)",
  ":58A:": "Beneficiary Institution",
  ":59:": "Beneficiary Customer (Name & Address)",
  ":59A:": "Beneficiary Customer (BIC)",
  ":59F:": "Beneficiary Customer (Structured)",
  ":70:": "Remittance Information",
  ":71A:": "Details of Charges",
  ":71F:": "Sender's Charges",
  ":71G:": "Receiver's Charges",
  ":72:": "Sender to Receiver Information",
  ":77A:": "Regulatory Reporting",
  ":77B:": "Regulatory Reporting",
};

/**
 * Safely decodes a Base64 string in both browser and node environments.
 */
export function safeBase64Decode(str: string): string {
  if (!str) return "";
  const cleaned = str.trim().replace(/\s+/g, "");

  try {
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const binary = window.atob(cleaned);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder("utf-8").decode(bytes);
    } else {
      return Buffer.from(cleaned, "base64").toString("utf-8");
    }
  } catch {
    try {
      if (typeof window !== "undefined" && typeof window.atob === "function") {
        return window.atob(cleaned);
      }
      return Buffer.from(cleaned, "base64").toString("ascii");
    } catch {
      return str;
    }
  }
}

/**
 * Checks if a string appears to be Base64 encoded.
 */
export function isLikelyBase64(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  const clean = str.trim().replace(/\s+/g, "");
  if (clean.length < 8) return false;
  // Must match Base64 character set and padding
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Regex.test(clean)) return false;

  // Additional sanity check: if it starts with plaintext tags like '<', '{', ':', it's not base64
  if (clean.startsWith("<") || clean.startsWith("{") || clean.startsWith(":")) return false;

  return true;
}

/**
 * Pretty prints an XML string with clean 2-space indentation.
 */
export function formatXml(xml: string): string {
  if (!xml) return "";
  try {
    let formatted = "";
    let indent = 0;
    const tab = "  ";

    const parts = xml.replace(/>\s*</g, "><").split(/(<[^>]+>)/g).filter(Boolean);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("</")) {
        // Closing tag
        indent = Math.max(0, indent - 1);
        formatted += tab.repeat(indent) + trimmed + "\n";
      } else if (trimmed.startsWith("<") && trimmed.endsWith("/>")) {
        // Self-closing tag
        formatted += tab.repeat(indent) + trimmed + "\n";
      } else if (trimmed.startsWith("<?") || trimmed.startsWith("<!")) {
        // Declaration / Comment
        formatted += tab.repeat(indent) + trimmed + "\n";
      } else if (trimmed.startsWith("<")) {
        // Opening tag
        formatted += tab.repeat(indent) + trimmed + "\n";
        indent++;
      } else {
        // Text node - attach inline to previous opening line if possible, or print
        const lines = formatted.split("\n");
        if (lines.length > 1 && lines[lines.length - 2].endsWith(">") && !lines[lines.length - 2].includes("</")) {
          // Merge text with tag
          lines[lines.length - 2] += trimmed;
          formatted = lines.join("\n");
        } else {
          formatted += tab.repeat(indent) + trimmed + "\n";
        }
      }
    }

    return formatted.trim();
  } catch {
    return xml;
  }
}

/**
 * Parses SWIFT MT Block 4 text into structured fields.
 */
export function parseSwiftMtFields(mtText: string): SwiftMtField[] {
  if (!mtText) return [];
  const fields: SwiftMtField[] = [];
  const lines = mtText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  let currentTag: string | null = null;
  let currentValue: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(:[0-9]{2}[A-Z]?:)(.*)$/);
    if (match) {
      if (currentTag) {
        const fullTag = currentTag;
        const label = SWIFT_MT_TAG_LABELS[fullTag] || `Field ${fullTag.replace(/:/g, "")}`;
        fields.push({
          tag: fullTag,
          label,
          value: currentValue.join("\n").trim(),
        });
      }
      currentTag = match[1];
      currentValue = [match[2]];
    } else if (currentTag) {
      currentValue.push(line);
    }
  }

  if (currentTag) {
    const label = SWIFT_MT_TAG_LABELS[currentTag] || `Field ${currentTag.replace(/:/g, "")}`;
    fields.push({
      tag: currentTag,
      label,
      value: currentValue.join("\n").trim(),
    });
  }

  return fields;
}

/**
 * Extracts root element and namespace from an XML string.
 */
function extractXmlMeta(xml: string): { root?: string; namespace?: string } {
  const rootMatch = xml.match(/<([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]+)[\s>]/);
  const root = rootMatch ? rootMatch[1] : undefined;

  const nsMatch = xml.match(/xmlns(?::[a-zA-Z0-9_-]+)?=["']([^"']+)["']/);
  const namespace = nsMatch ? nsMatch[1] : undefined;

  return { root, namespace };
}

/**
 * Automatically decodes and converts any SWIFT message or report payload.
 */
export function convertSwiftPayload(input: unknown): ConvertedPayload | null {
  if (!input) return null;

  const str = typeof input === "string" ? input : JSON.stringify(input);
  const rawClean = str.trim();
  const byteSize = new Blob([rawClean]).size;

  let decodedText = rawClean;
  let isBase64 = false;

  if (isLikelyBase64(rawClean)) {
    const candidate = safeBase64Decode(rawClean);
    // Verify candidate is human-readable (not empty or full of null characters)
    if (candidate && candidate !== rawClean && !/[\x00-\x08\x0E-\x1F]{3,}/.test(candidate)) {
      decodedText = candidate;
      isBase64 = true;
    }
  }

  const trimmedDecoded = decodedText.trim();

  // 1. Check for XML (ISO 20022 / InterAct)
  if (
    trimmedDecoded.startsWith("<") &&
    (trimmedDecoded.includes("</") || trimmedDecoded.endsWith("/>") || trimmedDecoded.includes("xmlns"))
  ) {
    const formatted = formatXml(trimmedDecoded);
    const meta = extractXmlMeta(trimmedDecoded);
    return {
      isBase64,
      raw: rawClean,
      decoded: trimmedDecoded,
      formattedText: formatted,
      format: "xml",
      byteSize,
      xmlRoot: meta.root,
      xmlNamespace: meta.namespace,
    };
  }

  // 2. Check for SWIFT MT Block 4 (e.g. :20:, :28D:, :32A:)
  if (/:\d{2}[A-Z]?:/.test(trimmedDecoded)) {
    const mtFields = parseSwiftMtFields(trimmedDecoded);
    return {
      isBase64,
      raw: rawClean,
      decoded: trimmedDecoded,
      formattedText: trimmedDecoded.replace(/\r\n/g, "\n"),
      format: "swift-mt",
      byteSize,
      mtFields,
    };
  }

  // 3. Check for JSON
  if (
    (trimmedDecoded.startsWith("{") && trimmedDecoded.endsWith("}")) ||
    (trimmedDecoded.startsWith("[") && trimmedDecoded.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmedDecoded);
      return {
        isBase64,
        raw: rawClean,
        decoded: trimmedDecoded,
        formattedText: JSON.stringify(parsed, null, 2),
        format: "json",
        byteSize,
      };
    } catch {
      // not valid json
    }
  }

  // 4. Binary check (e.g. PDF headers: %PDF- or JVBERi0)
  if (rawClean.startsWith("JVBERi0") || trimmedDecoded.startsWith("%PDF-")) {
    return {
      isBase64: true,
      raw: rawClean,
      decoded: "[Binary PDF Document]",
      formattedText: "Adobe PDF Document (Base64 Encoded)",
      format: "binary",
      byteSize,
    };
  }

  // 5. Default Plain Text
  return {
    isBase64,
    raw: rawClean,
    decoded: trimmedDecoded,
    formattedText: trimmedDecoded,
    format: "text",
    byteSize,
  };
}
