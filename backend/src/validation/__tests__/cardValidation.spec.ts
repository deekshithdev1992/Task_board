import { describe, it, expect } from 'vitest';
import {
  validateCardTitle,
  validateCardDescription,
  validateCreateCard,
  validateUpdateCard,
  CardValidationError,
  ValidationError,
} from '../cardValidation.js';

describe('validateCardTitle', () => {
  it('returns error when title is undefined', () => {
    const errors = validateCardTitle(undefined);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({ field: 'title', message: 'Title is required' });
  });

  it('returns error when title is null', () => {
    const errors = validateCardTitle(null);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('title');
  });

  it('returns error when title is not a string', () => {
    const errors = validateCardTitle(123);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('string');
  });

  it('returns error when title is empty string', () => {
    const errors = validateCardTitle('');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('at least');
  });

  it('returns error when title exceeds 255 characters', () => {
    const errors = validateCardTitle('x'.repeat(256));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('not exceed');
  });

  it('passes for valid title at min length', () => {
    const errors = validateCardTitle('A');
    expect(errors).toHaveLength(0);
  });

  it('passes for valid title at max length', () => {
    const errors = validateCardTitle('x'.repeat(255));
    expect(errors).toHaveLength(0);
  });

  it('passes for valid title with whitespace', () => {
    const errors = validateCardTitle('  My Card  ');
    expect(errors).toHaveLength(0);
  });
});

describe('validateCardDescription', () => {
  it('returns no errors when description is undefined (optional)', () => {
    const errors = validateCardDescription(undefined);
    expect(errors).toHaveLength(0);
  });

  it('returns no errors when description is null (optional)', () => {
    const errors = validateCardDescription(null);
    expect(errors).toHaveLength(0);
  });

  it('returns error when description is not a string', () => {
    const errors = validateCardDescription(123);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('string');
  });

  it('returns error when description exceeds 10000 characters', () => {
    const errors = validateCardDescription('x'.repeat(10001));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('not exceed');
  });

  it('passes for valid description at max length', () => {
    const errors = validateCardDescription('x'.repeat(10000));
    expect(errors).toHaveLength(0);
  });

  it('passes for empty string description', () => {
    const errors = validateCardDescription('');
    expect(errors).toHaveLength(0);
  });
});

describe('validateCreateCard', () => {
  it('returns errors for missing required fields', () => {
    const errors = validateCreateCard({});
    expect(errors.length).toBeGreaterThanOrEqual(2);
    const fields = errors.map((e) => e.field);
    expect(fields).toContain('title');
    expect(fields).toContain('board_id');
    expect(fields).toContain('column_id');
  });

  it('returns error when title is missing but board_id and column_id are present', () => {
    const errors = validateCreateCard({ board_id: 'b1', column_id: 'c1' });
    const titleErrors = errors.filter((e) => e.field === 'title');
    expect(titleErrors.length).toBeGreaterThan(0);
  });

  it('passes for valid card data', () => {
    const errors = validateCreateCard({
      title: 'Test Card',
      board_id: 'b1',
      column_id: 'c1',
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for valid card with optional description', () => {
    const errors = validateCreateCard({
      title: 'Test Card',
      description: 'A description',
      board_id: 'b1',
      column_id: 'c1',
    });
    expect(errors).toHaveLength(0);
  });

  it('returns error for invalid position', () => {
    const errors = validateCreateCard({
      title: 'Test Card',
      board_id: 'b1',
      column_id: 'c1',
      position: -1,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('position');
  });

  it('passes for valid position', () => {
    const errors = validateCreateCard({
      title: 'Test Card',
      board_id: 'b1',
      column_id: 'c1',
      position: 0,
    });
    expect(errors).toHaveLength(0);
  });

  it('returns error for non-numeric board_id', () => {
    const errors = validateCreateCard({
      title: 'Test Card',
      board_id: 123,
      column_id: 'c1',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('board_id');
  });
});

describe('validateUpdateCard', () => {
  it('returns no errors when no fields provided', () => {
    const errors = validateUpdateCard({});
    expect(errors).toHaveLength(0);
  });

  it('validates title if provided', () => {
    const errors = validateUpdateCard({ title: '' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('title');
  });

  it('validates description if provided', () => {
    const errors = validateUpdateCard({ description: 123 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('description');
  });

  it('validates position if provided', () => {
    const errors = validateUpdateCard({ position: -1 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('position');
  });

  it('accepts valid update fields', () => {
    const errors = validateUpdateCard({
      title: 'Updated',
      description: 'New desc',
      position: 3,
    });
    expect(errors).toHaveLength(0);
  });
});

describe('CardValidationError', () => {
  it('creates an error with validation errors', () => {
    const validationErrors: ValidationError[] = [
      { field: 'title', message: 'Title is required' },
    ];
    const error = new CardValidationError(validationErrors);
    expect(error.name).toBe('CardValidationError');
    expect(error.errors).toEqual(validationErrors);
    expect(error.message).toBe('Card validation failed');
  });
});
