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

const CARD_ID = '00000000-0000-4000-a000-000000000401';
const CARD_WITHOUT_DESCRIPTION_ID = '00000000-0000-4000-a000-000000000402';

describe('Card Detail Integration Tests', () => {
  let app: express.Application;
  let db: Database;

  beforeEach(async () => {
    realtime.emitCardCreated.mockClear();
    realtime.emitCardUpdated.mockClear();
    realtime.emitCardDeleted.mockClear();
    ({ app, db } = await createTestApp());
    insertCard(db, {
      id: CARD_ID,
      title: 'Detail Card',
      description: 'A detailed description',
      position: 3,
      createdBy: TEST_USER,
    });
    insertCard(db, {
      id: CARD_WITHOUT_DESCRIPTION_ID,
      title: 'No Description Card',
      description: null,
      position: 4,
      createdBy: TEST_USER,
    });
  });

  describe('GET /api/cards/:cardId', () => {
    it('rejects card detail requests without authentication', async () => {
      const res = await request(app).get(`/api/cards/${CARD_ID}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
      expect(getCardCount(db)).toBe(2);
    });

    it('returns a card with all required fields and does not mutate the database', async () => {
      const res = await request(app)
        .get(`/api/cards/${CARD_ID}`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.card).toMatchObject({
        id: CARD_ID,
        title: 'Detail Card',
        description: 'A detailed description',
        position: 3,
        column_id: COLUMN_ID,
        board_id: BOARD_ID,
        created_by: TEST_USER,
      });
      expect(res.body.card.created_at).toEqual(expect.any(String));
      expect(res.body.card.updated_at).toEqual(expect.any(String));
      expect(getCardCount(db)).toBe(2);
      expect(realtime.emitCardCreated).not.toHaveBeenCalled();
      expect(realtime.emitCardUpdated).not.toHaveBeenCalled();
      expect(realtime.emitCardDeleted).not.toHaveBeenCalled();
    });

    it('omits optional description when it is not present in the database', async () => {
      const res = await request(app)
        .get(`/api/cards/${CARD_WITHOUT_DESCRIPTION_ID}`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.card).toMatchObject({
        id: CARD_WITHOUT_DESCRIPTION_ID,
        title: 'No Description Card',
        position: 4,
      });
      expect(res.body.card.description).toBeUndefined();
    });

    it('returns 404 for a non-existent card', async () => {
      const res = await request(app)
        .get('/api/cards/00000000-0000-4000-a000-000000000999')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Card not found' });
      expect(getCardCount(db)).toBe(2);
    });

    it('rejects an invalid cardId route parameter', async () => {
      const res = await request(app)
        .get('/api/cards/not-a-uuid')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.errors).toContainEqual({ field: 'cardId', message: 'cardId must be a valid UUID' });
      expect(getCardCount(db)).toBe(2);
    });
  });
});
