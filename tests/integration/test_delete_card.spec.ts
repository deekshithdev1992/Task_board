import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type express from 'express';
import type { Database } from 'sql.js';
import {
  AUTH_HEADER,
  BOARD_ID,
  COLUMN_ID,
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

const CARD_ID = '00000000-0000-4000-a000-000000000301';

describe('Delete Card Integration Tests', () => {
  let app: express.Application;
  let db: Database;

  beforeEach(async () => {
    realtime.emitCardCreated.mockClear();
    realtime.emitCardUpdated.mockClear();
    realtime.emitCardDeleted.mockClear();
    ({ app, db } = await createTestApp());
    insertCard(db, {
      id: CARD_ID,
      title: 'Delete Me',
      description: 'Card to delete',
      position: 0,
    });
  });

  describe('DELETE /api/cards/:cardId', () => {
    it('rejects card deletion without authentication', async () => {
      const res = await request(app).delete(`/api/cards/${CARD_ID}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
      expect(getDbCard(db, CARD_ID)).not.toBeNull();
      expect(realtime.emitCardDeleted).not.toHaveBeenCalled();
    });

    it('deletes a card, removes it from the database, and emits realtime card.deleted', async () => {
      const res = await request(app)
        .delete(`/api/cards/${CARD_ID}`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(getDbCard(db, CARD_ID)).toBeNull();
      expect(getCardCount(db)).toBe(0);
      expect(realtime.emitCardDeleted).toHaveBeenCalledWith(BOARD_ID, COLUMN_ID, {
        cardId: CARD_ID,
        boardId: BOARD_ID,
        columnId: COLUMN_ID,
      });
    });

    it('deleted card is no longer retrievable through the API', async () => {
      await request(app)
        .delete(`/api/cards/${CARD_ID}`)
        .set('Authorization', AUTH_HEADER)
        .expect(204);

      const res = await request(app)
        .get(`/api/cards/${CARD_ID}`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Card not found' });
    });

    it('returns 404 for a non-existent card and does not emit realtime', async () => {
      const res = await request(app)
        .delete('/api/cards/00000000-0000-4000-a000-000000000999')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Card not found' });
      expect(getDbCard(db, CARD_ID)).not.toBeNull();
      expect(realtime.emitCardDeleted).not.toHaveBeenCalled();
    });

    it('rejects an invalid cardId route parameter', async () => {
      const res = await request(app)
        .delete('/api/cards/not-a-uuid')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({ field: 'cardId', message: 'cardId must be a valid UUID' });
      expect(getDbCard(db, CARD_ID)).not.toBeNull();
      expect(realtime.emitCardDeleted).not.toHaveBeenCalled();
    });
  });
});
