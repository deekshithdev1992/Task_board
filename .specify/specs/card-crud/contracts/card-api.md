# Contracts: Card API

## HTTP Endpoints

### List cards in a board/column
- Method: `GET` /api/boards/:boardId/cards
- Query params: `columnId` (optional)
- Response: `200` — `{ cards: Card[] }`

### Create card
- Method: `POST` /api/boards/:boardId/cards
- Body: `{ title: string, description?: string, columnId?: UUID }`
- Response: `201` — `{ card: Card }`

### Get card
- Method: `GET` /api/cards/:cardId
- Response: `200` — `{ card: Card }`

### Update card
- Method: `PUT` /api/cards/:cardId
- Body: `{ title?: string, description?: string, columnId?: UUID, position?: number }`
- Response: `200` — `{ card: Card }`

### Delete card
- Method: `DELETE` /api/cards/:cardId
- Response: `204` — no content

## Realtime Events (WebSocket)

- Event: `card.created` — Payload: `{ card: Card }`
- Event: `card.updated` — Payload: `{ card: Card }`
- Event: `card.deleted` — Payload: `{ cardId: UUID, boardId: UUID, columnId?: UUID }`

Clients should subscribe to a board-specific channel or namespace (e.g., `board:{boardId}`) to receive events relevant to that board. Events must include a `timestamp` and `originatingUserId` for conflict resolution and auditing.
