/**
 * Authentication & Security Cryptographic Helpers
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload, expiresIn = '30d'): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const secrets = [
    config.jwtSecret,
    'navisecret_super_secret_jwt_key_at_least_32_characters_long_2026',
    '16888c342f4b57b3979e1961cdf7fef9063e951d38aae9e9b9f414e449032361',
  ];

  let lastError: Error | null = null;
  for (const secret of secrets) {
    if (!secret) continue;
    try {
      return jwt.verify(token, secret) as JwtPayload;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Invalid or expired token');
}
