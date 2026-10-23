
## Security and reliability checklist
### Concern	Required implementation
- `Authentication`	JWT signature, issuer, audience, expiry validation
- `Authorization	Role/scope` policy plus resource ownership checks
- `Service identity`	Private networking and authenticated internal service calls
- `Input validation`	Fastify JSON Schema / TypeBox or equivalent
- Rate limiting	Per-IP, per-user and per-route policies
- `Idempotency`	Ride creation, payment intents, refunds, wallet adjustments
- `Database`	Transactions, indexes, constraints, migrations
- `Redis`	TTLs, eviction policy, connection limits, monitoring
- `Messaging`	Outbox, retry, deduplication, dead-letter queue
- `WebSocket`	Authentication, authorization, heartbeat, reconnect handling
- `Logging`	Structured logs with request ID and trace ID
- `Observability`	Metrics, distributed traces, health/readiness checks
- `Secrets`	Environment injection or secret manager; never commit .env
- `Testing`	Unit, integration, authorization, concurrency and load tests