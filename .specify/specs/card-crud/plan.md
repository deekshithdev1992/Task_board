Implementation Plan: Card CRUD

Branch: 002-card-crud | Date: 2026-06-03 | Spec: .specify/specs/card-crud/spec.md

Input: Feature specification from .specify/specs/card-crud/spec.md

Summary

Implement create, view, edit, and delete (CRUD) functionality for Card entities within task board columns. Changes must be persisted and propagated immediately to connected users through real-time synchronization.

Technical Context

Language/Version: TypeScript 5.x (Strict Mode)

Frontend Framework: React 18 + Vite + TypeScript

Backend Framework: Express.js running on Node.js

Database: SQLite using better-sqlite3

Testing:

Vitest for unit testing
React Testing Library for component testing
Supertest for API testing
Playwright for end-to-end testing

Coverage Target:

Minimum 80% code coverage
Coverage enforced in CI pipeline

Target Platform:

Modern desktop browsers
Mobile web browsers

Project Type:

Full-stack web application
Frontend + Backend + Real-time synchronization layer

Real-Time Communication:

WebSocket-based updates for card creation, modification, and deletion

Performance Goals:

Card create/edit/delete updates visible to connected users within 200ms
Board interactions remain responsive under normal usage

Constraints:

TypeScript strict mode enabled
WCAG 2.1 AA accessibility compliance
Minimum 80% test coverage
Real-time updates required for card create/edit/delete actions

Scale/Scope:

Boards containing up to 100 cards
Up to 20 concurrent connected users per board
Constitution Check
Required Gates
TypeScript strict mode enabled
No use of any without documented justification
Unit and integration tests required
Minimum 80% coverage
WCAG 2.1 AA accessibility compliance
API input validation required
Authentication enforced through existing system
Result

All constitution gates satisfied.

Project Structure
frontend/
├── src/
│   ├── components/
│   ├── features/card/
│   ├── services/
│   └── types/

backend/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── database/
│   └── realtime/

tests/
├── unit/
├── integration/
└── e2e/
Structure Decision

Separate frontend and backend applications to isolate UI, API, persistence, and real-time synchronization concerns.

Out of Scope
Drag-and-drop card reordering
Column CRUD operations
Board membership management
Authentication implementation
Notification preferences

Drag-and-drop functionality belongs to a separate feature specification.

Phase 0: Research
Validate WebSocket approach for real-time updates.
Define card event formats:
card.created
card.updated
card.deleted
Finalize API contract structure.
Output

research.md

Phase 1: Design & Contracts
Data Model

Create data-model.md defining:

Card
id
title
description
columnId
createdAt
updatedAt

Validation:

Title required
Title length: 1–100 characters
Description optional
Contracts

Create:

contracts/card-api.md

Endpoints:

POST /api/boards/:boardId/columns/:columnId/cards
GET /api/cards/:id
PUT /api/cards/:id
DELETE /api/cards/:id

WebSocket Events:

card.created
card.updated
card.deleted
Quickstart

Create:

quickstart.md

Include:

Installation
Environment variables
Database setup
Local development startup
Phase 2: Tasks

Generate tasks grouped by:

User Story 1

Create Card

User Story 2

View and Edit Card

User Story 3

Delete Card

Validation Tasks
Verify FR-003 card detail viewing
Verify SC-004 first-attempt success metric
Complexity Tracking
Decision	Justification
WebSocket for realtime sync	Immediate update requirement in FR-009
SQLite for storage	Simple local development and project scope
Separate frontend/backend	Clear separation of concerns and maintainability
Success Criteria Validation
SC-001

User can create a card in less than 10 seconds.

SC-002

Saved edits remain visible after refresh.

SC-003

Deleted cards disappear immediately.

SC-004

Conduct usability validation with at least 10 test scenarios covering create, edit, and delete workflows. Success is achieved when at least 90% of first-attempt user actions complete successfully without assistance or error recovery.

Plan generated from /speckit.plan workflow and updated after consistency analysis.