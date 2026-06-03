import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { CardModel } from '../../backend/src/models/card.js';
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
const COLUMN_3 = '00000000-0000-4000-a000-000000000030';

async function createDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => join(__dirname, '../../backend/node_modules/sql.js/dist', file),
  });
  const db = new SQL.Database();
  db.run(MIGRATION_SQL);
  const now = new Date().toISOString();
  db.run('INSERT INTO columns (id, name, board_id, created_at, updated_at) VALUES (?,?,?,?,?)', [COLUMN_1, 'To Do', BOARD_ID, now, now]);
  db.run('INSERT INTO columns (id, name, board_id, created_at, updated_at) VALUES (?,?,?,?,?)', [COLUMN_2, 'In Progress', BOARD_ID, now, now]);
  db.run('INSERT INTO columns (id, name, board_id, created_at, updated_at) VALUES (?,?,?,?,?)', [COLUMN_3, 'Done', BOARD_ID, now, now]);
  return db;
}

async function seedCard(db: Database, overrides: Record<string, unknown> = {}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO cards (id, title, description, position, column_id, board_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      overrides.title ?? 'Seed Card',
      overrides.description ?? null,
      overrides.position ?? 0,
      overrides.column_id ?? COLUMN_1,
      overrides.board_id ?? BOARD_ID,
      overrides.created_by ?? null,
      overrides.created_at ?? now,
      overrides.updated_at ?? now,
    ],
  );
  return id;
}

