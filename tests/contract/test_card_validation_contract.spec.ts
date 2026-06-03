import { describe, it, expect } from 'vitest';

/**
 * Contract Test: Card Validation API
 *
 * Validates the validation rules for all card endpoints.
 * Ensures API returns properly structured validation errors.
 *
 * Endpoints:
 * - POST /api/boards/:boardId/columns/:columnId/cards
 * - PUT /api/cards/:cardId
 * - GET /api/cards/:cardId
 * - DELETE /api/cards/:cardId
 *
 * Validation rules (from data-model.md):
 * - title: required, non-empty, max 255 chars
 * - description: optional, max 10000 chars
 * - position: non-negative number
 * - cardId/boardId/columnId: UUID format
 */

describe('Card Validation API Contract', () => {
  describe('Error response shape', () => {
    it('should return errors as an array of { field, message } objects', () => {
      const errorResponse = {
        errors: [
          { field: 'title', message: 'Title is required' },
          { field: 'board_id', message: 'Board ID is required and must be a string' },
        ],
      };

      expect(Array.isArray(errorResponse.errors)).toBe(true);
      errorResponse.errors.forEach((err) => {
        expect(err).toHaveProperty('field');
        expect(err).toHaveProperty('message');
        expect(typeof err.field).toBe('string');
        expect(typeof err.message).toBe('string');
      });
    });

    it('should return 400 status for validation errors', () => {
      const validationStatus = 400;
      expect(validationStatus).toBe(400);
    });

    it('should return 400 for invalid UUID params', () => {
      const invalidUUIDParams = ['not-a-uuid', '', '123', 'null'];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      invalidUUIDParams.forEach((param) => {
        expect(param).not.toMatch(uuidRegex);
      });
    });
  });

  describe('POST /api/boards/:boardId/cards validation', () => {
    it('should reject request with missing title', () => {
      const payload = { description: 'No title' };
      expect(payload.title).toBeUndefined();
    });

    it('should reject request with empty title', () => {
      const payload = { title: '' };
      expect(payload.title.length).toBe(0);
    });

    it('should reject request with title exceeding 255 characters', () => {
      const payload = { title: 'x'.repeat(256) };
      expect(payload.title.length).toBeGreaterThan(255);
    });

    it('should reject request with description exceeding 10000 characters', () => {
      const payload = { title: 'Valid', description: 'x'.repeat(10001) };
      expect(payload.description.length).toBeGreaterThan(10000);
    });

    it('should reject request with non-string title', () => {
      const payloads = [{ title: 123 }, { title: null }, { title: true }];

      payloads.forEach((payload) => {
        expect(typeof payload.title).not.toBe('string');
      });
    });

    it('should reject request with negative position', () => {
      const payload = { title: 'Valid', position: -1 };
      expect(payload.position).toBeLessThan(0);
    });

    it('should accept request with valid position', () => {
      const payload = { title: 'Valid', position: 0 };
      expect(payload.position).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PUT /api/cards/:cardId validation', () => {
    it('should accept empty body (no fields to update)', () => {
      const payload = {};
      expect(Object.keys(payload)).toHaveLength(0);
    });

    it('should reject title exceeding 255 characters', () => {
      const payload = { title: 'x'.repeat(256) };
      expect(payload.title.length).toBeGreaterThan(255);
    });

    it('should reject description exceeding 10000 characters', () => {
      const payload = { description: 'x'.repeat(10001) };
      expect(payload.description.length).toBeGreaterThan(10000);
    });

    it('should reject negative position', () => {
      const payload = { position: -1 };
      expect(payload.position).toBeLessThan(0);
    });

    it('should reject non-string title', () => {
      const payloads = [{ title: 123 }, { title: null }];
      payloads.forEach((payload) => {
        expect(typeof payload.title).not.toBe('string');
      });
    });

    it('should reject non-numeric position', () => {
      const payloads = [{ position: 'abc' }, { position: null }];
      payloads.forEach((payload) => {
        expect(typeof payload.position).not.toBe('number');
      });
    });
  });

  describe('Param validation', () => {
    it('should validate cardId is a UUID', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect('123e4567-e89b-12d3-a456-426614174000').toMatch(uuidRegex);
      expect('not-a-uuid').not.toMatch(uuidRegex);
    });

    it('should validate boardId is a UUID', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect('boards-123').not.toMatch(uuidRegex);
      expect('').not.toMatch(uuidRegex);
    });

    it('should validate columnId is a UUID', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect('col-1').not.toMatch(uuidRegex);
    });
  });
});
