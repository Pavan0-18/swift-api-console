export interface InventoryRequest {
  id: number;
  slug: string;
  name: string;
  section: "Distributions" | "FIN" | "InterAct";
  folder: string;
  method: "GET" | "POST" | "PATCH";
  urlTemplate: string;
  description: string;
  headers: Record<string, string>;
  pathVariables?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyMode?: "raw" | "none";
  defaultBody?: unknown;
}

export const SWIFT_REQUEST_INVENTORY: InventoryRequest[] = [
  // ==========================================
  // 1. DISTRIBUTIONS (Service-Agnostic Queue)
  // ==========================================
  {
    id: 1,
    slug: "dist-list-available",
    name: "GET — List Available Distributions",
    section: "Distributions",
    folder: "v2 / distributions",
    method: "GET",
    urlTemplate: "/v2/distributions",
    description: "Polls and retrieves available distributions from Alliance Cloud queue with limit/offset pagination.",
    headers: { Accept: "application/json" },
    queryParams: { limit: "50", offset: "0" },
  },
  {
    id: 2,
    slug: "dist-get-single",
    name: "GET — Retrieve Single Distribution",
    section: "Distributions",
    folder: "v2 / distributions / {id}",
    method: "GET",
    urlTemplate: "/v2/distributions/{id}",
    description: "Retrieves metadata and download/action links for a single distribution by its identifier.",
    headers: { Accept: "application/json" },
    pathVariables: { id: "" },
  },
  {
    id: 3,
    slug: "dist-post-ack",
    name: "POST — Acknowledge Distribution (ACK)",
    section: "Distributions",
    folder: "v2 / distributions / {id} / acks",
    method: "POST",
    urlTemplate: "/v2/distributions/{id}/acks",
    description: "Confirms proper reception of distribution by the client, marking it 'distributed' and clearing it from queue.",
    headers: { Accept: "application/json" },
    pathVariables: { id: "" },
    bodyMode: "none",
  },
  {
    id: 4,
    slug: "dist-post-nak",
    name: "POST — Reject Distribution (NAK)",
    section: "Distributions",
    folder: "v2 / distributions / {id} / naks",
    method: "POST",
    urlTemplate: "/v2/distributions/{id}/naks",
    description: "Reports rejection of a distribution to Alliance Cloud with an optional reason message.",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    pathVariables: { id: "" },
    bodyMode: "raw",
    defaultBody: {
      reason: "Unable to process distribution in back-office application.",
    },
  },
  {
    id: 5,
    slug: "dist-patch-batch",
    name: "PATCH — Batch ACK / NAK Distribution Statuses",
    section: "Distributions",
    folder: "v2 / distributions",
    method: "PATCH",
    urlTemplate: "/v2/distributions",
    description: "Sends multiple ACK and NAK updates for multiple distributions in a single API call.",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    bodyMode: "raw",
    defaultBody: [
      { id: "", status: "Ack" },
      { id: "", status: "Nak", status_update_message: "Storage unavailable" },
    ],
  },

  // ==========================================
  // 2. FIN MESSAGING (MT - ISO 15022)
  // ==========================================
  {
    id: 6,
    slug: "fin-post-message-single",
    name: "POST — Send Single FIN Message",
    section: "FIN",
    folder: "v2 / fin / messages",
    method: "POST",
    urlTemplate: "/v2/fin/messages",
    description: "Emits a single FIN MT message (e.g. MT101, MT103, MT940) to Alliance Cloud with routing parameters and Base64-encoded MT payload.",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    bodyMode: "raw",
    defaultBody: {
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
      payload:
        "DQo6MjA6TE9XLTAwMDA4MjAyNzYxNw0KOjI4RDoxMjM0NS8xMjM0NQ0KOjUwTDp4DQo6NTBIOi94DQp4DQo6MzA6OTYxMTIzDQo6MjE6TE9XLTAwMDA4MjAyNzYxNw0KOjMyQjpVU0QxLDM0DQo6NTJBOkNIQVNVUzMzDQo6NTk6eA0KOjcxQTpTSEENCjoyMTpMT1ctMDAwMDgyMDI3NjE3DQo6MzJCOlVTRDEsMzQNCjo1MkE6Q0hBU1VTMzMNCjo1OTp4DQo6NzFBOlNIQQ==",
    },
  },
  {
    id: 7,
    slug: "fin-post-messages-batch",
    name: "POST — Send Batch of FIN Messages",
    section: "FIN",
    folder: "v2 / fin / messages / batch",
    method: "POST",
    urlTemplate: "/v2/fin/messages/batch",
    description: "Transmits a batch of up to 500 FIN messages to Alliance Cloud in a single call. Every item requires a unique sender_reference.",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    bodyMode: "raw",
    defaultBody: [
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
        payload:
          "DQo6MjA6TE9XLTAwMDA4MjAyNzYxNw0KOjI4RDoxMjM0NS8xMjM0NQ0KOjUwTDp4DQo6NTBIOi94DQp4DQo6MzA6OTYxMTIzDQo6MjE6TE9XLTAwMDA4MjAyNzYxNw0KOjMyQjpVU0QxLDM0DQo6NTJBOkNIQVNVUzMzDQo6NTk6eA0KOjcxQTpTSEENCjoyMTpMT1ctMDAwMDgyMDI3NjE3DQo6MzJCOlVTRDEsMzQNCjo1MkE6Q0hBU1VTMzMNCjo1OTp4DQo6NzFBOlNIQQ==",
      },
      {
        sender_reference: "LOW-000082027618",
        message_type: "fin.101",
        sender: "SWLLUS33XXXX",
        receiver: "SWHQBEBBXXXX",
        network_info: {
          network_priority: "Normal",
          uetr: "28bbfe98-e654-4037-8d1f-505650326e1b",
          delivery_monitoring: "NonDeliveryAndDelivery",
          possible_duplicate: false,
          validation_identifier: "STP",
          service_type_identifier: "001",
        },
        payload:
          "CjoyMDpMT1ctMDAwMDgyMDI3NjE4CjoyOEQ6MTIzNDUvMTIzNDUKOjUwTDp4Cjo1MEg6L3gKeAo6MzA6OTYxMTIzCjoyMTpMT1ctMDAwMDgyMDI3NjE4CjozMkI6VVNEMSwzNAo6NTJBOkNIQVNVUzMzCjo1OTp4Cjo3MUE6U0hBCjoyMTpMT1ctMDAwMDgyMDI3NjE4CjozMkI6VVNEMSwzNAo6NTJBOkNIQVNVUzMzCjo1OTp4Cjo3MUE6U0hB",
      },
    ],
  },
  {
    id: 8,
    slug: "fin-download-message-single",
    name: "GET — Download Single FIN Message",
    section: "FIN",
    folder: "v2 / fin / messages / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/fin/messages/{distribution-id}",
    description: "Downloads the message details and Base64-encoded MT payload using the distribution identifier.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 9,
    slug: "fin-download-messages-batch",
    name: "GET — Download Multiple FIN Messages",
    section: "FIN",
    folder: "v2 / fin / messages",
    method: "GET",
    urlTemplate: "/v2/fin/messages",
    description: "Downloads a batch of FIN messages using comma-separated distribution IDs.",
    headers: { Accept: "application/json" },
    queryParams: { "distribution-id": "" },
  },
  {
    id: 10,
    slug: "fin-download-transmission-report-single",
    name: "GET — Download Single Transmission Report",
    section: "FIN",
    folder: "v2 / fin / transmission-reports / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/fin/transmission-reports/{distribution-id}",
    description: "Retrieves network transmission status report and metadata for a previously sent FIN message.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 11,
    slug: "fin-download-transmission-reports-batch",
    name: "GET — Download Multiple Transmission Reports",
    section: "FIN",
    folder: "v2 / fin / transmission-reports",
    method: "GET",
    urlTemplate: "/v2/fin/transmission-reports",
    description: "Retrieves multiple FIN transmission reports using comma-separated distribution IDs.",
    headers: { Accept: "application/json" },
    queryParams: { "distribution-id": "" },
  },
  {
    id: 12,
    slug: "fin-download-delivery-report-single",
    name: "GET — Download Single Delivery Report",
    section: "FIN",
    folder: "v2 / fin / delivery-reports / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/fin/delivery-reports/{distribution-id}",
    description: "Retrieves the final delivery confirmation report to the recipient bank for a sent FIN message.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 13,
    slug: "fin-download-delivery-reports-batch",
    name: "GET — Download Multiple Delivery Reports",
    section: "FIN",
    folder: "v2 / fin / delivery-reports",
    method: "GET",
    urlTemplate: "/v2/fin/delivery-reports",
    description: "Retrieves multiple FIN delivery reports using comma-separated distribution IDs.",
    headers: { Accept: "application/json" },
    queryParams: { "distribution-id": "" },
  },
  {
    id: 14,
    slug: "fin-download-delivery-notification-single",
    name: "GET — Download Single Delivery Notification",
    section: "FIN",
    folder: "v2 / fin / delivery-notifications / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/fin/delivery-notifications/{distribution-id}",
    description: "Retrieves delivery notification for messages sent to the SWIFT network outside Alliance Cloud.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 15,
    slug: "fin-download-delivery-notifications-batch",
    name: "GET — Download Multiple Delivery Notifications",
    section: "FIN",
    folder: "v2 / fin / delivery-notifications",
    method: "GET",
    urlTemplate: "/v2/fin/delivery-notifications",
    description: "Retrieves multiple delivery notifications using comma-separated distribution IDs.",
    headers: { Accept: "application/json" },
    queryParams: { "distribution-id": "" },
  },
  {
    id: 16,
    slug: "fin-download-export",
    name: "GET — Download Message Export",
    section: "FIN",
    folder: "v2 / fin / exports / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/fin/exports/{distribution-id}",
    description: "Downloads an export of a FIN message in PDF document format or Base64 encoding.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 17,
    slug: "fin-download-archive",
    name: "GET — Download Message Archive",
    section: "FIN",
    folder: "v2 / fin / archives / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/fin/archives/{distribution-id}",
    description: "Downloads complete archive containing message, full history logs, transmission reports, and delivery reports.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },

  // ==========================================
  // 3. INTERACT (MX - ISO 20022 / XML)
  // ==========================================
  {
    id: 18,
    slug: "interact-post-message-single",
    name: "POST — Send Single InterAct Message",
    section: "InterAct",
    folder: "v2 / interact / messages",
    method: "POST",
    urlTemplate: "/v2/interact/messages",
    description: "Emits an ISO 20022 XML message (e.g. setr, pacs, camt) to Alliance Cloud with routing parameters and Base64-encoded XML payload.",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    bodyMode: "raw",
    defaultBody: {
      sender_reference: "TSORCASWHQCHZ0XXX_CAN_setr",
      service_code: "swift.if.ia",
      message_type: "setr.017.001.04",
      requestor: "ou=orca,o=swllus33,o=swift",
      responder: "ou=mfunds,o=swhqbebb,o=swift",
      interface_info: {
        product_info: [
          {
            vendor_name: "Company",
            product_name: "BOProd",
            version: "7.4.3",
          },
        ],
      },
      network_info: {
        user_reference: "IE19080850952607",
        network_priority: "Normal",
        possible_duplicate: false,
        delivery_notification_requested: true,
        copy_authorisation_notification_requested: false,
        recipients: ["ou=orca,o=swllus33,o=swift"],
        recipients_public: true,
        request_subtype: "trgt.t2.rtgs.01",
        request_type: "setr.017.001.04",
        end_to_end_sender_info: "E2EInformationIE19080850952607",
      },
      security_info: {
        signing_requested: false,
        non_repudiation_requested: false,
      },
      format: "MX",
      payload:
        "PGVudmVsb3BlOkVudmVsb3BlIHhtbG5zOmVudmVsb3BlPSJ1cm46c3dpZnQ6eHNkOmVudmVsb3BlIj48QXBwSGRyIHhtbG5zPSJ1cm46c3dpZnQ6eHNkOiRhaFYxMCI+PE1zZ1JlZj5JRTE5MDgwODUwOTUyNjA3PC9Nc2dSZWY+PENyRGF0ZT4yMDE5LTA4LTA4VDEzOjE4OjQ4PC9DckRhdGU+PC9BcHBIZHI+PERvY3VtZW50IHhtbG5zPSJ1cm46aXNvOnN0ZDppc286MjAwMjI6dGVjaDp4c2Q6c2V0ci4wMTcuMDAxLjA0Ij48T3JkckN4bFN0c1JwdD48TXNnSWQ+PElkPklFMTkwODA4NTA5NTI2MDc8L0lkPjxDcmVEdFRtPjIwMTktMDgtMDhUMTM6MTg6NDg8L0NyZUR0VG0+PC9Nc2dJZD48U3RzUnB0PjxJbmR2Q3hsU3RzUnB0PjxPcmRyUmVmPkdaVUJMMDQwMDQ1NTQ2OEI8L09yZHJSZWY+PEN4bFN0cz48U3RzPkNBTkQ8L1N0cz48L0N4bFN0cz48L0luZHZDeGxTdHNScHQ+PC9TdHNScHQ+PC9PcmRyQ3hsU3RzUnB0PjwvRG9jdW1lbnQ+PC9lbnZlbG9wZTpFbnZlbG9wZT4=",
    },
  },
  {
    id: 19,
    slug: "interact-post-messages-batch",
    name: "POST — Send Batch of InterAct Messages",
    section: "InterAct",
    folder: "v2 / interact / messages / batch",
    method: "POST",
    urlTemplate: "/v2/interact/messages/batch",
    description: "Transmits a batch of up to 50 InterAct messages to Alliance Cloud in a single call. All items must have unique sender_reference fields.",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    bodyMode: "raw",
    defaultBody: [
      {
        sender_reference: "TSORCASWHQCHZ0XXX_CAN_setr_01",
        service_code: "swift.if.ia",
        message_type: "setr.017.001.04",
        requestor: "ou=orca,o=swllus33,o=swift",
        responder: "ou=mfunds,o=swhqbebb,o=swift",
        interface_info: {
          product_info: [
            {
              vendor_name: "Company",
              product_name: "BOProd",
              version: "7.4.3",
            },
          ],
        },
        network_info: {
          user_reference: "IE19080850952607",
          network_priority: "Normal",
          possible_duplicate: false,
          delivery_notification_requested: true,
          copy_authorisation_notification_requested: false,
          recipients: ["ou=orca,o=swllus33,o=swift"],
          recipients_public: true,
          request_subtype: "trgt.t2.rtgs.01",
          request_type: "setr.017.001.04",
          end_to_end_sender_info: "E2EInformationIE19080850952607",
        },
        security_info: {
          signing_requested: false,
          non_repudiation_requested: false,
        },
        format: "MX",
        payload:
          "PGVudmVsb3BlOkVudmVsb3BlIHhtbG5zOmVudmVsb3BlPSJ1cm46c3dpZnQ6eHNkOmVudmVsb3BlIj48QXBwSGRyIHhtbG5zPSJ1cm46c3dpZnQ6eHNkOiRhaFYxMCI+PE1zZ1JlZj5JRTE5MDgwODUwOTUyNjA3PC9Nc2dSZWY+PENyRGF0ZT4yMDE5LTA4LTA4VDEzOjE4OjQ4PC9DckRhdGU+PC9BcHBIZHI+PERvY3VtZW50IHhtbG5zPSJ1cm46aXNvOnN0ZDppc286MjAwMjI6dGVjaDp4c2Q6c2V0ci4wMTcuMDAxLjA0Ij48T3JkckN4bFN0c1JwdD48TXNnSWQ+PElkPklFMTkwODA4NTA5NTI2MDc8L0lkPjxDcmVEdFRtPjIwMTktMDgtMDhUMTM6MTg6NDg8L0NyZUR0VG0+PC9Nc2dJZD48U3RzUnB0PjxJbmR2Q3hsU3RzUnB0PjxPcmRyUmVmPkdaVUJMMDQwMDQ1NTQ2OEI8L09yZHJSZWY+PEN4bFN0cz48U3RzPkNBTkQ8L1N0cz48L0N4bFN0cz48L0luZHZDeGxTdHNScHQ+PC9TdHNScHQ+PC9PcmRyQ3hsU3RzUnB0PjwvRG9jdW1lbnQ+PC9lbnZlbG9wZTpFbnZlbG9wZT4=",
      },
      {
        sender_reference: "TSORCASWHQCHZ0XXX_CAN_setr_02",
        service_code: "swift.if.ia",
        message_type: "setr.017.001.04",
        requestor: "ou=orca,o=swllus33,o=swift",
        responder: "ou=mfunds,o=swhqbebb,o=swift",
        interface_info: {
          product_info: [
            {
              vendor_name: "Company",
              product_name: "BOProd",
              version: "7.4.3",
            },
          ],
        },
        network_info: {
          user_reference: "IE19080850952608",
          network_priority: "Normal",
          possible_duplicate: false,
          delivery_notification_requested: true,
          copy_authorisation_notification_requested: false,
          recipients: ["ou=orca,o=swllus33,o=swift"],
          recipients_public: true,
          request_subtype: "trgt.t2.rtgs.01",
          request_type: "setr.017.001.04",
          end_to_end_sender_info: "E2EInformationIE19080850952608",
        },
        security_info: {
          signing_requested: false,
          non_repudiation_requested: false,
        },
        format: "MX",
        payload:
          "PGVudmVsb3BlOkVudmVsb3BlIHhtbG5zOmVudmVsb3BlPSJ1cm46c3dpZnQ6eHNkOmVudmVsb3BlIj48QXBwSGRyIHhtbG5zPSJ1cm46c3dpZnQ6eHNkOiRhaFYxMCI+PE1zZ1JlZj5JRTE5MDgwODUwOTUyNjA3PC9Nc2dSZWY+PENyRGF0ZT4yMDE5LTA4LTA4VDEzOjE4OjQ4PC9DckRhdGU+PC9BcHBIZHI+PERvY3VtZW50IHhtbG5zPSJ1cm46aXNvOnN0ZDppc286MjAwMjI6dGVjaDp4c2Q6c2V0ci4wMTcuMDAxLjA0Ij48T3JkckN4bFN0c1JwdD48TXNnSWQ+PElkPklFMTkwODA4NTA5NTI2MDc8L0lkPjxDcmVEdFRtPjIwMTktMDgtMDhUMTM6MTg6NDg8L0NyZUR0VG0+PC9Nc2dJZD48U3RzUnB0PjxJbmR2Q3hsU3RzUnB0PjxPcmRyUmVmPkdaVUJMMDQwMDQ1NTQ2OEI8L09yZHJSZWY+PEN4bFN0cz48U3RzPkNBTkQ8L1N0cz48L0N4bFN0cz48L0luZHZDeGxTdHNScHQ+PC9TdHNScHQ+PC9PcmRyQ3hsU3RzUnB0PjwvRG9jdW1lbnQ+PC9lbnZlbG9wZTpFbnZlbG9wZT4=",
      },
    ],
  },
  {
    id: 20,
    slug: "interact-download-message-single",
    name: "GET — Download Single InterAct Message",
    section: "InterAct",
    folder: "v2 / interact / messages / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/interact/messages/{distribution-id}",
    description: "Downloads incoming or copy ISO 20022 XML InterAct message payload using distribution ID.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 21,
    slug: "interact-download-messages-batch",
    name: "GET — Download Multiple InterAct Messages",
    section: "InterAct",
    folder: "v2 / interact / messages",
    method: "GET",
    urlTemplate: "/v2/interact/messages",
    description: "Downloads multiple ISO 20022 XML messages using comma-separated distribution IDs.",
    headers: { Accept: "application/json" },
    queryParams: { "distribution-id": "" },
  },
  {
    id: 22,
    slug: "interact-download-transmission-report-single",
    name: "GET — Download Single Transmission Report",
    section: "InterAct",
    folder: "v2 / interact / transmission-reports / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/interact/transmission-reports/{distribution-id}",
    description: "Retrieves transmission report payload for a previously sent InterAct message.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 23,
    slug: "interact-download-transmission-reports-batch",
    name: "GET — Download Multiple Transmission Reports",
    section: "InterAct",
    folder: "v2 / interact / transmission-reports",
    method: "GET",
    urlTemplate: "/v2/interact/transmission-reports",
    description: "Retrieves multiple InterAct transmission reports using comma-separated distribution IDs.",
    headers: { Accept: "application/json" },
    queryParams: { "distribution-id": "" },
  },
  {
    id: 24,
    slug: "interact-download-delivery-report-single",
    name: "GET — Download Single Delivery Report",
    section: "InterAct",
    folder: "v2 / interact / delivery-reports / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/interact/delivery-reports/{distribution-id}",
    description: "Retrieves recipient delivery confirmation report for an InterAct ISO 20022 message.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 25,
    slug: "interact-download-delivery-reports-batch",
    name: "GET — Download Multiple Delivery Reports",
    section: "InterAct",
    folder: "v2 / interact / delivery-reports",
    method: "GET",
    urlTemplate: "/v2/interact/delivery-reports",
    description: "Retrieves multiple InterAct delivery reports using comma-separated distribution IDs.",
    headers: { Accept: "application/json" },
    queryParams: { "distribution-id": "" },
  },
  {
    id: 26,
    slug: "interact-download-delivery-notification-single",
    name: "GET — Download Single Delivery Notification",
    section: "InterAct",
    folder: "v2 / interact / delivery-notifications / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/interact/delivery-notifications/{distribution-id}",
    description: "Retrieves unmatched delivery notification for InterAct messages sent outside Alliance Cloud.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 27,
    slug: "interact-download-delivery-notifications-batch",
    name: "GET — Download Multiple Delivery Notifications",
    section: "InterAct",
    folder: "v2 / interact / delivery-notifications",
    method: "GET",
    urlTemplate: "/v2/interact/delivery-notifications",
    description: "Retrieves multiple InterAct delivery notifications using comma-separated distribution IDs.",
    headers: { Accept: "application/json" },
    queryParams: { "distribution-id": "" },
  },
  {
    id: 28,
    slug: "interact-download-export",
    name: "GET — Download Message Export",
    section: "InterAct",
    folder: "v2 / interact / exports / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/interact/exports/{distribution-id}",
    description: "Downloads an export of an InterAct ISO 20022 message in PDF format.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
  {
    id: 29,
    slug: "interact-download-archive",
    name: "GET — Download Message Archive",
    section: "InterAct",
    folder: "v2 / interact / archives / {distribution-id}",
    method: "GET",
    urlTemplate: "/v2/interact/archives/{distribution-id}",
    description: "Downloads full archive of an InterAct message with ISO 20022 XML, history logs, and linked reports.",
    headers: { Accept: "application/json" },
    pathVariables: { "distribution-id": "" },
  },
];

export function getInventoryRequestById(id: number | string): InventoryRequest | undefined {
  if (typeof id === "number") {
    return SWIFT_REQUEST_INVENTORY.find((r) => r.id === id);
  }
  const numericId = parseInt(id, 10);
  if (!isNaN(numericId)) {
    return SWIFT_REQUEST_INVENTORY.find((r) => r.id === numericId);
  }
  return SWIFT_REQUEST_INVENTORY.find(
    (r) => r.slug.toLowerCase() === id.toLowerCase() || String(r.id) === id
  );
}

export function searchInventory(query: string): InventoryRequest[] {
  const q = query.trim().toLowerCase();
  if (!q) return SWIFT_REQUEST_INVENTORY;
  return SWIFT_REQUEST_INVENTORY.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.urlTemplate.toLowerCase().includes(q) ||
      r.section.toLowerCase().includes(q) ||
      r.folder.toLowerCase().includes(q) ||
      String(r.id) === q ||
      `#${r.id}` === q
  );
}
