# SWIFT API Console

> Enterprise developer console and visual testing suite for **SWIFT Alliance Cloud Messaging APIs** (v2.1.1).


Designed as a specialized, developer-friendly Postman-like tester for SWIFT FIN (MT), InterAct (MX), FileAct, and Distributions services.

---

## Features

- **OpenAPI 3.0.2 Driven**: Automatically parses SWIFT Alliance Cloud Messaging 2.1.1 OpenAPI specification with 40+ endpoints.
- **Environment Agnostic**: One-click switching between **Sandbox** (`https://sandbox.swift.com/alliancecloud/v2`) and **Test / SIPN** (`https://api-test.swiftnet.sipn.swift.com/alliancecloud-test/v2`). Production is safely disabled by default.
- **Secure Server-Side Session**: Direct OAuth 2.0 client credentials authentication against SWIFT API Gateway. Tokens are encrypted into httpOnly cookies via `jose` (AES-256-GCM); Consumer Secrets are never stored in client-side storage or logged.
- **Postman-Grade API Explorer**:
  - Structured parameter inputs (path, query, header)
  - Schema-aware JSON request body editor
  - Live response inspector with HTTP status, latency (`ms`), response headers, and formatted JSON/text body viewer
  - Request execution proxy to eliminate browser CORS restrictions

---

## Project Structure

```text
src/
├── app/
│   ├── page.tsx                     # Landing page & quick links
│   ├── layout.tsx                   # Root layout with providers & dark theme
│   ├── globals.css                  # Console design system CSS variables
│   ├── providers.tsx                # TanStack Query & Sonner toast provider
│   ├── auth/
│   │   └── page.tsx                 # SWIFT credentials connection page
│   ├── dashboard/
│   │   ├── page.tsx                 # Overview metrics & service navigator
│   │   ├── messaging/
│   │   │   └── page.tsx             # Interactive Messaging API Explorer
│   │   └── layout.tsx               # Dashboard wrapper layout
│   └── api/
│       ├── auth/
│       │   ├── token/route.ts       # SWIFT OAuth token exchange & cookie session
│       │   ├── session/route.ts     # Current session validation
│       │   └── logout/route.ts      # Clear active session
│       ├── openapi/
│       │   └── endpoints/route.ts   # Normalized OpenAPI categories & metadata
│       └── swift/
│           └── [...path]/route.ts   # Secure SWIFT API gateway proxy
│
├── components/
│   ├── auth/                        # AuthForm & ConnectionSuccessCard
│   ├── dashboard/                   # OverviewMetrics & QuickNavCards
│   ├── layout/                      # DashboardLayout, Header, Sidebar, ConnectionStatus
│   ├── messaging/                   # MessagingShell, ApiCategory, ApiEndpoint, RequestResponseViewer
│   └── ui/                          # Button, Input, Label, Select, Badge, Card, etc.
│
├── config/
│   ├── swift.ts                     # SWIFT app configuration & service list
│   └── swift-messaging-2.1.1.json   # SWIFT OpenAPI 3.0.2 Specification
│
├── lib/
│   ├── api/                         # Standardized responses & error handling
│   ├── swift/
│   │   ├── auth.ts                  # OAuth 2.0 token service
│   │   ├── client.ts                # SWIFT backend client
│   │   ├── environments.ts          # Environment definitions (Sandbox, Test, Prod)
│   │   ├── session.ts               # Encrypted cookie session handling
│   │   ├── types.ts                 # SWIFT types
│   │   └── openapi/
│   │       ├── parser.ts            # OpenAPI $ref resolver & categorizer
│   │       ├── registry.ts          # Endpoint query & search engine
│   │       └── types.ts             # Normalized operation types
│   ├── utils/
│   └── validation/                  # Zod input schemas
│
└── types/
    └── swift.ts                     # Core TypeScript interfaces
```

---

## Installation & Setup

### 1. Install dependencies

```bash
cd swift-api-console
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Authentication Flow

1. Open `/auth` in the console.
2. Select target environment (**Sandbox** or **Test**).
3. Enter your **Consumer Key** and **Consumer Secret**.
4. Click **Connect to SWIFT**:
   - The backend performs an OAuth 2.0 Client Credentials token exchange with SWIFT Gateway.
   - Upon success, the access token is encrypted into an `httpOnly` secure session cookie.
   - The browser receives a masked confirmation (`ak_***1234`) and automatically enables access to the **Messaging API** console.

---

## Supported Messaging Categories

- **Distributions**:
  - `GET /distributions`: Retrieve available download queue
  - `GET /distributions/{id}`: Query distribution details
  - `POST /distributions/{id}/acks`: Positive acknowledgements
  - `POST /distributions/{id}/naks`: Negative acknowledgements
- **FIN Messaging (ISO 15022 / MT)**:
  - `POST /fin/messages`: Send single MT message
  - `POST /fin/messages/batch`: Send MT messages batch
  - Transmission Reports, Delivery Reports, Delivery Notifications, Archives & Exports
- **InterAct Messaging (ISO 20022 / MX & XML)**:
  - `POST /interact/messages`: Send MX / XML message
  - `POST /interact/messages/batch`: Batch XML messages
  - Reports, Delivery Notifications, and Archives
- **FileAct (Bulk File Transfers)**:
  - `POST /fileact/transfers`: Initiate file transfer
  - Transfer ACKs, Reports, and Archives

---

## Build Verification

```bash
npm run build
```
