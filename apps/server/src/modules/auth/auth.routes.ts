/**
 * Authentication, User Profiles, and Account Settings Routes
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { hashPassword, verifyPassword, signToken } from '../../utils/crypto.js';
import { authenticate } from '../../middleware/auth.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // 1. Sign Up
  app.post('/auth/signup', async (request, reply) => {
    const { email, password, username, displayName } = request.body as any;
    if (!email || !password) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Email and password are required' });
    }

    const existing = await queryOne('SELECT id FROM app_users WHERE email = $1', [email]);
    if (existing) {
      return reply.status(409).send({ error: 'CONFLICT', message: 'User already exists' });
    }

    const passwordHash = await hashPassword(password);
    const generatedUsername = username || email.split('@')[0] + '_' + Date.now().toString(36).slice(-4);
    const generatedDisplayName = displayName || username || email.split('@')[0];
    const userCode = 'NS-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newUser = await queryOne(
      `INSERT INTO app_users (email, password_hash, username, display_name, user_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, username, display_name, avatar_url, status_emoji, status_text, is_casper, user_code, created_at`,
      [email, passwordHash, generatedUsername, generatedDisplayName, userCode]
    );

    // Initialize user settings
    await query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [newUser.id]);

    const token = signToken({ userId: newUser.id, email: newUser.email });
    return reply.status(201).send({ success: true, token, user: newUser });
  });

  // 2. Log In
  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;
    if (!email || !password) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Email and password are required' });
    }

    const user = await queryOne(
      'SELECT id, email, password_hash, username, display_name, avatar_url, status_emoji, status_text, is_casper, user_code FROM app_users WHERE email = $1',
      [email]
    );

    if (!user) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
    }

    const token = signToken({ userId: user.id, email: user.email });
    const { password_hash, ...safeUser } = user;
    return reply.send({ success: true, token, user: safeUser });
  });

  // 3. Current User Profile (/auth/me and /users/me)
  const getMeHandler = async (request: any, reply: any) => {
    const user = await queryOne(
      'SELECT id, email, username, display_name, avatar_url, status_emoji, status_text, status_expires_at, is_casper, casper_until, user_code FROM app_users WHERE id = $1',
      [request.user!.userId]
    );
    if (!user) return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });
    return reply.send({ success: true, user });
  };
  app.get('/auth/me', { preHandler: [authenticate] }, getMeHandler);
  app.get('/users/me', { preHandler: [authenticate] }, getMeHandler);

  // 4. Update Current User Profile
  app.put('/users/me/profile', { preHandler: [authenticate] }, async (request, reply) => {
    const { username, display_name, avatar_url } = request.body as any;
    const updated = await queryOne(
      `UPDATE app_users 
       SET username = COALESCE($1, username),
           display_name = COALESCE($2, display_name),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, username, display_name, avatar_url, status_emoji, status_text, is_casper, user_code`,
      [username, display_name, avatar_url, request.user!.userId]
    );
    return reply.send({ success: true, user: updated });
  });

  // 5. Update Status
  app.put('/users/me/status', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as any;
    const emoji = body.emoji ?? body.status_emoji ?? '⚡';
    const text = body.text ?? body.status_text ?? null;
    let expiresAt = body.expiresAt ?? body.status_expires_at ?? null;
    if (!expiresAt && body.duration_minutes) {
      expiresAt = new Date(Date.now() + body.duration_minutes * 60000).toISOString();
    }
    await query(
      `UPDATE app_users
       SET status_emoji = $1, status_text = $2, status_expires_at = $3, updated_at = NOW()
       WHERE id = $4`,
      [emoji ?? null, text ?? null, expiresAt ?? null, request.user!.userId]
    );
    return reply.send({ success: true });
  });

  // 6. Clear Status
  app.delete('/users/me/status', { preHandler: [authenticate] }, async (request, reply) => {
    await query(
      `UPDATE app_users
       SET status_emoji = null, status_text = null, status_expires_at = null, updated_at = NOW()
       WHERE id = $1`,
      [request.user!.userId]
    );
    return reply.send({ success: true });
  });

  // 7. Delete Avatar
  app.delete('/users/me/avatar', { preHandler: [authenticate] }, async (request, reply) => {
    await query('UPDATE app_users SET avatar_url = null, updated_at = NOW() WHERE id = $1', [request.user!.userId]);
    return reply.send({ success: true });
  });

  // 8. Public Profile Lookup
  app.get('/users/:id/profile', async (request, reply) => {
    const { id } = request.params as any;
    if (!id || id === 'undefined' || id === 'null') {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invalid user ID' });
    }
    const user = await queryOne(
      'SELECT id, username, display_name, avatar_url, status_emoji, status_text, status_expires_at, is_casper, user_code, created_at FROM app_users WHERE id = $1',
      [id]
    );
    if (!user) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Profile not found' });
    return reply.send({ success: true, profile: { user_id: user.id, ...user } });
  });

  // 9. Search Profiles
  app.get('/users/search', { preHandler: [authenticate] }, async (request, reply) => {
    const { q } = request.query as any;
    if (!q || typeof q !== 'string') return reply.send({ success: true, results: [] });
    const results = await query(
      `SELECT id as user_id, username, display_name, avatar_url, status_emoji, status_text, user_code
       FROM app_users
       WHERE id != $1 AND (username ILIKE $2 OR display_name ILIKE $2 OR user_code ILIKE $2)
       LIMIT 20`,
      [request.user!.userId, `%${q}%`]
    );
    return reply.send({ success: true, results });
  });

  // 10. User Settings
  app.get('/settings', { preHandler: [authenticate] }, async (request, reply) => {
    const settings = await queryOne('SELECT * FROM user_settings WHERE user_id = $1', [request.user!.userId]);
    const user = await queryOne('SELECT is_casper, casper_until FROM app_users WHERE id = $1', [request.user!.userId]);
    return reply.send({
      success: true,
      settings: {
        ...(settings || { update_interval_sec: 5 }),
        ghost_mode: user?.is_casper ?? false,
        ghost_until: user?.casper_until ?? null,
      }
    });
  });

  app.put('/settings', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as any;
    await query(
      `INSERT INTO user_settings (user_id, update_interval_sec)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET update_interval_sec = EXCLUDED.update_interval_sec, updated_at = NOW()`,
      [request.user!.userId, body.update_interval_sec || 5]
    );
    return reply.send({ success: true });
  });

  // 11. Notification Preferences
  app.get('/settings/notifications', { preHandler: [authenticate] }, async (request, reply) => {
    const s = await queryOne('SELECT * FROM user_settings WHERE user_id = $1', [request.user!.userId]);
    return reply.send({
      success: true,
      preferences: {
        bumps: s?.notifications_bumps ?? true,
        reactions: s?.notifications_reactions ?? true,
        friend_requests: s?.notifications_requests ?? true,
        chat: s?.notifications_chat ?? true,
      }
    });
  });

  app.put('/settings/notifications', { preHandler: [authenticate] }, async (request, reply) => {
    const { bumps, reactions, friend_requests, chat } = request.body as any;
    await query(
      `INSERT INTO user_settings (user_id, notifications_bumps, notifications_reactions, notifications_requests, notifications_chat)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
       SET notifications_bumps = COALESCE($2, user_settings.notifications_bumps),
           notifications_reactions = COALESCE($3, user_settings.notifications_reactions),
           notifications_requests = COALESCE($4, user_settings.notifications_requests),
           notifications_chat = COALESCE($5, user_settings.notifications_chat),
           updated_at = NOW()`,
      [request.user!.userId, bumps, reactions, friend_requests, chat]
    );
    return reply.send({ success: true });
  });
}
