# Quickstart: Card CRUD (development)

Prerequisites:

- Node.js 18+ and npm or pnpm
- PostgreSQL (or configured `DATABASE_URL`)

Environment variables:

- `DATABASE_URL` — Postgres connection string
- `PORT` — backend port (default 4000)
- `FRONTEND_PORT` — frontend dev port (default 3000)

Local dev (example):

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

Run migrations (example using `knex` or `typeorm` depending on stack):

```bash
npm run migrate
```

Notes:

- The realtime server exposes a WebSocket endpoint at `ws://localhost:4000`.
- Use `DATABASE_URL` to point the local Postgres instance.
