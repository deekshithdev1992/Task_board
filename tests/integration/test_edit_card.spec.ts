import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type express from 'express';
import type { Database } from 'sql.js';
import {
  AUTH_HEADER,
  BOARD_ID,
  COLUMN_ID,
  createTestApp,
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

const CARD_ID = '00000000-0000-4000-a000-000000000201';

describe('Edit Card Integration Tests', () => {
  let app: express.Application;
  let db: Database;

  beforeEach(async () => {
    realtime.emitCardCreated.mockClear();
    realtime.emitCardUpdated.mockClear();
    realtime.emitCardDeleted.mockClear();
    ({ app, db } = await createTestApp());
    insertCard(db, {
      id: CARD_ID,
      title: 'Original Title',
      description: 'Original description',
      position: 0,
    });
  });

  describe('PUT /api/cards/:cardId', () => {
    it('rejects card updates without authentication', async () => {
      const res = await request(app)
        .put(`/api/cards/${CARD_ID}`)
        .send({ title: 'Unauthenticated Update' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
      expect(getDbCard(db, CARD_ID)?.title).toBe('Original Title');
      expect(realtime.emitCardUpdated).not.toHaveBeenCalled();
    });

    it('updates title and description, persists changes, and emits realtime card.updated', async () => {
      const before = getDbCard(db, CARD_ID);

      const res = await request(app)
        .put(`/api/cards/${CARD_ID}`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Updated Title', description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.card).toMatchObject({
        id: CARD_ID,
        title: 'Updated Title',
        description: 'Updated description',
        position: 0,
        column_id: COLUMN_ID,
        board_id: BOARD_ID,
      });
      expect(res.body.card.updated_at).not.toBe(before?.updated_at);

      const dbCard = getDbCard(db, CARD_ID);
      expect(dbCard).toMatchObject({
        title: 'Updated Title',
        description: 'Updated description',
        column_id: COLUMN_ID,
        board_id: BOARD_ID,
      });
      expect(realtime.emitCardUpdated).toHaveBeenCalledWith(BOARD_ID, COLUMN_ID, {
        card: expect.objectContaining({ id: CARD_ID, title: 'Updated Title' }),
      });
    });

    it('updates only position when position is provided', async () => {
      const res = await request(app)
        .put(`/api/cards/${CARD_ID}`)
        .set('Authorization', AUTH_HEADER)
        .send({ position: 7 });

      expect(res.status).toBe(200);
      expect(res.body.card).toMatchObject({
        id: CARD_ID,
        title: 'Original Title',
        description: 'Original description',
        position: 7,
      });
      expect(getDbCard(db, CARD_ID)?.position).toBe(7);
      expect(realtime.emitCardUpdated).toHaveBeenCalledOnce();
    });

    it('rejects title longer than 100 characters and leaves database unchanged', async () => {
      const res = await request(app)
        .put(`/api/cards/${CARD_ID}`)
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'x'.repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({ field: 'title', message: 'Title must not exceed 100 characters' });
      expect(getDbCard(db, CARD_ID)?.title).toBe('Original Title');
      expect(realtime.emitCardUpdated).not.toHaveBeenCalled();
    });

    it('rejects negative position and leaves database unchanged', async () => {
      const res = await request(app)
        .put(`/api/cards/${CARD_ID}`)
        .set('Authorization', AUTH_HEADER)
        .send({ position: -1 });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({ field: 'position', message: 'Position must be a non-negative number' });
      expect(getDbCard(db, CARD_ID)?.position).toBe(0);
      expect(realtime.emitCardUpdated).not.toHaveBeenCalled();
    });

    it('returns 404 for a non-existent card and does not emit realtime', async () => {
      const res = await request(app)
        .put('/api/cards/00000000-0000-4000-a000-000000000999')
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Missing Card' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Card not found' });
      expect(realtime.emitCardUpdated).not.toHaveBeenCalled();
    });

    it('rejects an invalid cardId route parameter', async () => {
      const res = await request(app)
        .put('/api/cards/not-a-uuid')
        .set('Authorization', AUTH_HEADER)
        .send({ title: 'Invalid ID' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({ field: 'cardId', message: 'cardId must be a valid UUID' });
      expect(getDbCard(db, CARD_ID)?.title).toBe('Original Title');
      expect(realtime.emitCardUpdated).not.toHaveBeenCalled();
    });
  });
});
