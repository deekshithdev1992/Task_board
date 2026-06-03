import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type express from 'express';
import type { Database } from 'sql.js';
import {
  AUTH_HEADER,
  BOARD_ID,
  COLUMN_ID,
  TEST_USER,
  createTestApp,
  getCardCount,
  getDbCard,
  insertCard,
} from './cardIntegrationTestUtils.js';

const realtime = vi.hoisted(() => ({
  emitCardCreated: vi.fn(),
  emitCardUpdated: vi.fn(),
  emitCardDeleted: vi.fn(),
}));

vi.mock('../../backend/src/realtime/index.js', () => ({
  getRealtime: () => realtime,
}));

describe('Create Card Integration Tests', () => {
  let app: express.Application;
  let db: Database;

  beforeEach(async () => {
    realtime.emitCardCreated.mockClear();
    realtime.emitCardUpdated.mockClear();
    realtime.emitCardDeleted.mockClear();
    ({ app, db } = await createTestApp());
  });

  describe('POST /api/boards/:boardId/columns/:columnId/cards', () => {
    it('rejects card creation without authentication', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .send({ title: 'Unauthenticated Card' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
      expect(getCardCount(db)).toBe(0);
      expect(realtime.emitCardCreated).not.toHaveBeenCalled();
    });

    it('creates a card, persists it, and emits realtime card.created', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Integration Create', description: 'Created through API' });

      expect(res.status).toBe(201);
      expect(res.body.card).toMatchObject({
        title: 'Integration Create',
        description: 'Created through API',
        position: 0,
        column_id: COLUMN_ID,
        board_id: BOARD_ID,
        created_by: TEST_USER,
      });
      expect(res.body.card.id).toEqual(expect.any(String));
      expect(res.body.card.created_at).toEqual(expect.any(String));
      expect(res.body.card.updated_at).toEqual(expect.any(String));

      const dbCard = getDbCard(db, res.body.card.id);
      expect(dbCard).toMatchObject({
        title: 'Integration Create',
        description: 'Created through API',
        position: 0,
        column_id: COLUMN_ID,
        board_id: BOARD_ID,
        created_by: TEST_USER,
      });
      expect(getCardCount(db)).toBe(1);
      expect(realtime.emitCardCreated).toHaveBeenCalledWith(BOARD_ID, COLUMN_ID, {
        card: expect.objectContaining({ id: res.body.card.id, title: 'Integration Create' }),
      });
    });

    it('assigns the next position within the target column', async () => {
      insertCard(db, {
        id: '00000000-0000-4000-a000-000000000101',
        title: 'Existing 0',
        position: 0,
      });
      insertCard(db, {
        id: '00000000-0000-4000-a000-000000000102',
        title: 'Existing 1',
        position: 1,
      });

      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Next Position' });

      expect(res.status).toBe(201);
      expect(res.body.card.position).toBe(2);
      expect(getDbCard(db, res.body.card.id)?.position).toBe(2);
    });

    it('rejects a missing title and does not persist or emit realtime', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({ field: 'title', message: 'Title is required' });
      expect(getCardCount(db)).toBe(0);
      expect(realtime.emitCardCreated).not.toHaveBeenCalled();
    });

    it('rejects an empty title and does not persist or emit realtime', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({ field: 'title', message: 'Title must be at least 1 character' });
      expect(getCardCount(db)).toBe(0);
      expect(realtime.emitCardCreated).not.toHaveBeenCalled();
    });

    it('rejects a title longer than 100 characters', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'x'.repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({ field: 'title', message: 'Title must not exceed 100 characters' });
      expect(getCardCount(db)).toBe(0);
      expect(realtime.emitCardCreated).not.toHaveBeenCalled();
    });

    it('rejects a description longer than 10000 characters', async () => {
      const res = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Valid Title', description: 'x'.repeat(10001) });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({
        field: 'description',
        message: 'Description must not exceed 10000 characters',
      });
      expect(getCardCount(db)).toBe(0);
      expect(realtime.emitCardCreated).not.toHaveBeenCalled();
    });

    it('rejects invalid board and column route parameters', async () => {
      const boardRes = await request(app)
        .post(`/api/boards/not-a-uuid/columns/${COLUMN_ID}/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Invalid Board' });
      expect(boardRes.status).toBe(400);
      expect(boardRes.body.errors[0].field).toBe('boardId');

      const columnRes = await request(app)
        .post(`/api/boards/${BOARD_ID}/columns/not-a-uuid/cards`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Invalid Column' });
      expect(columnRes.status).toBe(400);
      expect(columnRes.body.errors[0].field).toBe('columnId');
      expect(getCardCount(db)).toBe(0);
    });
  });
});
