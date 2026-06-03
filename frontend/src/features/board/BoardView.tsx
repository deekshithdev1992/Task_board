import React, { useState, useEffect, useRef } from 'react';
import { AddCard } from '../card/AddCard.js';
import { getCardsByColumn, Card } from '../../services/cardService.js';
import CardDetailView from '../card/CardDetailView.js';
import {
  initRealtime,
  cleanupRealtime,
  onCardCreated,
  onCardUpdated,
  onCardDeleted,
} from '../../realtime/cardEvents.js';

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
  const boardIdRef = useRef(boardId);
  boardIdRef.current = boardId;
  const selectedCardIdRef = useRef(selectedCardId);
  selectedCardIdRef.current = selectedCardId;
  const cardTriggerRef = useRef<HTMLElement | null>(null);

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

  // Initialize realtime connection for this board
  useEffect(() => {
    initRealtime(boardId);
    return () => {
      cleanupRealtime(boardId);
    };
  }, [boardId]);

  // Subscribe to realtime card:created events
  useEffect(() => {
    const unsub = onCardCreated((payload) => {
      const created = payload.card as unknown as Card;
      if (created.board_id !== boardIdRef.current) return;
      const columnId = created.column_id;
      if (columnId) {
        setCardsByColumn((prev) => {
          const existing = prev[columnId] || [];
          if (existing.some((c) => (c as Card).id === created.id)) return prev;
          return { ...prev, [columnId]: [...existing, created as Card] };
        });
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to realtime card:updated events
  useEffect(() => {
    const unsub = onCardUpdated((payload) => {
      const updated = payload.card as unknown as Card;
      if (updated.board_id !== boardIdRef.current) return;
      setCardsByColumn((prev) => {
        const next: Record<string, (Card | Record<string, unknown>)[]> = {};
        for (const colId of Object.keys(prev)) {
          next[colId] = (prev[colId] || []).map((c) =>
            (c as Card).id === updated.id ? updated : c,
          );
        }
        return next;
      });
    });
    return () => unsub();
  }, []);

  // Subscribe to realtime card:deleted events
  useEffect(() => {
    const unsub = onCardDeleted((payload) => {
      if (payload.boardId !== boardIdRef.current) return;
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
      if (selectedCardIdRef.current === payload.cardId) {
        setSelectedCardId(null);
      }
    });
    return () => unsub();
  }, []);

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
          onClose={() => {
            setSelectedCardId(null);
            setTimeout(() => cardTriggerRef.current?.focus(), 0);
          }}
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
                      onClick={(e) => {
                        cardTriggerRef.current = e.currentTarget;
                        setSelectedCardId(card.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          cardTriggerRef.current = e.currentTarget;
                          setSelectedCardId(card.id);
                        }
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
