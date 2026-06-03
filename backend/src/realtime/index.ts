import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

export interface RealtimeEventPayload {
  [key: string]: unknown;
}

export class RealtimeManager {
  private io: Server;

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
      },
    });

    this.setupConnections();
  }

  private setupConnections() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle board subscriptions
      socket.on('join_board', (boardId: string) => {
        const roomName = `board:${boardId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room ${roomName}`);
      });

      socket.on('leave_board', (boardId: string) => {
        const roomName = `board:${boardId}`;
        socket.leave(roomName);
        console.log(`Socket ${socket.id} left room ${roomName}`);
      });

      // Handle column subscriptions
      socket.on('join_column', (columnId: string) => {
        const roomName = `column:${columnId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room ${roomName}`);
      });

      socket.on('leave_column', (columnId: string) => {
        const roomName = `column:${columnId}`;
        socket.leave(roomName);
        console.log(`Socket ${socket.id} left room ${roomName}`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  emitCardCreated(boardId: string, columnId: string, payload: RealtimeEventPayload) {
    this.io.to(`board:${boardId}`).to(`column:${columnId}`).emit('card:created', payload);
  }

  emitCardUpdated(boardId: string, columnId: string, payload: RealtimeEventPayload) {
    this.io.to(`board:${boardId}`).to(`column:${columnId}`).emit('card:updated', payload);
  }

  emitCardDeleted(boardId: string, columnId: string, payload: RealtimeEventPayload) {
    this.io.to(`board:${boardId}`).to(`column:${columnId}`).emit('card:deleted', payload);
  }

  getIO(): Server {
    return this.io;
  }
}

let realtimeManager: RealtimeManager | null = null;

export function initializeRealtime(httpServer: HTTPServer): RealtimeManager {
  if (!realtimeManager) {
    realtimeManager = new RealtimeManager(httpServer);
  }
  return realtimeManager;
}

export function getRealtime(): RealtimeManager {
  if (!realtimeManager) {
    throw new Error('Realtime manager not initialized. Call initializeRealtime first.');
  }
  return realtimeManager;
}
