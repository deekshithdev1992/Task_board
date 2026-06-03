---
description: "Generated task list for Card CRUD feature"
---

# Tasks: Card CRUD

**Input**: Design documents from `/specify/card-crud/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Initialize frontend TypeScript project and scaffold files: frontend/package.json, frontend/tsconfig.json, frontend/src/main.tsx, frontend/public/index.html
- [ ] T002 [P] Initialize backend TypeScript project and scaffold files: backend/package.json, backend/tsconfig.json, backend/src/server.ts, backend/src/routes.ts
- [ ] T003 [P] Configure linting and formatting: .eslintrc.js, .prettierrc at repo root
- [ ] T004 [P] Add CI workflow for tests and coverage: .github/workflows/ci.yml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T005 Setup database migrations and initial schema for `cards` and `columns` in backend/migrations/001_create_cards.sql
- [ ] T006 [P] Implement backend Card model in backend/src/models/card.ts
- [ ] T007 [P] Implement input validation and shared validators in backend/src/validation/cardValidation.ts
- [ ] T008 [P] Implement basic authentication middleware in backend/src/middleware/auth.ts (stub to integrate existing auth system)
- [ ] T009 [P] Setup realtime scaffold in backend/src/realtime/index.ts (Socket.IO server) and board-specific namespaces
- [ ] T010 Implement base API routing and controllers file backend/src/controllers/cards.controller.ts (handlers to be filled per story)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create a Card (Priority: P1) 🎯 MVP

**Goal**: Allow users to create a card in a column and see it immediately

**Independent Test**: Create card via API and verify it appears in board UI and realtime event `card.created` is emitted

### Tests

- [ ] T011 [P] [US1] Contract test: tests/contract/test_card_create_contract.spec.ts (validate POST /api/boards/:boardId/cards response shape)
- [ ] T012 [P] [US1] Integration test: tests/integration/test_create_card.spec.ts (create card end-to-end, verify DB and realtime event)

### Implementation

- [ ] T013 [P] [US1] Implement `POST /api/boards/:boardId/cards` handler in backend/src/controllers/cards.controller.ts
- [ ] T014 [P] [US1] Implement backend service to create card in backend/src/services/cardService.ts
- [ ] T015 [P] [US1] Add Card model persistence in backend/src/models/card.ts (migration depends on T005)
- [ ] T016 [P] [US1] Emit realtime `card.created` event from backend/src/realtime/index.ts after successful create
- [ ] T017 [P] [US1] Add frontend `AddCard` component in frontend/src/features/card/AddCard.tsx and wire to `frontend/src/services/cardService.ts`
- [ ] T018 [US1] Add UI integration: display created card in frontend/src/features/board/BoardView.tsx (depends on T017)

**Checkpoint**: User Story 1 should be testable and demoable independently

---

## Phase 4: User Story 2 - Edit a Card (Priority: P2)

**Goal**: Allow users to update card title/description and propagate changes in realtime

**Independent Test**: Update card via API or UI and verify changed values persist and `card.updated` event is emitted

### Tests

- [ ] T019 [P] [US2] Contract test: tests/contract/test_card_update_contract.spec.ts (validate PUT /api/cards/:cardId)
- [ ] T020 [P] [US2] Integration test: tests/integration/test_edit_card.spec.ts (edit card end-to-end, verify DB and realtime event)

### Implementation

- [ ] T021 [US2] Implement `PUT /api/cards/:cardId` handler in backend/src/controllers/cards.controller.ts
- [ ] T022 [P] [US2] Implement backend update logic in backend/src/services/cardService.ts
- [ ] T023 [P] [US2] Emit realtime `card.updated` event after successful update in backend/src/realtime/index.ts
- [ ] T024 [P] [US2] Add frontend `EditCard` component in frontend/src/features/card/EditCard.tsx and integrate into Card detail view

**Checkpoint**: User Story 2 should be independently testable

---

## Phase 5: User Story 3 - Delete a Card (Priority: P3)

**Goal**: Allow users to delete cards and notify other viewers immediately

**Independent Test**: Delete card and verify it is removed from DB, UI updates, and `card.deleted` event emitted and handled

### Tests

- [ ] T025 [P] [US3] Contract test: tests/contract/test_card_delete_contract.spec.ts (validate DELETE /api/cards/:cardId)
- [ ] T026 [P] [US3] Integration test: tests/integration/test_delete_card.spec.ts (delete card end-to-end, verify DB and realtime event)

### Implementation

- [ ] T027 [US3] Implement `DELETE /api/cards/:cardId` handler in backend/src/controllers/cards.controller.ts
- [ ] T028 [P] [US3] Implement backend delete logic in backend/src/services/cardService.ts
- [ ] T029 [P] [US3] Emit realtime `card.deleted` event with `{ cardId, boardId, columnId }` in backend/src/realtime/index.ts
- [ ] T030 [P] [US3] Add frontend delete UI and confirmation component in frontend/src/features/card/DeleteCard.tsx and ensure Card detail view closes when deleted

**Checkpoint**: User Story 3 should be independently testable

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T031 [P] Add accessibility checks and fixes for card UI in frontend/src/features/card/ (WCAG 2.1 AA)
- [ ] T032 [P] Add unit tests for services and models in tests/unit/
- [ ] T033 [P] Add security validation and hardening in backend/src/middleware/
- [ ] T034 Update documentation in .specify/specs/card-crud/quickstart.md and README.md
- [ ] T035 [P] Performance tuning for realtime delivery (profile and optimize message paths)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

## Parallel Opportunities

- Phase 1 tasks marked [P] can run in parallel
- Foundational tasks marked [P] can be parallelized (migrations, model implementation, validation, realtime scaffold)
- Once foundation completes, each User Story (US1, US2, US3) can proceed in parallel by different developers
- Tests marked [P] can run in parallel

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo

***

Generated by /speckit.tasks on 2026-06-03
