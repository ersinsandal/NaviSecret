/**
 * Server-side Geodesic Distance and Geohash Utilities
 */

const EARTH_RADIUS_METERS = 6371000;
const RAD_FACTOR = Math.PI / 180;
const GEOHASH_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const phi1 = lat1 * RAD_FACTOR;
  const phi2 = lat2 * RAD_FACTOR;
  const deltaLon = (lon2 - lon1) * RAD_FACTOR;

  const cosTheta = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
  const clamped = Math.min(1.0, Math.max(-1.0, cosTheta));
  return EARTH_RADIUS_METERS * Math.acos(clamped);
}

export function encodeGeohash(lat: number, lon: number, precision = 7): string {
  let [minLat, maxLat] = [-90, 90];
  let [minLon, maxLon] = [-180, 180];
  let isLon = true;
  let bitCount = 0;
  let charIdx = 0;
  let hash = '';

  while (hash.length < precision) {
    if (isLon) {
      const mid = (minLon + maxLon) * 0.5;
      const bit = lon >= mid ? 1 : 0;
      charIdx = (charIdx << 1) | bit;
      if (bit === 1) minLon = mid; else maxLon = mid;
    } else {
      const mid = (minLat + maxLat) * 0.5;
      const bit = lat >= mid ? 1 : 0;
      charIdx = (charIdx << 1) | bit;
      if (bit === 1) minLat = mid; else maxLat = mid;
    }

    isLon = !isLon;
    bitCount++;

    if (bitCount === 5) {
      hash += GEOHASH_ALPHABET.charAt(charIdx);
      bitCount = 0;
      charIdx = 0;
    }
  }

  return hash;
}
