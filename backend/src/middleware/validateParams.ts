import { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

const PARAM_RULES: Record<string, { pattern: RegExp; message: string }> = {
  cardId: { pattern: UUID_REGEX, message: 'cardId must be a valid UUID' },
  boardId: { pattern: UUID_REGEX, message: 'boardId must be a valid UUID' },
  columnId: { pattern: UUID_REGEX, message: 'columnId must be a valid UUID' },
};

export function validateParams(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: { field: string; message: string }[] = [];

    for (const name of paramNames) {
      const rule = PARAM_RULES[name];
      if (!rule) continue;

      const value = req.params[name];
      if (!value || !rule.pattern.test(value)) {
        errors.push({ field: name, message: rule.message });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  };
}
