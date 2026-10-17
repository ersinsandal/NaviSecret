/**
 * Server Configuration & Environment Variables
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'navisecret_super_secret_jwt_key_at_least_32_characters_long_2026',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:C11jMmt_Rfe-1NORHcIvF5oTLPJUxYkM@localhost:5433/postgres',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  storagePath: process.env.STORAGE_PATH || path.resolve(__dirname, '..', 'uploads'),
  corsOrigin: process.env.CORS_ORIGIN || true,
};
