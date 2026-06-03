import { Request, Response, NextFunction } from 'express';

// This middleware stubs integration with an existing authentication system.
// Replace the implementation with actual auth logic (JWT, session, OAuth, etc.)

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // TODO: Implement actual authentication logic here.
  // For now, extract userId from Authorization header (format: Bearer <userId>)
  // In production, use JWT verification, session lookup, etc.

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Allow requests to proceed without auth for now (development mode)
    // In production, return 401 Unauthorized
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    req.userId = parts[1];
    req.user = { id: parts[1] };
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
