/**
 * NaviSecret Backend Server Smoke & Routing Verification Test
 * Tests Fastify app initialization, route registration, crypto utilities, and route injection.
 */
import { buildApp } from '../src/index.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/utils/crypto.js';
import { calculateDistance, encodeGeohash } from '../src/utils/geofence.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`✅ PASS: ${msg}`);
  passedTests++;
}

async function runTests() {
  console.log('🚀 Running NaviSecret Backend Server Smoke Tests...\n');

  // 1. Test Crypto Utilities
  console.log('--- Testing Cryptographic & JWT Functions ---');
  const password = 'SuperSecretPassword123!';
  const hashed = await hashPassword(password);
  assert(hashed.startsWith('$2'), 'Password hash uses bcrypt format');
  assert(await verifyPassword(password, hashed), 'Password verification succeeds with correct password');
  assert(!(await verifyPassword('WrongPassword', hashed)), 'Password verification fails with wrong password');

  const payload = { userId: '11111111-2222-3333-4444-555555555555', email: 'test@navisecret.local' };
  const token = signToken(payload, '1h');
  assert(typeof token === 'string' && token.length > 20, 'JWT token signed successfully');

  const decoded = verifyToken(token);
  assert(decoded?.userId === payload.userId, 'JWT token verified and userId matches');
  assert(decoded?.email === payload.email, 'JWT token verified and email matches');

  // 2. Test Geofence & Geohashing
  console.log('\n--- Testing Geofence & Math Engine ---');
  const dist = calculateDistance(41.0082, 28.9784, 41.0082, 28.9784);
  assert(Math.round(dist) === 0, 'Zero distance between identical points');

  const distKm = calculateDistance(41.0082, 28.9784, 41.0182, 28.9784);
  assert(distKm > 1000 && distKm < 1200, `Haversine distance between 0.01 lat diff is ~1.1km (${Math.round(distKm)}m)`);

  const geohash = encodeGeohash(41.0082, 28.9784, 7);
  assert(typeof geohash === 'string' && geohash.length === 7, `Geohash generated with correct precision: ${geohash}`);

  // 3. Test Fastify App Build & Route Registrations
  console.log('\n--- Testing Fastify App & Route Registration ---');
  const app = await buildApp();
  await app.ready();

  const requiredRoutes: Array<{ method: any; url: string }> = [
    { method: 'GET', url: '/health' },
    { method: 'GET', url: '/api/health' },
    { method: 'POST', url: '/api/v1/auth/signup' },
    { method: 'POST', url: '/api/v1/auth/login' },
    { method: 'GET', url: '/api/v1/users/me' },
    { method: 'GET', url: '/api/v1/users/search' },
    { method: 'GET', url: '/api/v1/settings' },
    { method: 'POST', url: '/api/v1/presence/broadcast' },
    { method: 'GET', url: '/api/v1/presence/friends' },
    { method: 'POST', url: '/api/v1/presence/casper' },
    { method: 'POST', url: '/api/v1/pulses/scan' },
    { method: 'POST', url: '/api/v1/pulses/record' },
    { method: 'GET', url: '/api/v1/pulses/history' },
    { method: 'POST', url: '/api/v1/capsules' },
    { method: 'GET', url: '/api/v1/capsules/nearby' },
    { method: 'GET', url: '/api/v1/social/friends' },
    { method: 'POST', url: '/api/v1/social/requests' },
    { method: 'GET', url: '/api/v1/social/requests/pending' },
    { method: 'GET', url: '/api/v1/social/friends-of-friends' },
    { method: 'GET', url: '/api/v1/social/rankings' },
    { method: 'GET', url: '/api/v1/social/blocked' },
    { method: 'GET', url: '/api/v1/social/streaks' },
    { method: 'POST', url: '/api/v1/privacy/rules' },
    { method: 'GET', url: '/api/v1/chat/rooms' },
    { method: 'GET', url: '/api/v1/places' },
    { method: 'GET', url: '/api/v1/groups' },
    { method: 'GET', url: '/api/v1/footprints' },
    { method: 'GET', url: '/api/v1/unveil/cells' },
    { method: 'POST', url: '/api/v1/reactions' },
    { method: 'POST', url: '/storage/upload' },
    { method: 'GET', url: '/ws' },
  ];

  for (const route of requiredRoutes) {
    const exists = app.hasRoute({ method: route.method, url: route.url });
    assert(exists, `Route registered: [${route.method}] ${route.url}`);
  }

  // 4. Test Injected HTTP Endpoints
  console.log('\n--- Testing Injected HTTP Endpoints ---');
  const healthRes = await app.inject({
    method: 'GET',
    url: '/health',
  });
  assert(healthRes.statusCode === 200, 'GET /health returns 200 OK');
  const healthJson = healthRes.json();
  assert(healthJson.status === 'ok', 'Health status is ok');

  const apiHealthRes = await app.inject({
    method: 'GET',
    url: '/api/health',
  });
  assert(apiHealthRes.statusCode === 200, 'GET /api/health returns 200 OK');

  const unauthRes = await app.inject({
    method: 'GET',
    url: '/api/v1/users/me',
  });
  assert(unauthRes.statusCode === 401, 'GET /api/v1/users/me without token returns 401 Unauthorized');

  const unauthFriendsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/social/friends',
  });
  assert(unauthFriendsRes.statusCode === 401, 'GET /api/v1/social/friends without token returns 401 Unauthorized');

  await app.close();

  console.log(`\n========================================`);
  console.log(`🎉 ALL SERVER SMOKE TESTS PASSED (${passedTests}/${totalTests})`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
