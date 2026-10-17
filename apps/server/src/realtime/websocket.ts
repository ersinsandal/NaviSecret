/**
 * Realtime WebSocket Hub & Connection Manager
 */
import type { WebSocket } from 'ws';
import { verifyToken } from '../utils/crypto.js';

export interface SocketClient {
  userId: string;
  socket: WebSocket;
  lastActive: number;
}

export class RealtimeHub {
  private readonly clients = new Map<string, Set<WebSocket>>();

  public register(userId: string, socket: WebSocket): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(socket);

    socket.on('close', () => {
      const set = this.clients.get(userId);
      if (set) {
        set.delete(socket);
        if (set.size === 0) this.clients.delete(userId);
      }
    });
  }

  public sendToUser(targetUserId: string, event: string, data: any): void {
    const sockets = this.clients.get(targetUserId);
    if (!sockets) return;
    const payload = JSON.stringify({ event, data });
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }

  public broadcastToUsers(userIds: string[], event: string, data: any): void {
    const payload = JSON.stringify({ event, data });
    for (const uid of userIds) {
      const sockets = this.clients.get(uid);
      if (!sockets) continue;
      for (const ws of sockets) {
        if (ws.readyState === ws.OPEN) {
          ws.send(payload);
        }
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();
