import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioc } from 'socket.io-client';
import { RealtimeManager } from '../realtime/index.js';

describe('RealtimeManager card:deleted event propagation', () => {
  let httpServer: ReturnType<typeof createServer>;
  let realtimeManager: RealtimeManager;
  let port: number;

  beforeAll(async () => {
    httpServer = createServer();
    realtimeManager = new RealtimeManager(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterAll(() => {
    httpServer.close();
  });

  it('emits card:deleted event with correct payload to all connected clients in the same board room', async () => {
    const client1 = ioc(`http://localhost:${port}`);
    const client2 = ioc(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((resolve) => client1.on('connect', () => resolve())),
      new Promise<void>((resolve) => client2.on('connect', () => resolve())),
    ]);

    client1.emit('join_board', 'b1');
    client2.emit('join_board', 'b1');

    // Small delay to ensure rooms are joined on server
    await new Promise((resolve) => setTimeout(resolve, 50));

    let receivedPayload1: unknown;
    let receivedPayload2: unknown;
    const received1 = new Promise<void>((resolve) => {
      client1.once('card:deleted', (p) => { receivedPayload1 = p; resolve(); });
    });
    const received2 = new Promise<void>((resolve) => {
      client2.once('card:deleted', (p) => { receivedPayload2 = p; resolve(); });
    });

    const payload = { cardId: 'c1', boardId: 'b1', columnId: 'col1' };
    realtimeManager.emitCardDeleted('b1', 'col1', payload);

    await Promise.all([received1, received2]);

    expect(receivedPayload1).toEqual(payload);
    expect(receivedPayload2).toEqual(payload);

    client1.close();
    client2.close();
  });

  it('emits card:deleted only to clients in the target board room', async () => {
    const clientInRoom = ioc(`http://localhost:${port}`);
    const clientOtherRoom = ioc(`http://localhost:${port}`);

    await Promise.all([
      new Promise<void>((resolve) => clientInRoom.on('connect', () => resolve())),
      new Promise<void>((resolve) => clientOtherRoom.on('connect', () => resolve())),
    ]);

    clientInRoom.emit('join_board', 'b1');
    clientOtherRoom.emit('join_board', 'b2');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const receivedInRoom = new Promise<void>((resolve) => {
      clientInRoom.once('card:deleted', () => resolve());
    });
    let receivedOtherRoom = false;
    clientOtherRoom.on('card:deleted', () => { receivedOtherRoom = true; });

    const payload = { cardId: 'c1', boardId: 'b1', columnId: 'col1' };
    realtimeManager.emitCardDeleted('b1', 'col1', payload);

    await receivedInRoom;
    // Small extra wait to confirm other-room client did NOT receive
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedOtherRoom).toBe(false);

    clientInRoom.close();
    clientOtherRoom.close();
  });

  it('stops receiving card:deleted events after client leaves the board room', async () => {
    const client = ioc(`http://localhost:${port}`);

    await new Promise<void>((resolve) => client.on('connect', () => resolve()));

    client.emit('join_board', 'b1');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // First emit — client should receive
    const firstReceived = new Promise<void>((resolve) => {
      client.once('card:deleted', () => resolve());
    });
    realtimeManager.emitCardDeleted('b1', 'col1', { cardId: 'c1', boardId: 'b1', columnId: 'col1' });
    await firstReceived;

    // Leave the board room
    client.emit('leave_board', 'b1');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Second emit — client should NOT receive
    let receivedAfterLeave = false;
    client.on('card:deleted', () => { receivedAfterLeave = true; });
    realtimeManager.emitCardDeleted('b1', 'col1', { cardId: 'c2', boardId: 'b1', columnId: 'col1' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(receivedAfterLeave).toBe(false);

    client.close();
  });

  it('calls io.to with board and column rooms and emits card:deleted event', () => {
    const localHttpServer = createServer();
    const localRm = new RealtimeManager(localHttpServer);
    const ioServer = localRm.getIO();

    const emitSpy = vi.fn();
    const toColumnSpy = vi.fn().mockReturnValue({ emit: emitSpy });
    const toBoardSpy = vi.fn().mockReturnValue({ to: toColumnSpy, emit: emitSpy });
    vi.spyOn(ioServer, 'to').mockImplementation(toBoardSpy);

    const payload = { cardId: 'c1', boardId: 'b1', columnId: 'col1' };
    localRm.emitCardDeleted('b1', 'col1', payload);

    expect(toBoardSpy).toHaveBeenCalledWith('board:b1');
    expect(toColumnSpy).toHaveBeenCalledWith('column:col1');
    expect(emitSpy).toHaveBeenCalledWith('card:deleted', payload);

    localHttpServer.close();
  });
});
