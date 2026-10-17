/**
 * Social Network, Friendships, Privacy Rules, and Social Discovery Routes
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';
import { realtimeHub } from '../../realtime/websocket.js';

export async function socialRoutes(app: FastifyInstance): Promise<void> {
  // 1. Get Friend List
  app.get('/social/friends', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const friends = await query(
      `SELECT f.id as friendship_id, f.friend_id, f.can_view_location, f.share_expires_at, f.created_at as friendship_created_at,
              u.id as user_id, u.username, u.display_name, u.avatar_url, u.status_emoji, u.status_text, u.is_casper
       FROM friendships f
       JOIN app_users u ON u.id = f.friend_id
       WHERE f.user_id = $1 AND f.status = 'accepted'
       ORDER BY u.display_name ASC`,
      [userId]
    );

    return reply.send({ success: true, friends });
  });

  // 2. Get Pending Friend Requests
  app.get('/social/requests/pending', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const incoming = await query(
      `SELECT f.id, f.user_id as requester_id, f.created_at,
              u.username, u.display_name, u.avatar_url, u.status_emoji, u.status_text
       FROM friendships f
       JOIN app_users u ON u.id = f.user_id
       WHERE f.friend_id = $1 AND f.status = 'pending'`,
      [userId]
    );

    const outgoing = await query(
      `SELECT f.id, f.friend_id as recipient_id, f.created_at,
              u.username, u.display_name, u.avatar_url, u.status_emoji, u.status_text
       FROM friendships f
       JOIN app_users u ON u.id = f.friend_id
       WHERE f.user_id = $1 AND f.status = 'pending'`,
      [userId]
    );

    return reply.send({ success: true, incoming, outgoing });
  });

  // 3. Send Friend Request
  app.post('/social/requests', { preHandler: [authenticate] }, async (request, reply) => {
    const { targetUserId, friendId, username, userCode } = request.body as any;
    const userId = request.user!.userId;
    let recipientId = targetUserId || friendId;

    if (!recipientId && (username || userCode)) {
      const targetIdentifier = (userCode || username || '').trim();
      const user = await queryOne(
        'SELECT id FROM app_users WHERE username = $1 OR user_code = $1 OR user_code = $2',
        [targetIdentifier, targetIdentifier.startsWith('#') ? targetIdentifier.slice(1) : targetIdentifier]
      );
      if (user) recipientId = user.id;
    }

    if (!recipientId) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Target user ID, user code or username required' });
    }

    if (recipientId === userId) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Cannot friend yourself' });
    }

    // Check if recipient exists
    const recipient = await queryOne('SELECT id, display_name FROM app_users WHERE id = $1', [recipientId]);
    if (!recipient) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });
    }

    // Check existing friendship or request
    const existing = await queryOne(
      `SELECT id, status FROM friendships WHERE user_id = $1 AND friend_id = $2`,
      [userId, recipientId]
    );

    if (existing) {
      if (existing.status === 'accepted') {
        return reply.status(409).send({ error: 'ALREADY_FRIENDS', message: 'Already friends' });
      }
      if (existing.status === 'pending') {
        return reply.status(409).send({ error: 'ALREADY_REQUESTED', message: 'Request already pending' });
      }
    }

    // Insert pending request
    const result = await queryOne(
      `INSERT INTO friendships (user_id, friend_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'pending', created_at = NOW()
       RETURNING id, user_id, friend_id, status, created_at`,
      [userId, recipientId]
    );

    // Notify recipient via WebSocket
    const sender = await queryOne('SELECT display_name, avatar_url FROM app_users WHERE id = $1', [userId]);
    realtimeHub.sendToUser(recipientId, 'FRIEND_REQUEST_RECEIVED', {
      requestId: result.id,
      requesterId: userId,
      displayName: sender?.display_name,
      avatarUrl: sender?.avatar_url,
      timestamp: Date.now(),
    });

    return reply.status(201).send({ success: true, request: result });
  });

  // 4. Accept Friend Request
  app.post('/social/requests/:id/accept', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = request.user!.userId;

    // The request can be identified by row ID or requester's user ID
    let reqRow = await queryOne(
      `SELECT * FROM friendships WHERE id = $1 AND friend_id = $2 AND status = 'pending'`,
      [id, userId]
    );

    if (!reqRow) {
      reqRow = await queryOne(
        `SELECT * FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
        [id, userId]
      );
    }

    if (!reqRow) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Pending request not found' });
    }

    const requesterId = reqRow.user_id;

    // Update the pending request to accepted
    await query(`UPDATE friendships SET status = 'accepted' WHERE id = $1`, [reqRow.id]);

    // Ensure reciprocal accepted record exists
    await query(
      `INSERT INTO friendships (user_id, friend_id, status, can_view_location)
       VALUES ($1, $2, 'accepted', true)
       ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'`,
      [userId, requesterId]
    );

    // Realtime notification
    const accepter = await queryOne('SELECT display_name, avatar_url FROM app_users WHERE id = $1', [userId]);
    realtimeHub.sendToUser(requesterId, 'FRIEND_REQUEST_ACCEPTED', {
      friendId: userId,
      displayName: accepter?.display_name,
      avatarUrl: accepter?.avatar_url,
      timestamp: Date.now(),
    });

    return reply.send({ success: true });
  });

  // 5. Reject Friend Request
  app.post('/social/requests/:id/reject', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = request.user!.userId;

    await query(
      `DELETE FROM friendships 
       WHERE (id = $1 OR user_id = $1) AND friend_id = $2 AND status = 'pending'`,
      [id, userId]
    );

    return reply.send({ success: true });
  });

  // 6. Cancel Friend Request (outgoing)
  app.delete('/social/requests/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = request.user!.userId;

    await query(
      `DELETE FROM friendships 
       WHERE (id = $1 OR friend_id = $1) AND user_id = $2 AND status = 'pending'`,
      [id, userId]
    );

    return reply.send({ success: true });
  });

  // 7. Remove Friend
  app.delete('/social/friends/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = request.user!.userId;

    // Delete both directions
    await query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, id]
    );

    return reply.send({ success: true });
  });

  // 8. Friends of Friends (Recommendations)
  app.get('/social/friends-of-friends', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const fof = await query(
      `SELECT u.id as user_id, u.username, u.display_name, u.avatar_url, COUNT(*) as mutual_count
       FROM friendships f1
       JOIN friendships f2 ON f1.friend_id = f2.user_id AND f2.status = 'accepted'
       JOIN app_users u ON u.id = f2.friend_id
       WHERE f1.user_id = $1 AND f1.status = 'accepted'
         AND f2.friend_id != $1
         AND f2.friend_id NOT IN (
           SELECT friend_id FROM friendships WHERE user_id = $1
         )
       GROUP BY u.id, u.username, u.display_name, u.avatar_url
       ORDER BY mutual_count DESC
       LIMIT 15`,
      [userId]
    );

    return reply.send({ success: true, suggestions: fof });
  });

  // 9. Friend Rankings & Stats
  app.get('/social/rankings', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const rankings = await query(
      `SELECT u.id as user_id, u.username, u.display_name, u.avatar_url,
              COUNT(DISTINCT p.id) as pulse_count,
              COUNT(DISTINCT t.id) as territories_count
       FROM friendships f
       JOIN app_users u ON u.id = f.friend_id
       LEFT JOIN pulse_history p ON (p.initiator_id = u.id OR p.peer_id = u.id)
       LEFT JOIN unveiled_territories t ON t.user_id = u.id
       WHERE f.user_id = $1 AND f.status = 'accepted'
       GROUP BY u.id, u.username, u.display_name, u.avatar_url
       ORDER BY pulse_count DESC, territories_count DESC
       LIMIT 25`,
      [userId]
    );

    return reply.send({ success: true, rankings });
  });

  // 10. Blocked Users
  app.get('/social/blocked', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const blocked = await query(
      `SELECT f.id, f.friend_id as blocked_user_id, f.created_at,
              u.username, u.display_name, u.avatar_url
       FROM friendships f
       JOIN app_users u ON u.id = f.friend_id
       WHERE f.user_id = $1 AND f.status = 'blocked'`,
      [userId]
    );

    return reply.send({ success: true, blocked });
  });

  app.post('/social/block', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId: targetId } = request.body as any;
    const userId = request.user!.userId;

    if (!targetId || targetId === userId) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invalid target user ID' });
    }

    // Set status to blocked
    await query(
      `INSERT INTO friendships (user_id, friend_id, status, can_view_location)
       VALUES ($1, $2, 'blocked', false)
       ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'blocked', can_view_location = false`,
      [userId, targetId]
    );

    // Remove reciprocal friendship
    await query(`DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2`, [targetId, userId]);

    return reply.send({ success: true });
  });

  app.delete('/social/blocked/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = request.user!.userId;

    await query(
      `DELETE FROM friendships 
       WHERE user_id = $1 AND (friend_id = $2 OR id = $2) AND status = 'blocked'`,
      [userId, id]
    );

    return reply.send({ success: true });
  });

  // 11. Streaks
  app.get('/social/streaks', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    // Calculate streaks based on pulse encounters in the last 7 days
    const streaks = await query(
      `SELECT u.id as user_id, u.display_name, u.avatar_url,
              COUNT(DISTINCT DATE(p.pulsed_at)) as active_days
       FROM friendships f
       JOIN app_users u ON u.id = f.friend_id
       LEFT JOIN pulse_history p ON ((p.initiator_id = $1 AND p.peer_id = u.id) OR (p.initiator_id = u.id AND p.peer_id = $1))
         AND p.pulsed_at >= NOW() - INTERVAL '7 days'
       WHERE f.user_id = $1 AND f.status = 'accepted'
       GROUP BY u.id, u.display_name, u.avatar_url
       ORDER BY active_days DESC`,
      [userId]
    );

    return reply.send({ success: true, streaks });
  });

  // 12. Privacy Rules & Location Sharing
  app.get('/privacy/rules', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const rules = await query(
      `SELECT friend_id as viewer_id, 
              CASE WHEN can_view_location THEN 'current' ELSE 'none' END as level, 
              share_expires_at as expires_at 
       FROM friendships 
       WHERE user_id = $1`,
      [userId]
    );
    return reply.send({ success: true, rules });
  });

  app.post('/privacy/rules', { preHandler: [authenticate] }, async (request, reply) => {
    const { friendId, targetUserId, canViewLocation = true, shareExpiresAt = null } = request.body as any;
    const userId = request.user!.userId;
    const fid = friendId || targetUserId;

    if (!fid) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'friendId is required' });
    }

    await query(
      `UPDATE friendships 
       SET can_view_location = $1, share_expires_at = $2
       WHERE user_id = $3 AND friend_id = $4`,
      [Boolean(canViewLocation), shareExpiresAt, userId, fid]
    );

    return reply.send({ success: true });
  });

  app.delete('/privacy/rules/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = request.user!.userId;

    await query(
      `UPDATE friendships 
       SET can_view_location = false, share_expires_at = null
       WHERE user_id = $1 AND (friend_id = $2 OR id = $2)`,
      [userId, id]
    );

    return reply.send({ success: true });
  });

  app.put('/privacy/rules/:id/expiry', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { shareExpiresAt } = request.body as any;
    const userId = request.user!.userId;

    await query(
      `UPDATE friendships 
       SET share_expires_at = $1
       WHERE user_id = $2 AND (friend_id = $3 OR id = $3)`,
      [shareExpiresAt, userId, id]
    );

    return reply.send({ success: true });
  });
}
