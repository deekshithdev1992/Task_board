# Quickstart: Card CRUD (development)

Prerequisites:

- Node.js 18+ and npm

Environment variables:

- `PORT` — backend port (default 4000)
- `FRONTEND_URL` — frontend URL for Socket.IO CORS (default http://localhost:5173)

Local dev:

```bash
# backend
cd backend
npm install
npm run dev

# frontend
cd ../frontend
npm install
npm run dev
```

Database:

- The backend uses an in-memory SQLite database (via sql.js).
- No external database setup or migration runner is required.
- On startup, the database is created automatically and seeded with a default board and three columns (To Do, In Progress, Done).

Realtime:

- The backend exposes a Socket.IO WebSocket endpoint at `ws://localhost:4000`.
- In development, the frontend connects through the Vite dev server proxy (`/socket.io` route), so clients simply connect to the Vite URL (`http://localhost:5173`).
- Card realtime event names are `card:created`, `card:updated`, and `card:deleted`.

API authentication:

- Card API routes require `Authorization: Bearer <userId>`.
- The development frontend sends this header using `localStorage['task-board-user-id']` when set, or `demo-user` by default.
