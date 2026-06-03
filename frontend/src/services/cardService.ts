/**
 * Frontend Card Service
 *
 * Handles all API calls related to cards:
 * - Creating new cards
 * - Fetching cards by ID, column, or board
 * - Updating cards
 * - Deleting cards
 *
 * Base URL: /api
 * Endpoints follow the contract in contracts/card-api.md
 */

export interface Card {
  id: string;
  title: string;
  description?: string;
  position: number;
  column_id: string;
  board_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCardInput {
  title: string;
  description?: string;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  columnId?: string;
  position?: number;
}

/**
 * Create a new card in a board's column
 *
 * @param boardId - The board UUID
 * @param columnId - The column UUID
 * @param data - Card creation data
 * @returns The created card object
 * @throws Error if the request fails
 */
export async function createCard(
  boardId: string,
  columnId: string,
  data: CreateCardInput
): Promise<Card> {
  const response = await fetch(`/api/boards/${boardId}/columns/${columnId}/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = (await response.json()) as Record<string, unknown>;
    throw new Error((error.error as string) || 'Failed to create card');
  }

  const result = (await response.json()) as { card: Card };
  return result.card;
}

/**
 * Fetch a specific card by ID
 *
 * @param cardId - The card UUID
 * @returns The card object
 * @throws Error if card not found or request fails
 */
export async function getCard(cardId: string): Promise<Card> {
  const response = await fetch(`/api/cards/${cardId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch card');
  }

  const result = (await response.json()) as { card: Card };
  return result.card;
}

/**
 * Fetch all cards in a column
 *
 * @param boardId - The board UUID
 * @param columnId - The column UUID
 * @returns Array of card objects
 * @throws Error if request fails
 */
export async function getCardsByColumn(
  boardId: string,
  columnId: string
): Promise<Card[]> {
  const response = await fetch(
    `/api/boards/${boardId}/columns/${columnId}/cards`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch cards');
  }

  const result = (await response.json()) as { cards: Card[] };
  return result.cards;
}

/**
 * Fetch all cards in a board
 *
 * @param boardId - The board UUID
 * @returns Array of card objects
 * @throws Error if request fails
 */
export async function getCardsByBoard(boardId: string): Promise<Card[]> {
  const response = await fetch(`/api/boards/${boardId}/cards`);

  if (!response.ok) {
    throw new Error('Failed to fetch cards');
  }

  const result = (await response.json()) as { cards: Card[] };
  return result.cards;
}

/**
 * Update a card
 *
 * @param cardId - The card UUID
 * @param data - Partial card data to update
 * @returns The updated card object
 * @throws Error if card not found or request fails
 */
export async function updateCard(
  cardId: string,
  data: UpdateCardInput
): Promise<Card> {
  const response = await fetch(`/api/cards/${cardId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update card');
  }

  const result = (await response.json()) as { card: Card };
  return result.card;
}

/**
 * Delete a card
 *
 * @param cardId - The card UUID
 * @throws Error if card not found or request fails
 */
export async function deleteCard(cardId: string): Promise<void> {
  const response = await fetch(`/api/cards/${cardId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete card');
  }
}
