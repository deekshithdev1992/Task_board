/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import * as cardService from '../../../services/cardService.js';
import CardDetailView from '../CardDetailView.js';
import BoardView from '../../board/BoardView.js';
import cardEvents from '../../../realtime/cardEvents.js';
import { describe, it, expect, afterEach } from 'vitest';

describe('EditCard flow and realtime updates', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    vi.spyOn(cardService, 'updateCard').mockImplementation(
      async (id, data) => ({ ...card, ...(data as any) }) as any,
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
