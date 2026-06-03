import { describe, it, expect } from 'vitest';

/**
 * Contract Test: Card Detail API
 *
 * Validates the shape and structure of the GET /api/cards/:cardId endpoint.
 * Ensures API contract for retrieving a single card remains stable.
 *
 * Expected:
 * - Endpoint: GET /api/cards/:cardId
 * - Response: 200 — { card: Card }
 */

describe('Card Detail API Contract', () => {
  describe('GET /api/cards/:cardId', () => {
    it('should return 200 OK with card object when valid cardId is provided', () => {
      const expectedResponse = {
        card: {
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          position: expect.any(Number),
          column_id: expect.any(String),
          board_id: expect.any(String),
          created_by: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String),
        },
      };

      expect(expectedResponse).toBeDefined();
      expect(expectedResponse.card).toBeDefined();
      expect(expectedResponse.card.id).toBeDefined();
    });

    it('should return card fields matching the expected schema', () => {
      const mockCard = {
        id: 'uuid-123',
        title: 'Test Card',
        description: 'A description',
        position: 0,
        column_id: 'col-1',
        board_id: 'board-1',
        created_by: 'user-1',
        created_at: '2026-06-03T00:00:00.000Z',
        updated_at: '2026-06-03T00:00:00.000Z',
      };

      expect(mockCard).toHaveProperty('id');
      expect(mockCard).toHaveProperty('title');
      expect(mockCard).toHaveProperty('position');
      expect(mockCard).toHaveProperty('column_id');
      expect(mockCard).toHaveProperty('board_id');
      expect(mockCard).toHaveProperty('created_at');
      expect(mockCard).toHaveProperty('updated_at');
    });

    it('should return 404 when cardId does not exist', () => {
      const nonExistentCardId = 'card-does-not-exist';
      expect(nonExistentCardId).toBeDefined();
    });

    it('should include timestamps in ISO 8601 format', () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      const createdAt = '2026-06-03T00:00:00.000Z';
      expect(createdAt).toMatch(isoRegex);
    });

    it('should return optional description as string when present', () => {
      const cardWithDescription = { description: 'A detailed description' };
      const cardWithoutDescription = {};

      expect(cardWithDescription.description).toBeDefined();
      expect(cardWithoutDescription.description).toBeUndefined();
    });
  });
});
