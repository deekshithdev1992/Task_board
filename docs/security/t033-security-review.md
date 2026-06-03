# T033 — Security Validation & Hardening Review

## Authentication Architecture

- **`authMiddleware`** (`backend/src/middleware/auth.ts:19-38`) — Parses `Authorization: Bearer <userId>` header and sets `req.userId`. Applied at the router level in `server.ts:14` so all card routes go through it. No cryptographic token verification — it is a stub per the spec assumption (spec.md:123): *"Authentication and authorization are handled by existing systems."*
- **`requireAuth`** (`backend/src/middleware/auth.ts:40-45`) — Returns 401 if `req.userId` is not set. Applied individually to each card route. This is the enforcement gate: if `authMiddleware` fails to set `userId` (no header, malformed), `requireAuth` rejects the request.

## Route Protection Coverage

| Route | Method | `requireAuth` | `validateParams` |
|---|---|---|---|
| `/boards/:boardId/columns/:columnId/cards` | GET | Yes (`cards.controller.ts:26`) | `boardId`, `columnId` |
| `/boards/:boardId/columns/:columnId/cards` | POST | Yes (`cards.controller.ts:42`) | `boardId`, `columnId` |
| `/cards/:cardId` | GET | Yes (`cards.controller.ts:84`) | `cardId` |
| `/cards/:cardId` | PUT | Yes (`cards.controller.ts:105`) | `cardId` |
| `/cards/:cardId` | DELETE | Yes (`cards.controller.ts:146`) | `cardId` |
| `/health` | GET | No (intentionally open, `routes.ts:5`) | None |

All 5 card routes are protected. The health endpoint is intentionally open.

## Parameter Validation

- **`validateParams`** (`backend/src/middleware/validateParams.ts:3-10`) — Validates `cardId`, `boardId`, and `columnId` against a UUID regex (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`). Returns 400 with field-level error messages on mismatch. Applied to all card routes via the middleware chain.
- Dead code: `ID_REGEX` on line 4 is defined but never used.

## SQL Injection Prevention

- All database queries in `backend/src/models/card.ts` use parameterized bindings (`?` placeholders with `stmt.bind([...])`). No dynamic SQL string concatenation with user input.
- Dynamic SQL building in `card.ts:130` (`UPDATE cards SET ${updates.join(', ')}`) uses only hardcoded column names (`title`, `description`, `position`, `updated_at`), never user-controlled strings.

## Field Injection Vulnerability and Fix

**Vulnerability** (`backend/src/services/cardService.ts:112-116`, pre-fix):

```ts
const updated = {
  ...card,
  ...input, // spread any property from request body
  updated_at: new Date().toISOString(),
};
```

The `...input` spread allowed clients to overwrite `created_by`, `board_id`, `column_id`, and `id` by including them in the PUT body. The validation layer (`cardValidation.ts:86-103`) did not reject unknown fields.

**Fix** (`backend/src/services/cardService.ts:113-119`):

Replaced the raw spread with a whitelist that only copies `title`, `description`, and `position` from the input:

```ts
const allowed: Record<string, unknown> = {};
if (input.title !== undefined) allowed.title = input.title;
if (input.description !== undefined) allowed.description = input.description;
if (input.position !== undefined) allowed.position = input.position;

const updated = {
  ...card,
  ...allowed,
  updated_at: new Date().toISOString(),
};
```

**Regression test** (`tests/security/cardSecurity.spec.ts:260-293`): Sends `title`, `created_by`, `board_id`, and `id` in a PUT body. Asserts `title` updated but `created_by`, `board_id`, and `id` remain unchanged.

## Security Test Coverage

| Test Group | File | Tests | Coverage |
|---|---|---|---|
| Auth enforcement | `tests/security/cardSecurity.spec.ts` | 5 | All 5 routes reject unauthenticated requests with 401 |
| Invalid token | `tests/security/cardSecurity.spec.ts` | 2 | Malformed Bearer, error body format |
| Parameter validation | `tests/security/cardSecurity.spec.ts` | 5 | Non-UUID boardId, columnId, cardId on all relevant routes |
| Body validation | `tests/security/cardSecurity.spec.ts` | 3 | Empty title, too-long title (POST + PUT) |
| Not found | `tests/security/cardSecurity.spec.ts` | 3 | GET/PUT/DELETE non-existent card |
| Happy path with auth | `tests/security/cardSecurity.spec.ts` | 5 | Full CRUD lifecycle with valid auth |
| Field injection | `tests/security/cardSecurity.spec.ts` | 2 | Blocks overwrite of `created_by`, `board_id`, `id` |
| **Total** | | **25** | |

Additional coverage from backend validation tests (`backend/src/validation/__tests__/cardValidation.spec.ts`): 27 tests covering title, description, position edge cases.

## Accepted Risks

| Risk | Rationale | Mitigation |
|---|---|---|
| **No WebSocket authentication** | Out of scope for T033 (targets `backend/src/middleware/`). Spec assumption (spec.md:123) states auth is handled by existing systems. | Noted; can be added later via Socket.IO middleware. |
| **No authorization/ownership checks** | Spec assumption (spec.md:123) delegates authorization to existing systems. Any authenticated user can access any card. | **Constitution exception** (`.specify/memory/constitution.md §V.4`): Authorization checks MUST be enforced on all protected APIs. This gap exists because auth is delegated to an external system per spec.md. Tracked as future work. `created_by` field exists in the schema and model but is not enforced. |
| **Auth middleware is a stub** | Deliberate per spec — the real auth system is external. Accepts any `Bearer <string>` as valid. | The `requireAuth` gate ensures at minimum that some userId is present. Token verification should be added when the real auth system is integrated. |
| **No body size limit on express.json()** | Default Express limit (100kb) applies. | Consider adding `express.json({ limit: '1mb' })` for defense in depth. |
| **No XSS sanitization on title/description** | Frontend renders content as text (JSX escapes by default). | Consider adding server-side sanitization if HTML rendering is required in the future. |

## Final Verdict

**T033 status: COMPLETE**

The security validation and hardening tasks are complete:

- ✅ Authentication middleware (`auth.ts`) — stub pattern with `requireAuth` enforcement
- ✅ Route protection — all 5 card routes require authentication
- ✅ Parameter validation (`validateParams.ts`) — UUID validation on all route params
- ✅ SQL injection prevention — parameterized queries throughout `card.ts`
- ✅ Field injection fix — whitelist-based update in `cardService.ts`
- ✅ Security tests — 25 tests covering auth, params, validation, field injection
- ✅ Security review documentation (this file)
