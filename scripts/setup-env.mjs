import fs from 'node:fs';
import crypto from 'node:crypto';

// Generate production cryptographic secrets
const jwtSecret = crypto.randomBytes(32).toString('hex');
const dbPassword = crypto.randomBytes(24).toString('base64url');
const capsuleSecret = crypto.randomBytes(32).toString('hex');

let envContent = '';
if (fs.existsSync('.env.example')) {
  envContent = fs.readFileSync('.env.example', 'utf-8');
} else if (fs.existsSync('.env')) {
  envContent = fs.readFileSync('.env', 'utf-8');
} else {
  envContent = [
    '# NaviSecret Standalone Node.js + Redis + PostgreSQL Environment Configuration',
    'PORT=8000',
    'HOST=0.0.0.0',
    'NODE_ENV=production',
    `POSTGRES_PASSWORD=${dbPassword}`,
    `DATABASE_URL=postgresql://postgres:${dbPassword}@postgres:5432/postgres`,
    'REDIS_URL=redis://redis:6379',
    `JWT_SECRET=${jwtSecret}`,
    `CAPSULE_ENCRYPTION_SECRET=${capsuleSecret}`,
    'STORAGE_PATH=/app/uploads',
    'CORS_ORIGIN=true',
    'VITE_API_URL=http://localhost:8000',
    'VITE_WS_URL=ws://localhost:8000/ws',
  ].join('\n');
}

envContent = envContent.replace(/POSTGRES_PASSWORD=.*/, `POSTGRES_PASSWORD=${dbPassword}`);
envContent = envContent.replace(/DATABASE_URL=postgresql:\/\/postgres:[^@]*@postgres:5432\/postgres/, `DATABASE_URL=postgresql://postgres:${dbPassword}@postgres:5432/postgres`);
envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
envContent = envContent.replace(/CAPSULE_ENCRYPTION_SECRET=.*/, `CAPSULE_ENCRYPTION_SECRET=${capsuleSecret}`);

fs.writeFileSync('.env', envContent, 'utf-8');
console.log('✓ NaviSecret .env configured successfully with high-entropy production keys.');
