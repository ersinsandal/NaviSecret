/**
 * Fastify Authentication Middleware & Request User Decorator
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, type JwtPayload } from '../utils/crypto.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const payload = verifyToken(token);
    request.user = payload;
  } catch (err: any) {
    reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}
