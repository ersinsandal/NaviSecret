/**
 * Social Groups, Invites, and Group Membership Routes
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function groupRoutes(app: FastifyInstance): Promise<void> {
  // 1. Get User's Groups
  app.get('/groups', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const groups = await query(
      `SELECT g.id, g.creator_id, g.name, g.description, g.invite_code, g.created_at,
              (SELECT COUNT(*) FROM social_group_members WHERE group_id = g.id) as member_count,
              (g.creator_id = $1) as is_creator
       FROM social_groups g
       JOIN social_group_members m ON m.group_id = g.id
       WHERE m.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId]
    );

    return reply.send({ success: true, groups });
  });

  // 2. Create Group
  app.post('/groups', { preHandler: [authenticate] }, async (request, reply) => {
    const { name, description } = request.body as any;
    const userId = request.user!.userId;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Group name is required' });
    }

    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await queryOne('SELECT id FROM social_groups WHERE invite_code = $1', [inviteCode]);
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    const group = await queryOne(
      `INSERT INTO social_groups (creator_id, name, description, invite_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, creator_id, name, description, invite_code, created_at`,
      [userId, name.trim(), description || null, inviteCode]
    );

    // Add creator to group members
    await query(
      `INSERT INTO social_group_members (group_id, user_id) VALUES ($1, $2)`,
      [group.id, userId]
    );

    return reply.status(201).send({ success: true, group: { ...group, member_count: 1, is_creator: true } });
  });

  // 3. Join Group by Invite Code
  app.post('/groups/join', { preHandler: [authenticate] }, async (request, reply) => {
    const { code, inviteCode } = request.body as any;
    const userId = request.user!.userId;
    const targetCode = (code || inviteCode || '').toString().trim().toUpperCase();

    if (!targetCode) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invite code is required' });
    }

    const group = await queryOne(
      `SELECT id, creator_id, name, description, invite_code, created_at FROM social_groups WHERE UPPER(invite_code) = $1`,
      [targetCode]
    );

    if (!group) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Invalid or expired invite code' });
    }

    await query(
      `INSERT INTO social_group_members (group_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [group.id, userId]
    );

    // If a group chat room exists, add the user to chat room members as well
    const chatRoom = await queryOne(
      `SELECT id FROM chat_rooms WHERE group_id = $1 AND room_type = 'group'`,
      [group.id]
    );
    if (chatRoom) {
      await query(
        `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [chatRoom.id, userId]
      );
    }

    return reply.send({ success: true, group });
  });

  // 4. Leave Group
  app.post('/groups/:id/leave', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: groupId } = request.params as any;
    const userId = request.user!.userId;

    await query(
      `DELETE FROM social_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    return reply.send({ success: true });
  });

  // 5. Delete Group (Creator Only)
  app.delete('/groups/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: groupId } = request.params as any;
    const userId = request.user!.userId;

    const group = await queryOne('SELECT * FROM social_groups WHERE id = $1', [groupId]);
    if (!group) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Group not found' });
    }

    if (group.creator_id !== userId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only group creator can delete the group' });
    }

    await query('DELETE FROM social_groups WHERE id = $1', [groupId]);

    return reply.send({ success: true });
  });

  // 6. Get Group Members
  app.get('/groups/:id/members', { preHandler: [authenticate] }, async (request, reply) => {
    const { id: groupId } = request.params as any;
    const userId = request.user!.userId;

    // Check membership
    const isMember = await queryOne(
      `SELECT * FROM social_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (!isMember) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'You are not a member of this group' });
    }

    const members = await query(
      `SELECT u.id as user_id, u.username, u.display_name, u.avatar_url, u.status_emoji, u.is_casper,
              m.joined_at, (g.creator_id = u.id) as is_creator
       FROM social_group_members m
       JOIN social_groups g ON g.id = m.group_id
       JOIN app_users u ON u.id = m.user_id
       WHERE m.group_id = $1
       ORDER BY is_creator DESC, m.joined_at ASC`,
      [groupId]
    );

    return reply.send({ success: true, members });
  });
}
