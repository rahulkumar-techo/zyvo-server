# Zyvo System Architecture

High-level architecture, service interactions, and request flows for the Zyvo microservices platform.

---

## 1. System Topology

```mermaid
flowchart TB
    subgraph CLIENTS["1. CLIENT LAYER"]
        PA["Passenger App<br/>(Expo + React Native)"]
        DA["Driver App<br/>(Expo + React Native)"]
        AD["Admin Dashboard<br/>(Next.js Web)"]
    end

    subgraph EDGE["2. EDGE / API LAYER"]
        LB["Load Balancer / TLS Termination"]
        GW["API Gateway (Fastify)<br/>Rate Limiting · Request ID · Upstream Proxy"]
        JWT["Auth Guard<br/>JWT Validation · Iss · Aud · Exp"]
        POLICY["Route Policies<br/>Roles · Scopes · Permissions"]
    end

    subgraph IDENTITY["3. IDENTITY DOMAIN"]
        AUTH["Auth Service<br/>Credentials · Sessions · Refresh Rotation"]
        USERS["User Service<br/>Passenger Profiles · Contacts"]
        DRIVERS["Driver Service<br/>KYC · Vehicles · Approval Status"]
    end

    subgraph RIDE["4. RIDE DOMAIN"]
        LOC["Location Service<br/>GPS Ingestion · Geospatial Tracking"]
        SEARCH["Matching Service<br/>Nearby Search · Driver Offers"]
        FARE["Pricing Service<br/>Base Fares · Surge Multiplier"]
        TRIP["Trip Service<br/>Ride State Machine"]
        MAPS["Maps Adapter<br/>Routing · Distance · ETA"]
    end

    subgraph COMMERCE["5. PAYMENT & POST-TRIP DOMAIN"]
        PAY["Payment Service<br/>Auth · Capture · Refunds · Webhooks"]
        WALLET["Wallet / Ledger Service<br/>Double-entry Bookkeeping (Paise)"]
        RATING["Rating Service<br/>Reviews & Aggregated Scores"]
        NOTIFY["Notification Service<br/>Push (FCM/APNs) · SMS · Email"]
    end

    subgraph DATA["6. STORAGE & INFRASTRUCTURE"]
        PG[("PostgreSQL 16+<br/>Multi-Schema Domain Stores")]
        REDIS[("Redis 7+<br/>TTL Cache · Geo Indexing · Locks")]
        BUS[["Message Broker<br/>Domain Events · Async Workflows"]]
        OBJ[("Object Storage (S3/R2)<br/>KYC Documents · Media")]
    end

    PA --> LB
    DA --> LB
    AD --> LB
    LB --> GW
    GW --> JWT
    JWT --> POLICY
    POLICY --> AUTH
    POLICY --> USERS
    POLICY --> DRIVERS
    POLICY --> LOC
    POLICY --> SEARCH
    POLICY --> FARE
    POLICY --> TRIP
    POLICY --> PAY
    POLICY --> WALLET
    POLICY --> RATING

    SEARCH --> LOC
    SEARCH --> FARE
    SEARCH --> MAPS
    TRIP --> FARE
    TRIP --> DRIVERS
    TRIP --> PAY
    TRIP --> NOTIFY
    PAY --> WALLET
    RATING --> TRIP

    AUTH --> PG
    USERS --> PG
    DRIVERS --> PG
    DRIVERS --> OBJ
    LOC --> REDIS
    SEARCH --> REDIS
    FARE --> REDIS
    TRIP --> PG
    PAY --> PG
    WALLET --> PG
    RATING --> PG

    TRIP --> BUS
    PAY --> BUS
    DRIVERS --> BUS
    LOC --> BUS
    BUS --> NOTIFY
    BUS --> WALLET
    BUS --> RATING

    DA -. "WebSocket: Driver GPS Stream" .-> GW
    PA -. "WebSocket: Live Trip Tracking" .-> GW

    classDef edge fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A
    classDef domain fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef infra fill:#FEF3C7,stroke:#D97706,color:#78350F
    classDef identity fill:#F3E8FF,stroke:#9333EA,color:#581C87

    class GW,JWT,POLICY,LB edge
    class SEARCH,LOC,FARE,TRIP,MAPS,PAY,WALLET,RATING,NOTIFY domain
    class PG,REDIS,BUS,OBJ infra
    class AUTH,USERS,DRIVERS identity
```

---

## 2. Request Flows

### A. Authentication & Refresh Token Rotation

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (App / Web)
    participant G as API Gateway (:4000)
    participant A as Auth Service (:4001)
    participant DB as PostgreSQL (Local / Cloud)

    Note over C,DB: Phase 1: User Login
    C->>G: POST /api/v1/auth/login { phoneOrEmail, password }
    G->>A: Reverse Proxy -> POST /auth/login
    A->>DB: Query user & credentials
    DB-->>A: Record + Scrypt Hash
    A->>A: Verify Password & Sign JWT Access Token
    A->>DB: Store RefreshSession (token_hash)
    A-->>G: 200 OK + Body Tokens + Set-Cookie
    G-->>C: 200 OK (Tokens in Body & HttpOnly Cookies)

    Note over C,DB: Phase 2: Token Rotation
    C->>G: POST /api/v1/auth/refresh (Cookie or Body)
    G->>A: Reverse Proxy -> POST /auth/refresh
    A->>DB: Validate token_hash in refresh_sessions
    DB-->>A: Active session verified
    A->>DB: Invalidate old token & rotate new token hash
    A-->>G: 200 OK + New Tokens
    G-->>C: 200 OK (Rotated Access & Refresh Tokens)
```

---

### B. Ride Booking & Concurrency-Safe Matching

```mermaid
sequenceDiagram
    autonumber
    participant P as Passenger App
    participant G as API Gateway
    participant F as Pricing Service
    participant T as Trip Service
    participant M as Matching Service
    participant R as Redis (Geo)
    participant D as Driver App
    participant PAY as Payment Service

    P->>G: POST /api/v1/pricing/estimate { pickup, dropoff }
    G->>F: Calculate base fare, distance & surge
    F-->>G: Fare estimate + estimateId (5m TTL)
    G-->>P: Return estimate response

    P->>G: POST /api/v1/trips { estimateId, idempotencyKey }
    G->>T: Create ride request
    T->>T: Validate idempotency & estimate expiry
    T->>PAY: Pre-authorize payment hold
    T->>M: Request nearest driver dispatch
    M->>R: GEOSEARCH nearby active drivers
    M-->>D: Push ride offer (15s accept timeout)

    D->>G: POST /api/v1/trips/{id}/accept
    G->>T: Accept offer
    T->>T: Atomic assignment & state transition (REQUESTED -> ACCEPTED)
    T-->>P: WebSocket broadcast: Driver assigned with live ETA
```

---

## 3. Data Architecture Guidelines

* **Money Representation:** Always stored as integer **paise** (`Int`), never floating point numbers.
* **Timestamps:** ISO 8601 UTC with microsecond precision (`timestamptz(6)`).
* **Identifiers:** Universally Unique Identifiers (`UUIDv4`).
* **Cross-Domain References:** Service databases reference other domain entities strictly by UUID, avoiding physical database-level foreign key locks across decoupled service schemas.