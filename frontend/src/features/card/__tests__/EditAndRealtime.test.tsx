/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi } from 'vitest';

import * as cardService from '../../../services/cardService.js';
import CardDetailView from '../CardDetailView.js';
import AddCard from '../AddCard.js';
import EditCard from '../EditCard.js';
import DeleteCard from '../DeleteCard.js';
import BoardView from '../../board/BoardView.js';
import cardEvents from '../../../realtime/cardEvents.js';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';

const { mockSocket, getSocketHandler } = vi.hoisted(() => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const socket = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
    }),
    emit: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  };
  return {
    mockSocket: socket,
    getSocketHandler: (event: string) => handlers[event],
  };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
  Socket: vi.fn(),
}));

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

  it('adds card to BoardView when realtime card.created event is received', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([]);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    await waitFor(() => expect(screen.getByText('No cards yet')).toBeDefined());

    // Emit realtime create event
    const newCard = {
      id: 'c2',
      title: 'New Realtime Card',
      description: '',
      position: 2,
      column_id: 'col1',
      board_id: 'b1',
    };
    cardEvents.__emitCardCreatedForTest({ card: newCard });

    await waitFor(() => expect(screen.getByText('New Realtime Card')).toBeDefined());
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

  it('closes CardDetailView and removes card from BoardView when viewed card is deleted via realtime event', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];

    const card = {
      id: 'c1',
      title: 'Detail Card',
      description: 'Desc',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([card] as any);
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    // Wait for board to load the card
    await waitFor(() => expect(screen.getByText('Detail Card')).toBeDefined());

    // Click the card to open CardDetailView
    fireEvent.click(screen.getByText('Detail Card'));

    // Wait for CardDetailView to open — Edit button is only in the modal, not the board
    await waitFor(() => expect(screen.getByText('Edit')).toBeDefined());

    // Emit realtime delete event for the viewed card
    cardEvents.__emitCardDeletedForTest({
      cardId: 'c1',
      boardId: 'b1',
      columnId: 'col1',
    });

    // CardDetailView should close — Edit/Delete buttons should be gone
    await waitFor(() => expect(screen.queryByText('Edit')).toBeNull());
    expect(screen.queryByText('Delete')).toBeNull();

    // Card should be removed from the board — no stale card details remain
    expect(screen.queryByText('Detail Card')).toBeNull();

    // Column should show empty state
    expect(screen.getByText('No cards yet')).toBeDefined();
  });

  it('does not close CardDetailView when a different card is deleted via realtime event', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];

    const cardA = {
      id: 'cA',
      title: 'Card A',
      description: 'First card',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };

    const cardB = {
      id: 'cB',
      title: 'Card B',
      description: 'Second card',
      position: 2,
      column_id: 'col1',
      board_id: 'b1',
    };

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([cardA, cardB] as any);
    vi.spyOn(cardService, 'getCard').mockResolvedValue(cardA as any);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    // Wait for board to load both cards
    await waitFor(() => expect(screen.getByText('Card A')).toBeDefined());
    expect(screen.getByText('Card B')).toBeDefined();

    // Click Card A to open its detail view
    fireEvent.click(screen.getByText('Card A'));

    // Wait for Card A detail view to open — Edit button is modal-specific
    await waitFor(() => expect(screen.getByText('Edit')).toBeDefined());

    // Emit realtime delete event for Card B (different card)
    cardEvents.__emitCardDeletedForTest({
      cardId: 'cB',
      boardId: 'b1',
      columnId: 'col1',
    });

    // Card B should be removed from the board
    await waitFor(() => expect(screen.queryByText('Card B')).toBeNull());

    // Card A detail view should still be open — Edit button confirms modal is open
    expect(screen.getByText('Edit')).toBeDefined();

    // Card A should remain (1 card left in column)
    expect(screen.getByText('1 cards')).toBeDefined();
  });

  it('opens CardDetailView from BoardView and closes via Close button', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];

    const card = {
      id: 'c1',
      title: 'My Card',
      description: 'Some description',
      position: 3,
      column_id: 'col1',
      board_id: 'b1',
    };

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([card] as any);
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    // Card is visible on the board
    await waitFor(() => expect(screen.getByText('My Card')).toBeDefined());

    // Click the card to open CardDetailView
    fireEvent.click(screen.getByText('My Card'));

    // CardDetailView opens — Edit button is only in the modal
    await waitFor(() => expect(screen.getByText('Edit')).toBeDefined());

    // Click Close button to close CardDetailView
    fireEvent.click(screen.getByText('Close'));

    // CardDetailView closes — Edit button should be gone
    await waitFor(() => expect(screen.queryByText('Edit')).toBeNull());

    // Card is still on the board (close is not delete)
    expect(screen.getByText('My Card')).toBeDefined();
  });

  it('dispatches card:deleted through socket listener chain to registered callbacks', async () => {
    cardEvents.initRealtime('b1');

    const handler = getSocketHandler('card:deleted');
    expect(handler).toBeDefined();

    const callback = vi.fn();
    const unsub = cardEvents.onCardDeleted(callback);

    handler({ cardId: 'c1', boardId: 'b1', columnId: 'col1' });

    expect(callback).toHaveBeenCalledWith({ cardId: 'c1', boardId: 'b1', columnId: 'col1' });

    unsub();
  });

  it('deduplicates card:created event when card already exists in state', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([]);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    await waitFor(() => expect(screen.getByText('No cards yet')).toBeDefined());

    const newCard = {
      id: 'c1',
      title: 'Unique Card',
      description: '',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };

    // First emission adds the card
    cardEvents.__emitCardCreatedForTest({ card: newCard });
    await waitFor(() => expect(screen.getByText('Unique Card')).toBeDefined());

    // Second emission with same card ID — should be deduplicated
    cardEvents.__emitCardCreatedForTest({ card: newCard });
    await waitFor(() => {
      const cards = screen.queryAllByText('Unique Card');
      expect(cards).toHaveLength(1);
    });
  });

  it('filters card:created events for a different board', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([]);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    await waitFor(() => expect(screen.getByText('No cards yet')).toBeDefined());

    // Emit card:created for a different board — should be ignored
    cardEvents.__emitCardCreatedForTest({
      card: {
        id: 'c2',
        title: 'Wrong Board Card',
        description: '',
        position: 1,
        column_id: 'col1',
        board_id: 'b2',
      },
    });

    // Verify no card was added
    expect(screen.queryByText('Wrong Board Card')).toBeNull();
  });

  it('cleans up socket listeners when switching boards', () => {
    cardEvents.__resetForTest();

    cardEvents.initRealtime('b1');
    expect(mockSocket.on).toHaveBeenCalledTimes(3);
    expect(mockSocket.on).toHaveBeenCalledWith('card:created', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('card:updated', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('card:deleted', expect.any(Function));

    mockSocket.on.mockClear();
    mockSocket.off.mockClear();

    cardEvents.initRealtime('b2');
    expect(mockSocket.off).toHaveBeenCalledTimes(3);
    expect(mockSocket.off).toHaveBeenCalledWith('card:created');
    expect(mockSocket.off).toHaveBeenCalledWith('card:updated');
    expect(mockSocket.off).toHaveBeenCalledWith('card:deleted');

    // New listeners should be registered for the new board
    expect(mockSocket.on).toHaveBeenCalledTimes(3);
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

  it('shows title too long error when title exceeds 100 characters', async () => {
    const onCardCreated = vi.fn();

    render((<AddCard boardId="b1" columnId="c1" onCardCreated={onCardCreated} onCancel={vi.fn()} />) as any);

    const input = screen.getByLabelText('Card Title *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(101) } });

    fireEvent.click(screen.getByText('Create Card'));

    await waitFor(() => expect(screen.getByText('Title must be 100 characters or less')).toBeDefined());
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

  it('shows title too long error when title exceeds 100 characters', async () => {
    const onUpdated = vi.fn();

    render((<EditCard card={baseCard} onUpdated={onUpdated} onCancel={vi.fn()} />) as any);

    const input = screen.getByLabelText('Title *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(101) } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('Title must be 100 characters or less')).toBeDefined());
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('displays server validation errors from API response', async () => {
    const onUpdated = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        errors: [{ field: 'title', message: 'Title must not exceed 100 characters' }],
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

    await waitFor(() => expect(screen.getByText('Title must not exceed 100 characters')).toBeDefined());
    expect(onUpdated).not.toHaveBeenCalled();
  });
});

describe('CardDetailView rendering', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('displays card description when present', async () => {
    const card = {
      id: 'c1',
      title: 'Test Card',
      description: 'A detailed description',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);
    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    await waitFor(() => expect(screen.getByText('Test Card')).toBeDefined());
    expect(screen.getByText('A detailed description')).toBeDefined();
  });

  it('displays card position', async () => {
    const card = {
      id: 'c1',
      title: 'Position Test',
      description: '',
      position: 42,
      column_id: 'col1',
      board_id: 'b1',
    };
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);
    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    await waitFor(() => expect(screen.getByText('Position: 42')).toBeDefined());
  });

  it('shows loading state before card is loaded', () => {
    vi.spyOn(cardService, 'getCard').mockReturnValue(new Promise(() => {}));
    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('shows error state when card fetch fails', async () => {
    vi.spyOn(cardService, 'getCard').mockRejectedValue(new Error('Network error'));
    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    await waitFor(() => expect(screen.getByText('Failed to load card')).toBeDefined());
  });
});

describe('Accessibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders CardDetailView with role="dialog", aria-modal, and aria-labelledby', async () => {
    const card = { id: 'c1', title: 'Test Card', description: 'Desc', position: 1, column_id: 'col1', board_id: 'b1' };
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);
    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    await waitFor(() => expect(screen.getByText('Test Card')).toBeDefined());

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('card-detail-title');
    expect(document.getElementById('card-detail-title')?.textContent).toBe('Test Card');
  });

  it('closes CardDetailView when Escape key is pressed', async () => {
    const card = { id: 'c1', title: 'Test Card', description: 'Desc', position: 1, column_id: 'col1', board_id: 'b1' };
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);
    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    await waitFor(() => expect(screen.getByText('Test Card')).toBeDefined());

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('applies aria-invalid and aria-describedby on EditCard title validation errors', async () => {
    const baseCard = { id: 'c1', title: 'Test', description: '', position: 1, column_id: 'col1', board_id: 'b1' };

    render((<EditCard card={baseCard} onUpdated={vi.fn()} onCancel={vi.fn()} />) as any);

    const input = screen.getByLabelText('Title *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('Title is required')).toBeDefined());

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('edit-title-error');
    expect(document.getElementById('edit-title-error')?.textContent).toBe('Title is required');
  });

  it('displays EditCard submit error with role="alert"', async () => {
    const baseCard = { id: 'c1', title: 'Test', description: '', position: 1, column_id: 'col1', board_id: 'b1' };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render((<EditCard card={baseCard} onUpdated={vi.fn()} onCancel={vi.fn()} />) as any);

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('Server error')).toBeDefined());
    expect(screen.getByText('Server error').getAttribute('role')).toBe('alert');
  });

  it('displays DeleteCard error with role="alert"', async () => {
    vi.spyOn(cardService, 'deleteCard').mockRejectedValue(new Error('Delete failed'));

    render((<DeleteCard cardId="c1" cardTitle="Test" onDeleted={vi.fn()} onCancel={vi.fn()} />) as any);

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(screen.getByText('Failed to delete card')).toBeDefined());
    expect(screen.getByText('Failed to delete card').getAttribute('role')).toBe('alert');
  });

  it('traps Tab focus within CardDetailView dialog, cycling from last to first', async () => {
    const card = { id: 'c1', title: 'Focus Trap Card', description: 'Desc', position: 1, column_id: 'col1', board_id: 'b1' };
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);
    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    await waitFor(() => expect(screen.getByText('Focus Trap Card')).toBeDefined());

    const dialog = screen.getByRole('dialog');
    const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    expect(focusable.length).toBeGreaterThanOrEqual(3);

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    // Start with focus on the last element, press Tab, expect first to receive focus
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(first);
  });

  it('traps Shift+Tab focus within CardDetailView dialog, cycling from first to last', async () => {
    const card = { id: 'c1', title: 'ShiftTab Card', description: 'Desc', position: 1, column_id: 'col1', board_id: 'b1' };
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);
    const onClose = vi.fn();

    render((<CardDetailView cardId="c1" onClose={onClose} />) as any);

    await waitFor(() => expect(screen.getByText('ShiftTab Card')).toBeDefined());

    const dialog = screen.getByRole('dialog');
    const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    expect(focusable.length).toBeGreaterThanOrEqual(3);

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    // Start with focus on the first element, press Shift+Tab, expect last to receive focus
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('restores focus to the triggering card after closing CardDetailView', async () => {
    const columns = [{ id: 'col1', name: 'To Do' }];
    const card = {
      id: 'c1',
      title: 'Focus Restore Card',
      description: '',
      position: 1,
      column_id: 'col1',
      board_id: 'b1',
    };

    vi.spyOn(cardService, 'getCardsByColumn').mockResolvedValue([card] as any);
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card as any);

    render((<BoardView boardId="b1" columns={columns} />) as any);

    await waitFor(() => expect(screen.getByText('Focus Restore Card')).toBeDefined());

    // Click the card to open CardDetailView
    const cardElement = screen.getByText('Focus Restore Card').closest('.card') as HTMLElement;
    fireEvent.click(cardElement);

    // Wait for CardDetailView to open
    await waitFor(() => expect(screen.getByText('Edit')).toBeDefined());

    // Click Close button
    fireEvent.click(screen.getByText('Close'));

    // Focus should return to the triggering card element
    await waitFor(() => {
      expect(document.activeElement).toBe(cardElement);
    });
  });
});
