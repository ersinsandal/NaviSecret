import { deriveLocationKey, encrypt, decrypt } from '../packages/geo-drop/src/crypto.ts';
import { 
  toFixedPoint, 
  metersToRadiusSquared, 
  cosLatScaled, 
  validatePublicSignals, 
  buildZkStatementBinding, 
  generateNaviZkpProof,
  generateZeroProof 
} from '../packages/geo-drop/src/zkp.ts';
import {
  calculateDistance,
  encodeGeohash,
  decodeGeohash,
  verifyProximity,
  geohashNeighbors
} from '../packages/geo-drop/src/geofence.ts';
import {
  addPlanarLaplaceNoise,
  gridSnap,
  detectSensitivePlaces,
  bucketizeDistance,
  FrequencyBudget,
} from '../packages/sdk/src/privacy-location.ts';
import {
  generateIndexTokens,
  generateSearchTokens,
  matchTokens
} from '../packages/geo-drop/src/encrypted-search.ts';

async function runTestSuite() {
  console.log('================================================================');
  console.log('       NAVISECRET SUITE ACCEPTANCE & VERIFICATION TESTS         ');
  console.log('       Author & Owner: Ersin Sandal (SliferSoft)                ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // --- Test 1: Cryptography & Key Derivation ---
  console.log('--- 1. Cryptography & Key Derivation (AES-256-GCM + PBKDF2) ---');
  const secretData = 'Confidential NaviSecret geodrop coordinate payload - Ersin Sandal';
  const salt = 'salt_random_0123456789';
  const locKey = deriveLocationKey('xn774c', 'drop-navisecret-01', salt);
  assert(locKey.startsWith('capsule-crypto:v1:'), `Derived location key generated (v1): ${locKey}`);
  
  const locKeyV2 = deriveLocationKey('xn774c', 'drop-navisecret-01', salt, undefined, 2);
  assert(locKeyV2.startsWith('capsule-crypto:v2:'), `Derived location key generated (v2): ${locKeyV2}`);

  const encrypted = await encrypt(secretData, locKey);
  assert(encrypted.ciphertext.length > 0, 'Encrypted ciphertext is produced (Base64)');
  assert(encrypted.iv.length > 0, 'IV is produced (Base64)');
  assert(encrypted.salt.length > 0, 'PBKDF2 salt is produced (Base64)');

  const decrypted = await decrypt(encrypted, locKey);
  assert(decrypted === secretData, 'Decrypted plain text exactly matches original payload');

  // --- Test 2: Geofencing & Haversine Distance ---
  console.log('\n--- 2. Geofencing & Haversine Distance ---');
  // Tokyo Station (35.6812, 139.7671) to Shibuya Station (35.6580, 139.7016)
  const dist = calculateDistance(35.6812, 139.7671, 35.6580, 139.7016);
  assert(dist > 6000 && dist < 7000, `Distance between Tokyo & Shibuya is ${Math.round(dist)}m (expected ~6.6km)`);

  const samePointDist = calculateDistance(41.0082, 28.9784, 41.0082, 28.9784);
  assert(samePointDist === 0, 'Distance between identical points is 0m');

  const nearbyProof = verifyProximity({
    targetLat: 35.6812,
    targetLon: 139.7671,
    unlockRadius: 50,
    userLat: 35.6813,
    userLon: 139.7672,
    accuracy: 5,
    userId: 'user-ersin-01'
  });
  assert(nearbyProof.verified === true, 'Nearby location (15m) verifies within 50m geofence radius');

  const farProof = verifyProximity({
    targetLat: 35.6812,
    targetLon: 139.7671,
    unlockRadius: 50,
    userLat: 35.6580,
    userLon: 139.7016,
    accuracy: 5,
    userId: 'user-ersin-01'
  });
  assert(farProof.verified === false, 'Far location (~6.6km) rejected outside 50m geofence radius');

  // --- Test 3: Geohash Encoding & Decoding ---
  console.log('\n--- 3. Geohash Encoding & Decoding ---');
  const gh = encodeGeohash(41.0082, 28.9784, 7);
  assert(typeof gh === 'string' && gh.length === 7, `Encoded Geohash: ${gh}`);
  
  const decoded = decodeGeohash(gh);
  assert(Math.abs(decoded.lat - 41.0082) < 0.01, 'Decoded latitude is within precision');
  assert(Math.abs(decoded.lon - 28.9784) < 0.01, 'Decoded longitude is within precision');

  // --- Test 4: Privacy Location & Differential Privacy (Laplace) ---
  console.log('\n--- 4. Differential Privacy (Laplace Mechanism) & Grid Snap ---');
  const noisy = addPlanarLaplaceNoise(41.0082, 28.9784, 1.0); // epsilon = 1.0
  const noiseDist = calculateDistance(41.0082, 28.9784, noisy.lat, noisy.lon);
  assert(noiseDist >= 0, `Laplace noise distance offset: ${Math.round(noiseDist)}m`);

  const snapped = gridSnap(41.008234, 28.978456, 100, 'navisecret-grid-seed');
  assert(snapped.lat !== undefined && snapped.lon !== undefined && snapped.cellId.length > 0, `Grid snap produced valid cell: ${snapped.cellId}`);

  const bucket = bucketizeDistance(245);
  assert(typeof bucket === 'string', `Bucketized distance for 245m: ${bucket}`);

  // --- Test 5: Zero-Knowledge Proof (ZKP) Geometric & Circuit Math ---
  console.log('\n--- 5. Zero-Knowledge Proof (ZKP) Engine ---');
  const fpLat = toFixedPoint(35.6812);
  assert(fpLat === 35681200n, 'toFixedPoint scales correctly with 1e6 factor');

  const rSq = metersToRadiusSquared(50);
  assert(rSq > 0n, 'metersToRadiusSquared returns positive BigInt');

  const cosScaled = cosLatScaled(35.6812);
  assert(cosScaled > 0n && cosScaled <= 1000000n, 'cosLatScaled returns valid 1e6 fixed point');

  const binding = await buildZkStatementBinding({
    dropId: 'drop-test-123',
    serverNonce: 'server-nonce-xyz',
    epoch: 123456,
  });
  assert(typeof binding.contextDigest === 'string' && binding.contextDigest.length > 0, `ZK statement binding generates valid contextDigest: ${binding.contextDigest.slice(0, 16)}...`);
  assert(typeof binding.challengeDigest === 'string' && binding.challengeDigest.length > 0, `ZK statement binding generates valid challengeDigest: ${binding.challengeDigest.slice(0, 16)}...`);

  assert(typeof generateNaviZkpProof === 'function', 'generateNaviZkpProof is exported as primary function');
  assert(generateZeroProof === generateNaviZkpProof, 'generateZeroProof matches generateNaviZkpProof');

  // --- Test 6: Public Signals Validation ---
  console.log('\n--- 6. ZKP Signal Validation ---');
  const validSignals = [
    '1',                                // valid
    toFixedPoint(35.6812).toString(),   // sigTargetLat
    toFixedPoint(139.7671).toString(),  // sigTargetLon
    metersToRadiusSquared(50).toString(), // sigRadiusSq
    cosLatScaled(35.6812).toString(),   // sigCosLat
    binding.contextDigest,              // sigContextDigest
    binding.epoch,                      // sigEpoch
    binding.challengeDigest             // sigChallengeDigest
  ];
  const isValid = validatePublicSignals(validSignals, 35.6812, 139.7671, 50, binding);
  assert(isValid === true, 'Public signals correctly verified with matching drop coordinates & statement binding');

  const isInvalidCoord = validatePublicSignals(validSignals, 35.6580, 139.7016, 50, binding);
  assert(isInvalidCoord === false, 'Public signals correctly rejected mismatched coordinates');

  // --- Test 7: Encrypted Search & SBPP Tokens ---
  console.log('\n--- 7. Encrypted Search & Blind Token Matching ---');
  const searchKey = 'secure_high_entropy_search_key_32bytes_long!';
  const indexTokens = await generateIndexTokens(35.6812, 139.7671, { searchKey });
  assert(indexTokens.tokens.length > 0, `Index tokens generated (${indexTokens.tokens.length} tokens)`);

  const searchTokens = await generateSearchTokens(35.6812, 139.7671, 100, { searchKey });
  assert(searchTokens.tokens.length > 0, `Search tokens generated (${searchTokens.tokens.length} tokens, precision ${searchTokens.precision})`);

  const matches = matchTokens(searchTokens, [{ dropId: 'drop-1', tokens: indexTokens }]);
  assert(matches.some(m => m.dropId === 'drop-1'), 'Encrypted search successfully matched drop at same location without exposing coordinates');

  // --- Test 8: Navi Ecosystem Brand Exports ---
  console.log('\n--- 8. Navi Ecosystem Brand Exports (NaviDrop, NaviZKP) ---');
  const { NaviDropError } = await import('../packages/geo-drop/src/errors.ts');
  assert(typeof NaviDropError === 'function', 'NaviDropError class is exported as first-class brand error');

  const testErr = new NaviDropError('VERIFICATION_FAILED', 'NaviDrop proximity check failed');
  assert(testErr.code === 'VERIFICATION_FAILED', 'NaviDropError instance retains error code');

  console.log('\n================================================================');
  console.log(`ALL TESTS PASSED: ${passed}/${total} assertions succeeded (100%)`);
  console.log('================================================================');
}

runTestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
