# Data Model: Card

## Entities

- **Card**
  - `id` (UUID) — primary key
  - `title` (string, required, max 255)
  - `description` (string, optional)
  - `position` (number) — ordering within a column
  - `column_id` (UUID) — foreign key to `Column`
  - `board_id` (UUID) — foreign key to `Board`
  - `created_by` (UUID) — user id
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

- **Column** (reference)
  - `id` (UUID)
  - `name` (string)
  - `board_id` (UUID)

## Validation Rules

- `title`: required, non-empty, max length 255
- `description`: optional, max length 10_000 (or NEEDS CLARIFICATION)
- `position`: non-negative number; on insert compute highest position + 1

## State Transitions

- Create → Active
- Update → Active (updated_at changes)
- Delete → Removed (hard delete unless soft-delete required)
