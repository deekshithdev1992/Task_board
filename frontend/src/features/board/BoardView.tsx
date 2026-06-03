import React, { useState, useEffect } from 'react';
import { AddCard } from '../card/AddCard.js';
import { getCardsByColumn, Card } from '../../services/cardService.js';
import CardDetailView from '../card/CardDetailView.js';
import { onCardDeleted } from '../../realtime/cardEvents.js';

/**
 * BoardView Component
 *
 * Displays a board with columns and cards.
 *
 * Features:
 * - Display columns in a horizontal layout
 * - Display cards within each column
 * - Add new card UI in each column
 * - Handle realtime card.created events
 * - Scroll horizontally if many columns
 *
 * Props:
 * - boardId: UUID of the board to display
 * - columns: Array of column objects with id and name
 */

export interface Column {
  id: string;
  name: string;
}

export interface BoardViewProps {
  boardId: string;
  columns: Column[];
}

export const BoardView: React.FC<BoardViewProps> = ({ boardId, columns }) => {
  const [cardsByColumn, setCardsByColumn] = useState<
    Record<string, (Card | Record<string, unknown>)[]>
  >({});
  const [isLoadingColumn, setIsLoadingColumn] = useState<Record<string, boolean>>({});
  const [showAddCardForm, setShowAddCardForm] = useState<Record<string, boolean>>({});
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Load cards for all columns on mount
  useEffect(() => {
    const loadCards = async () => {
      const columnCards: Record<string, Card[]> = {};
      const loading: Record<string, boolean> = {};

      for (const column of columns) {
        loading[column.id] = true;
      }
      setIsLoadingColumn(loading);

      try {
        for (const column of columns) {
          try {
            const cards = await getCardsByColumn(boardId, column.id);
            columnCards[column.id] = cards;
          } catch (err) {
            console.error(`Failed to load cards for column ${column.id}:`, err);
            columnCards[column.id] = [];
          }
        }
        setCardsByColumn(columnCards);
      } finally {
        setIsLoadingColumn({});
      }
    };

    loadCards();
  }, [boardId, columns]);

  // Subscribe to realtime card:deleted events
  useEffect(() => {
    const unsub = onCardDeleted((payload) => {
      setCardsByColumn((prev) => {
        const next: Record<string, (Card | Record<string, unknown>)[]> = {};
        for (const colId of Object.keys(prev)) {
          next[colId] = (prev[colId] || []).filter(
            (c) => (c as Card).id !== payload.cardId
          );
        }
        return next;
      });
      // Close detail view if the deleted card is shown
      if (selectedCardId === payload.cardId) {
        setSelectedCardId(null);
      }
    });
    return () => unsub();
  }, [selectedCardId]);

  const handleCardCreated = (columnId: string, card: Record<string, unknown>) => {
    // Add the new card to the column
    setCardsByColumn((prev) => ({
      ...prev,
      [columnId]: [...(prev[columnId] || []), card as unknown as Card],
    }));

    // Close the add card form
    setShowAddCardForm((prev) => ({
      ...prev,
      [columnId]: false,
    }));
  };

  const toggleAddCardForm = (columnId: string) => {
    setShowAddCardForm((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  return (
    <div className="board-view">
      <div className="board-header">
        <h1>Task Board</h1>
      </div>

      {selectedCardId && (
        <CardDetailView
          cardId={selectedCardId}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={(updatedCard) => {
            const updated = updatedCard as unknown as Card;
            setCardsByColumn((prev) => {
              const next: Record<string, (Card | Record<string, unknown>)[]> = {};
              for (const col of columns) {
                next[col.id] = [];
              }
              for (const colId of Object.keys(prev)) {
                next[colId] = (prev[colId] || []).filter(
                  (c) => (c as Card).id !== updated.id,
                );
              }
              const targetCol = updated.column_id;
              if (!next[targetCol]) next[targetCol] = [];
              next[targetCol] = [...next[targetCol], updated as Card];
              return next;
            });
          }}
          onCardDeleted={(payload) => {
            setCardsByColumn((prev) => {
              const next: Record<string, (Card | Record<string, unknown>)[]> = {};
              for (const colId of Object.keys(prev)) {
                next[colId] = (prev[colId] || []).filter(
                  (c) => (c as Card).id !== payload.cardId
                );
              }
              return next;
            });
          }}
        />
      )}

      <div className="columns-container">
        {columns.map((column) => (
          <div key={column.id} className="column">
            <div className="column-header">
              <h2>{column.name}</h2>
              <span className="card-count">
                {(cardsByColumn[column.id] || []).length} cards
              </span>
            </div>

            <div className="cards-list">
              {isLoadingColumn[column.id] ? (
                <div className="loading">Loading cards...</div>
              ) : (cardsByColumn[column.id] || []).length > 0 ? (
                (cardsByColumn[column.id] || []).map((cardData) => {
                  const card = cardData as Card;
                  return (
                    <div
                      key={card.id}
                      className="card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedCardId(card.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setSelectedCardId(card.id);
                      }}
                    >
                      <div className="card-header">
                        <h3>{card.title}</h3>
                      </div>
                      {card.description && (
                        <div className="card-description">
                          <p>{card.description}</p>
                        </div>
                      )}
                      <div className="card-footer">
                        <small className="card-meta">
                          Position: {card.position}
                        </small>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">No cards yet</div>
              )}
            </div>

            <div className="column-actions">
              {showAddCardForm[column.id] ? (
                <AddCard
                  boardId={boardId}
                  columnId={column.id}
                  onCardCreated={(card) =>
                    handleCardCreated(column.id, card)
                  }
                  onCancel={() => toggleAddCardForm(column.id)}
                />
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => toggleAddCardForm(column.id)}
                  aria-label={`Add card to ${column.name}`}
                >
                  + Add Card
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardView;
