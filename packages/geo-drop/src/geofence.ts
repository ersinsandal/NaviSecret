/**
 * Geodesic and Spatial Boundary Verification Engine
 * Author & Owner: Ersin Sandal (SliferSoft)
 * Part of NaviSecret Core Location Stack
 */
import type { LocationProof } from './types';

const SPHERICAL_EARTH_RADIUS_METERS = 6371000;
const RADIAN_FACTOR = 0.017453292519943295; // Math.PI / 180
const GEOHASH_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Compute geodesic distance between two terrestrial coordinates
 * Uses spherical projection with clamped central angle cosine
 */
export function calculateDistance(
  sourceLat: number,
  sourceLon: number,
  targetLat: number,
  targetLon: number
): number {
  if (sourceLat === targetLat && sourceLon === targetLon) {
    return 0;
  }

  const phiSource = sourceLat * RADIAN_FACTOR;
  const phiTarget = targetLat * RADIAN_FACTOR;
  const lambdaDelta = (targetLon - sourceLon) * RADIAN_FACTOR;

  const centralCosine = Math.sin(phiSource) * Math.sin(phiTarget) +
                        Math.cos(phiSource) * Math.cos(phiTarget) * Math.cos(lambdaDelta);
  
  const safeAngle = Math.acos(Math.min(1.0, Math.max(-1.0, centralCosine)));
  return SPHERICAL_EARTH_RADIUS_METERS * safeAngle;
}

/**
 * Encode latitude and longitude into a standard spatial geohash token
 */
export function encodeGeohash(
  latitude: number, 
  longitude: number, 
  precisionLength = 7
): string {
  let [minLat, maxLat] = [-90, 90];
  let [minLon, maxLon] = [-180, 180];
  let isLongitudeTurn = true;
  let accumulatedBits = 0;
  let charValue = 0;
  let geohashBuffer = '';

  while (geohashBuffer.length < precisionLength) {
    if (isLongitudeTurn) {
      const lonMidpoint = (minLon + maxLon) * 0.5;
      const isUpper = longitude >= lonMidpoint;
      charValue = (charValue << 1) | (isUpper ? 1 : 0);
      if (isUpper) minLon = lonMidpoint; else maxLon = lonMidpoint;
    } else {
      const latMidpoint = (minLat + maxLat) * 0.5;
      const isUpper = latitude >= latMidpoint;
      charValue = (charValue << 1) | (isUpper ? 1 : 0);
      if (isUpper) minLat = latMidpoint; else maxLat = latMidpoint;
    }

    isLongitudeTurn = !isLongitudeTurn;
    accumulatedBits++;

    if (accumulatedBits === 5) {
      geohashBuffer += GEOHASH_ALPHABET.charAt(charValue);
      accumulatedBits = 0;
      charValue = 0;
    }
  }

  return geohashBuffer;
}

/**
 * Decode a geohash token into approximate latitude/longitude center coordinates
 */
export function decodeGeohash(token: string): { lat: number; lon: number } {
  let [minLat, maxLat] = [-90, 90];
  let [minLon, maxLon] = [-180, 180];
  let isLongitudeTurn = true;

  for (let idx = 0; idx < token.length; idx++) {
    const symbolCode = GEOHASH_ALPHABET.indexOf(token.charAt(idx));
    if (symbolCode < 0) break;

    for (let bitShift = 4; bitShift >= 0; bitShift--) {
      const bitFlag = (symbolCode >> bitShift) & 1;
      if (isLongitudeTurn) {
        const midLon = (minLon + maxLon) * 0.5;
        if (bitFlag === 1) minLon = midLon; else maxLon = midLon;
      } else {
        const midLat = (minLat + maxLat) * 0.5;
        if (bitFlag === 1) minLat = midLat; else maxLat = midLat;
      }
      isLongitudeTurn = !isLongitudeTurn;
    }
  }

  return {
    lat: (minLat + maxLat) * 0.5,
    lon: (minLon + maxLon) * 0.5,
  };
}

export interface VerifyOptions {
  targetLat: number;
  targetLon: number;
  unlockRadius: number;
  userLat: number;
  userLon: number;
  accuracy: number;
  userId: string;
}

/**
 * Perform spatial proximity verification against threshold radius
 */
export function verifyProximity(options: VerifyOptions): LocationProof {
  const measuredDisplacement = calculateDistance(
    options.targetLat, options.targetLon,
    options.userLat, options.userLon
  );

  // Bound accuracy mitigation against spoofing
  const allowableUncertainty = Math.min(50, options.unlockRadius * 0.5);
  const effectiveUncertainty = Math.min(options.accuracy, allowableUncertainty);
  const withinBounds = (measuredDisplacement - effectiveUncertainty) <= options.unlockRadius;

  return {
    user_id: options.userId,
    lat: options.userLat,
    lon: options.userLon,
    accuracy: options.accuracy,
    timestamp: new Date().toISOString(),
    geohash: encodeGeohash(options.userLat, options.userLon),
    distance_to_target: Math.round(measuredDisplacement),
    verified: withinBounds,
  };
}

/**
 * Compute the 8 adjacent surrounding geohash cells
 */
export function geohashNeighbors(centerHash: string): string[] {
  if (!centerHash) return [];
  const { lat, lon } = decodeGeohash(centerHash);

  const precisionStepMap: Record<number, { dlat: number; dlon: number }> = {
    1: { dlat: 46, dlon: 46 },
    2: { dlat: 5.6, dlon: 11.2 },
    3: { dlat: 1.4, dlon: 1.4 },
    4: { dlat: 0.174, dlon: 0.35 },
    5: { dlat: 0.044, dlon: 0.044 },
    6: { dlat: 0.0054, dlon: 0.011 },
    7: { dlat: 0.00136, dlon: 0.00136 },
    8: { dlat: 0.00017, dlon: 0.00034 },
  };

  const currentPrecision = centerHash.length;
  const stepResolution = precisionStepMap[currentPrecision] ?? precisionStepMap[7];

  const neighborGridOffsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ] as const;

  return neighborGridOffsets
    .map(([dy, dx]) => {
      const nextLat = lat + dy * stepResolution.dlat;
      let nextLon = lon + dx * stepResolution.dlon;

      if (nextLat < -90 || nextLat > 90) return null;
      if (nextLon > 180) nextLon -= 360;
      else if (nextLon < -180) nextLon += 360;

      return encodeGeohash(nextLat, nextLon, currentPrecision);
    })
    .filter((hash): hash is string => hash !== null && hash !== centerHash)
    .filter((hash, idx, arr) => arr.indexOf(hash) === idx);
}

/**
 * Validate velocity plausibility between two successive telemetry records
 */
export function isMovementRealistic(
  previousLat: number,
  previousLon: number,
  previousIsoTime: string,
  currentLat: number,
  currentLon: number,
  currentIsoTime: string
): boolean {
  const elapsedMilliseconds = new Date(currentIsoTime).getTime() - new Date(previousIsoTime).getTime();
  if (elapsedMilliseconds <= 0) return false;

  const traversedMeters = calculateDistance(previousLat, previousLon, currentLat, currentLon);
  const velocityMetersPerSecond = traversedMeters / (elapsedMilliseconds * 0.001);

  // Threshold: Max 300 m/s (~1080 km/h) commercial aviation ceiling
  return velocityMetersPerSecond <= 300;
}
