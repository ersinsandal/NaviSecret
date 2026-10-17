/**
 * Proximity Pulse (⚡) Detection & Encounter History Routes
 */
import type { FastifyInstance } from 'fastify';
import { redis } from '../../redis/client.js';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';
import { calculateDistance } from '../../utils/geofence.js';
import { realtimeHub } from '../../realtime/websocket.js';

export async function pulseRoutes(app: FastifyInstance): Promise<void> {
  // 1. Scan Nearby Friends for Pulses
  app.post('/pulses/scan', { preHandler: [authenticate] }, async (request, reply) => {
    const { lat, lon, radius = 500 } = request.body as any;
    const userId = request.user!.userId;

    // Get user's accepted friends
    const friends = await query<{ friend_id: string }>(
      `SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'`,
      [userId]
    );

    if (friends.length === 0) {
      return reply.send({ success: true, nearby: [] });
    }

    const friendIds = friends.map(f => f.friend_id);
    const nearbyList: Array<{ user_id: string; distance: number; display_name?: string; avatar_url?: string }> = [];

    // Check positions from Redis
    try {
      const positions = await redis.geopos('geo:live_users', ...friendIds);
      for (let i = 0; i < friendIds.length; i++) {
        const pos = positions[i];
        if (pos && pos[0] !== null && pos[1] !== null) {
          const peerLat = parseFloat(pos[1]);
          const peerLon = parseFloat(pos[0]);
          const dist = calculateDistance(lat, lon, peerLat, peerLon);

          if (dist <= radius) {
            const peer = await queryOne(
              'SELECT display_name, avatar_url FROM app_users WHERE id = $1',
              [friendIds[i]]
            );
            nearbyList.push({
              user_id: friendIds[i],
              distance: Math.round(dist),
              display_name: peer?.display_name || undefined,
              avatar_url: peer?.avatar_url || undefined,
            });
          }
        }
      }
    } catch {
      // Redis error fallback
    }

    return reply.send({ success: true, nearby: nearbyList });
  });

  // 2. Record a Pulse Encounter
  app.post('/pulses/record', { preHandler: [authenticate] }, async (request, reply) => {
    const { peerId, distance } = request.body as any;
    const userId = request.user!.userId;

    if (!peerId) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'peerId is required' });
    }

    const rec = await queryOne(
      `INSERT INTO pulse_history (initiator_id, peer_id, distance_meters)
       VALUES ($1, $2, $3)
       RETURNING id, initiator_id, peer_id, distance_meters, pulsed_at`,
      [userId, peerId, distance || 0]
    );

    // Notify peer via WebSocket
    const initiator = await queryOne('SELECT display_name, avatar_url FROM app_users WHERE id = $1', [userId]);
    realtimeHub.sendToUser(peerId, 'PULSE_ALERT', {
      peerId: userId,
      displayName: initiator?.display_name,
      avatarUrl: initiator?.avatar_url,
      distanceMeters: distance || 0,
      timestamp: Date.now(),
    });

    return reply.send({ success: true, pulse: rec });
  });

  // 3. Pulse History
  app.get('/pulses/history', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const limit = parseInt((request.query as any)?.limit || '20', 10);

    const history = await query(
      `SELECT h.id, h.initiator_id as user_id, h.peer_id as nearby_user_id, h.distance_meters as distance, h.pulsed_at as created_at,
              u.display_name, u.avatar_url
       FROM pulse_history h
       LEFT JOIN app_users u ON u.id = h.peer_id
       WHERE h.initiator_id = $1 OR h.peer_id = $1
       ORDER BY h.pulsed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return reply.send({ success: true, history });
  });
}
