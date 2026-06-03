const TITLE_MIN_LENGTH = 1;
const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 10000;

export interface ValidationError {
  field: string;
  message: string;
}

export class CardValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super('Card validation failed');
    this.name = 'CardValidationError';
  }
}

export function validateCardTitle(title: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (title === undefined || title === null) {
    errors.push({ field: 'title', message: 'Title is required' });
    return errors;
  }

  if (typeof title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
    return errors;
  }

  if (title.length < TITLE_MIN_LENGTH) {
    errors.push({ field: 'title', message: `Title must be at least ${TITLE_MIN_LENGTH} character` });
  }

  if (title.length > TITLE_MAX_LENGTH) {
    errors.push({ field: 'title', message: `Title must not exceed ${TITLE_MAX_LENGTH} characters` });
  }

  return errors;
}

export function validateCardDescription(description: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (description === undefined || description === null) {
    return errors; // Optional field
  }

  if (typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
    return errors;
  }

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push({ field: 'description', message: `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters` });
  }

  return errors;
}

export function validateCreateCard(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...validateCardTitle(data.title));

  if (data.description !== undefined && data.description !== null) {
    errors.push(...validateCardDescription(data.description));
  }

  if (!data.column_id || typeof data.column_id !== 'string') {
    errors.push({ field: 'column_id', message: 'Column ID is required and must be a string' });
  }

  if (!data.board_id || typeof data.board_id !== 'string') {
    errors.push({ field: 'board_id', message: 'Board ID is required and must be a string' });
  }

  if (data.position !== undefined) {
    if (typeof data.position !== 'number' || data.position < 0) {
      errors.push({ field: 'position', message: 'Position must be a non-negative number' });
    }
  }

  return errors;
}

export function validateUpdateCard(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.title !== undefined) {
    errors.push(...validateCardTitle(data.title));
  }

  if (data.description !== undefined) {
    errors.push(...validateCardDescription(data.description));
  }

  if (data.position !== undefined) {
    if (typeof data.position !== 'number' || data.position < 0) {
      errors.push({ field: 'position', message: 'Position must be a non-negative number' });
    }
  }

  return errors;
}
