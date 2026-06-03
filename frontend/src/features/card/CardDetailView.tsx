import React, { useEffect, useState, useRef } from 'react';
import { getCard, Card } from '../../services/cardService.js';
import EditCard from './EditCard.js';
import DeleteCard from './DeleteCard.js';
import * as cardEvents from '../../realtime/cardEvents.js';

export interface CardDetailViewProps {
  cardId: string;
  onClose: () => void;
  onCardUpdated?: (card: Record<string, unknown>) => void;
  onCardDeleted?: (payload: { cardId: string; boardId: string; columnId: string }) => void;
}

export const CardDetailView: React.FC<CardDetailViewProps> = ({
  cardId,
  onClose,
  onCardUpdated,
  onCardDeleted,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  const [card, setCard] = useState<Record<string, unknown> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isLoading && dialogRef.current) {
      const firstFocusable = dialogRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (firstFocusable) (firstFocusable as HTMLElement).focus();
    }
  }, [isLoading]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const c = await getCard(cardId);
        if (mounted) setCard(c as unknown as Record<string, unknown>);
      } catch (err) {
        console.error('Failed to load card', err);
        if (mounted) setError('Failed to load card');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    // subscribe to realtime updates for this card
    const unsubUpdated = cardEvents.onCardUpdated((payload) => {
      const updated = payload.card as unknown as Card;
      if (updated.id === cardId) {
        setCard(updated as unknown as Record<string, unknown>);
      }
    });
    const unsubDeleted = cardEvents.onCardDeleted((payload) => {
      if (payload.cardId === cardId) {
        if (onCardDeleted) onCardDeleted(payload);
        onClose();
      }
    });

    return () => {
      mounted = false;
      unsubUpdated();
      unsubDeleted();
    };
  }, [cardId]);

  const handleUpdated = (updatedCard: Record<string, unknown>) => {
    setCard(updatedCard);
    setIsEditing(false);
    if (onCardUpdated) onCardUpdated(updatedCard);
  };

  const handleDeleted = () => {
    const cardData = card as unknown as Card;
    const payload = {
      cardId: cardData.id,
      boardId: cardData.board_id,
      columnId: cardData.column_id,
    };
    if (onCardDeleted) onCardDeleted(payload);
    onClose();
  };

  if (isLoading) {
    return (
      <div className="card-detail-modal" role="dialog" aria-modal="true" aria-labelledby="card-detail-loading" ref={dialogRef} tabIndex={-1} onKeyDown={handleDialogKeyDown}>
        <div className="card-detail">
          <div id="card-detail-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="card-detail-modal" role="dialog" aria-modal="true" aria-labelledby="card-detail-error" ref={dialogRef} tabIndex={-1} onKeyDown={handleDialogKeyDown}>
        <div className="card-detail">
          <div id="card-detail-error" className="error-message">{error || 'Card not found'}</div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const descriptionStr = card ? String((card as unknown as Card).description || '') : '';

  return (
    <div className="card-detail-modal" role="dialog" aria-modal="true" ref={dialogRef} tabIndex={-1} aria-labelledby="card-detail-title" onKeyDown={handleDialogKeyDown}>
      <div className="card-detail">
        <div className="card-detail-header">
          <h2 id="card-detail-title">{(card as unknown as Card).title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {!isEditing ? (
          <div className="card-detail-body">
            {descriptionStr && <p>{descriptionStr}</p>}
            <div className="card-meta">
              <small>Position: {(card as unknown as Card).position}</small>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Edit
              </button>
              <button className="btn btn-danger" onClick={() => setIsDeleting(true)}>
                Delete
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
            {isDeleting && (
              <div className="card-detail-delete">
                <DeleteCard
                  cardId={(card as unknown as Card).id}
                  cardTitle={(card as unknown as Card).title}
                  onDeleted={handleDeleted}
                  onCancel={() => setIsDeleting(false)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="edit-card-section">
            <EditCard
              card={card as unknown as Card}
              onUpdated={handleUpdated}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CardDetailView;