describe('CardModel', () => {
  let db: Database;
  let model: CardModel;

  beforeEach(async () => {
    db = await createDatabase();
    model = new CardModel(db);
  });

  describe('create', () => {
    it('creates a card with minimum required fields', () => {
      const card = model.create({ title: 'Test Card', column_id: COLUMN_1, board_id: BOARD_ID });
      expect(card.id).toBeTruthy();
      expect(typeof card.id).toBe('string');
      expect(card.title).toBe('Test Card');
      expect(card.position).toBe(0);
      expect(card.column_id).toBe(COLUMN_1);
      expect(card.board_id).toBe(BOARD_ID);
      expect(card.created_by).toBeUndefined();
    });

    it('creates a card with optional description', () => {
      const card = model.create({ title: 'Card', description: 'A description', column_id: COLUMN_1, board_id: BOARD_ID });
      expect(card.description).toBe('A description');
    });

    it('creates a card with optional created_by', () => {
      const card = model.create({ title: 'Card', column_id: COLUMN_1, board_id: BOARD_ID, created_by: 'user-1' });
      expect(card.created_by).toBe('user-1');
    });

    it('auto-assigns position 0 for first card in a column', () => {
      const card = model.create({ title: 'First', column_id: COLUMN_1, board_id: BOARD_ID });
      expect(card.position).toBe(0);
    });

    it('auto-assigns position as max(position) + 1 for subsequent cards', () => {
      model.create({ title: 'First', column_id: COLUMN_1, board_id: BOARD_ID });
      const card2 = model.create({ title: 'Second', column_id: COLUMN_1, board_id: BOARD_ID });
      expect(card2.position).toBe(1);
      const card3 = model.create({ title: 'Third', column_id: COLUMN_1, board_id: BOARD_ID });
      expect(card3.position).toBe(2);
    });

    it('computes position independently per column', () => {
      model.create({ title: 'A', column_id: COLUMN_1, board_id: BOARD_ID });
      model.create({ title: 'B', column_id: COLUMN_2, board_id: BOARD_ID });
      expect(model.getById(model.create({ title: 'C', column_id: COLUMN_1, board_id: BOARD_ID }).id)!.position).toBe(1);
      expect(model.getById(model.create({ title: 'D', column_id: COLUMN_2, board_id: BOARD_ID }).id)!.position).toBe(1);
    });

    it('sets created_at and updated_at as ISO timestamp strings', () => {
      const card = model.create({ title: 'Test', column_id: COLUMN_1, board_id: BOARD_ID });
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(card.created_at).toMatch(isoRegex);
      expect(card.updated_at).toMatch(isoRegex);
    });

    it('persists card to database', () => {
      const card = model.create({ title: 'Persist Test', column_id: COLUMN_1, board_id: BOARD_ID });
      const fetched = model.getById(card.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.title).toBe('Persist Test');
    });
  });

  describe('getById', () => {
    it('returns card for existing ID', async () => {
      const cardId = await seedCard(db, { title: 'Find Me' });
      const result = model.getById(cardId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(cardId);
      expect(result!.title).toBe('Find Me');
    });

    it('returns null for non-existent ID', () => {
      expect(model.getById('nonexistent-id')).toBeNull();
    });

    it('returns null for empty string ID', () => {
      expect(model.getById('')).toBeNull();
    });
  });

  describe('getByColumnId', () => {
    it('returns cards in a column ordered by position', async () => {
      await seedCard(db, { title: 'C', position: 2, column_id: COLUMN_1 });
      await seedCard(db, { title: 'B', position: 1, column_id: COLUMN_1 });
      await seedCard(db, { title: 'A', position: 0, column_id: COLUMN_1 });
      const cards = model.getByColumnId(COLUMN_1);
      expect(cards).toHaveLength(3);
      expect(cards[0].position).toBe(0);
      expect(cards[0].title).toBe('A');
      expect(cards[1].position).toBe(1);
      expect(cards[2].position).toBe(2);
    });

    it('does not return cards from other columns', async () => {
      await seedCard(db, { title: 'Col1', column_id: COLUMN_1 });
      await seedCard(db, { title: 'Col2', column_id: COLUMN_2 });
      const cards = model.getByColumnId(COLUMN_1);
      expect(cards).toHaveLength(1);
      expect(cards[0].title).toBe('Col1');
    });

    it('returns empty array for column with no cards', () => {
      expect(model.getByColumnId(COLUMN_3)).toEqual([]);
    });
  });

  describe('getByBoardId', () => {
    it('returns all cards in a board', async () => {
      await seedCard(db, { title: 'A', column_id: COLUMN_1 });
      await seedCard(db, { title: 'B', column_id: COLUMN_2 });
      await seedCard(db, { title: 'C', column_id: COLUMN_3 });
      const cards = model.getByBoardId(BOARD_ID);
      expect(cards).toHaveLength(3);
    });

    it('returns cards ordered by position', async () => {
      await seedCard(db, { title: 'Second', position: 1, column_id: COLUMN_1 });
      await seedCard(db, { title: 'First', position: 0, column_id: COLUMN_2 });
      const cards = model.getByBoardId(BOARD_ID);
      expect(cards[0].title).toBe('First');
      expect(cards[1].title).toBe('Second');
    });

    it('returns empty array for board with no cards', () => {
      expect(model.getByBoardId(BOARD_ID)).toEqual([]);
    });

    it('does not return cards from other boards', async () => {
      await seedCard(db, { board_id: BOARD_ID });
      expect(model.getByBoardId('other-board')).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates card title', async () => {
      const cardId = await seedCard(db, { title: 'Original' });
      const updated = model.update(cardId, { title: 'Updated' });
      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated');
      expect(model.getById(cardId)!.title).toBe('Updated');
    });

    it('updates card description', async () => {
      const cardId = await seedCard(db, { title: 'Test', description: null });
      const updated = model.update(cardId, { description: 'New description' });
      expect(updated!.description).toBe('New description');
    });

    it('updates card position', async () => {
      const cardId = await seedCard(db, { title: 'Test', position: 0 });
      const updated = model.update(cardId, { position: 5 });
      expect(updated!.position).toBe(5);
    });

    it('updates multiple fields simultaneously', async () => {
      const cardId = await seedCard(db, { title: 'Old Title', description: 'Old Desc', position: 0 });
      const updated = model.update(cardId, { title: 'New Title', description: 'New Desc', position: 10 });
      expect(updated!.title).toBe('New Title');
      expect(updated!.description).toBe('New Desc');
      expect(updated!.position).toBe(10);
    });

    it('returns null for non-existent card', () => {
      expect(model.update('no-such-id', { title: 'Nope' })).toBeNull();
    });

    it('updates updated_at timestamp on each update', async () => {
      const cardId = await seedCard(db, { title: 'Test', updated_at: '2020-01-01T00:00:00.000Z' });
      const originalUpdatedAt = model.getById(cardId)!.updated_at;
      const updated = model.update(cardId, { title: 'Updated' });
      expect(updated!.updated_at).not.toBe(originalUpdatedAt);
      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });
  });

  describe('delete', () => {
    it('deletes existing card and returns true', async () => {
      const cardId = await seedCard(db, { title: 'To Delete' });
      expect(model.delete(cardId)).toBe(true);
    });

    it('removes card from database after deletion', async () => {
      const cardId = await seedCard(db, { title: 'Gone' });
      model.delete(cardId);
      expect(model.getById(cardId)).toBeNull();
    });

    it('returns false for non-existent card', () => {
      expect(model.delete('no-such-id')).toBe(false);
    });

    it('deletes only the specified card', async () => {
      const keepId = await seedCard(db, { title: 'Keep' });
      const deleteId = await seedCard(db, { title: 'Delete' });
      model.delete(deleteId);
      expect(model.getById(keepId)).not.toBeNull();
      expect(model.getById(deleteId)).toBeNull();
    });
  });
});
