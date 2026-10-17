/**
 * Expressive Reactions Routes with Realtime WebSocket Delivery
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';
import { realtimeHub } from '../../realtime/websocket.js';

export async function reactionRoutes(app: FastifyInstance): Promise<void> {
  // 1. Send Reaction
  app.post('/reactions', { preHandler: [authenticate] }, async (request, reply) => {
    const { to_user_id, toUserId, emoji, message } = request.body as any;
    const userId = request.user!.userId;
    const targetUserId = to_user_id || toUserId;

    if (!targetUserId || !emoji) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'to_user_id and emoji are required' });
    }

    const reaction = await queryOne(
      `INSERT INTO expressive_reactions (from_user_id, to_user_id, emoji, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, from_user_id, to_user_id, emoji, message, sent_at`,
      [userId, targetUserId, emoji, message || null]
    );

    // Fetch sender profile for WebSocket notification
    const sender = await queryOne('SELECT display_name, avatar_url, username FROM app_users WHERE id = $1', [userId]);

    // Dispatch realtime event
    realtimeHub.sendToUser(targetUserId, 'REACTION_RECEIVED', {
      id: reaction.id,
      from_user_id: userId,
      emoji: reaction.emoji,
      message: reaction.message,
      sent_at: reaction.sent_at,
      sender: {
        id: userId,
        displayName: sender?.display_name,
        avatarUrl: sender?.avatar_url,
        username: sender?.username,
      },
    });

    return reply.status(201).send({ success: true, reaction });
  });

  // 2. Get Received Reactions
  app.get('/reactions/received', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const limit = parseInt((request.query as any)?.limit || '50', 10);

    const reactions = await query(
      `SELECT r.id, r.from_user_id, r.to_user_id, r.emoji, r.message, r.sent_at,
              u.display_name, u.avatar_url, u.username
       FROM expressive_reactions r
       JOIN app_users u ON u.id = r.from_user_id
       WHERE r.to_user_id = $1
       ORDER BY r.sent_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return reply.send({ success: true, reactions });
  });

  // 3. Get Sent Reactions
  app.get('/reactions/sent', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const limit = parseInt((request.query as any)?.limit || '50', 10);

    const reactions = await query(
      `SELECT r.id, r.from_user_id, r.to_user_id, r.emoji, r.message, r.sent_at,
              u.display_name, u.avatar_url, u.username
       FROM expressive_reactions r
       JOIN app_users u ON u.id = r.to_user_id
       WHERE r.from_user_id = $1
       ORDER BY r.sent_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return reply.send({ success: true, reactions });
  });
}
