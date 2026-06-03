# Task Board

A full-stack task board application with real-time updates.

## Stack

- **Frontend:** React + TypeScript + Vite + Socket.IO
- **Backend:** Express + TypeScript + Socket.IO + SQL.js
- **Testing:** Vitest + Testing Library + Supertest

## Getting Started

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (port 4000)
cd backend && npm run dev

# Start frontend (port 5173)
cd frontend && npm run dev
```

## User Stories

| US | Feature | Branch | Tag |
|----|---------|--------|-----|
| 1 | Create Card | `002-card-crud` | — |
| 2 | Edit & Detail Card | `us2-migration` | `us2-complete` |
| 3 | Delete Card | `us3-delete-card` | `us3-complete` |
| 4 | Validation | `us4-validation` | `us4-complete` |

## Tests

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# Contract + integration tests (from root)
npx vitest run tests/contract tests/integration
```
