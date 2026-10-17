/**
 * Saved / Favorite Places CRUD & Geofence Presence Checks
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';
import { calculateDistance } from '../../utils/geofence.js';

export async function placeRoutes(app: FastifyInstance): Promise<void> {
  // 1. Get Saved Places
  app.get('/places', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const places = await query(
      `SELECT id, user_id, name, place_type, latitude, longitude, radius_meters, created_at
       FROM saved_places
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return reply.send({ success: true, places });
  });

  // 2. Add Saved Place
  app.post('/places', { preHandler: [authenticate] }, async (request, reply) => {
    const { name, place_type = 'other', latitude, longitude, radius_meters = 100 } = request.body as any;
    const userId = request.user!.userId;

    if (!name || latitude === undefined || longitude === undefined) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'name, latitude, and longitude are required' });
    }

    const place = await queryOne(
      `INSERT INTO saved_places (user_id, name, place_type, latitude, longitude, radius_meters)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, name, place_type, latitude, longitude, radius_meters, created_at`,
      [userId, name, place_type, latitude, longitude, radius_meters]
    );

    return reply.status(201).send({ success: true, place });
  });

  // 3. Update Saved Place
  app.put('/places/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, place_type, latitude, longitude, radius_meters } = request.body as any;
    const userId = request.user!.userId;

    const updated = await queryOne(
      `UPDATE saved_places
       SET name = COALESCE($1, name),
           place_type = COALESCE($2, place_type),
           latitude = COALESCE($3, latitude),
           longitude = COALESCE($4, longitude),
           radius_meters = COALESCE($5, radius_meters)
       WHERE id = $6 AND user_id = $7
       RETURNING id, user_id, name, place_type, latitude, longitude, radius_meters, created_at`,
      [name, place_type, latitude, longitude, radius_meters, id, userId]
    );

    if (!updated) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Saved place not found' });
    }

    return reply.send({ success: true, place: updated });
  });

  // 4. Delete Saved Place
  app.delete('/places/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = request.user!.userId;

    await query(`DELETE FROM saved_places WHERE id = $1 AND user_id = $2`, [id, userId]);

    return reply.send({ success: true });
  });

  // 5. Check Presence at Saved Places
  app.post('/places/check-presence', { preHandler: [authenticate] }, async (request, reply) => {
    const { latitude, longitude } = request.body as any;
    const userId = request.user!.userId;

    if (latitude === undefined || longitude === undefined) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'latitude and longitude are required' });
    }

    const places = await query(
      `SELECT id, name, place_type, latitude, longitude, radius_meters
       FROM saved_places
       WHERE user_id = $1`,
      [userId]
    );

    const matches = places.filter(p => {
      const dist = calculateDistance(latitude, longitude, p.latitude, p.longitude);
      return dist <= (p.radius_meters || 100);
    });

    return reply.send({
      success: true,
      inside: matches.length > 0 ? matches[0] : null,
      matches,
    });
  });
}
