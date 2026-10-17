# ZK Proximity Proof Circuits

Circom circuits for proving proximity to a location without revealing exact coordinates.

The package currently includes:

- `proximity.circom`: original proximity-only statement
- `secret_proximity.circom`: context-bound ZeroProof statement with capsule/session binding

## Prerequisites

```bash
pnpm install
```

The workspace installs `circom2` and `snarkjs` locally for `@navisecret/geo-drop`.

## Build Steps

### 1. Compile Circuit

```bash
# Proximity circuit
circom proximity.circom --r1cs --wasm --sym -o build/

# Context-bound ZeroProof circuit
circom secret_proximity.circom --r1cs --wasm --sym -o build/
```

### 2. Trusted Setup

For development and testing, the current circuit fits within a small BN128 ceremony:

```bash
# Phase 1: Powers of Tau
snarkjs powersoftau new bn128 10 pot10_0000.ptau -v
snarkjs powersoftau contribute pot10_0000.ptau pot10_0001.ptau --name="NaviSecret contributor" -v
snarkjs powersoftau prepare phase2 pot10_0001.ptau pot10_final.ptau -v

# Phase 2: Circuit-specific setup
snarkjs groth16 setup build/secret_proximity.r1cs pot10_final.ptau secret_proximity_0000.zkey
snarkjs zkey contribute secret_proximity_0000.zkey secret_proximity_final.zkey --name="NaviSecret contributor" -v
snarkjs zkey export verificationkey secret_proximity_final.zkey verification_key.json
```

For production, use a multi-party ceremony and publish the ceremony transcript with the final proving key.

### 3. Output Artifacts

| File | Purpose | Where to deploy |
|------|---------|----------------|
| `build/secret_proximity_js/secret_proximity.wasm` | Circuit WASM | CDN / artifacts server |
| `secret_proximity_final.zkey` | Proving key | CDN / artifacts server |
| `verification_key.json` | Verification key | Stored in capsule's `proof_config.requirements[].params.verification_key` |

### 4. Workspace Scripts

```bash
pnpm --filter @navisecret/geo-drop run zkp:compile
pnpm --filter @navisecret/geo-drop run zkp:build
pnpm --filter @navisecret/geo-drop run zkp:witness
pnpm --filter @navisecret/geo-drop run zkp:prove
pnpm --filter @navisecret/geo-drop run zkp:verify
```

`zkp:witness`, `zkp:prove`, and `zkp:verify` use the sample input in
`example-proximity-input.json` and write outputs into `build/`.

### 5. Usage in GeoDrop SDK

```typescript
import { generateNaviZkpProof, verifyProximityProof } from '@navisecret/geo-drop';

const { proof, publicSignals, statement } = await generateNaviZkpProof(
  userLat, userLon,
  drop.lat, drop.lon,
  drop.unlock_radius_meters,
  {
    dropId: drop.id,
    policyVersion: '1',
    epoch: '2026-03-13T10',
    serverNonce: nonceFromServer,
  },
  { artifactsBaseUrl: 'https://cdn.example.com/zkp/' }
);

const valid = await verifyProximityProof(proof, publicSignals, verificationKey);
```

## Circuit Details

- **Curve**: BN128 (`alt_bn128`)
- **Protocol**: Groth16
- **Arithmetic**: Fixed-point integers (scale ×1e6, ~0.11m resolution)
- **Latitude correction**: cosine scaling on longitude delta
- **Context binding**: `drop_id`, `policy_version`, `epoch`, and `server_nonce` are bound through public statement values
