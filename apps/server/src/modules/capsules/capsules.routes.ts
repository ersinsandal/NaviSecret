/**
 * Secret Capsule (🎁) Routes (Location-Bound Encrypted Content)
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';
import { calculateDistance, encodeGeohash } from '../../utils/geofence.js';

export async function capsuleRoutes(app: FastifyInstance): Promise<void> {
  // 1. Create a Secret Capsule
  app.post('/capsules', { preHandler: [authenticate] }, async (request, reply) => {
    const {
      latitude,
      longitude,
      title,
      encryptedPayload,
      saltEntropy,
      unlockRadiusM = 50,
      requiresPasscode = false,
      passcodeHint = null,
    } = request.body as any;
    const userId = request.user!.userId;

    if (!latitude || !longitude || !encryptedPayload || !saltEntropy) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Missing required capsule parameters' });
    }

    const geohash = encodeGeohash(latitude, longitude, 7);

    const capsule = await queryOne(
      `INSERT INTO secret_capsules 
       (creator_id, latitude, longitude, geohash, title, encrypted_payload, salt_entropy, unlock_radius_m, requires_passcode, passcode_hint)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, geohash, unlock_radius_m, requires_passcode, passcode_hint, created_at`,
      [
        userId,
        latitude,
        longitude,
        geohash,
        title || 'Secret Capsule',
        encryptedPayload,
        saltEntropy,
        unlockRadiusM,
        requiresPasscode ? 1 : 0,
        passcodeHint || null,
      ]
    );

    return reply.status(201).send({ success: true, capsuleId: capsule.id, capsule });
  });

  // 2. Query Nearby Capsules
  app.get('/capsules/nearby', { preHandler: [authenticate] }, async (request, reply) => {
    const { lat, lon, radius = 1000 } = request.query as any;
    if (lat === undefined || lon === undefined) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'lat and lon are required' });
    }

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    const searchRadius = parseFloat(radius);

    const allCapsules = await query(
      `SELECT c.id, c.creator_id, c.latitude, c.longitude, c.title, c.unlock_radius_m,
              c.requires_passcode, c.passcode_hint, c.created_at,
              u.display_name as creator_name, u.avatar_url as creator_avatar
       FROM secret_capsules c
       LEFT JOIN app_users u ON u.id = c.creator_id`
    );

    const nearbyCapsules = allCapsules
      .map(c => ({
        ...c,
        requires_passcode: Boolean(c.requires_passcode),
        distanceMeters: Math.round(calculateDistance(userLat, userLon, c.latitude, c.longitude)),
      }))
      .filter(c => c.distanceMeters <= searchRadius);

    return reply.send({ success: true, capsules: nearbyCapsules });
  });

  // 3. Unlock a Capsule
  app.post('/capsules/:id/unlock', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { userLat, userLon } = request.body as any;

    if (userLat === undefined || userLon === undefined) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'userLat and userLon are required' });
    }

    const capsule = await queryOne('SELECT * FROM secret_capsules WHERE id = $1', [id]);
    if (!capsule) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Capsule not found' });
    }

    const distance = calculateDistance(userLat, userLon, capsule.latitude, capsule.longitude);
    if (distance > capsule.unlock_radius_m) {
      return reply.status(403).send({
        error: 'OUT_OF_RANGE',
        message: `You are too far from the capsule (${Math.round(distance)}m). Required: within ${capsule.unlock_radius_m}m.`,
        currentDistance: Math.round(distance),
        requiredRadius: capsule.unlock_radius_m,
      });
    }

    return reply.send({
      success: true,
      capsuleId: capsule.id,
      title: capsule.title,
      encryptedPayload: capsule.encrypted_payload,
      saltEntropy: capsule.salt_entropy,
      requiresPasscode: Boolean(capsule.requires_passcode),
      passcodeHint: capsule.passcode_hint,
      verifiedDistance: Math.round(distance),
    });
  });
}
