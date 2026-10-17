/**
 * Local Media & File Storage Routes
 */
import type { FastifyInstance } from 'fastify';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { authenticate } from '../../middleware/auth.js';
import { query } from '../../database/db.js';

import { config } from '../../config.js';

const UPLOAD_DIR = config.storagePath;
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function storageRoutes(app: FastifyInstance): Promise<void> {
  // 1. Upload File (Multipart)
  app.post('/storage/upload', { preHandler: [authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'No file provided' });
    }

    const ext = extname(data.filename) || '.bin';
    const safeFilename = `${randomUUID()}${ext}`;
    const targetPath = join(UPLOAD_DIR, safeFilename);

    await pipeline(data.file, createWriteStream(targetPath));

    const publicUrl = `/uploads/${safeFilename}`;
    return reply.status(201).send({
      success: true,
      url: publicUrl,
      filename: safeFilename,
      mimetype: data.mimetype,
    });
  });

  // 2. Upload Avatar Specifically
  app.post('/users/me/avatar', { preHandler: [authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'No image provided' });
    }

    const ext = extname(data.filename) || '.jpg';
    const safeFilename = `avatar_${request.user!.userId}_${Date.now()}${ext}`;
    const targetPath = join(UPLOAD_DIR, safeFilename);

    await pipeline(data.file, createWriteStream(targetPath));

    const publicUrl = `/uploads/${safeFilename}`;

    // Update user profile in PostgreSQL
    await query('UPDATE app_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [
      publicUrl,
      request.user!.userId,
    ]);

    return reply.send({ success: true, avatarUrl: publicUrl });
  });

  // 3. Serve Static Uploaded File
  app.get('/uploads/:filename', async (request, reply) => {
    const { filename } = request.params as any;
    // Basic sanitization
    const sanitized = filename.replace(/[^a-zA-Z0-9_.-]/g, '');
    const filePath = join(UPLOAD_DIR, sanitized);

    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'File not found' });
    }

    const { createReadStream } = await import('node:fs');
    return reply.send(createReadStream(filePath));
  });
}
