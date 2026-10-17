/**
 * Footprint (👣) Telemetry Trails & Movement Breadcrumbs Routes
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';

export async function footprintRoutes(app: FastifyInstance): Promise<void> {
  // 1. Get Own Footprint History
  app.get('/footprints', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const limit = parseInt((request.query as any)?.limit || '100', 10);
    const since = (request.query as any)?.since;

    let history;
    if (since) {
      history = await query(
        `SELECT id, latitude, longitude, accuracy_meters, recorded_at
         FROM footprint_points
         WHERE user_id = $1 AND recorded_at >= $2
         ORDER BY recorded_at DESC
         LIMIT $3`,
        [userId, since, limit]
      );
    } else {
      history = await query(
        `SELECT id, latitude, longitude, accuracy_meters, recorded_at
         FROM footprint_points
         WHERE user_id = $1
         ORDER BY recorded_at DESC
         LIMIT $2`,
        [userId, limit]
      );
    }

    return reply.send({ success: true, history });
  });

  // 2. Get Peer's Footprint Trail (if permitted)
  app.get('/footprints/peers/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: peerId } = request.params as any;
    const userId = request.user!.userId;
    const limit = parseInt((request.query as any)?.limit || '100', 10);

    // Verify permission: peer must have granted location sharing to requester
    const permission = await queryOne(
      `SELECT can_view_location, share_expires_at
       FROM friendships
       WHERE user_id = $1 AND friend_id = $2 AND status = 'accepted'`,
      [peerId, userId]
    );

    if (!permission || !permission.can_view_location) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'You do not have permission to view this trail' });
    }

    if (permission.share_expires_at && new Date(permission.share_expires_at) < new Date()) {
      return reply.status(403).send({ error: 'EXPIRED', message: 'Location sharing has expired' });
    }

    // Check if peer is in Casper mode
    const peerUser = await queryOne('SELECT is_casper, casper_until FROM app_users WHERE id = $1', [peerId]);
    const isCasperActive = peerUser?.is_casper && (!peerUser.casper_until || new Date(peerUser.casper_until) > new Date());
    if (isCasperActive) {
      return reply.send({ success: true, history: [], casper: true });
    }

    const history = await query(
      `SELECT id, latitude, longitude, accuracy_meters, recorded_at
       FROM footprint_points
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [peerId, limit]
    );

    return reply.send({ success: true, history });
  });

  // 3. Record Footprint Point
  app.post('/footprints/record', { preHandler: [authenticate] }, async (request, reply) => {
    const { latitude, longitude, accuracy_meters = 10 } = request.body as any;
    const userId = request.user!.userId;

    if (latitude === undefined || longitude === undefined) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'latitude and longitude are required' });
    }

    const point = await queryOne(
      `INSERT INTO footprint_points (user_id, latitude, longitude, accuracy_meters)
       VALUES ($1, $2, $3, $4)
       RETURNING id, latitude, longitude, accuracy_meters, recorded_at`,
      [userId, latitude, longitude, accuracy_meters]
    );

    return reply.status(201).send({ success: true, point });
  });
}
