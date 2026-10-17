#!/usr/bin/env node
/**
 * NaviSecret - Production Secret Key Generator
 * Author & Owner: Ersin Sandal (SliferSoft)
 * Generates cryptographically secure secrets for Node.js, Fastify, Redis, and PostgreSQL.
 *
 * Usage:
 *   node scripts/generate-keys.mjs
 */

import crypto from 'node:crypto';

const jwtSecret = crypto.randomBytes(32).toString('hex');
const dbPassword = crypto.randomBytes(24).toString('base64url');
const capsuleSecret = crypto.randomBytes(32).toString('hex');

console.log('=============================================================================');
console.log(' NaviSecret Production Server Secrets & Encryption Keys');
console.log('=============================================================================\n');
console.log('# Add/update these values in your .env file:\n');
console.log(`POSTGRES_PASSWORD=${dbPassword}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`CAPSULE_ENCRYPTION_SECRET=${capsuleSecret}\n`);
console.log('=============================================================================');
