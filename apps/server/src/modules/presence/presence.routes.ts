/**
 * Realtime Presence, Live GPS, and Casper Mode Routes
 */
import type { FastifyInstance } from 'fastify';
import { redis } from '../../redis/client.js';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';
import { encodeGeohash } from '../../utils/geofence.js';
import { realtimeHub } from '../../realtime/websocket.js';

export async function presenceRoutes(app: FastifyInstance): Promise<void> {
  // 1. Broadcast Live Location
  app.post('/presence/broadcast', { preHandler: [authenticate] }, async (request, reply) => {
    const { latitude, longitude, accuracy } = request.body as any;
    const isTrail = (request.query as any)?.trail === 'true';
    const userId = request.user!.userId;

    if (latitude === undefined || longitude === undefined) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'latitude and longitude are required' });
    }

    const user = await queryOne('SELECT is_casper, casper_until FROM app_users WHERE id = $1', [userId]);
    const isCasperActive = user?.is_casper && (!user.casper_until || new Date(user.casper_until) > new Date());

    if (!isCasperActive) {
      // 1. Redis GEOADD: Longitude, Latitude, Member
      try {
        await redis.geoadd('geo:live_users', longitude, latitude, userId);
        await redis.hset(`user:meta:${userId}`, {
          lat: latitude.toString(),
          lon: longitude.toString(),
          accuracy: (accuracy || 10).toString(),
          updatedAt: Date.now().toString(),
        });
        await redis.expire(`user:meta:${userId}`, 180);
      } catch (err: any) {
        // Redis fallback logging
      }

      // 2. Notify permitted friends over WebSockets
      const friendships = await query<{ friend_id: string }>(
        `SELECT friend_id FROM friendships 
         WHERE user_id = $1 AND status = 'accepted' AND can_view_location = true`,
        [userId]
      );
      const friendIds = friendships.map(f => f.friend_id);
      realtimeHub.broadcastToUsers(friendIds, 'PEER_LOCATION_UPDATE', {
        user_id: userId,
        latitude,
        longitude,
        accuracy_meters: accuracy || 10,
        updated_at: new Date().toISOString(),
      });
    }

    // 3. Optional: Record Footprint trail if requested
    if (isTrail) {
      await query(
        `INSERT INTO footprint_points (user_id, latitude, longitude, accuracy_meters)
         VALUES ($1, $2, $3, $4)`,
        [userId, latitude, longitude, accuracy || 10]
      );
    }

    // 4. Update World Unveil visited cell
    const cellToken = encodeGeohash(latitude, longitude, 7);
    await query(
      `INSERT INTO unveiled_territories (user_id, cell_token, visit_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, cell_token) DO UPDATE
       SET visit_count = unveiled_territories.visit_count + 1, unveiled_at = NOW()`,
      [userId, cellToken]
    );

    return reply.send({ success: true, timestamp: Date.now(), isCasper: isCasperActive });
  });

  // 2. Fetch Visible Friends
  app.get('/presence/friends', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    // Get list of friends who granted permission to see their location
    const permittedFriends = await query<{ friend_id: string }>(
      `SELECT user_id as friend_id FROM friendships 
       WHERE friend_id = $1 AND status = 'accepted' AND can_view_location = true`,
      [userId]
    );

    if (permittedFriends.length === 0) {
      return reply.send({ success: true, friends: [] });
    }

    const friendIds = permittedFriends.map(f => f.friend_id);
    const visibleLocations: any[] = [];

    // Query Redis for live positions
    try {
      const positions = await redis.geopos('geo:live_users', ...friendIds);
      for (let i = 0; i < friendIds.length; i++) {
        const pos = positions[i];
        if (pos && pos[0] !== null && pos[1] !== null) {
          const meta = await redis.hgetall(`user:meta:${friendIds[i]}`);
          visibleLocations.push({
            user_id: friendIds[i],
            latitude: parseFloat(pos[1]),
            longitude: parseFloat(pos[0]),
            accuracy_meters: meta.accuracy ? parseFloat(meta.accuracy) : 10,
            updated_at: meta.updatedAt ? new Date(parseInt(meta.updatedAt, 10)).toISOString() : new Date().toISOString(),
          });
        }
      }
    } catch {
      // Fallback: return empty if redis is temporarily offline
    }

    return reply.send({ success: true, friends: visibleLocations });
  });

  // 3. Toggle Casper Mode
  app.post('/presence/casper', { preHandler: [authenticate] }, async (request, reply) => {
    const { enabled, minutes } = request.body as any;
    const userId = request.user!.userId;

    const expiresAt = (enabled && minutes && minutes > 0)
      ? new Date(Date.now() + minutes * 60_000).toISOString()
      : null;

    await query(
      `UPDATE app_users 
       SET is_casper = $1, casper_until = $2, updated_at = NOW() 
       WHERE id = $3`,
      [Boolean(enabled), expiresAt, userId]
    );

    if (enabled) {
      try {
        await redis.zrem('geo:live_users', userId);
      } catch {}
    }

    return reply.send({ success: true, isCasper: Boolean(enabled), casperUntil: expiresAt });
  });
}
