# Spec Alignment Report: Card CRUD

Generated: 2026-06-03

## Scope

Compared these Spec Kit artifacts against the current implementation:

- `.specify/specs/card-crud/spec.md`
- `.specify/specs/card-crud/plan.md`
- `.specify/specs/card-crud/tasks.md`
- `.specify/specs/card-crud/contracts/card-api.md`
- `.specify/specs/card-crud/research.md`
- `.specify/specs/card-crud/quickstart.md`
- Backend routes, middleware, database setup, realtime implementation, frontend card services, and current tests

## Mismatches Found And Fixes Applied

| Area | Mismatch found | Fix applied | Final aligned state |
|---|---|---|---|
| Create endpoint | `contracts/card-api.md` and `tasks.md` referenced `POST /api/boards/:boardId/cards`, but implementation uses `POST /api/boards/:boardId/columns/:columnId/cards`. | Updated contracts and tasks to use the column-scoped create route. | Create card endpoint is `POST /api/boards/:boardId/columns/:columnId/cards`. |
| List endpoint | Contract listed `GET /api/boards/:boardId/cards` with optional `columnId`, but implementation exposes only `GET /api/boards/:boardId/columns/:columnId/cards`. | Replaced board-level list contract with column-scoped list contract. | List cards endpoint is `GET /api/boards/:boardId/columns/:columnId/cards`. |
| Card id parameter name | Plan used `:id` for get/update/delete in places, while implementation uses `:cardId`. | Updated plan endpoints to `:cardId`. | Detail/update/delete endpoints are `GET`, `PUT`, and `DELETE /api/cards/:cardId`. |
| Update request body | Contract allowed `columnId` updates, but `cardService.updateCard` whitelists only `title`, `description`, and `position`. | Removed `columnId` from update contract. | Update body is `{ title?: string, description?: string, position?: number }`. |
| Create request body | Contract allowed `columnId` in the body, but implementation gets `columnId` from the route parameter. | Removed body `columnId` from create contract. | Create body is `{ title: string, description?: string }`; `columnId` comes from the URL. |
| Authentication | Spec assumptions said auth was handled elsewhere, but actual Card routes are protected by `requireAuth` and require a bearer header. | Added spec clarification, contract auth requirement, and quickstart API authentication notes. | All Card API routes require `Authorization: Bearer <userId>`; the current middleware parses `<userId>` as the authenticated user id. |
| Authorization ownership | Constitution expects protected API authorization, but implementation does not enforce board/card ownership. | Spec assumptions now explicitly point to the accepted security exception. | Ownership authorization is not implemented for Card CRUD and is documented in `docs/security/t033-security-review.md`. |
| Realtime event names | Spec artifacts used dot names `card.created`, `card.updated`, and `card.deleted`, but implementation emits Socket.IO events `card:created`, `card:updated`, and `card:deleted`. | Updated plan, tasks, contracts, research, and quickstart to colon event names. | Realtime event names are `card:created`, `card:updated`, and `card:deleted`. |
| Realtime payload requirements | Contract required `timestamp` and `originatingUserId`, but implementation does not emit either field. | Removed that requirement and documented that implemented payloads do not include those fields. | `card:created` and `card:updated` payloads are `{ card }`; `card:deleted` payload is `{ cardId, boardId, columnId }`. |
| Realtime delete payload | Contract made `columnId` optional, but implementation always emits `columnId`. | Updated contract to require `columnId`. | `card:deleted` payload includes required `cardId`, `boardId`, and `columnId`. |
| Realtime subscription model | Contract described board-specific channel/namespace generically; implementation uses Socket.IO rooms and `join_board`. | Updated contract to describe `join_board` and room names `board:{boardId}` and `column:{columnId}`. | Clients join board rooms with `join_board`; server emits to board and column rooms. |
| Database technology | Plan said SQLite using `better-sqlite3`, while implementation uses sql.js. | Updated plan and research to sql.js-backed in-memory SQLite. | Database is in-memory SQLite via sql.js, seeded at startup with default columns. |
| Research note | Research said spec/data model still referenced PostgreSQL. | Replaced stale note with final aligned sql.js state. | Research, plan, data model, contracts, and quickstart all align on sql.js. |
| Conflict handling edge case | Spec edge case required conflict notification for near-simultaneous edits, but implementation uses last successful saved update and realtime broadcast. | Updated spec edge case to match implemented behavior. | Near-simultaneous edits resolve by applying and broadcasting the most recent successful saved update. |
| Task status format | `tasks.md` had completed US3 and validation tasks written as plain text instead of checked task entries. | Converted T025-T030C and T036-T040 to `[X]` task entries and added completed T041 for Playwright E2E coverage. | Task artifact reflects completed implementation and validation work in checkbox format. |
| Executable contract tests | Contract test text still referenced `POST /api/boards/:boardId/cards`, included `columnId` in the create body, and had a bad missing/empty-title assertion. | Updated contract tests to `POST /api/boards/:boardId/columns/:columnId/cards`, removed body `columnId`, and fixed the assertion. | Contract tests now match the aligned Card API contract and pass. |

## Final Aligned State

### Endpoints

- `GET /api/boards/:boardId/columns/:columnId/cards`
- `POST /api/boards/:boardId/columns/:columnId/cards`
- `GET /api/cards/:cardId`
- `PUT /api/cards/:cardId`
- `DELETE /api/cards/:cardId`

All endpoints require `Authorization: Bearer <userId>`.

### Event Names

- `card:created` with `{ card }`
- `card:updated` with `{ card }`
- `card:deleted` with `{ cardId, boardId, columnId }`

### Database

- SQLite implemented with sql.js.
- Database is in-memory during runtime.
- Startup seeds a default board and three columns.

### API Contracts

- Contracts now use column-scoped card create/list routes.
- Contracts use snake_case card fields matching implementation: `column_id`, `board_id`, `created_by`, `created_at`, and `updated_at`.
- Contracts include implemented auth, validation, not-found, and no-content response behavior.
- Contracts no longer require unsupported `timestamp`, `originatingUserId`, or `columnId` update behavior.
- Executable contract tests now match the same route and request-body shape.
