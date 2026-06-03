import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
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

const BOARD_ID = '00000000-0000-4000-a000-000000000001';
const COLUMN_ID = '00000000-0000-4000-a000-000000000010';
const TEST_USER = 'test-user-123';
const AUTH_HEADER = `Bearer ${TEST_USER}`;

async function createTestApp(): Promise<{ app: express.Application; db: Database }> {
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

  const app = express();
  app.use(express.json());
  app.use('/api', router);
  app.use('/api', authMiddleware, cardsRouter);

  const cardService = new CardService(db);
  setCardService(cardService);

  return { app, db };
}

describe('Card Security', () => {
  let app: express.Application;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  describe('Authentication enforcement', () => {
    it('rejects POST create card without auth header', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .send({ title: 'Test' });
      expect(res.status).toBe(401);
    });

    it('rejects GET card detail without auth header', async () => {
      const res = await request(app)
        .get('/api/cards/00000000-0000-4000-a000-000000000999');
      expect(res.status).toBe(401);
    });

    it('rejects PUT update card without auth header', async () => {
      const res = await request(app)
        .put('/api/cards/00000000-0000-4000-a000-000000000999')
        .send({ title: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('rejects DELETE card without auth header', async () => {
      const res = await request(app)
        .delete('/api/cards/00000000-0000-4000-a000-000000000999');
      expect(res.status).toBe(401);
    });

    it('rejects GET cards by column without auth header', async () => {
      const res = await request(app)
        .get(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`);
      expect(res.status).toBe(401);
    });
  });

  describe('Invalid authentication', () => {
    it('rejects malformed Bearer token', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', 'NotBearer token')
        .send({ title: 'Test' });
      expect(res.status).toBe(401);
    });

    it('returns 401 Unauthorized with expected error format', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .send({ title: 'Test' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
    });
  });

  describe('Parameter validation', () => {
    it('rejects POST with non-UUID boardId', async () => {
      const res = await request(app)
        .post('/api/boards/invalid-board/columns/col-1/cards')
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('boardId');
    });

    it('rejects POST with non-UUID columnId', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/not-a-uuid/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('columnId');
    });

    it('rejects GET card with non-UUID cardId', async () => {
      const res = await request(app)
        .get('/api/cards/not-a-uuid')
        .set('Authorization', AUTH_HEADER);
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('cardId');
    });

    it('rejects PUT with non-UUID cardId', async () => {
      const res = await request(app)
        .put('/api/cards/not-a-uuid')
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Updated' });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('cardId');
    });

    it('rejects DELETE with non-UUID cardId', async () => {
      const res = await request(app)
        .delete('/api/cards/not-a-uuid')
        .set('Authorization', AUTH_HEADER);
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('cardId');
    });
  });

  describe('Validation failures', () => {
    it('rejects POST with empty title', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: '' });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('title');
    });

    it('rejects POST with title exceeding 100 characters', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'x'.repeat(101) });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('title');
    });

    it('rejects PUT with title exceeding 100 characters', async () => {
      const res = await request(app)
        .put('/api/cards/00000000-0000-4000-a000-000000000999')
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'x'.repeat(101) });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('title');
    });
  });

  describe('Not found', () => {
    it('returns 404 for GET non-existent card', async () => {
      const res = await request(app)
        .get('/api/cards/00000000-0000-4000-a000-000000000999')
        .set('Authorization', AUTH_HEADER);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Card not found' });
    });

    it('returns 404 for PUT non-existent card', async () => {
      const res = await request(app)
        .put('/api/cards/00000000-0000-4000-a000-000000000999')
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Updated' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Card not found' });
    });

    it('returns 404 for DELETE non-existent card', async () => {
      const res = await request(app)
        .delete('/api/cards/00000000-0000-4000-a000-000000000999')
        .set('Authorization', AUTH_HEADER);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Card not found' });
    });
  });

  describe('Happy path with auth', () => {
    let createdCardId: string;

    it('creates a card with valid auth', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Security Test Card' });
      expect(res.status).toBe(201);
      expect(res.body.card).toBeDefined();
      expect(res.body.card.title).toBe('Security Test Card');
      expect(res.body.card.created_by).toBe(TEST_USER);
      createdCardId = res.body.card.id;
    });

    it('retrieves the created card', async () => {
      expect(createdCardId).toBeDefined();
      const res = await request(app)
        .get(`/api/cards/${createdCardId}`)
        .set('Authorization', AUTH_HEADER);
      expect(res.status).toBe(200);
      expect(res.body.card.title).toBe('Security Test Card');
    });

    it('updates the card', async () => {
      expect(createdCardId).toBeDefined();
      const res = await request(app)
        .put(`/api/cards/${createdCardId}`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Updated Security Card' });
      expect(res.status).toBe(200);
      expect(res.body.card.title).toBe('Updated Security Card');
    });

    it('deletes the card', async () => {
      expect(createdCardId).toBeDefined();
      const res = await request(app)
        .delete(`/api/cards/${createdCardId}`)
        .set('Authorization', AUTH_HEADER);
      expect(res.status).toBe(204);
    });

    it('card is not retrievable after deletion', async () => {
      expect(createdCardId).toBeDefined();
      const res = await request(app)
        .get(`/api/cards/${createdCardId}`)
        .set('Authorization', AUTH_HEADER);
      expect(res.status).toBe(404);
    });
  });

  describe('Field injection protection', () => {
    let createdCardId: string;

    it('creates a baseline card to test against', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Baseline Card' });
      expect(res.status).toBe(201);
      createdCardId = res.body.card.id;
      expect(res.body.card.created_by).toBe(TEST_USER);
    });

    it('blocks injection of created_by, board_id, and id via update payload', async () => {
      expect(createdCardId).toBeDefined();

      // Attempt field injection via PUT
      const res = await request(app)
        .put(`/api/cards/${createdCardId}`)
        .set('Authorization', AUTH_HEADER)
        .send({
          title: 'Injected Title',
          created_by: 'attacker',
          board_id: '00000000-0000-4000-a000-000000009999',
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        });

      expect(res.status).toBe(200);

      // Verify the allowed field (title) was updated
      expect(res.body.card.title).toBe('Injected Title');

      // Verify protected fields were NOT overwritten
      expect(res.body.card.created_by).toBe(TEST_USER);
      expect(res.body.card.board_id).toBe(BOARD_ID);
      expect(res.body.card.id).toBe(createdCardId);
    });
  });
});
