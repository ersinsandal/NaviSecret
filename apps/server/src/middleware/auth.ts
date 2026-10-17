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
  let token: string | undefined;
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if ((request.query as any)?.token) {
    token = (request.query as any).token;
  }

  if (!token) {
    reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization token' });
    return;
  }

  try {
    const payload = verifyToken(token);
    request.user = payload;
  } catch (err: any) {
    reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}
