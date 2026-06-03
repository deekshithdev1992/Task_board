import { CardModel } from '../models/card.js';
import { Database } from 'sql.js';

/**
 * Card Service
 * 
 * Handles all business logic for card operations:
 * - Creating cards with validation
 * - Retrieving cards
 * - Updating card details
 * - Deleting cards
 * 
 * Works with:
 * - CardModel for database persistence
 * - CardValidation for input validation
 * - RealtimeManager for event emission (injected)
 */

export interface CreateCardInput {
  title: string;
  description?: string;
  columnId: string;
  boardId: string;
  userId?: string;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  columnId?: string;
  position?: number;
}

export class CardService {
  private cardModel: CardModel;

  constructor(database: Database) {
    this.cardModel = new CardModel(database);
  }

  /**
   * Create a new card in a column
   * 
   * @param input Card creation data
   * @returns The created card object
   * @throws Error if validation fails or database operation fails
   */
  createCard(input: CreateCardInput) {
    const now = new Date().toISOString();
    const id = this.generateId();

    const cardData = {
      id,
      title: input.title,
      description: input.description || null,
      position: undefined, // Will be computed by the model
      column_id: input.columnId,
      board_id: input.boardId,
      created_by: input.userId,
      created_at: now,
      updated_at: now,
    };

    const created = this.cardModel.create(cardData as Parameters<typeof this.cardModel.create>[0]);
    return created;
  }

  /**
   * Retrieve a card by ID
   * 
   * @param cardId The card's UUID
   * @returns The card object or null if not found
   */
  getCardById(cardId: string) {
    return this.cardModel.getById(cardId);
  }

  /**
   * Retrieve all cards in a column
   * 
   * @param columnId The column's UUID
   * @returns Array of card objects
   */
  getCardsByColumnId(columnId: string) {
    return this.cardModel.getByColumnId(columnId);
  }

  /**
   * Retrieve all cards in a board
   * 
   * @param boardId The board's UUID
   * @returns Array of card objects
   */
  getCardsByBoardId(boardId: string) {
    return this.cardModel.getByBoardId(boardId);
  }

  /**
   * Update a card
   * 
   * @param cardId The card's UUID
   * @param input Partial card data to update
   * @returns The updated card object or null if not found
   * @throws Error if validation fails
   */
  updateCard(cardId: string, input: UpdateCardInput) {
    const card = this.cardModel.getById(cardId);
    if (!card) {
      return null;
    }

    // Whitelist allowed fields to prevent field injection
    const allowed: Record<string, unknown> = {};
    if (input.title !== undefined) allowed.title = input.title;
    if (input.description !== undefined) allowed.description = input.description;
    if (input.position !== undefined) allowed.position = input.position;

    const updated = {
      ...card,
      ...allowed,
      updated_at: new Date().toISOString(),
    };

    return this.cardModel.update(cardId, updated);
  }

  /**
   * Delete a card
   * 
   * @param cardId The card's UUID
   * @returns true if deleted, false if not found
   */
  deleteCard(cardId: string): boolean {
    return this.cardModel.delete(cardId);
  }

  /**
   * Generate a UUID v4
   * 
   * @returns A new UUID string
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
