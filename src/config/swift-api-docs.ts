export interface ApiDocDefinition {
  id: number;
  name: string;
  method: "GET" | "POST" | "PATCH";
  urlTemplate: string;
  section: "Distributions" | "FIN" | "InterAct";
  lifecycleStep: "Queue Polling" | "Distribution Lookup" | "Content Download" | "Queue Acknowledgment" | "Message Emission" | "Batch Emission";
  summary: string;
  functionality: string;
  businessPurpose: string;
  request: {
    pathParams?: Array<{ name: string; type: string; required: boolean; description: string; example: string }>;
    queryParams?: Array<{ name: string; type: string; required: boolean; description: string; example: string }>;
    headers: Array<{ name: string; value: string; description: string }>;
    body?: {
      mode: "none" | "raw";
      contentType?: string;
      description: string;
      example?: string;
      fields?: Array<{ name: string; type: string; required: boolean; description: string }>;
    };
  };
  response: {
    statusCodes: Array<{ code: number; meaning: string; scenario: string }>;
    headers: Array<{ name: string; description: string }>;
    structureDescription: string;
    sampleJson: string;
  };
  payloadGuide: {
    format: "Base64 (MT Block 4)" | "Base64 (ISO 20022 XML)" | "Base64 (PDF)" | "JSON Report Structure" | "None (Status Only)" | "JSON Emission Envelope" | "JSON Batch Array";
    encodingDescription: string;
    decodedExample?: string;
    fieldBreakdown?: Array<{ field: string; meaning: string }>;
  };
}

