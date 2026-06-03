/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi } from 'vitest';

import * as cardService from '../../../services/cardService.js';
import CardDetailView from '../CardDetailView.js';
import AddCard from '../AddCard.js';
import EditCard from '../EditCard.js';
import BoardView from '../../board/BoardView.js';
import cardEvents from '../../../realtime/cardEvents.js';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';

describe('EditCard flow and realtime updates', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('edits a card via CardDetailView and updates UI', async () => {
    const card = {
      id: 'c1',
      title: 'Original',
      description: 'Desc',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };

    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ card: { ...card, title: 'Updated Title' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    // wait for card to load
    await waitFor(() => expect(screen.getByText('Original')).toBeDefined());

    // click Edit
    fireEvent.click(screen.getByText('Edit'));

    const input = screen.getByLabelText('Title *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Updated Title' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('Updated Title')).toBeDefined());
    expect(fetchSpy).toHaveBeenCalledWith('/api/cards/c1', expect.objectContaining({ method: 'PUT' }));
  });

  it('updates BoardView when realtime card.updated event is received', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];

    const initialCard = {
      id: 'c1',
      title: 'Old Title',
      description: '',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([initialCard] as any);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    await waitFor(() => expect(screen.getByText('Old Title')).toBeDefined());

    // Emit realtime update
    const updated = { ...initialCard, title: 'Realtime Updated' };
    cardEvents.__emitCardUpdatedForTest({ card: updated });

    await waitFor(() => expect(screen.getByText('Realtime Updated')).toBeDefined());
  });

  it('closes CardDetailView when current card is deleted by another user via realtime event', async () => {
    const card = {
      id: 'c1',
      title: 'To Be Deleted',
      description: 'Desc',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };

    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);

    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    // wait for card to load
    await waitFor(() => expect(screen.getByText('To Be Deleted')).toBeDefined());

    // Emit realtime delete event
    cardEvents.__emitCardDeletedForTest({
      cardId: 'c1',
      boardId: 'b1',
      columnId: 'col1',
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('removes card from BoardView when realtime card.deleted event is received', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];

    const initialCard = {
      id: 'c1',
      title: 'Delete Me',
      description: '',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([initialCard] as any);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    await waitFor(() => expect(screen.getByText('Delete Me')).toBeDefined());

    // Emit realtime delete event
    cardEvents.__emitCardDeletedForTest({
      cardId: 'c1',
      boardId: 'b1',
      columnId: 'col1',
    });

    await waitFor(() => expect(screen.queryByText('Delete Me')).toBeNull());
  });
});

describe('AddCard validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('shows title required error when submitting with empty title', async () => {
    const onCardCreated = vi.fn();

    render((<AddCard boardId="b1" columnId="c1" onCardCreated={onCardCreated} onCancel={vi.fn()} />) as any);

    fireEvent.click(screen.getByText('Create Card'));

    await waitFor(() => expect(screen.getByText('Title is required')).toBeDefined());
    expect(onCardCreated).not.toHaveBeenCalled();
  });

  it('shows title too long error when title exceeds 255 characters', async () => {
    const onCardCreated = vi.fn();

    render((<AddCard boardId="b1" columnId="c1" onCardCreated={onCardCreated} onCancel={vi.fn()} />) as any);

    const input = screen.getByLabelText('Card Title *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(256) } });

    fireEvent.click(screen.getByText('Create Card'));

    await waitFor(() => expect(screen.getByText('Title must be 255 characters or less')).toBeDefined());
    expect(onCardCreated).not.toHaveBeenCalled();
  });

  it('displays server validation errors from API response', async () => {
    const onCardCreated = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        errors: [{ field: 'title', message: 'Title is required' }],
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render((<AddCard boardId="b1" columnId="c1" onCardCreated={onCardCreated} onCancel={vi.fn()} />) as any);

    const input = screen.getByLabelText('Card Title *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Valid Title' } });

    fireEvent.click(screen.getByText('Create Card'));

    await waitFor(() => expect(screen.getByText('Title is required')).toBeDefined());
    expect(onCardCreated).not.toHaveBeenCalled();
  });
});

describe('EditCard validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  const baseCard = {
    id: 'c1',
    title: 'Test Card',
    description: 'Desc',
    position: 1,
    column_id: 'col1',
    board_id: 'b1',
  };

  it('shows title required error when clearing title and submitting', async () => {
    const onUpdated = vi.fn();

    render((<EditCard card={baseCard} onUpdated={onUpdated} onCancel={vi.fn()} />) as any);

    const input = screen.getByLabelText('Title *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('Title is required')).toBeDefined());
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('shows title too long error when title exceeds 255 characters', async () => {
    const onUpdated = vi.fn();

    render((<EditCard card={baseCard} onUpdated={onUpdated} onCancel={vi.fn()} />) as any);

    const input = screen.getByLabelText('Title *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(256) } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('Title must be 255 characters or less')).toBeDefined());
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('displays server validation errors from API response', async () => {
    const onUpdated = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        errors: [{ field: 'title', message: 'Title must not exceed 255 characters' }],
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render((<EditCard card={baseCard} onUpdated={onUpdated} onCancel={vi.fn()} />) as any);

    const input = screen.getByLabelText('Title *') as HTMLInputElement;
    // change title to trigger dirty check
    fireEvent.change(input, { target: { value: 'Valid Title Changed' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('Title must not exceed 255 characters')).toBeDefined());
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
