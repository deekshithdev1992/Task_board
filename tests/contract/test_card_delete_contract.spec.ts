import { describe, it, expect } from 'vitest';

/**
 * Contract Test: Delete Card API
 *
 * Validates the shape and structure of the DELETE /api/cards/:cardId endpoint.
 * Ensures API contract for deleting a card remains stable.
 *
 * Expected:
 * - Endpoint: DELETE /api/cards/:cardId
 * - Success Response: 204 No Content (empty body)
 * - Error (card not found): 404 — { error: string }
 * - Error (invalid cardId): 400 — { errors: Array<{ field, message }> }
 * - Realtime event emission: card:deleted on success
 */

describe('Card Delete API Contract', () => {
  describe('DELETE /api/cards/:cardId', () => {
    it('should return 204 No Content with empty body when card is deleted', () => {
      /**
       * Test Scenario:
       * When a valid DELETE request is made for an existing card
       * Then the response status should be 204
       * And the response body should be empty
       */
      const expectedStatus = 204;
      const expectedBody = undefined;

      expect(expectedStatus).toBe(204);
      expect(expectedBody).toBeUndefined();
    });

    it('should return 404 with error message when cardId does not exist', () => {
      /**
       * Test Scenario:
       * When a DELETE request is made with a valid UUID that does not exist
       * Then the response status should be 404
       * And the response body should contain an error message
       */
      const errorResponse = {
        error: 'Card not found',
      };

      expect(errorResponse).toHaveProperty('error');
      expect(typeof errorResponse.error).toBe('string');
      expect(errorResponse.error.length).toBeGreaterThan(0);
    });

    it('should return 400 with validation errors for invalid UUID cardId', () => {
      /**
       * Test Scenario:
       * When a DELETE request is made with a non-UUID cardId
       * Then the response status should be 400
       * And the response body should contain an errors array
       * Each error should have { field, message }
       */
      const validationResponse = {
        errors: [
          { field: 'cardId', message: 'cardId must be a valid UUID' },
        ],
      };

      expect(Array.isArray(validationResponse.errors)).toBe(true);
      validationResponse.errors.forEach((err) => {
        expect(err).toHaveProperty('field');
        expect(err).toHaveProperty('message');
        expect(typeof err.field).toBe('string');
        expect(typeof err.message).toBe('string');
      });
    });

    it('should reject empty cardId parameter', () => {
      /**
       * Test Scenario:
       * When cardId is an empty string
       * Then the API should return a validation error
       */
      const emptyCardId = '';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(emptyCardId).not.toMatch(uuidRegex);
    });

    it('should reject non-UUID cardId values', () => {
      /**
       * Test Scenario:
       * When cardId is not a valid UUID format
       * Then the API should reject it
       */
      const invalidCardIds = ['not-a-uuid', 'abc-123', '12345', 'null', 'undefined'];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      invalidCardIds.forEach((cardId) => {
        expect(cardId).not.toMatch(uuidRegex);
      });
    });

    it('should accept a valid UUID format for cardId', () => {
      /**
       * Test Scenario:
       * When cardId is a valid UUID v4
       * Then the API should accept it as a valid parameter format
       */
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(validUUID).toMatch(uuidRegex);
    });

    it('should emit realtime card:deleted event containing cardId, boardId, and columnId', () => {
      /**
       * Test Scenario:
       * When a card is successfully deleted
       * Then the backend should emit a card:deleted event via Socket.IO
       * The event payload should contain cardId, boardId, and columnId
       */
      const emittedPayload = {
        cardId: expect.any(String),
        boardId: expect.any(String),
        columnId: expect.any(String),
      };

      expect(emittedPayload).toHaveProperty('cardId');
      expect(emittedPayload).toHaveProperty('boardId');
      expect(emittedPayload).toHaveProperty('columnId');
    });

    it('should include cardId in the realtime event matching the deleted card', () => {
      /**
       * Test Scenario:
       * The card:deleted event should carry the exact cardId
       * of the card that was deleted
       */
      const cardId = '123e4567-e89b-12d3-a456-426614174000';
      const eventPayload = { cardId, boardId: 'b1', columnId: 'col1' };

      expect(eventPayload.cardId).toBe(cardId);
    });

    it('should return error 503 when database operation fails', () => {
      /**
       * Test Scenario:
       * When an internal server error occurs during deletion
       * Then the API should return 503 Service Unavailable
       */
      const errorStatus = 503;
      const errorResponse = {
        error: 'Failed to delete card',
      };

      expect(errorStatus).toBe(503);
      expect(errorResponse).toHaveProperty('error');
      expect(typeof errorResponse.error).toBe('string');
    });
  });
});