export const SWIFT_API_DOCS: Record<number, ApiDocDefinition> = {
  // ========================================================
  // 1. GET /v2/distributions - List Available Distributions
  // ========================================================
  1: {
    id: 1,
    name: "GET — List Available Distributions",
    method: "GET",
    urlTemplate: "/v2/distributions",
    section: "Distributions",
    lifecycleStep: "Queue Polling",
    summary: "Service-agnostic queue polling endpoint to retrieve pending inbound distributions.",
    functionality:
      "Frequently queries the SWIFT Alliance Cloud queue for available distributions linked to the client's Distinguished Name (DN) application channel. Returns an array of available distributions along with hypermedia pagination links.",
    businessPurpose:
      "This is the entry point for automated store-and-forward (SnF) message ingestion. Back-office systems poll this endpoint periodically to discover inbound customer transfers, statements, reports, and delivery receipts waiting to be processed.",
    request: {
      queryParams: [
        {
          name: "limit",
          type: "integer",
          required: false,
          description: "Maximum number of distributions to return. Default is 50, maximum is 200.",
          example: "50",
        },
        {
          name: "offset",
          type: "integer",
          required: false,
          description: "Number of records to skip from the beginning of the queue. Default is 0.",
          example: "0",
        },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [
        { code: 200, meaning: "OK", scenario: "Queue inspected successfully. Returns available distributions or empty array." },
        { code: 429, meaning: "Too Many Requests", scenario: "Spike arrest limit exceeded (max 100 calls/sec across institution or >6 polls/min per channel)." },
      ],
      headers: [
        { name: "Content-Type", description: "application/json;charset=UTF-8" },
      ],
      structureDescription:
        "JSON object containing a 'distributions' array and 'links' pagination object (self, first, next, previous, last). Each distribution item contains id, service, type, message_cloud_reference, copy, and specific download links.",
      sampleJson: JSON.stringify(
        {
          distributions: [
            {
              id: 44984189498,
              service: "fin",
              type: "transmissionReport",
              copy: false,
              message_cloud_reference: "68f78910-6484-4c20-b73f-8424a20b8e23",
              links: [
                { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions/44984189498", rel: "self", type: "GET" },
                { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/fin/transmission-reports/44984189498", rel: "download", type: "GET" },
              ],
            },
            {
              id: 44984189500,
              service: "fin",
              type: "message",
              distribution_tag: "fin-high-amount",
              copy: false,
              transmission_possible_duplicate: false,
              message_cloud_reference: "6c6cf8b9-9c9c-4ef4-be70-da426c1d19dd",
              links: [
                { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions/44984189500", rel: "self", type: "GET" },
                { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/fin/messages/44984189500", rel: "download", type: "GET" },
              ],
            },
          ],
          links: [
            { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions?limit=50&offset=0", rel: "self", type: "GET" },
            { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions?limit=50&offset=50", rel: "next", type: "GET" },
          ],
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "JSON Report Structure",
      encodingDescription:
        "The response does not carry message text directly. Instead, it provides the resource IDs and rel='download' links to fetch the actual payload through service-specific endpoints.",
      fieldBreakdown: [
        { field: "id", meaning: "Unique distribution sequence ID (e.g. 44984189500)." },
        { field: "service", meaning: "SWIFT protocol: 'fin', 'interAct', or 'fileAct'." },
        { field: "type", meaning: "Content type: 'message', 'transmissionReport', 'deliveryReport', 'deliveryNotification', 'export', or 'archive'." },
        { field: "message_cloud_reference", meaning: "UUID assigned by SWIFT Alliance Cloud to track the payment life-cycle." },
        { field: "transmission_possible_duplicate", meaning: "True if distribution has already been tentatively downloaded previously." },
      ],
    },
  },

  // ========================================================
  // 2. GET /v2/distributions/{id} - Retrieve Single Distribution
  // ========================================================

  2: {
    id: 2,
    name: "GET — Retrieve Single Distribution",
    method: "GET",
    urlTemplate: "/v2/distributions/{id}",
    section: "Distributions",
    lifecycleStep: "Distribution Lookup",
    summary: "Retrieves metadata and navigation links for a specific distribution by its ID.",
    functionality:
      "Fetches the single distribution object given its unique ID. Confirms its current status in the queue and returns hypermedia links to download the content or submit an ACK/NAK.",
    businessPurpose:
      "Used when a back-office process needs to re-verify the status of a specific item or inspect its available action links before performing downloads or issuing acknowledgements.",
    request: {
      pathParams: [
        { name: "id", type: "string", required: true, description: "Distribution identifier.", example: "44984189500" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [
        { code: 200, meaning: "OK", scenario: "Distribution metadata returned." },
        { code: 404, meaning: "Not Found", scenario: "Distribution ID does not exist or has already been acknowledged." },
      ],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Single distribution object containing ID, service, type, cloud reference, and action links.",
      sampleJson: JSON.stringify(
        {
          id: 44984189500,
          service: "fin",
          type: "message",
          copy: false,
          message_cloud_reference: "6c6cf8b9-9c9c-4ef4-be70-da426c1d19dd",
          links: [
            { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions/44984189500", rel: "self", type: "GET" },
            { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/fin/messages/44984189500", rel: "download", type: "GET" },
            { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions/44984189500/acks", rel: "ack", type: "POST" },
            { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions/44984189500/naks", rel: "nak", type: "POST" },
          ],
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "JSON Report Structure",
      encodingDescription: "Provides status metadata and direct links for downloading content and submitting acknowledgements.",
      fieldBreakdown: [
        { field: "rel: 'download'", meaning: "URL to download the actual payload content (FIN message or report)." },
        { field: "rel: 'ack'", meaning: "URL to POST an acknowledgement once stored." },
        { field: "rel: 'nak'", meaning: "URL to POST a negative acknowledgement if processing failed." },
      ],
    },
  },

  // ========================================================
  // 3. POST /v2/distributions/{id}/acks - Acknowledge Distribution
  // ========================================================

  3: {
    id: 3,
    name: "POST — Acknowledge Distribution (ACK)",
    method: "POST",
    urlTemplate: "/v2/distributions/{id}/acks",
    section: "Distributions",
    lifecycleStep: "Queue Acknowledgment",
    summary: "Confirms proper receipt and processing of a distribution, removing it from the queue.",
    functionality:
      "Marks the distribution as 'distributed' in Alliance Cloud and permanently clears it from the available distributions queue. Requires no request body.",
    businessPurpose:
      "Crucial store-and-forward step: until an ACK is sent, SWIFT keeps the message in the queue. Calling this endpoint confirms the back-office bank application has safely stored the message in its database.",
    request: {
      pathParams: [
        { name: "id", type: "string", required: true, description: "Distribution ID to acknowledge.", example: "44984189499" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
      body: {
        mode: "none",
        description: "No request body is required for single ACK.",
      },
    },
    response: {
      statusCodes: [
        { code: 204, meaning: "No Content", scenario: "Distribution acknowledged and successfully removed from queue." },
        { code: 404, meaning: "Not Found", scenario: "Distribution ID not found or already acknowledged." },
      ],
      headers: [],
      structureDescription: "HTTP 204 No Content with empty response body.",
      sampleJson: "HTTP/1.1 204 No Content",
    },
    payloadGuide: {
      format: "None (Status Only)",
      encodingDescription: "HTTP 204 No Content confirms that the Alliance Cloud state machine has marked the distribution as delivered.",
    },
  },

  // ========================================================
  // 4. POST /v2/distributions/{id}/naks - Reject Distribution
  // ========================================================

  4: {
    id: 4,
    name: "POST — Reject Distribution (NAK)",
    method: "POST",
    urlTemplate: "/v2/distributions/{id}/naks",
    section: "Distributions",
    lifecycleStep: "Queue Acknowledgment",
    summary: "Rejects a distribution, marking it 'failed to be distributed' in Alliance Cloud.",
    functionality:
      "Sends a negative acknowledgement (NAK) for a distribution. Removes the distribution from the active queue and logs an operator alert in Alliance Cloud with the optional rejection reason provided.",
    businessPurpose:
      "Used when downstream banking systems encounter unrecoverable processing errors (e.g. invalid syntax, database rejection). Alliance Cloud operators can then inspect the NAK reason and manually re-dispatch.",
    request: {
      pathParams: [
        { name: "id", type: "string", required: true, description: "Distribution ID to reject.", example: "732489498" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Content-Type", value: "application/json", description: "JSON request body." },
      ],
      body: {
        mode: "raw",
        contentType: "application/json",
        description: "Optional JSON object detailing the rejection reason.",
        example: JSON.stringify({ reason: "Unable to store message. Storage database unreachable." }, null, 2),
        fields: [
          { name: "reason", type: "string", required: false, description: "Operator-readable explanation for rejecting the distribution." },
        ],
      },
    },
    response: {
      statusCodes: [
        { code: 204, meaning: "No Content", scenario: "Distribution NAK accepted and removed from available queue." },
        { code: 404, meaning: "Not Found", scenario: "Distribution ID was not found." },
      ],
      headers: [],
      structureDescription: "HTTP 204 No Content with empty response body.",
      sampleJson: "HTTP/1.1 204 No Content",
    },
    payloadGuide: {
      format: "None (Status Only)",
      encodingDescription: "Returns HTTP 204 No Content upon recording the rejection.",
    },
  },

  // ========================================================
  // 5. PATCH /v2/distributions - Batch Update Statuses
  // ========================================================

  5: {
    id: 5,
    name: "PATCH — Batch ACK / NAK Distribution Statuses",
    method: "PATCH",
    urlTemplate: "/v2/distributions",
    section: "Distributions",
    lifecycleStep: "Queue Acknowledgment",
    summary: "Sends multiple ACK and NAK updates for multiple distributions in a single call.",
    functionality:
      "Accepts an array of status updates ({ id, status: 'Ack' | 'Nak', status_update_message?: string }). Alliance Cloud processes all items atomically and returns an array indicating whether each update succeeded ('OK' or 'NotFound').",
    businessPurpose:
      "High-throughput reconciliation: allows back-office applications that ingest messages in batches to commit dozens or hundreds of distributions in a single round-trip.",
    request: {
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Content-Type", value: "application/json", description: "JSON array of updates." },
      ],
      body: {
        mode: "raw",
        contentType: "application/json",
        description: "Array of distribution update objects.",
        example: JSON.stringify(
          [
            { id: "44984189498", status: "Ack" },
            { id: "44984189499", status: "Ack" },
            { id: "44984189500", status: "Nak", status_update_message: "Storage disk full" },
          ],
          null,
          2
        ),
        fields: [
          { name: "id", type: "string | number", required: true, description: "Distribution ID to update." },
          { name: "status", type: "'Ack' | 'Nak'", required: true, description: "Desired outcome status." },
          { name: "status_update_message", type: "string", required: false, description: "Optional explanation when status is Nak." },
        ],
      },
    },
    response: {
      statusCodes: [
        { code: 200, meaning: "OK", scenario: "Batch processed. Returns individual result per ID." },
      ],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Array of result objects mapping each ID to 'OK' or 'NotFound'.",
      sampleJson: JSON.stringify(
        [
          { id: "44984189498", result: "OK" },
          { id: "44984189499", result: "OK" },
          { id: "44984189500", result: "NotFound" },
        ],
        null,
        2
      ),
    },
    payloadGuide: {
      format: "JSON Report Structure",
      encodingDescription: "Structured array describing individual status results.",
      fieldBreakdown: [
        { field: "result: 'OK'", meaning: "Distribution status successfully updated and removed from queue." },
        { field: "result: 'NotFound'", meaning: "Distribution ID was invalid or already acknowledged." },
      ],
    },
  },

  // ========================================================
  // 6. GET /v2/fin/messages/{distribution-id} - Download Single FIN Message
  // ========================================================

  // ========================================================
  // 6. POST /v2/fin/messages - Send Single FIN Message
  // ========================================================
  6: {
    id: 6,
    name: "POST — Send Single FIN Message",
    method: "POST",
    urlTemplate: "/v2/fin/messages",
    section: "FIN",
    lifecycleStep: "Message Emission",
    summary: "Submits an individual FIN MT payment message to Alliance Cloud for network validation and transmission.",
    functionality:
      "Transmits a single FIN message (e.g. MT101, MT103, MT202, MT940). Alliance Cloud validates syntax, checks BIC RMA authorizations, computes the network header, and dispatches it into the SWIFT network.",
    businessPurpose:
      "Core outbound emission endpoint for MT payment initiation, customer credit transfers, financial institution transfers, and treasury operations.",
    request: {
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "X-SWIFT-Signature", value: "eyJhbGciOiJSUzI1NiIs...", description: "Non-repudiation RS256 JWT generated via pre-request script: CustomGlobalFunctions.createNRSignature(\"sub\", \"privateKey\", \"publicKey\")." },
        { name: "Content-Type", value: "application/json", description: "Standard JSON request media type." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
      body: {
        mode: "raw",
        contentType: "application/json",
        description: "JSON emission envelope containing sender, receiver, message type, network parameters, and Base64-encoded MT Block 4 text.",
        example: JSON.stringify(
          {
            sender_reference: "LOW-000082027617",
            message_type: "fin.101",
            sender: "SWLLUS33XXXX",
            receiver: "SWHQBEBBXXXX",
            network_info: {
              network_priority: "Normal",
              uetr: "5fb4fe6b-eaa3-4e16-a4db-1d50bd512220",
              delivery_monitoring: "NonDeliveryAndDelivery",
              possible_duplicate: false,
              validation_identifier: "STP",
              service_type_identifier: "001",
            },
            payload: "DQo6MjA6TE9XLTAwMDA4MjAyNzYxNw0KOjI4RDoxMjM0NS8xMjM0NQ0KOjUwTDp4DQo6NTBIOi94DQp4DQo6MzA6OTYxMTIzDQo6MjE6TE9XLTAwMDA4MjAyNzYxNw0KOjMyQjpVU0QxLDM0DQo6NTJBOkNIQVNVUzMzDQo6NTk6eA0KOjcxQTpTSEENCjoyMTpMT1ctMDAwMDgyMDI3NjE3DQo6MzJCOlVTRDEsMzQNCjo1MkE6Q0hBU1VTMzMNCjo1OTp4DQo6NzFBOlNIQQ==",
          },
          null,
          2
        ),
        fields: [
          { name: "sender_reference", type: "string", required: true, description: "Unique sender tracking reference for the message." },
          { name: "message_type", type: "string", required: true, description: "SWIFT message standard identifier (e.g. fin.101, fin.103)." },
          { name: "sender", type: "string", required: true, description: "12-character BIC of originating institution." },
          { name: "receiver", type: "string", required: true, description: "12-character BIC of destination institution." },
          { name: "network_info.network_priority", type: "string", required: false, description: "Priority level: Normal or Urgent." },
          { name: "network_info.uetr", type: "string", required: false, description: "Unique End-to-end Transaction Reference (UUID v4)." },
          { name: "payload", type: "string (Base64)", required: true, description: "Base64-encoded ASCII string of SWIFT MT Block 4 text." },
        ],
      },
    },
    response: {
      statusCodes: [
        { code: 201, meaning: "Created", scenario: "FIN message accepted by Alliance Cloud for processing and dispatch." },
        { code: 400, meaning: "Bad Request", scenario: "Payload validation failed or required fields missing." },
        { code: 403, meaning: "Forbidden", scenario: "Invalid credentials or unauthorized application channel." },
      ],
      headers: [
        { name: "Content-Type", description: "application/json;charset=UTF-8" },
        { name: "Location", description: "URI of the newly created message resource." },
      ],
      structureDescription: "JSON object returning the assigned distribution ID, message status, and tracking references.",
      sampleJson: JSON.stringify(
        {
          id: "44984189520",
          sender_reference: "LOW-000082027617",
          status: "Accepted",
          creation_time: "2026-10-13T10:14:00Z",
          links: [
            { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/fin/messages/44984189520", rel: "self", type: "GET" },
          ],
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "Base64 (MT Block 4)",
      encodingDescription: "The request 'payload' attribute contains standard SWIFT MT Block 4 text encoded in Base64.",
      decodedExample: ":20:LOW-000082027617\n:28D:12345/12345\n:30:261013\n:21:LOW-000082027617\n:32B:USD1,34\n:52A:CHASUS33\n:71A:SHA",
      fieldBreakdown: [
        { field: ":20:", meaning: "Sender's Reference." },
        { field: ":28D:", meaning: "Message Index / Total." },
        { field: ":30:", meaning: "Execution Date." },
        { field: ":32B:", meaning: "Currency Code and Amount." },
        { field: ":52A:", meaning: "Ordering Institution BIC." },
        { field: ":71A:", meaning: "Details of Charges." },
      ],
    },
  },

  // ========================================================
  // 7. POST /v2/fin/messages/batch - Send Batch of FIN Messages
  // ========================================================
  7: {
    id: 7,
    name: "POST — Send Batch of FIN Messages",
    method: "POST",
    urlTemplate: "/v2/fin/messages/batch",
    section: "FIN",
    lifecycleStep: "Batch Emission",
    summary: "Transmits a batch of up to 500 FIN messages to Alliance Cloud in a single call.",
    functionality:
      "Allows bulk ingestion of FIN MT payment messages. Every item inside the array must contain a unique sender_reference value. Alliance Cloud validates the batch asynchronously and returns a 202 Accepted status with a batch tracking identifier.",
    businessPurpose:
      "High-volume end-of-day or continuous payment processing: allows enterprise ERP and core banking engines to discharge hundreds of transfers simultaneously.",
    request: {
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "X-SWIFT-Signature", value: "eyJhbGciOiJSUzI1NiIs...", description: "Non-repudiation RS256 JWT generated via pre-request script: CustomGlobalFunctions.createNRSignature(\"sub\", \"privateKey\", \"publicKey\")." },
        { name: "Content-Type", value: "application/json", description: "JSON array media type." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
      body: {
        mode: "raw",
        contentType: "application/json",
        description: "Array of up to 500 FIN message emission objects with unique sender references.",
        example: JSON.stringify(
          [
            {
              sender_reference: "LOW-000082027617",
              message_type: "fin.101",
              sender: "SWLLUS33XXXX",
              receiver: "SWHQBEBBXXXX",
              network_info: { network_priority: "Normal", uetr: "5fb4fe6b-eaa3-4e16-a4db-1d50bd512220" },
              payload: "DQo6MjA6TE9XLTAwMDA4MjAyNzYxNw0KOjI4RDoxMjM0NS8xMjM0NQ0KOjMwOjk2MTEyMw0KOjMyQjpVU0QxLDM0DQo6NTJBOkNIQVNVUzMzDQo6NzFBOlNIQQ==",
            },
            {
              sender_reference: "LOW-000082027618",
              message_type: "fin.101",
              sender: "SWLLUS33XXXX",
              receiver: "SWHQBEBBXXXX",
              network_info: { network_priority: "Normal", uetr: "28bbfe98-e654-4037-8d1f-505650326e1b" },
              payload: "CjoyMDpMT1ctMDAwMDgyMDI3NjE4CjoyOEQ6MTIzNDUvMTIzNDUKOjMwOjk2MTEyMwo6MzJCOlVTRDEsMzQKOjUyQTpDSEFTVVMzMwo6NzFBOlNIQQ==",
            },
          ],
          null,
          2
        ),
        fields: [
          { name: "[].sender_reference", type: "string", required: true, description: "Unique tracking reference within the batch." },
          { name: "[].message_type", type: "string", required: true, description: "FIN type (e.g. fin.101, fin.103)." },
          { name: "[].payload", type: "string (Base64)", required: true, description: "Base64 MT Block 4 text." },
        ],
      },
    },
    response: {
      statusCodes: [
        { code: 202, meaning: "Accepted", scenario: "Batch accepted for background validation and processing." },
        { code: 400, meaning: "Bad Request", scenario: "Duplicate sender_reference or exceeding 500 messages limit." },
      ],
      headers: [
        { name: "Content-Type", description: "application/json;charset=UTF-8" },
        { name: "Location", description: "Batch status check URI." },
      ],
      structureDescription: "Batch acceptance summary with batch identifier and count.",
      sampleJson: JSON.stringify(
        {
          batch_id: "BATCH-FIN-20261013-001",
          status: "Accepted",
          message_count: 2,
          accepted_time: "2026-10-13T10:15:00Z",
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "JSON Batch Array",
      encodingDescription: "Top-level JSON array where each entry includes its own Base64-encoded MT Block 4 payload.",
    },
  },

  8: {
    id: 8,
    name: "GET — Download Single FIN Message",
    method: "GET",
    urlTemplate: "/v2/fin/messages/{distribution-id}",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Downloads incoming or copy FIN MT message and Base64-encoded Block 4 payload.",
    functionality:
      "Retrieves the complete message envelope (direction, sender, receiver, message_type, session_number, sequence_number, UETR) and the Base64-encoded SWIFT MT payload text.",
    businessPurpose:
      "Primary consumption endpoint for SWIFT FIN payments (e.g. MT103 Customer Transfer, MT202 Financial Institution Transfer, MT940 Statement).",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Target distribution identifier.", example: "44984189499" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [
        { code: 200, meaning: "OK", scenario: "Message envelope and payload retrieved successfully." },
        { code: 404, meaning: "Not Found", scenario: "Message distribution ID not found." },
      ],
      headers: [
        { name: "Content-Type", description: "application/json;charset=UTF-8" },
        { name: "X-SWIFT-Integrity", description: "JWT signed by Alliance Cloud containing RFC 8785 canonical digest to prove origin and tamper-resistance." },
      ],
      structureDescription: "Contains 'distribution' object and 'message' envelope with metadata and Base64 'payload'.",
      sampleJson: JSON.stringify(
        {
          distribution: {
            id: 44984189499,
            message_cloud_reference: "c169124c-30c7-4485-8cb1-b894df526ec9",
            service: "fin",
            type: "message",
            links: [
              { href: "https://api.swiftnet.sipn.swift.com/alliancecloud/v2/distributions/44984189499/acks", rel: "ack", type: "POST" },
            ],
          },
          message: {
            direction: "Incoming",
            message_type: "fin.103",
            sender: "SWLLUS33XXXX",
            receiver: "SWHQBEBBXXXX",
            sender_reference: "PAYREF-20261010-001",
            network_info: {
              session_number: 23,
              sequence_number: 298,
              message_input_reference: "200727SWLLUS33XXXX0001000017",
            },
            security_info: {
              rma_result: "Success",
              checksum_result: "Success",
            },
            payload: "OjIwOlBBWVJFRi0yMDI2MTAxMC0wMDEKOjIzQjpDUkVE... (Base64)",
          },
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "Base64 (MT Block 4)",
      encodingDescription:
        "The 'payload' property is a standard Base64-encoded string representing SWIFT MT Block 4 message text.",
      decodedExample: ":20:PAYREF-20261010-001\n:23B:CRED\n:32A:261010USD10000,00\n:50K:/123456789 JOHN SMITH\n:59:/987654321 JANE DOE\n:70:INVOICE 456\n:71A:SHA\n-",
      fieldBreakdown: [
        { field: ":20:", meaning: "Transaction Reference Number." },
        { field: ":23B:", meaning: "Bank Operation Code (e.g. CRED)." },
        { field: ":32A:", meaning: "Value Date (YYMMDD), Currency (USD), Amount (10000,00)." },
        { field: ":50K:", meaning: "Ordering Customer account & name." },
        { field: ":59:", meaning: "Beneficiary Customer account & name." },
        { field: ":71A:", meaning: "Details of Charges (SHA / OUR / BEN)." },
      ],
    },
  },

  // ========================================================
  // 7. GET /v2/fin/messages - Download Multiple FIN Messages
  // ========================================================

  9: {
    id: 9,
    name: "GET — Download Multiple FIN Messages",
    method: "GET",
    urlTemplate: "/v2/fin/messages",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Downloads a batch of FIN messages using comma-separated distribution IDs.",
    functionality:
      "Retrieves multiple FIN messages in a single HTTP request using the query parameter ?distribution-id=id1,id2,id3. Returns an array of message records.",
    businessPurpose:
      "High-throughput batch ingestion of payment messages discovered in the polling queue.",
    request: {
      queryParams: [
        {
          name: "distribution-id",
          type: "string",
          required: true,
          description: "Comma-separated list of distribution IDs to download.",
          example: "44984189498,44984189499",
        },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [
        { code: 200, meaning: "OK", scenario: "Array of requested message distributions returned." },
      ],
      headers: [
        { name: "Content-Type", description: "application/json;charset=UTF-8" },
        { name: "X-SWIFT-Integrity", description: "Integrity JWT header." },
      ],
      structureDescription: "Array of objects containing { distribution: {...}, message: {...} }.",
      sampleJson: JSON.stringify(
        [
          {
            distribution: { id: 44984189498, service: "fin", type: "message" },
            message: { message_type: "fin.103", sender: "BANKGB22XXXX", payload: "..." },
          },
          {
            distribution: { id: 44984189499, service: "fin", type: "message" },
            message: { message_type: "fin.202", sender: "BANKUS33XXXX", payload: "..." },
          },
        ],
        null,
        2
      ),
    },
    payloadGuide: {
      format: "Base64 (MT Block 4)",
      encodingDescription: "Each item in the returned array contains its own Base64-encoded MT text payload.",
    },
  },

  // ========================================================
  // 8. GET /v2/fin/transmission-reports/{distribution-id} - Single Transmission Report
  // ========================================================

  10: {
    id: 10,
    name: "GET — Download Single Transmission Report",
    method: "GET",
    urlTemplate: "/v2/fin/transmission-reports/{distribution-id}",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Retrieves network transmission status report for a previously sent FIN message.",
    functionality:
      "Returns transmission feedback detailing whether a sent message was successfully emitted into the SWIFT network or rejected at the gateway. The message_cloud_reference links directly to the originally sent message.",
    businessPurpose:
      "Instant emission confirmation: ensures your payment was validated and accepted by the SWIFT core network without syntax or RMA authorization errors.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the transmission report.", example: "44984189498" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [
        { code: 200, meaning: "OK", scenario: "Transmission report returned." },
        { code: 404, meaning: "Not Found", scenario: "Report ID not found." },
      ],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Contains 'distribution' and 'transmission_report' details.",
      sampleJson: JSON.stringify(
        {
          distribution: {
            id: 44984189498,
            service: "fin",
            type: "transmissionReport",
            message_cloud_reference: "68f78910-6484-4c20-b73f-8424a20b8e23",
          },
          transmission_report: {
            sender_reference: "PAYREF-20261010-001",
            network_status: "Accepted",
            session_number: 142,
            sequence_number: 1052,
            validation_result: "Success",
          },
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "JSON Report Structure",
      encodingDescription: "Structured JSON metadata describing SWIFT network acceptance status.",
      fieldBreakdown: [
        { field: "network_status", meaning: "'Accepted' (transmitted to SWIFT) or 'Rejected'." },
        { field: "session_number / sequence_number", meaning: "SWIFT Input Sequence Number (ISN) issued upon acceptance." },
      ],
    },
  },

  // ========================================================
  // 9. GET /v2/fin/transmission-reports - Batch Transmission Reports
  // ========================================================

  11: {
    id: 11,
    name: "GET — Download Multiple Transmission Reports",
    method: "GET",
    urlTemplate: "/v2/fin/transmission-reports",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Retrieves multiple FIN transmission reports using comma-separated distribution IDs.",
    functionality: "Batched retrieval of transmission reports via ?distribution-id=id1,id2,id3.",
    businessPurpose: "Automates reconciliation of high-volume outgoing payment batches.",
    request: {
      queryParams: [
        { name: "distribution-id", type: "string", required: true, description: "Comma-separated distribution IDs.", example: "44984189498,44984189499" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Array of transmission reports returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Array of { distribution, transmission_report } objects.",
      sampleJson: JSON.stringify([{ distribution: { id: 44984189498 }, transmission_report: { status: "Accepted" } }], null, 2),
    },
    payloadGuide: {
      format: "JSON Report Structure",
      encodingDescription: "Array of structured network transmission reports.",
    },
  },

  // ========================================================
  // 10. GET /v2/fin/delivery-reports/{distribution-id} - Single Delivery Report
  // ========================================================

  12: {
    id: 12,
    name: "GET — Download Single Delivery Report",
    method: "GET",
    urlTemplate: "/v2/fin/delivery-reports/{distribution-id}",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Retrieves final delivery confirmation report to recipient bank for a sent FIN message.",
    functionality:
      "When a delivery acknowledgement arrives from the SWIFT network, Alliance Cloud matches it with the original outgoing message in the platform and creates a deliveryReport distribution. This endpoint retrieves that matched report.",
    businessPurpose:
      "Definitive payment finality: confirms that the recipient institution has received the message and provides the exact delivery timestamp and SWIFT Output Sequence Number (OSN).",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the delivery report.", example: "44984189501" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [
        { code: 200, meaning: "OK", scenario: "Delivery report returned." },
        { code: 404, meaning: "Not Found", scenario: "Distribution ID not found." },
      ],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Contains 'distribution' and 'delivery_report' objects.",
      sampleJson: JSON.stringify(
        {
          distribution: {
            id: 44984189501,
            service: "fin",
            type: "deliveryReport",
            message_cloud_reference: "68f78910-6484-4c20-b73f-8424a20b8e23",
          },
          delivery_report: {
            delivery_status: "Delivered",
            delivery_time: "2026-10-10T12:04:19.000Z",
            output_sequence_number: "200727BANKUS33XXXX0001000045",
          },
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "JSON Report Structure",
      encodingDescription: "Structured delivery verification report with delivery timestamp and OSN.",
    },
  },

  // ========================================================
  // 11. GET /v2/fin/delivery-reports - Batch Delivery Reports
  // ========================================================

  13: {
    id: 13,
    name: "GET — Download Multiple Delivery Reports",
    method: "GET",
    urlTemplate: "/v2/fin/delivery-reports",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Retrieves multiple FIN delivery reports using comma-separated distribution IDs.",
    functionality: "Batched download of delivery reports via ?distribution-id=id1,id2,id3.",
    businessPurpose: "Batch reconciliation of delivered transactions.",
    request: {
      queryParams: [
        { name: "distribution-id", type: "string", required: true, description: "Comma-separated distribution IDs.", example: "44984189501,44984189502" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Array of delivery reports returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Array of { distribution, delivery_report } objects.",
      sampleJson: JSON.stringify([{ distribution: { id: 44984189501 }, delivery_report: { delivery_status: "Delivered" } }], null, 2),
    },
    payloadGuide: {
      format: "JSON Report Structure",
      encodingDescription: "Collection of delivery reports.",
    },
  },

  // ========================================================
  // 12. GET /v2/fin/delivery-notifications/{distribution-id} - Single Delivery Notification
  // ========================================================

  14: {
    id: 14,
    name: "GET — Download Single Delivery Notification",
    method: "GET",
    urlTemplate: "/v2/fin/delivery-notifications/{distribution-id}",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Retrieves delivery notification for messages sent to SWIFT outside Alliance Cloud.",
    functionality:
      "When a delivery notification arrives that cannot be matched to an existing message in Alliance Cloud (such as during migration from an on-premise interface), it is distributed as a deliveryNotification rather than a deliveryReport.",
    businessPurpose:
      "Migration support: ensures that delivery acknowledgements for messages sent prior to migration are not lost.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the notification.", example: "44984189505" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Delivery notification returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Contains 'distribution' and raw delivery notification 'payload'.",
      sampleJson: JSON.stringify(
        {
          distribution: { id: 44984189505, service: "fin", type: "deliveryNotification" },
          delivery_notification: { payload: "..." },
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "Base64 (MT Block 4)",
      encodingDescription: "Contains the raw Base64-encoded delivery notification text.",
    },
  },

  // ========================================================
  // 13. GET /v2/fin/delivery-notifications - Batch Delivery Notifications
  // ========================================================

  15: {
    id: 15,
    name: "GET — Download Multiple Delivery Notifications",
    method: "GET",
    urlTemplate: "/v2/fin/delivery-notifications",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Retrieves multiple delivery notifications using comma-separated distribution IDs.",
    functionality: "Batched download of unmatched delivery notifications.",
    businessPurpose: "Batch migration processing of delivery acknowledgements.",
    request: {
      queryParams: [
        { name: "distribution-id", type: "string", required: true, description: "Comma-separated distribution IDs.", example: "44984189505,44984189506" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Array of delivery notifications returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Array of { distribution, delivery_notification } objects.",
      sampleJson: JSON.stringify([{ distribution: { id: 44984189505 } }], null, 2),
    },
    payloadGuide: { format: "JSON Report Structure", encodingDescription: "Collection of delivery notifications." },
  },

  // ========================================================
  // 14. GET /v2/fin/exports/{distribution-id} - Download FIN Export
  // ========================================================

  16: {
    id: 16,
    name: "GET — Download Message Export",
    method: "GET",
    urlTemplate: "/v2/fin/exports/{distribution-id}",
    section: "FIN",
    lifecycleStep: "Content Download",
    summary: "Downloads an export of a FIN message in PDF document format or Base64 encoding.",
    functionality:
      "Returns a human-readable PDF rendering of the payment message. If Accept: application/pdf is specified, the binary PDF document is returned directly. If application/json is used, the PDF bytes are Base64-encoded in the 'export' field.",
    businessPurpose:
      "Audit, compliance, customer statements, and legal archiving: provides an official, printable PDF rendition of the transaction.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the export.", example: "40614647987" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json (or application/pdf)", description: "Select JSON with Base64 or binary PDF." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Export document returned." }],
      headers: [{ name: "Content-Type", description: "application/json (or application/pdf)" }],
      structureDescription: "Contains 'distribution' metadata and 'export' string containing Base64-encoded PDF.",
      sampleJson: JSON.stringify(
        {
          distribution: { id: 40614647987, service: "fin", type: "export", export_format: "pdf" },
          export: "JVBERi0xLjQKJfbk/N8KMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovVmVyc2lvbi... (Base64 PDF)",
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "Base64 (PDF)",
      encodingDescription: "Base64 string beginning with 'JVBERi0' representing standard PDF document bytes.",
    },
  },

  // ========================================================
  // 15. GET /v2/fin/archives/{distribution-id} - Download FIN Archive
  // ========================================================

  17: {
    id: 17,
    name: "GET — Download Message Archive",
    section: "FIN",
    method: "GET",
    urlTemplate: "/v2/fin/archives/{distribution-id}",
    lifecycleStep: "Content Download",
    summary: "Downloads complete archive containing message, full history logs, transmission reports, and delivery reports.",
    functionality:
      "Returns the most exhaustive view of a transaction. Bundles the raw message, full audit trail (history_logs with timestamps and event codes like CREATED_RECEPTION, VALIDATED), all transmission reports, and all delivery reports.",
    businessPurpose:
      "Long-term regulatory archiving and dispute investigation: contains the complete life-cycle history from receipt to settlement in a single resource.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the archive.", example: "40614647989" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Complete archive package returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Contains 'distribution' and 'archive' with message, history_report, transmission_reports, and delivery_reports.",
      sampleJson: JSON.stringify(
        {
          distribution: { id: 40614647989, service: "fin", type: "archive" },
          archive: {
            message: { sender_reference: "7ad32386-f1da-4395-9f56-9eb767711056", payload: "..." },
            history_report: {
              history_logs: [
                { code: "CREATED_RECEPTION", label: "Message received", time: "2026-10-10T11:53:43.394Z", user: "System" },
                { code: "VALIDATED", label: "Validated", time: "2026-10-10T11:53:44.000Z", user: "System" },
              ],
            },
            transmission_reports: [{ status: "Accepted" }],
            delivery_reports: [{ delivery_status: "Delivered" }],
          },
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "JSON Report Structure",
      encodingDescription: "Structured composite object linking message content with chronologically ordered history logs.",
    },
  },

  // ========================================================
  // 16. GET /v2/interact/messages/{distribution-id} - Single InterAct Message
  // ========================================================

  // ========================================================
  // 18. POST /v2/interact/messages - Send Single InterAct Message
  // ========================================================
  18: {
    id: 18,
    name: "POST — Send Single InterAct Message",
    method: "POST",
    urlTemplate: "/v2/interact/messages",
    section: "InterAct",
    lifecycleStep: "Message Emission",
    summary: "Submits an ISO 20022 XML InterAct message to Alliance Cloud for network validation and transmission.",
    functionality:
      "Transmits an individual ISO 20022 XML document (e.g. pacs.008, pacs.009, pain.001, camt.053, or setr securities messages). Alliance Cloud validates schemas against ISO specifications, formats the SWIFTNet RequestHeader, and sends to destination.",
    businessPurpose:
      "Primary endpoint for ISO 20022 real-time and cross-border payments, ISO securities ordering, and treasury management.",
    request: {
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "X-SWIFT-Signature", value: "eyJhbGciOiJSUzI1NiIs...", description: "Non-repudiation RS256 JWT generated via pre-request script: CustomGlobalFunctions.createNRSignature(\"sub\", \"privateKey\", \"publicKey\")." },
        { name: "Content-Type", value: "application/json", description: "Standard JSON request media type." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
      body: {
        mode: "raw",
        contentType: "application/json",
        description: "InterAct emission envelope with requestor, responder, service code, and Base64-encoded XML payload.",
        example: JSON.stringify(
          {
            sender_reference: "TSORCASWHQCHZ0XXX_CAN_setr",
            service_code: "swift.if.ia",
            message_type: "setr.017.001.04",
            requestor: "ou=orca,o=swllus33,o=swift",
            responder: "ou=mfunds,o=swhqbebb,o=swift",
            network_info: {
              user_reference: "IE19080850952607",
              network_priority: "Normal",
              possible_duplicate: false,
              delivery_notification_requested: true,
              request_type: "setr.017.001.04",
            },
            security_info: {
              signing_requested: false,
              non_repudiation_requested: false,
            },
            format: "MX",
            payload: "PGVudmVsb3BlOkVudmVsb3BlIHhtbG5zOmVudmVsb3BlPSJ1cm46c3dpZnQ6eHNkOmVudmVsb3BlIj48QXBwSGRyIHhtbG5zPSJ1cm46c3dpZnQ6eHNkOiRhaFYxMCI+PE1zZ1JlZj5JRTE5MDgwODUwOTUyNjA3PC9Nc2dSZWY+PENyRGF0ZT4yMDE5LTA4LTA4VDEzOjE4OjQ4PC9DckRhdGU+PC9BcHBIZHI+PERvY3VtZW50IHhtbG5zPSJ1cm46aXNvOnN0ZDppc286MjAwMjI6dGVjaDp4c2Q6c2V0ci4wMTcuMDAxLjA0Ij48T3JkckN4bFN0c1JwdD48TXNnSWQ+PElkPklFMTkwODA4NTA5NTI2MDc8L0lkPjwvT3JkckN4bFN0c1JwdD48L0RvY3VtZW50PjwvZW52ZWxvcGU6RW52ZWxvcGU+",
          },
          null,
          2
        ),
        fields: [
          { name: "sender_reference", type: "string", required: true, description: "Unique sender tracking reference." },
          { name: "service_code", type: "string", required: true, description: "SWIFTNet service code (e.g. swift.if.ia, swift.finplus!p)." },
          { name: "message_type", type: "string", required: true, description: "ISO 20022 message definition identifier." },
          { name: "requestor", type: "string", required: true, description: "Distinguished Name (DN) of sender." },
          { name: "responder", type: "string", required: true, description: "Distinguished Name (DN) of destination." },
          { name: "payload", type: "string (Base64 XML)", required: true, description: "Base64-encoded UTF-8 ISO 20022 XML document." },
        ],
      },
    },
    response: {
      statusCodes: [
        { code: 201, meaning: "Created", scenario: "InterAct message accepted for network routing." },
        { code: 400, meaning: "Bad Request", scenario: "XML schema violation or missing parameters." },
        { code: 403, meaning: "Forbidden", scenario: "Unauthorized application channel." },
      ],
      headers: [
        { name: "Content-Type", description: "application/json;charset=UTF-8" },
        { name: "Location", description: "URI of the newly created InterAct message." },
      ],
      structureDescription: "JSON object returning the assigned distribution ID and validation status.",
      sampleJson: JSON.stringify(
        {
          id: "55001239850",
          sender_reference: "TSORCASWHQCHZ0XXX_CAN_setr",
          status: "Accepted",
          service_code: "swift.if.ia",
          creation_time: "2026-10-13T10:18:00Z",
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "Base64 (ISO 20022 XML)",
      encodingDescription: "Base64 string representing the complete ISO 20022 XML document (AppHdr + Document).",
      decodedExample: `<?xml version="1.0" encoding="UTF-8"?>\n<envelope:Envelope xmlns:envelope="urn:swift:xsd:envelope">\n  <AppHdr xmlns="urn:swift:xsd:\\$ahV10">\n    <MsgRef>IE19080850952607</MsgRef>\n    <CrDate>2026-10-13T10:18:00</CrDate>\n  </AppHdr>\n  <Document xmlns="urn:iso:std:iso:20022:tech:xsd:setr.017.001.04">\n    <OrdrCxlStsRpt>\n      <MsgId><Id>IE19080850952607</Id></MsgId>\n    </OrdrCxlStsRpt>\n  </Document>\n</envelope:Envelope>`,
    },
  },

  // ========================================================
  // 19. POST /v2/interact/messages/batch - Send Batch of InterAct Messages
  // ========================================================
  19: {
    id: 19,
    name: "POST — Send Batch of InterAct Messages",
    method: "POST",
    urlTemplate: "/v2/interact/messages/batch",
    section: "InterAct",
    lifecycleStep: "Batch Emission",
    summary: "Transmits a batch of up to 50 InterAct ISO 20022 messages to Alliance Cloud in a single call.",
    functionality:
      "Allows bulk submission of up to 50 InterAct XML messages. All sender_reference values must be distinct across items in the request. Alliance Cloud validates syntax and yields an asynchronous batch processing handle.",
    businessPurpose:
      "Bulk submission for high-value ISO 20022 clearing, payment batches, or bulk securities transactions.",
    request: {
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "X-SWIFT-Signature", value: "eyJhbGciOiJSUzI1NiIs...", description: "Non-repudiation RS256 JWT generated via pre-request script: CustomGlobalFunctions.createNRSignature(\"sub\", \"privateKey\", \"publicKey\")." },
        { name: "Content-Type", value: "application/json", description: "JSON array media type." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
      body: {
        mode: "raw",
        contentType: "application/json",
        description: "Array of up to 50 InterAct message emission objects with unique sender references.",
        example: JSON.stringify(
          [
            {
              sender_reference: "BATCH-MX-001",
              service_code: "swift.if.ia",
              message_type: "setr.017.001.04",
              requestor: "ou=orca,o=swllus33,o=swift",
              responder: "ou=mfunds,o=swhqbebb,o=swift",
              payload: "PGVudmVsb3BlOkVudmVsb3BlPjwvZW52ZWxvcGU6RW52ZWxvcGU+",
            },
            {
              sender_reference: "BATCH-MX-002",
              service_code: "swift.if.ia",
              message_type: "setr.017.001.04",
              requestor: "ou=orca,o=swllus33,o=swift",
              responder: "ou=mfunds,o=swhqbebb,o=swift",
              payload: "PGVudmVsb3BlOkVudmVsb3BlPjwvZW52ZWxvcGU6RW52ZWxvcGU+",
            },
          ],
          null,
          2
        ),
        fields: [
          { name: "[].sender_reference", type: "string", required: true, description: "Unique tracking reference within the batch." },
          { name: "[].message_type", type: "string", required: true, description: "ISO 20022 standard type." },
          { name: "[].payload", type: "string (Base64 XML)", required: true, description: "Base64 ISO 20022 XML document." },
        ],
      },
    },
    response: {
      statusCodes: [
        { code: 202, meaning: "Accepted", scenario: "Batch accepted for background validation and dispatch." },
        { code: 400, meaning: "Bad Request", scenario: "Duplicate sender references or exceeding 50 message limit." },
      ],
      headers: [
        { name: "Content-Type", description: "application/json;charset=UTF-8" },
        { name: "Location", description: "Batch status check URI." },
      ],
      structureDescription: "Batch acceptance summary with batch identifier and count.",
      sampleJson: JSON.stringify(
        {
          batch_id: "BATCH-INTERACT-20261013-001",
          status: "Accepted",
          message_count: 2,
          accepted_time: "2026-10-13T10:20:00Z",
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "JSON Batch Array",
      encodingDescription: "JSON array of InterAct message envelopes, each embedding Base64 ISO 20022 XML payloads.",
    },
  },

  20: {
    id: 20,
    name: "GET — Download Single InterAct Message",
    method: "GET",
    urlTemplate: "/v2/interact/messages/{distribution-id}",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Downloads incoming or copy ISO 20022 XML InterAct message payload using distribution ID.",
    functionality:
      "Retrieves the InterAct XML message envelope and Base64-encoded ISO 20022 XML document (e.g. pacs.008, pain.001, camt.053, or FINplus messages). In Release 2.1, includes usage_identifier and contingency_processing_code.",
    businessPurpose:
      "Core endpoint for receiving next-generation ISO 20022 real-time and cross-border payment instructions.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the InterAct message.", example: "55001239800" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "InterAct message and ISO 20022 XML payload returned." }],
      headers: [
        { name: "Content-Type", description: "application/json;charset=UTF-8" },
        { name: "X-SWIFT-Integrity", description: "Integrity JWT header." },
      ],
      structureDescription: "Contains 'distribution' and 'message' envelope with Base64 XML payload.",
      sampleJson: JSON.stringify(
        {
          distribution: { id: 55001239800, service: "interAct", type: "message" },
          message: {
            service: "swift.interact",
            sender: "BANKGB22XXXX",
            receiver: "BANKUS33XXXX",
            usage_identifier: "pacs.008.001.08",
            payload: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPERvY3VtZW50... (Base64 XML)",
          },
        },
        null,
        2
      ),
    },
    payloadGuide: {
      format: "Base64 (ISO 20022 XML)",
      encodingDescription: "Base64 string representing an ISO 20022 XML Document with AppHdr and Document blocks.",
      decodedExample: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MSG20261010-001</MsgId>
      <CreDtTm>2026-10-10T12:00:00Z</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>E2E-998877</EndToEndId>
        <UETR>c169124c-30c7-4485-8cb1-b894df526ec9</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="USD">10000.00</IntrBkSttlmAmt>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`,
      fieldBreakdown: [
        { field: "<MsgId>", meaning: "Group Header Message Identifier." },
        { field: "<UETR>", meaning: "Unique End-to-End Transaction Reference (RFC 4122 UUID)." },
        { field: "<IntrBkSttlmAmt>", meaning: "Interbank settlement currency and amount." },
      ],
    },
  },

  // ========================================================
  // 17. GET /v2/interact/messages - Batch InterAct Messages
  // ========================================================

  21: {
    id: 21,
    name: "GET — Download Multiple InterAct Messages",
    method: "GET",
    urlTemplate: "/v2/interact/messages",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Downloads multiple ISO 20022 XML messages using comma-separated distribution IDs.",
    functionality: "Batched retrieval of ISO 20022 XML messages via ?distribution-id=id1,id2,id3.",
    businessPurpose: "High-volume ingestion of ISO 20022 payments.",
    request: {
      queryParams: [
        { name: "distribution-id", type: "string", required: true, description: "Comma-separated distribution IDs.", example: "55001239800,55001239801" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Array of InterAct messages returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Array of { distribution, message } objects.",
      sampleJson: JSON.stringify([{ distribution: { id: 55001239800 }, message: { payload: "..." } }], null, 2),
    },
    payloadGuide: { format: "Base64 (ISO 20022 XML)", encodingDescription: "Collection of ISO 20022 XML payloads." },
  },

  // ========================================================
  // 18. GET /v2/interact/transmission-reports/{distribution-id} - Single InterAct Transmission Report
  // ========================================================

  22: {
    id: 22,
    name: "GET — Download Single Transmission Report",
    method: "GET",
    urlTemplate: "/v2/interact/transmission-reports/{distribution-id}",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Retrieves transmission report payload for a previously sent InterAct message.",
    functionality: "Returns Base64-encoded transmission_report_payload containing technical ACK/NAK from the SWIFT network.",
    businessPurpose: "Validates acceptance of outgoing ISO 20022 messages into the SWIFT network.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the report.", example: "55001239805" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Transmission report returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Contains 'distribution' and 'transmission_report' with Base64 payload.",
      sampleJson: JSON.stringify(
        {
          distribution: { id: 55001239805, service: "interAct", type: "transmissionReport" },
          transmission_report: { transmission_report_payload: "... (Base64)" },
        },
        null,
        2
      ),
    },
    payloadGuide: { format: "Base64 (ISO 20022 XML)", encodingDescription: "Base64 encoded technical transmission ACK XML." },
  },

  // ========================================================
  // 19. GET /v2/interact/transmission-reports - Batch InterAct Transmission Reports
  // ========================================================

  23: {
    id: 23,
    name: "GET — Download Multiple Transmission Reports",
    method: "GET",
    urlTemplate: "/v2/interact/transmission-reports",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Retrieves multiple InterAct transmission reports using comma-separated distribution IDs.",
    functionality: "Batched retrieval of InterAct transmission reports.",
    businessPurpose: "Reconciliation of sent ISO 20022 batches.",
    request: {
      queryParams: [
        { name: "distribution-id", type: "string", required: true, description: "Comma-separated distribution IDs.", example: "55001239805,55001239806" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Array of transmission reports returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Array of { distribution, transmission_report } objects.",
      sampleJson: JSON.stringify([{ distribution: { id: 55001239805 } }], null, 2),
    },
    payloadGuide: { format: "JSON Report Structure", encodingDescription: "Batch transmission reports." },
  },

  // ========================================================
  // 20. GET /v2/interact/delivery-reports/{distribution-id} - Single InterAct Delivery Report
  // ========================================================

  24: {
    id: 24,
    name: "GET — Download Single Delivery Report",
    method: "GET",
    urlTemplate: "/v2/interact/delivery-reports/{distribution-id}",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Retrieves recipient delivery confirmation report for an InterAct ISO 20022 message.",
    functionality: "Retrieves matched delivery confirmation report containing delivery_notification_payload in Base64.",
    businessPurpose: "Establishes definitive delivery of ISO 20022 payments to beneficiary financial institutions.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the delivery report.", example: "55001239810" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Delivery report returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Contains 'distribution' and 'delivery_report' objects.",
      sampleJson: JSON.stringify(
        {
          distribution: { id: 55001239810, service: "interAct", type: "deliveryReport" },
          delivery_report: { delivery_notification_payload: "..." },
        },
        null,
        2
      ),
    },
    payloadGuide: { format: "Base64 (ISO 20022 XML)", encodingDescription: "Base64 delivery confirmation payload." },
  },

  // ========================================================
  // 21. GET /v2/interact/delivery-reports - Batch InterAct Delivery Reports
  // ========================================================

  25: {
    id: 25,
    name: "GET — Download Multiple Delivery Reports",
    method: "GET",
    urlTemplate: "/v2/interact/delivery-reports",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Retrieves multiple InterAct delivery reports using comma-separated distribution IDs.",
    functionality: "Batched download of delivery confirmation reports.",
    businessPurpose: "Batch reconciliation of delivered ISO 20022 transfers.",
    request: {
      queryParams: [
        { name: "distribution-id", type: "string", required: true, description: "Comma-separated distribution IDs.", example: "55001239810,55001239811" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Array of delivery reports returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Array of { distribution, delivery_report } objects.",
      sampleJson: JSON.stringify([{ distribution: { id: 55001239810 } }], null, 2),
    },
    payloadGuide: { format: "JSON Report Structure", encodingDescription: "Batch delivery reports." },
  },

  // ========================================================
  // 22. GET /v2/interact/delivery-notifications/{distribution-id} - Single InterAct Delivery Notification
  // ========================================================

  26: {
    id: 26,
    name: "GET — Download Single Delivery Notification",
    method: "GET",
    urlTemplate: "/v2/interact/delivery-notifications/{distribution-id}",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Retrieves unmatched delivery notification for InterAct messages sent outside Alliance Cloud.",
    functionality: "Retrieves unmatched delivery notification arriving during interface migration.",
    businessPurpose: "Maintains audit consistency for ISO 20022 messages in flight during migrations.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the notification.", example: "55001239815" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Delivery notification returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Contains 'distribution' and 'delivery_notification' with payload.",
      sampleJson: JSON.stringify({ distribution: { id: 55001239815 }, delivery_notification: { payload: "..." } }, null, 2),
    },
    payloadGuide: { format: "Base64 (ISO 20022 XML)", encodingDescription: "Raw Base64 delivery notification XML." },
  },

  // ========================================================
  // 23. GET /v2/interact/delivery-notifications - Batch InterAct Delivery Notifications
  // ========================================================

  27: {
    id: 27,
    name: "GET — Download Multiple Delivery Notifications",
    method: "GET",
    urlTemplate: "/v2/interact/delivery-notifications",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Retrieves multiple InterAct delivery notifications using comma-separated distribution IDs.",
    functionality: "Batched retrieval of unmatched InterAct delivery notices.",
    businessPurpose: "Batch migration reconciliation.",
    request: {
      queryParams: [
        { name: "distribution-id", type: "string", required: true, description: "Comma-separated distribution IDs.", example: "55001239815,55001239816" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Array of delivery notifications returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Array of { distribution, delivery_notification } objects.",
      sampleJson: JSON.stringify([{ distribution: { id: 55001239815 } }], null, 2),
    },
    payloadGuide: { format: "JSON Report Structure", encodingDescription: "Collection of delivery notifications." },
  },

  // ========================================================
  // 24. GET /v2/interact/exports/{distribution-id} - Download InterAct Export
  // ========================================================

  28: {
    id: 28,
    name: "GET — Download Message Export",
    method: "GET",
    urlTemplate: "/v2/interact/exports/{distribution-id}",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Downloads an export of an InterAct ISO 20022 message in PDF format.",
    functionality: "Retrieves a formatted PDF rendition of an ISO 20022 message.",
    businessPurpose: "Compliance review, audit documentation, customer payment confirmation vouchers.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the export.", example: "55001239820" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json (or application/pdf)", description: "JSON with Base64 or binary PDF." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "PDF export document returned." }],
      headers: [{ name: "Content-Type", description: "application/json (or application/pdf)" }],
      structureDescription: "Contains 'distribution' and Base64 'export' string.",
      sampleJson: JSON.stringify({ distribution: { id: 55001239820, export_format: "pdf" }, export: "JVBERi0xLjQ..." }, null, 2),
    },
    payloadGuide: { format: "Base64 (PDF)", encodingDescription: "Base64 string representing PDF bytes." },
  },

  // ========================================================
  // 25. GET /v2/interact/archives/{distribution-id} - Download InterAct Archive
  // ========================================================

  29: {
    id: 29,
    name: "GET — Download Message Archive",
    method: "GET",
    urlTemplate: "/v2/interact/archives/{distribution-id}",
    section: "InterAct",
    lifecycleStep: "Content Download",
    summary: "Downloads full archive of an InterAct message with ISO 20022 XML, history logs, and linked reports.",
    functionality: "Bundles complete message XML, chronological audit event history logs, transmission reports, and delivery reports.",
    businessPurpose: "Regulatory compliance and transaction lifecycle auditing for ISO 20022 payments.",
    request: {
      pathParams: [
        { name: "distribution-id", type: "string", required: true, description: "Distribution ID of the archive.", example: "55001239825" },
      ],
      headers: [
        { name: "Authorization", value: "Bearer <token>", description: "OAuth 2.0 Bearer access token." },
        { name: "Accept", value: "application/json", description: "Standard JSON API media type." },
      ],
    },
    response: {
      statusCodes: [{ code: 200, meaning: "OK", scenario: "Archive package returned." }],
      headers: [{ name: "Content-Type", description: "application/json;charset=UTF-8" }],
      structureDescription: "Contains 'distribution' and complete 'archive' object with history logs.",
      sampleJson: JSON.stringify(
        {
          distribution: { id: 55001239825, service: "interAct", type: "archive" },
          archive: {
            message: { payload: "..." },
            history_report: { history_logs: [{ code: "CREATED_RECEPTION", time: "2026-10-10T12:00:00Z" }] },
            transmission_reports: [],
            delivery_reports: [],
          },
        },
        null,
        2
      ),
    },
    payloadGuide: { format: "JSON Report Structure", encodingDescription: "Complete archive with history audit logs and reports." },
  },
};
