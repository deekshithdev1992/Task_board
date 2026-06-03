import { io, Socket } from 'socket.io-client';

type CardCreatedCallback = (payload: { card: Record<string, unknown> }) => void;
type CardUpdatedCallback = (payload: { card: Record<string, unknown> }) => void;
type CardDeletedCallback = (payload: { cardId: string; boardId: string; columnId: string }) => void;

let socket: Socket | null = null;
let boardIdJoined: string | null = null;
const cardCreatedListeners: CardCreatedCallback[] = [];
const cardUpdatedListeners: CardUpdatedCallback[] = [];
const cardDeletedListeners: CardDeletedCallback[] = [];

export function initRealtime(boardId: string) {
  if (!socket) {
    socket = io();
  }

  if (boardIdJoined === boardId) return;

  // Remove old socket-level listeners before switching to a different board
  if (boardIdJoined !== null) {
    socket.off('card:updated');
    socket.off('card:created');
    socket.off('card:deleted');
  }

  // join board room
  socket.emit('join_board', boardId);
  boardIdJoined = boardId;

  socket.on('card:updated', (payload: { card: Record<string, unknown> }) => {
    for (const cb of cardUpdatedListeners) {
      try {
        cb(payload);
      } catch (e) {
        console.warn('cardUpdated listener error', e);
      }
    }
  });

  socket.on('card:created', (payload: { card: Record<string, unknown> }) => {
    for (const cb of cardCreatedListeners) {
      try {
        cb(payload);
      } catch (e) {
        console.warn('cardCreated listener error', e);
      }
    }
  });

  socket.on('card:deleted', (payload: { cardId: string; boardId: string; columnId: string }) => {
    for (const cb of cardDeletedListeners) {
      try {
        cb(payload);
      } catch (e) {
        console.warn('cardDeleted listener error', e);
      }
    }
  });
}

export function cleanupRealtime(boardId?: string) {
  if (!socket) return;
  if (boardId && boardIdJoined === boardId) {
    socket.emit('leave_board', boardId);
    boardIdJoined = null;
  }
}

export function onCardCreated(cb: CardCreatedCallback) {
  cardCreatedListeners.push(cb);
  return () => {
    const idx = cardCreatedListeners.indexOf(cb);
    if (idx >= 0) cardCreatedListeners.splice(idx, 1);
  };
}

export function onCardUpdated(cb: CardUpdatedCallback) {
  cardUpdatedListeners.push(cb);
  return () => {
    const idx = cardUpdatedListeners.indexOf(cb);
    if (idx >= 0) cardUpdatedListeners.splice(idx, 1);
  };
}

export function onCardDeleted(cb: CardDeletedCallback) {
  cardDeletedListeners.push(cb);
  return () => {
    const idx = cardDeletedListeners.indexOf(cb);
    if (idx >= 0) cardDeletedListeners.splice(idx, 1);
  };
}

// Test helpers to simulate incoming events in unit tests
export function __emitCardCreatedForTest(payload: { card: Record<string, unknown> }) {
  for (const cb of cardCreatedListeners) cb(payload);
}

export function __emitCardUpdatedForTest(payload: { card: Record<string, unknown> }) {
  for (const cb of cardUpdatedListeners) cb(payload);
}

export function __emitCardDeletedForTest(payload: { cardId: string; boardId: string; columnId: string }) {
  for (const cb of cardDeletedListeners) cb(payload);
}

// Test helper: reset module state for isolated testing
export function __resetForTest() {
  if (socket) {
    socket.off('card:updated');
    socket.off('card:created');
    socket.off('card:deleted');
  }
  socket = null;
  boardIdJoined = null;
  cardCreatedListeners.length = 0;
  cardUpdatedListeners.length = 0;
  cardDeletedListeners.length = 0;
}

export default {
  initRealtime,
  cleanupRealtime,
  onCardCreated,
  onCardUpdated,
  onCardDeleted,
  __emitCardCreatedForTest,
  __emitCardUpdatedForTest,
  __emitCardDeletedForTest,
  __resetForTest,
};
