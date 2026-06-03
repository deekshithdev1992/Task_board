import React, { useState, FormEvent, ChangeEvent } from 'react';

/**
 * AddCard Component
 *
 * Provides UI for creating a new card in a column.
 *
 * Features:
 * - Text input for card title (required, max 255 chars)
 * - Text area for optional description (max 10000 chars)
 * - Submit and cancel buttons
 * - Form validation
 * - Loading state during submission
 * - Error display
 *
 * Props:
 * - boardId: UUID of the board
 * - columnId: UUID of the column where the card will be created
 * - onCardCreated: Callback function when card is successfully created
 * - onCancel: Callback function when user cancels creation
 */

export interface AddCardProps {
  boardId: string;
  columnId: string;
  onCardCreated: (card: Record<string, unknown>) => void;
  onCancel: () => void;
}

export interface CardFormData {
  title: string;
  description: string;
}

export const AddCard: React.FC<AddCardProps> = ({
  boardId,
  columnId,
  onCardCreated,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CardFormData>({
    title: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be 255 characters or less';
    }

    if (formData.description.length > 10000) {
      newErrors.description = 'Description must be 10000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      title: e.target.value,
    }));
    // Clear error for this field
    if (errors.title) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.title;
        return newErrors;
      });
    }
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      description: e.target.value,
    }));
    // Clear error for this field
    if (errors.description) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.description;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        title: formData.title,
        ...(formData.description.trim() && { description: formData.description }),
      };

      const response = await fetch(
        `/api/boards/${boardId}/columns/${columnId}/cards`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          const fieldErrors: Record<string, string> = {};
          errorData.errors.forEach((error: Record<string, unknown>) => {
            const field = error.field as string;
            const message = error.message as string;
            fieldErrors[field] = message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ submit: errorData.error || 'Failed to create card' });
        }
        return;
      }

      const data = (await response.json()) as { card: Record<string, unknown> };
      onCardCreated(data.card);
      setFormData({ title: '', description: '' });
    } catch (error) {
      console.error('Error creating card:', error);
      setErrors({ submit: 'An error occurred while creating the card' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-card-form">
      <div className="form-group">
        <label htmlFor="card-title">Card Title *</label>
        <input
          id="card-title"
          type="text"
          value={formData.title}
          onChange={handleTitleChange}
          placeholder="Enter card title"
          maxLength={255}
          disabled={isLoading}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className={errors.title ? 'input-error' : ''}
        />
        {errors.title && (
          <span id="title-error" className="error-message">
            {errors.title}
          </span>
        )}
        <span className="character-count">
          {formData.title.length}/255 characters
        </span>
      </div>

      <div className="form-group">
        <label htmlFor="card-description">Description (optional)</label>
        <textarea
          id="card-description"
          value={formData.description}
          onChange={handleDescriptionChange}
          placeholder="Enter card description"
          maxLength={10000}
          disabled={isLoading}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
          className={errors.description ? 'input-error' : ''}
          rows={4}
        />
        {errors.description && (
          <span id="description-error" className="error-message">
            {errors.description}
          </span>
        )}
        <span className="character-count">
          {formData.description.length}/10000 characters
        </span>
      </div>

      {errors.submit && (
        <div className="error-message submit-error" role="alert">
          {errors.submit}
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary"
          aria-busy={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Card'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default AddCard;
