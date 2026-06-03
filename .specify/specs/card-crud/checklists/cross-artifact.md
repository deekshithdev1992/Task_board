# Cross-Artifact Requirements Quality Checklist

**Purpose**: Validate the quality, clarity, and completeness of Card CRUD requirements across spec.md, plan.md, tasks.md, data-model.md, research.md, and constitution.md.

**Created**: 2026-06-03

## Requirement Completeness

- [ ] CHK001 Are all functional requirements (FR-001 through FR-009) uniquely identified and non-overlapping? [Completeness, Spec §FR]
- [ ] CHK002 Are requirements defined for all error/edge case scenarios listed in spec.md §Edge Cases, or are some left as implementation details? [Completeness, Spec §Edge Cases]
- [ ] CHK003 Are non-functional requirements (performance, security, accessibility thresholds) defined with measurable targets beyond constitution defaults? [Completeness, Gap]
- [ ] CHK004 Are recovery requirements specified for all failure modes (network loss, server restart, concurrent edit conflict)? [Completeness, Spec §Edge Cases]
- [ ] CHK005 Are success criteria SC-001 through SC-004 actionable as buildable gates vs. post-launch business KPIs? [Completeness, Spec §Success Criteria]
- [ ] CHK006 Is the authorization/ownership model specified for card-level operations, or intentionally deferred to an external system? [Completeness, Spec §Assumptions]

## Requirement Clarity

- [ ] CHK007 Is the term "real time" in FR-009 quantified with a specific latency threshold (e.g., <200ms)? [Clarity, Spec §FR-009]
- [ ] CHK008 Is "immediately" in SC-003 defined with a measurable time bound? [Clarity, Spec §SC-003]
- [ ] CHK009 Is the data model naming convention explicitly documented (snake_case in DB vs camelCase in API responses)? [Clarity, data-model.md vs actual]
- [ ] CHK010 Are validation rule priorities documented when both frontend and backend validation apply (which takes precedence)? [Clarity, Gap]
- [ ] CHK011 Is the WebSocket reconnection behavior specified (retry count, backoff strategy, timeout)? [Clarity, Gap]

## Requirement Consistency

- [ ] CHK012 Does data-model.md's `title` max length (currently 100) match spec.md's "1–100 characters" (FR-002)? [Consistency, Spec §FR-002 vs data-model.md]
- [ ] CHK013 Does plan.md's database choice (SQLite) match research.md? [Consistency, plan.md vs research.md]
- [ ] CHK014 Does plan.md's test framework (Vitest) match research.md? [Consistency, plan.md vs research.md]
- [ ] CHK015 Is the contract API path format consistent between contracts/card-api.md and the implemented routes? [Consistency, contracts/card-api.md vs cards.controller.ts]
- [ ] CHK016 Do the WebSocket event payload formats in contracts/card-api.md match actual event emissions? [Consistency, contracts/card-api.md vs realtime/index.ts]

## Acceptance Criteria Quality

- [ ] CHK017 Can each acceptance scenario in spec.md be objectively verified by a passing or failing automated test? [Measurability, Spec §User Stories]
- [ ] CHK018 Is SC-001 ("create card in <10 seconds") verifiable in CI, or does it require production monitoring? [Measurability, Spec §SC-001]
- [ ] CHK019 Are quantitative thresholds defined for "graceful failure" of collaboration features? [Measurability, Constitution §VI]

## Scenario Coverage

- [ ] CHK020 Are requirements specified for concurrent edit conflict resolution (last-write-wins vs. version vectors)? [Coverage, Spec §Edge Cases]
- [ ] CHK021 Are requirements specified for the board empty/zero state when all cards are deleted? [Coverage, Gap]
- [ ] CHK022 Are requirements specified for card state when the WebSocket reconnects after disconnect? [Coverage, Gap]
- [ ] CHK023 Are mobile/responsive layout requirements specified, given plan.md targets "Mobile web browsers"? [Coverage, plan.md vs Gap]

## Edge Case Coverage

- [ ] CHK024 Is the behavior specified when a card's `column_id` references a non-existent column? [Edge Case, Gap]
- [ ] CHK025 Is the behavior specified when a card is created with a title of exactly 100 characters (boundary)? [Edge Case, Spec §FR-002]
- [ ] CHK026 Is the behavior specified when a card is created with a title of exactly 1 character (boundary)? [Edge Case, Spec §FR-002]

## Non-Functional Requirements

- [ ] CHK027 Are accessibility (WCAG 2.1 AA) requirements specified for all interactive states — loading, error, empty, and success? [NFR, Constitution §III.1]
- [ ] CHK028 Is the 80% coverage threshold explicitly documented with exclusion rules (generated code, mocks)? [NFR, Constitution §II.1]
- [ ] CHK029 Are performance degradation requirements defined for the "up to 20 concurrent users" scale target? [NFR, plan.md]
- [ ] CHK030 Are security requirements specified for WebSocket connections (authentication, rate limiting)? [NFR, Gap]

## Dependencies & Assumptions

- [ ] CHK031 Is the assumption that "authentication is handled by existing systems" documented with a clear integration contract? [Assumption, Spec §Assumptions]
- [ ] CHK032 Is the drag-and-drop out-of-scope decision consistently referenced across all artifacts where a user might expect it? [Assumption, Spec §Assumptions]
- [ ] CHK033 Are external dependencies (sql.js, Socket.IO, React) version-pinned in requirements or left to implementation? [Dependency, Gap]
