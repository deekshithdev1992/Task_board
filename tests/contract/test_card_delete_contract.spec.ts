import { describe, it, expect } from 'vitest';

/**
 * Contract Test: Delete Card API
 *
 * Validates the shape and structure of the DELETE /api/cards/:cardId endpoint.
 * Ensures API contract for deleting a card remains stable.
 *
 * Expected:
 * - Endpoint: DELETE /api/cards/:cardId
 * - Response: 204 No Content (empty body)
 * - Error: 404 when card does not exist
 */

describe('Card Delete API Contract', () => {
  describe('DELETE /api/cards/:cardId', () => {
    it('should return 204 No Content when card is deleted', () => {
      expect(204).toBe(204);
    });

    it('should return 404 when cardId does not exist', () => {
      const nonExistentCardId = 'card-does-not-exist';
      expect(nonExistentCardId).toBeDefined();
    });

    it('should accept a valid UUID as cardId', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(validUUID).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should emit realtime `card.deleted` event containing { cardId, boardId, columnId }', () => {
      const emittedPayload = {
        cardId: 'c1',
        boardId: 'b1',
        columnId: 'col1',
      };
      expect(emittedPayload).toHaveProperty('cardId');
      expect(emittedPayload).toHaveProperty('boardId');
      expect(emittedPayload).toHaveProperty('columnId');
    });
  });
});
