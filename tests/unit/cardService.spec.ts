import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { CardService } from '../../backend/src/services/cardService.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATION_SQL = readFileSync(
  join(__dirname, '../../backend/migrations/001_create_cards.sql'),
  'utf-8',
);

const BOARD_ID = '00000000-0000-4000-a000-000000000001';
const COLUMN_1 = '00000000-0000-4000-a000-000000000010';
const COLUMN_2 = '00000000-0000-4000-a000-000000000020';

async function createDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => join(__dirname, '../../backend/node_modules/sql.js/dist', file),
  });
  const db = new SQL.Database();
  db.run(MIGRATION_SQL);
  const now = new Date().toISOString();
  db.run('INSERT INTO columns (id, name, board_id, created_at, updated_at) VALUES (?,?,?,?,?)', [COLUMN_1, 'To Do', BOARD_ID, now, now]);
  db.run('INSERT INTO columns (id, name, board_id, created_at, updated_at) VALUES (?,?,?,?,?)', [COLUMN_2, 'In Progress', BOARD_ID, now, now]);
  return db;
}

describe('CardService', () => {
  let db: Database;
  let service: CardService;

  beforeEach(async () => {
    db = await createDatabase();
    service = new CardService(db);
  });

  describe('createCard', () => {
    it('creates a card with valid input and returns the full card object', () => {
      const card = service.createCard({ title: 'Test Card', columnId: COLUMN_1, boardId: BOARD_ID });
      expect(card).toBeTruthy();
      expect(typeof card.id).toBe('string');
      expect(card.title).toBe('Test Card');
      expect(card.column_id).toBe(COLUMN_1);
      expect(card.board_id).toBe(BOARD_ID);
      expect(card.position).toBeGreaterThanOrEqual(0);
    });

    it('generates a UUID v4 format id', () => {
      const card = service.createCard({ title: 'UUID Test', columnId: COLUMN_1, boardId: BOARD_ID });
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(card.id).toMatch(uuidRegex);
    });

    it('sets created_at and updated_at as ISO timestamps', () => {
      const card = service.createCard({ title: 'Timestamp Test', columnId: COLUMN_1, boardId: BOARD_ID });
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(card.created_at).toMatch(isoRegex);
      expect(card.updated_at).toMatch(isoRegex);
      expect(card.created_at).toBe(card.updated_at);
    });

    it('includes userId when provided', () => {
      const card = service.createCard({ title: 'User Card', columnId: COLUMN_1, boardId: BOARD_ID, userId: 'user-abc' });
      expect(card.created_by).toBe('user-abc');
    });

    it('persists to database and is retrievable', () => {
      const card = service.createCard({ title: 'Persist Check', columnId: COLUMN_1, boardId: BOARD_ID });
      const fetched = service.getCardById(card.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(card.id);
    });
  });

  describe('getCardById', () => {
    it('returns null for non-existent card', () => {
      expect(service.getCardById('does-not-exist')).toBeNull();
    });
  });

  describe('getCardsByColumnId', () => {
    it('returns empty array when column has no cards', () => {
      expect(service.getCardsByColumnId(COLUMN_1)).toEqual([]);
    });
  });

  describe('getCardsByBoardId', () => {
    it('returns empty array when board has no cards', () => {
      expect(service.getCardsByBoardId(BOARD_ID)).toEqual([]);
    });
  });

  describe('updateCard', () => {
    it('updates card title', () => {
      const card = service.createCard({ title: 'Original', columnId: COLUMN_1, boardId: BOARD_ID });
      const updated = service.updateCard(card.id, { title: 'Updated Title' });
      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
    });

    it('updates card description', () => {
      const card = service.createCard({ title: 'Test', columnId: COLUMN_1, boardId: BOARD_ID });
      const updated = service.updateCard(card.id, { description: 'New description' });
      expect(updated!.description).toBe('New description');
    });

    it('updates card position', () => {
      const card = service.createCard({ title: 'Test', columnId: COLUMN_1, boardId: BOARD_ID });
      const updated = service.updateCard(card.id, { position: 42 });
      expect(updated!.position).toBe(42);
    });

    it('returns null for non-existent card', () => {
      expect(service.updateCard('no-such-id', { title: 'Nope' })).toBeNull();
    });

    it('persists update to database', () => {
      const card = service.createCard({ title: 'Before', columnId: COLUMN_1, boardId: BOARD_ID });
      service.updateCard(card.id, { title: 'After' });
      expect(service.getCardById(card.id)!.title).toBe('After');
    });

    it('updates updated_at timestamp after modification', () => {
      const card = service.createCard({ title: 'Test', columnId: COLUMN_1, boardId: BOARD_ID });
      const updated = service.updateCard(card.id, { title: 'Changed' });
      expect(updated).not.toBeNull();
      const updatedTime = new Date(updated!.updated_at).getTime();
      const createdTime = new Date(card.updated_at).getTime();
      expect(updatedTime).toBeGreaterThanOrEqual(createdTime);
    });

    it('preserves other fields when updating a single field', () => {
      const card = service.createCard({
        title: 'Full Card',
        description: 'Original Desc',
        columnId: COLUMN_1,
        boardId: BOARD_ID,
      });
      const updated = service.updateCard(card.id, { title: 'New Title' });
      expect(updated!.title).toBe('New Title');
      expect(updated!.description).toBe('Original Desc');
      expect(updated!.column_id).toBe(COLUMN_1);
    });
  });

  describe('deleteCard', () => {
    it('deletes existing card and returns true', () => {
      const card = service.createCard({ title: 'To Delete', columnId: COLUMN_1, boardId: BOARD_ID });
      expect(service.deleteCard(card.id)).toBe(true);
    });

    it('returns false for non-existent card', () => {
      expect(service.deleteCard('no-such-id')).toBe(false);
    });

    it('removes card from database after deletion', () => {
      const card = service.createCard({ title: 'Gone', columnId: COLUMN_1, boardId: BOARD_ID });
      service.deleteCard(card.id);
      expect(service.getCardById(card.id)).toBeNull();
    });

    it('does not delete other cards', () => {
      const keep = service.createCard({ title: 'Keep', columnId: COLUMN_1, boardId: BOARD_ID });
      const remove = service.createCard({ title: 'Remove', columnId: COLUMN_1, boardId: BOARD_ID });
      service.deleteCard(remove.id);
      expect(service.getCardById(keep.id)).not.toBeNull();
      expect(service.getCardById(remove.id)).toBeNull();
    });
  });
});
