/**
 * NaviSecret High-Performance Backend API & Realtime WebSocket Server
 * Author & Creator: Ersin Sandal (SliferSoft)
 * Stack: Node.js (ESM) + Fastify + Redis + PostgreSQL
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { pool } from './database/db.js';
import { redis } from './redis/client.js';
import { verifyToken } from './utils/crypto.js';
import { realtimeHub } from './realtime/websocket.js';

// Route Modules
import { authRoutes } from './modules/auth/auth.routes.js';
import { presenceRoutes } from './modules/presence/presence.routes.js';
import { pulseRoutes } from './modules/pulses/pulses.routes.js';
import { capsuleRoutes } from './modules/capsules/capsules.routes.js';
import { socialRoutes } from './modules/social/social.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { placeRoutes } from './modules/places/places.routes.js';
import { groupRoutes } from './modules/groups/groups.routes.js';
import { footprintRoutes } from './modules/footprints/footprints.routes.js';
import { unveilRoutes } from './modules/unveil/unveil.routes.js';
import { reactionRoutes } from './modules/reactions/reactions.routes.js';
import { storageRoutes } from './modules/storage/storage.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // 1. Cross-Origin Resource Sharing (CORS)
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 2. Multipart Uploads Support
  await app.register(multipart, {
    limits: {
      fileSize: 15 * 1024 * 1024, // 15 MB limit
    },
  });

  // 3. WebSockets Support
  await app.register(websocket);

  // Health Check Endpoints
  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now(), service: 'navisecret-server' }));
  app.get('/api/health', async () => ({ status: 'ok', timestamp: Date.now(), service: 'navisecret-server' }));

  // Root Storage / Uploads access
  await app.register(storageRoutes);

  // Unified API Routes Plugin
  async function apiPlugin(instance: FastifyInstance) {
    await instance.register(authRoutes);
    await instance.register(presenceRoutes);
    await instance.register(pulseRoutes);
    await instance.register(capsuleRoutes);
    await instance.register(socialRoutes);
    await instance.register(chatRoutes);
    await instance.register(placeRoutes);
    await instance.register(groupRoutes);
    await instance.register(footprintRoutes);
    await instance.register(unveilRoutes);
    await instance.register(reactionRoutes);
    await instance.register(storageRoutes);
  }

  // Register under /api/v1 (primary) and /api (convenience fallback)
  await app.register(apiPlugin, { prefix: '/api/v1' });
  await app.register(apiPlugin, { prefix: '/api' });

  // 4. WebSocket Realtime Endpoint
  app.get('/ws', { websocket: true }, (socket, req) => {
    let currentUserId: string | null = null;

    // Check token in query: /ws?token=<jwt>
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');
      if (token) {
        const payload = verifyToken(token);
        if (payload?.userId) {
          currentUserId = payload.userId;
          realtimeHub.register(currentUserId, socket);
          socket.send(JSON.stringify({ event: 'AUTHENTICATED', data: { userId: currentUserId } }));
        }
      }
    } catch {}

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'auth' && msg.token) {
          try {
            const payload = verifyToken(msg.token);
            if (payload?.userId) {
              currentUserId = payload.userId;
              realtimeHub.register(currentUserId, socket);
              socket.send(JSON.stringify({ event: 'AUTHENTICATED', data: { userId: currentUserId } }));
            } else {
              socket.send(JSON.stringify({ event: 'AUTH_FAILED', error: 'Invalid or expired token' }));
            }
          } catch {
            socket.send(JSON.stringify({ event: 'AUTH_FAILED', error: 'Invalid or expired token' }));
          }
        } else if (msg.type === 'ping') {
          socket.send(JSON.stringify({ event: 'PONG', timestamp: Date.now() }));
        }
      } catch {}
    });
  });

  return app;
}

// Start Server when executed directly
async function start() {
  const app = await buildApp();
  try {
    const address = await app.listen({ port: config.port, host: config.host });
    app.log.info(`⚡ NaviSecret Production Backend Server running on ${address}`);
    app.log.info(`📡 WebSocket endpoint ready at ws://${config.host}:${config.port}/ws`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Only start when this file is the entry point
if (process.argv[1] && process.argv[1].endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  start();
}
