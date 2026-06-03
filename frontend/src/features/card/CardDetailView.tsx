import React, { useEffect, useState } from 'react';
import { getCard, Card } from '../../services/cardService.js';
import EditCard from './EditCard.js';

export interface CardDetailViewProps {
  cardId: string;
  onClose: () => void;
  onCardUpdated?: (card: Record<string, unknown>) => void;
}

export const CardDetailView: React.FC<CardDetailViewProps> = ({
  cardId,
  onClose,
  onCardUpdated,
}) => {
  const [card, setCard] = useState<Record<string, unknown> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    let unsub: (() => void) | null = null;
    let cardEvents: typeof import('../../realtime/cardEvents') | null = null;
    (async () => {
      cardEvents = await import('../../realtime/cardEvents');
      unsub = cardEvents.onCardUpdated((payload) => {
        const updated = payload.card as unknown as Card;
        if (updated.id === cardId) {
          setCard(updated as unknown as Record<string, unknown>);
        }
      });
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [cardId]);

  const handleUpdated = (updatedCard: Record<string, unknown>) => {
    setCard(updatedCard);
    setIsEditing(false);
    if (onCardUpdated) onCardUpdated(updatedCard);
  };

  if (isLoading) {
    return (
      <div className="card-detail-modal">
        <div className="card-detail">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="card-detail-modal">
        <div className="card-detail">
          <div className="error-message">{error || 'Card not found'}</div>
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
    <div className="card-detail-modal" role="dialog" aria-modal="true">
      <div className="card-detail">
        <div className="card-detail-header">
          <h2>{(card as unknown as Card).title}</h2>
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
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <EditCard
            card={card as unknown as Card}
            onUpdated={handleUpdated}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CardDetailView;
