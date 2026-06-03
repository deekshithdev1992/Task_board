# Contracts: Card API

## HTTP Endpoints

All Card API endpoints require `Authorization: Bearer <userId>`. The current auth middleware parses the bearer value as the authenticated user id.

### List cards in a column
- Method: `GET` /api/boards/:boardId/columns/:columnId/cards
- Response: `200` — `{ cards: Card[] }`
- Error: `401` — `{ error: "Authentication required" }`
- Error: `400` — `{ errors: Array<{ field: string, message: string }> }` for invalid `boardId` or `columnId`

### Create card
- Method: `POST` /api/boards/:boardId/columns/:columnId/cards
- Body: `{ title: string, description?: string }`
- Response: `201` — `{ card: Card }`
- Error: `401` — `{ error: "Authentication required" }`
- Error: `400` — `{ errors: Array<{ field: string, message: string }> }` for invalid params or body validation failures

### Get card
- Method: `GET` /api/cards/:cardId
- Response: `200` — `{ card: Card }`
- Error: `401` — `{ error: "Authentication required" }`
- Error: `400` — `{ errors: Array<{ field: string, message: string }> }` for invalid `cardId`
- Error: `404` — `{ error: "Card not found" }`

### Update card
- Method: `PUT` /api/cards/:cardId
- Body: `{ title?: string, description?: string, position?: number }`
- Response: `200` — `{ card: Card }`
- Error: `401` — `{ error: "Authentication required" }`
- Error: `400` — `{ errors: Array<{ field: string, message: string }> }` for invalid `cardId` or body validation failures
- Error: `404` — `{ error: "Card not found" }`

### Delete card
- Method: `DELETE` /api/cards/:cardId
- Response: `204` — no content
- Error: `401` — `{ error: "Authentication required" }`
- Error: `400` — `{ errors: Array<{ field: string, message: string }> }` for invalid `cardId`
- Error: `404` — `{ error: "Card not found" }`

## Card Shape

```ts
type Card = {
  id: string;
  title: string;
  description?: string;
  position: number;
  column_id: string;
  board_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};
```

## Realtime Events (WebSocket)

- Event: `card:created` — Payload: `{ card: Card }`
- Event: `card:updated` — Payload: `{ card: Card }`
- Event: `card:deleted` — Payload: `{ cardId: UUID, boardId: UUID, columnId: UUID }`

Clients join a board room by emitting `join_board` with `boardId`; the server broadcasts to Socket.IO rooms named `board:{boardId}` and `column:{columnId}`. The implemented event payloads do not include `timestamp` or `originatingUserId` fields.
