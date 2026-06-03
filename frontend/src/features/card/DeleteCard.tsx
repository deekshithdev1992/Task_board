import React, { useState } from 'react';
import { deleteCard } from '../../services/cardService.js';

export interface DeleteCardProps {
  cardId: string;
  cardTitle: string;
  onDeleted: () => void;
  onCancel: () => void;
}

export const DeleteCard: React.FC<DeleteCardProps> = ({
  cardId,
  cardTitle,
  onDeleted,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteCard(cardId);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete card', err);
      setError('Failed to delete card');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="delete-card-confirmation">
      <p>Are you sure you want to delete <strong>{cardTitle}</strong>?</p>
      {error && <div className="error-message">{error}</div>}
      <div className="form-actions">
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={isLoading}
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DeleteCard;
