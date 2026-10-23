

# System architecture — complete node diagram

```
flowchart TB
    subgraph CLIENTS["1. CLIENT LAYER"]
        PA["Passenger App<br/>Expo + Zustand"]
        DA["Driver App<br/>Expo + Zustand"]
        AD["Admin Dashboard<br/>Web"]
    end

    subgraph EDGE["2. EDGE / API LAYER"]
        LB["Load Balancer / TLS"]
        GW["API Gateway<br/>Fastify<br/>Rate limit · Request ID · Routing"]
        JWT["Auth Guard<br/>JWT signature · iss · aud · exp"]
        POLICY["Route policy<br/>Scopes · Role"]
    end

    subgraph IDENTITY["3. IDENTITY"]
        AUTH["Auth Service<br/>Login · Refresh · Logout"]
        USERS["User Service<br/>Passenger · Profile"]
        DRIVERS["Driver Service<br/>KYC · Vehicle · Status"]
    end

    subgraph RIDE["4. RIDE DOMAIN"]
        LOC["Location Service<br/>GPS · Driver availability"]
        SEARCH["Ride Search / Matching<br/>Nearby drivers · Offers"]
        FARE["Pricing Service<br/>Fare estimate · Surge"]
        TRIP["Trip Service<br/>Ride state machine"]
        MAPS["Maps Adapter<br/>Routes · Distance · ETA"]
    end

    subgraph COMMERCE["5. PAYMENT / POST-TRIP"]
        PAY["Payment Service<br/>Authorization · Capture · Refund"]
        WALLET["Wallet / Ledger Service"]
        RATING["Rating Service"]
        NOTIFY["Notification Service<br/>Push · SMS · Email"]
    end

    subgraph DATA["6. STORAGE / INFRASTRUCTURE"]
        PG[("PostgreSQL<br/>Service-owned schemas / DBs")]
        REDIS[("Redis<br/>Cache · TTL · Geo · Locks")]
        BUS[["Message Broker<br/>Domain events"]]
        OBJ[("Object Storage<br/>KYC documents")]
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

    DA -. "WebSocket: location updates" .-> GW
    PA -. "WebSocket: trip updates" .-> GW

    classDef edge fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A
    classDef domain fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef infra fill:#FEF3C7,stroke:#D97706,color:#78350F
    classDef identity fill:#F3E8FF,stroke:#9333EA,color:#581C87

    class GW,JWT,POLICY,LB edge
    class SEARCH,LOC,FARE,TRIP,MAPS,PAY,WALLET,RATING,NOTIFY domain
    class PG,REDIS,BUS,OBJ infra
    class AUTH,USERS,DRIVERS identity
```

## Request flows — client se database tak
A. Login and token refresh

```
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant A as Auth Service
    participant DB as Auth DB

    C->>G: POST /api/v1/auth/login
    G->>A: Forward public auth route
    A->>DB: Verify credentials
    DB-->>A: User + password hash
    A->>A: Verify password
    A-->>G: Access token + refresh token
    G-->>C: 200 OK

    C->>G: GET /api/v1/rides/estimate + access token
    G->>G: Verify JWT locally
    G-->>C: 401 if expired
    C->>G: POST /api/v1/auth/refresh
    G->>A: Forward refresh request
    A->>DB: Validate refresh token / session
    A-->>G: New access token
    G-->>C: 200 OK
    C->>G: Retry original estimate request
    G->>G: Verify new access token

```
## B. Ride booking and driver matching
```

sequenceDiagram
    participant P as Passenger App
    participant G as Gateway
    participant F as Pricing
    participant T as Trip Service
    participant M as Matching
    participant R as Redis
    participant D as Driver App
    participant PAY as Payment Service

    P->>G: POST /rides/estimate
    G->>F: Origin + destination + category
    F-->>G: Fare estimate + expiry
    G-->>P: Estimate

    P->>G: POST /rides
    G->>T: Create ride with estimateId
    T->>T: Validate estimate + idempotency
    T->>PAY: Pre-authorize payment if required
    T->>M: Request driver matching
    M->>R: Find eligible nearby drivers
    M-->>D: Ride offer via WebSocket/push
    D->>G: Accept ride offer
    G->>T: Accept offer
    T->>T: Atomic assignment + state transition
    T-->>P: Driver assigned

```