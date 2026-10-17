#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUIT="${1:-navisecret_zkp}"
PTAU="${2:-pot10_final.ptau}"
BUILD_DIR="${3:-build}"

cd "$SCRIPT_DIR"

if [[ ! -f "${CIRCUIT}.circom" ]]; then
  echo "Circuit file not found: ${CIRCUIT}.circom" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"

if [[ ! -f "$PTAU" ]]; then
  snarkjs powersoftau new bn128 10 pot10_0000.ptau -v
  snarkjs powersoftau contribute pot10_0000.ptau pot10_0001.ptau --name="NaviSecret local contribution" -e="navisecret-zkp"
  snarkjs powersoftau prepare phase2 pot10_0001.ptau "$PTAU" -v
fi

circom "${CIRCUIT}.circom" --r1cs --wasm --sym -o "$BUILD_DIR"

snarkjs groth16 setup "${BUILD_DIR}/${CIRCUIT}.r1cs" "$PTAU" "${BUILD_DIR}/${CIRCUIT}_0000.zkey"
snarkjs zkey contribute "${BUILD_DIR}/${CIRCUIT}_0000.zkey" "${BUILD_DIR}/${CIRCUIT}_final.zkey" \
  --name="NaviSecret contributor" -e="navisecret-zkp"
snarkjs zkey export verification_key "${BUILD_DIR}/${CIRCUIT}_final.zkey" \
  "${BUILD_DIR}/${CIRCUIT}_verification_key.json"

echo "NaviSecret-ZKP artifact generation complete: $CIRCUIT"
