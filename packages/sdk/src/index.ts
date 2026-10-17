/**
 * @navisecret/sdk
 * Location sharing and privacy preservation SDK
 */

// Type definition exports
export * from './types.js';

// Core functionality exports
export { createLocationCore, calculateDistance, estimateMotionType, encodeGeohash, decodeGeohash } from './core.js';

// Policy engine (advanced usage)
export { evaluatePolicies, coarsenLocation } from './policy-engine.js';
export type { EvaluationContext } from './policy-engine.js';

// Probabilistic location integrity scoring
export {
  computeTrustScore,
  computeTrustScoreV2,
  gateTrustScore,
  temporalRaimTrustSignalProvider,
  networkCrossCheckTrustSignalProvider,
  DEFAULT_TRUST_SIGNAL_PROVIDERS,
} from './trust-scorer.js';
export type {
  LocationPoint,
  TrustScoreResult,
  TrustScoreResultV2,
  TrustThresholds,
  TrustDeviceCapabilities,
  GpsFix,
  NetworkHint,
  ImuSummary,
  TrustContext,
  TrustSignalInput,
  TrustSignalObservation,
  TrustSignalProvider,
  TrustSignalEvidence,
} from './trust-scorer.js';

// Privacy-preserving location sharing
export {
  createPrivacyProcessor,
  createSensingGate,
  validatePrivacyConfig,
  detectSensitivePlaces,
  obfuscateLocation,
  addPlanarLaplaceNoise,
  gridSnap,
  bucketizeDistance,
  processLocation,
  FrequencyBudget,
  AdaptiveReporter,
  FixedRateReporter,
  jitterDepartureTime,
  DEFAULT_PRIVACY_CONFIG,
  DEFAULT_GATE_CONFIG,
} from './privacy-location.js';
export type {
  GateDecision,
  GateInput,
  MotionState,
  SensitivePlace,
  SensingGate,
  SensingGateConfig,
  PrivacyZoneRule,
  LocationState,
  LocationReporter,
  PrivacyConfig,
} from './privacy-location.js';
