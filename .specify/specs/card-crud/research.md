# Research: Card CRUD Decisions

Generated: 2026-06-03

## Decision: Language & Tooling

- Decision: Use TypeScript 5.x (latest stable in project CI) with `strict` enabled.
- Rationale: Project constitution mandates TypeScript strict mode; TypeScript 5.x provides improved performance and newer language features.
- Alternatives considered: Locking to older TypeScript 4.x for compatibility with legacy dependencies. Rejected because repository already expects strict TypeScript practices.

## Decision: Backend Framework

- Decision: Node.js with Express (minimal) or NestJS (if DI and structure desired). Recommend starting with Express for speed, migrating to NestJS if project complexity grows.
- Rationale: Express is widely supported, low friction for small feature additions, and has extensive middleware for validation and auth. NestJS would provide stronger structure but increases upfront setup.
- Alternatives: Deno, Go, or serverless functions. Rejected due to current team familiarity and ecosystem fit.

## Decision: Storage

- Decision: PostgreSQL for relational storage of cards and board metadata.
- Rationale: Strong ACID guarantees, mature migrations tooling, and good fit for relational data such as boards/columns/cards.
- Alternatives: MongoDB (rejected for stronger consistency needs) or in-memory stores (not suitable for persistence).

## Decision: Testing

- Decision: Jest for unit tests, React Testing Library for frontend components, and supertest for HTTP integration tests. Enforce coverage checks in CI to meet constitution gate (80%).
- Rationale: Jest is already standard for TypeScript/React stacks and integrates with coverage reporting.

## Decision: Realtime Synchronization Pattern

- Decision: Use WebSocket-based realtime channel implemented with Socket.IO (or native `ws`) for server-driven push updates of create/edit/delete events.
- Rationale: WebSockets provide bidirectional low-latency updates across connected clients. Socket.IO offers reconnection, fallbacks and event namespaces which simplify collaboration features.
- Alternatives considered: Server-Sent Events (SSE) — simpler but unidirectional and lacks client emission; WebRTC — overkill for this use-case. Chosen: WebSocket.

## CI / Coverage Enforcement

- Decision: Add CI step to fail the build when coverage < 80% for modified files; require unit tests and integration tests as part of PR checks.

## Scale & Performance Targets

- Decision: Optimize for boards with up to hundreds of cards and low thousands of concurrent users; profile and iterate if higher scale required.

## Next Steps

1. Add `research.md` to the feature spec (this file).
2. Create `/contracts/card-api.md` and `data-model.md` in Phase 1 based on these decisions.
