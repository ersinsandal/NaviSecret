/**
 * Direct & Group Chat Messaging Routes with Realtime WebSocket Delivery
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';
import { realtimeHub } from '../../realtime/websocket.js';

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  // 1. Get User's Chat Rooms
  app.get('/chat/rooms', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const rooms = await query(
      `SELECT r.id, r.room_type, r.group_id, r.created_at,
              crm.last_read_at,
              g.name as group_name,
              lm.id as last_message_id, lm.content as last_message_content, lm.sent_at as last_message_sent_at, lm.sender_id as last_message_sender_id,
              (
                SELECT COUNT(*)
                FROM chat_messages m
                WHERE m.room_id = r.id AND m.sent_at > COALESCE(crm.last_read_at, '1970-01-01') AND m.sender_id != $1
              ) as unread_count
       FROM chat_room_members crm
       JOIN chat_rooms r ON r.id = crm.room_id
       LEFT JOIN social_groups g ON g.id = r.group_id
       LEFT JOIN chat_messages lm ON lm.id = (
         SELECT m2.id
         FROM chat_messages m2
         WHERE m2.room_id = r.id
         ORDER BY m2.sent_at DESC
         LIMIT 1
       )
       WHERE crm.user_id = $1
       ORDER BY COALESCE(lm.sent_at, r.created_at) DESC`,
      [userId]
    );

    // Populate peer details for direct rooms
    for (const room of rooms) {
      if (room.room_type === 'direct') {
        const peer = await queryOne(
          `SELECT u.id, u.username, u.display_name, u.avatar_url, u.status_emoji, u.is_casper
           FROM chat_room_members m
           JOIN app_users u ON u.id = m.user_id
           WHERE m.room_id = $1 AND m.user_id != $2`,
          [room.id, userId]
        );
        (room as any).peer = peer || null;
      }
    }

    return reply.send({ success: true, rooms });
  });

  // 2. Get or Create Direct Chat Room
  app.post('/chat/direct/:uid', { preHandler: [authenticate] }, async (request, reply) => {
    const { uid: peerId } = request.params as any;
    const userId = request.user!.userId;

    if (!peerId || peerId === userId) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invalid peer user ID' });
    }

    // Check if a direct room already exists between these two
    const existing = await queryOne(
      `SELECT r.id
       FROM chat_rooms r
       JOIN chat_room_members m1 ON m1.room_id = r.id AND m1.user_id = $1
       JOIN chat_room_members m2 ON m2.room_id = r.id AND m2.user_id = $2
       WHERE r.room_type = 'direct'
       LIMIT 1`,
      [userId, peerId]
    );

    if (existing) {
      return reply.send({ success: true, roomId: existing.id, isNew: false });
    }

    // Create new direct room
    const newRoom = await queryOne(
      `INSERT INTO chat_rooms (room_type) VALUES ('direct') RETURNING id, room_type, created_at`
    );

    await query(
      `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [newRoom.id, userId, peerId]
    );

    return reply.status(201).send({ success: true, roomId: newRoom.id, isNew: true });
  });

  // 3. Get or Create Group Chat Room
  app.post('/chat/groups/:id/room', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: groupId } = request.params as any;
    const userId = request.user!.userId;

    // Check group membership
    const membership = await queryOne(
      `SELECT * FROM social_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (!membership) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'You are not a member of this group' });
    }

    const existing = await queryOne(
      `SELECT id FROM chat_rooms WHERE group_id = $1 AND room_type = 'group' LIMIT 1`,
      [groupId]
    );

    if (existing) {
      return reply.send({ success: true, roomId: existing.id, isNew: false });
    }

    const newRoom = await queryOne(
      `INSERT INTO chat_rooms (room_type, group_id) VALUES ('group', $1) RETURNING id`,
      [groupId]
    );

    // Add all current group members to the room
    const members = await query<{ user_id: string }>(
      `SELECT user_id FROM social_group_members WHERE group_id = $1`,
      [groupId]
    );

    for (const m of members) {
      await query(
        `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [newRoom.id, m.user_id]
      );
    }

    return reply.status(201).send({ success: true, roomId: newRoom.id, isNew: true });
  });

  // 4. Get Room Messages
  app.get('/chat/rooms/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: roomId } = request.params as any;
    const userId = request.user!.userId;
    const limit = parseInt((request.query as any)?.limit || '50', 10);

    // Verify membership
    const member = await queryOne(
      `SELECT * FROM chat_room_members WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );
    if (!member) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this room' });
    }

    const messages = await query(
      `SELECT m.id, m.room_id, m.sender_id, m.content, m.sent_at,
              u.display_name, u.avatar_url, u.username
       FROM chat_messages m
       JOIN app_users u ON u.id = m.sender_id
       WHERE m.room_id = $1
       ORDER BY m.sent_at ASC
       LIMIT $2`,
      [roomId, limit]
    );

    return reply.send({ success: true, messages });
  });

  // 5. Send Message to Room
  app.post('/chat/rooms/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: roomId } = request.params as any;
    const { content, text } = request.body as any;
    const userId = request.user!.userId;
    const msgContent = content || text;

    if (!msgContent || typeof msgContent !== 'string' || msgContent.trim() === '') {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Message content cannot be empty' });
    }

    // Verify membership
    const member = await queryOne(
      `SELECT * FROM chat_room_members WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );
    if (!member) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this room' });
    }

    const newMsg = await queryOne(
      `INSERT INTO chat_messages (room_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, room_id, sender_id, content, sent_at`,
      [roomId, userId, msgContent.trim()]
    );

    // Update sender's last_read_at
    await query(`UPDATE chat_room_members SET last_read_at = NOW() WHERE room_id = $1 AND user_id = $2`, [roomId, userId]);

    // Fetch sender info for websocket dispatch
    const sender = await queryOne('SELECT display_name, avatar_url, username FROM app_users WHERE id = $1', [userId]);

    // Dispatch realtime message to all other room members
    const roomMembers = await query<{ user_id: string }>(
      `SELECT user_id FROM chat_room_members WHERE room_id = $1 AND user_id != $2`,
      [roomId, userId]
    );
    const targetIds = roomMembers.map(m => m.user_id);

    realtimeHub.broadcastToUsers(targetIds, 'CHAT_MESSAGE_RECEIVED', {
      id: newMsg.id,
      roomId,
      senderId: userId,
      content: newMsg.content,
      sentAt: newMsg.sent_at,
      sender: {
        id: userId,
        displayName: sender?.display_name,
        avatarUrl: sender?.avatar_url,
        username: sender?.username,
      },
    });

    return reply.status(201).send({
      success: true,
      message: {
        ...newMsg,
        display_name: sender?.display_name,
        avatar_url: sender?.avatar_url,
      },
    });
  });

  // 6. Mark Room Messages as Read
  app.post('/chat/rooms/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: roomId } = request.params as any;
    const userId = request.user!.userId;

    await query(
      `UPDATE chat_room_members 
       SET last_read_at = NOW() 
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );

    return reply.send({ success: true });
  });

  // 7. Get Room Members
  app.get('/chat/rooms/:id/members', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: roomId } = request.params as any;
    const userId = request.user!.userId;

    // Check membership
    const member = await queryOne(
      `SELECT * FROM chat_room_members WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );
    if (!member) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this room' });
    }

    const members = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.status_emoji, u.is_casper, crm.last_read_at
       FROM chat_room_members crm
       JOIN app_users u ON u.id = crm.user_id
       WHERE crm.room_id = $1`,
      [roomId]
    );

    return reply.send({ success: true, members });
  });
}
