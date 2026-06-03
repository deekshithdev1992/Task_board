import { Router, Request, Response } from 'express';
import { validateCreateCard, validateUpdateCard } from '../validation/cardValidation.js';
import { validateParams } from '../middleware/validateParams.js';
import { getRealtime } from '../realtime/index.js';

const router = Router();

// Placeholder for Card Service (to be injected)
interface CardService {
  createCard(data: Record<string, unknown>): Record<string, unknown>;
  getCardById(id: string): Record<string, unknown> | null;
  updateCard(id: string, data: Record<string, unknown>): Record<string, unknown> | null;
  deleteCard(id: string): boolean;
  getCardsByBoardId(boardId: string): Record<string, unknown>[];
  getCardsByColumnId(columnId: string): Record<string, unknown>[];
}

let cardService: CardService | null = null;

export function setCardService(service: CardService) {
  cardService = service;
}

// GET /api/boards/:boardId/columns/:columnId/cards
router.get('/boards/:boardId/columns/:columnId/cards', validateParams('boardId', 'columnId'), (req: Request, res: Response) => {
  try {
    if (!cardService) {
      return res.status(503).json({ error: 'Card service not initialized' });
    }

    const { columnId } = req.params;
    const cards = cardService.getCardsByColumnId(columnId);
    res.json({ cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// POST /api/boards/:boardId/columns/:columnId/cards
router.post('/boards/:boardId/columns/:columnId/cards', validateParams('boardId', 'columnId'), (req: Request, res: Response) => {
  try {
    if (!cardService) {
      return res.status(503).json({ error: 'Card service not initialized' });
    }

    const { boardId, columnId } = req.params;
    const validationErrors = validateCreateCard({
      ...req.body,
      board_id: boardId,
      column_id: columnId,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const card = cardService.createCard({
      title: req.body.title as string,
      description: req.body.description as string | undefined,
      columnId,
      boardId,
      userId: req.userId,
    });

    // Emit realtime event
    try {
      const realtimeManager = getRealtime();
      realtimeManager.emitCardCreated(boardId, columnId, { card });
    } catch (realtimeError) {
      console.warn('Failed to emit realtime event:', realtimeError);
      // Don't fail the request if realtime fails
    }

    res.status(201).json({ card });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// GET /api/cards/:cardId
router.get('/cards/:cardId', validateParams('cardId'), (req: Request, res: Response) => {
  try {
    if (!cardService) {
      return res.status(503).json({ error: 'Card service not initialized' });
    }

    const { cardId } = req.params;
    const card = cardService.getCardById(cardId);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ card });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// PUT /api/cards/:cardId
router.put('/cards/:cardId', validateParams('cardId'), (req: Request, res: Response) => {
  try {
    if (!cardService) {
      return res.status(503).json({ error: 'Card service not initialized' });
    }

    const { cardId } = req.params;
    const validationErrors = validateUpdateCard(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const card = cardService.updateCard(cardId, req.body);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Emit realtime updated event
    try {
      const realtimeManager = getRealtime();
      const cardData = card as Record<string, unknown>;
      realtimeManager.emitCardUpdated(
        cardData.board_id as string,
        cardData.column_id as string,
        { card },
      );
    } catch (realtimeError) {
      console.warn('Failed to emit realtime event:', realtimeError);
      // Do not fail the request if realtime emission fails
    }

    res.json({ card });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// DELETE /api/cards/:cardId
router.delete('/cards/:cardId', validateParams('cardId'), (req: Request, res: Response) => {
  try {
    if (!cardService) {
      return res.status(503).json({ error: 'Card service not initialized' });
    }

    const { cardId } = req.params;

    // Fetch card first to get board_id/column_id for realtime event
    const existing = cardService.getCardById(cardId);
    if (!existing) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const existingData = existing as Record<string, unknown>;
    const boardId = existingData.board_id as string;
    const columnId = existingData.column_id as string;

    const success = cardService.deleteCard(cardId);

    if (!success) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Emit realtime deleted event
    try {
      const realtimeManager = getRealtime();
      realtimeManager.emitCardDeleted(boardId, columnId, {
        cardId,
        boardId,
        columnId,
      });
    } catch (realtimeError) {
      console.warn('Failed to emit realtime event:', realtimeError);
      // Do not fail the request if realtime emission fails
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

export default router;
