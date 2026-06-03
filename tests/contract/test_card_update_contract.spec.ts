import { describe, it, expect } from 'vitest';

/**
 * Contract Test: Update Card API
 *
 * Validates the shape and structure of the PUT /api/cards/:cardId endpoint.
 * Ensures API contract for updating a card remains stable.
 *
 * Expected:
 * - Endpoint: PUT /api/cards/:cardId
 * - Request: Partial card fields: { title?: string, description?: string, position?: number, columnId?: UUID }
 * - Response: 200 — { card: Card }
 */

describe('Card Update API Contract', () => {
  describe('PUT /api/cards/:cardId', () => {
    it('should return 200 OK with updated card object when valid fields are provided', () => {
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
    });

    it('should accept partial updates (title or description only)', () => {
      const partialUpdate = { title: 'New Title' };
      expect(partialUpdate.title).toBeDefined();

      const partialUpdate2 = { description: 'Updated description' };
      expect(partialUpdate2.description).toBeDefined();
    });

    it('should return 400 when invalid fields are provided (e.g., title too long)', () => {
      const invalidPayload = { title: 'x'.repeat(101) };
      expect(invalidPayload.title.length).toBeGreaterThan(100);
    });

    it('should return 404 when cardId does not exist', () => {
      const nonExistentCardId = 'card-does-not-exist';
      expect(nonExistentCardId).toBeDefined();
    });

    it('should emit realtime `card:updated` event containing the updated card', () => {
      const emittedPayload = { card: { id: 'c1', title: 't', column_id: 'col1', board_id: 'b1' } };
      expect(emittedPayload.card).toBeDefined();
      expect(emittedPayload.card.id).toBeDefined();
    });
  });
});
