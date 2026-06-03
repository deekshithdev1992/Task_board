import React, { useState, FormEvent, ChangeEvent } from 'react';
import { getCardRequestHeaders } from '../../services/cardService.js';

export interface EditCardProps {
  card: {
    id: string;
    title: string;
    description?: string;
    position?: number;
    column_id: string;
    board_id: string;
  };
  onUpdated: (card: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const EditCard: React.FC<EditCardProps> = ({ card, onUpdated, onCancel }) => {
  const [formData, setFormData] = useState({
    title: card.title || '',
    description: card.description || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (formData.description.length > 10000) {
      newErrors.description = 'Description must be 10000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, title: e.target.value }));
    if (errors.title) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n.title;
        return n;
      });
    }
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }));
    if (errors.description) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n.description;
        return n;
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {};
      if (formData.title !== card.title) payload.title = formData.title;
      if (formData.description !== (card.description || ''))
        payload.description = formData.description;

      const response = await fetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: getCardRequestHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as Record<string, unknown>;
        if (errorData.errors) {
          const fieldErrors: Record<string, string> = {};
          (errorData.errors as Array<Record<string, unknown>>).forEach(
            (error: Record<string, unknown>) => {
              const field = error.field as string;
              const message = error.message as string;
              fieldErrors[field] = message;
            },
          );
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
          }
        }
        setErrors({ submit: (errorData.error as string) || 'Failed to update card' });
        return;
      }

      const data = (await response.json()) as { card: Record<string, unknown> };
      onUpdated(data.card);
    } catch (err) {
      console.error('Error updating card:', err);
      setErrors({ submit: 'An error occurred while updating the card' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-card-form">
      <div className="form-group">
        <label htmlFor="edit-card-title">Title *</label>
        <input
          id="edit-card-title"
          type="text"
          value={formData.title}
          onChange={handleTitleChange}
          maxLength={100}
          disabled={isLoading}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'edit-title-error' : undefined}
          className={errors.title ? 'input-error' : ''}
        />
        {errors.title && <span id="edit-title-error" className="error-message">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="edit-card-description">Description</label>
        <textarea
          id="edit-card-description"
          value={formData.description}
          onChange={handleDescriptionChange}
          maxLength={10000}
          disabled={isLoading}
          rows={4}
          className={errors.description ? 'input-error' : ''}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'edit-description-error' : undefined}
        />
        {errors.description && <span id="edit-description-error" className="error-message">{errors.description}</span>}
      </div>

      {errors.submit && <div className="error-message" role="alert">{errors.submit}</div>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EditCard;
