import express from 'express';
import initSqlJs, { Database } from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { router } from '../../backend/src/routes.js';
import cardsRouter, { setCardService } from '../../backend/src/controllers/cards.controller.js';
import { authMiddleware } from '../../backend/src/middleware/auth.js';
import { CardService } from '../../backend/src/services/cardService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATION_SQL = readFileSync(
  join(__dirname, '../../backend/migrations/001_create_cards.sql'),
  'utf-8',
);

export const BOARD_ID = '00000000-0000-4000-a000-000000000001';
export const OTHER_BOARD_ID = '00000000-0000-4000-a000-000000000002';
export const COLUMN_ID = '00000000-0000-4000-a000-000000000010';
export const OTHER_COLUMN_ID = '00000000-0000-4000-a000-000000000020';
export const TEST_USER = 'integration-user-123';
export const AUTH_HEADER = `Bearer ${TEST_USER}`;

export interface TestCardRow {
  id: string;
  title: string;
  description?: string;
  position: number;
  column_id: string;
  board_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export async function createTestApp(): Promise<{ app: express.Application; db: Database }> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => join(__dirname, '../../backend/node_modules/sql.js/dist', file),
  });
  const db = new SQL.Database();
  db.run(MIGRATION_SQL);

  const now = new Date().toISOString();
  db.run(
    `INSERT INTO columns (id, name, board_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [COLUMN_ID, 'To Do', BOARD_ID, now, now],
  );
  db.run(
    `INSERT INTO columns (id, name, board_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [OTHER_COLUMN_ID, 'Done', OTHER_BOARD_ID, now, now],
  );

  const app = express();
  app.use(express.json());
  app.use('/api', router);
  app.use('/api', authMiddleware, cardsRouter);

  setCardService(new CardService(db));

  return { app, db };
}

export function insertCard(
  db: Database,
  input: {
    id: string;
    title: string;
    description?: string | null;
    position?: number;
    columnId?: string;
    boardId?: string;
    createdBy?: string | null;
  },
): TestCardRow {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO cards (id, title, description, position, column_id, board_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.title,
      input.description ?? null,
      input.position ?? 0,
      input.columnId ?? COLUMN_ID,
      input.boardId ?? BOARD_ID,
      input.createdBy ?? TEST_USER,
      now,
      now,
    ],
  );
  const card = getDbCard(db, input.id);
  if (!card) throw new Error(`Failed to insert test card ${input.id}`);
  return card;
}

export function getDbCard(db: Database, cardId: string): TestCardRow | null {
  const stmt = db.prepare('SELECT * FROM cards WHERE id = ?');
  stmt.bind([cardId]);

  let card: TestCardRow | null = null;
  if (stmt.step()) {
    card = rowToCard(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return card;
}

export function getCardCount(db: Database): number {
  const stmt = db.prepare('SELECT COUNT(*) AS count FROM cards');
  let count = 0;
  if (stmt.step()) {
    count = Number((stmt.getAsObject() as { count: number }).count);
  }
  stmt.free();
  return count;
}

function rowToCard(row: Record<string, unknown>): TestCardRow {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) || undefined,
    position: row.position as number,
    column_id: row.column_id as string,
    board_id: row.board_id as string,
    created_by: (row.created_by as string | null) || undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
