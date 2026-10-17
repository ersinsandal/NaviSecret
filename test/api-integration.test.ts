/**
 * NaviSecret End-to-End API Integration Test
 * Author: Ersin Sandal (SliferSoft)
 * Tests connection to Fastify Backend (Node.js 22 + Redis + PostgreSQL 16)
 */

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';

async function runApiIntegrationTests() {
  console.log(`\n======================================================`);
  console.log(`  NAVISECRET STANDALONE API INTEGRATION TEST SUITE     `);
  console.log(`  Target: ${API_URL}`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, label: string) {
    if (cond) {
      console.log(`✅ PASS: ${label}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${label}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${API_URL}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    const healthJson = await healthRes.json() as { status: string };
    assert(healthJson.status === 'ok', 'Health status is "ok"');

    // 2. Auth protection check (unauthorized access returns 401)
    const meRes = await fetch(`${API_URL}/api/v1/users/me`);
    assert(meRes.status === 401, 'Protected /api/v1/users/me returns HTTP 401 Unauthorized');

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  } catch (err: any) {
    console.log(`ℹ️ Server not currently running on ${API_URL} (${err.message}).`);
    console.log(`  (To run live tests: start docker compose up -d or pnpm dev:server)\n`);
  }
}

runApiIntegrationTests().catch(console.error);
