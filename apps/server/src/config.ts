import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnvValue(key: string, defaultValue: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '../../../.env'),
      path.resolve(__dirname, '../../.env'),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
        if (match && match[1]) {
          return match[1].trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch {}
  return defaultValue;
}

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: getEnvValue('JWT_SECRET', '16888c342f4b57b3979e1961cdf7fef9063e951d38aae9e9b9f414e449032361'),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:C11jMmt_Rfe-1NORHcIvF5oTLPJUxYkM@localhost:5433/postgres',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  storagePath: process.env.STORAGE_PATH || path.resolve(__dirname, '..', 'uploads'),
  corsOrigin: process.env.CORS_ORIGIN || true,
};
