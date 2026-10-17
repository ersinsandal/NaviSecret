param(
  [string]$Circuit = "navisecret_zkp",
  [string]$Ptau = "pot10_final.ptau",
  [string]$BuildDir = "build",
  [switch]$CreatePtau,
  [switch]$CompileOnly
)

$ErrorActionPreference = "Stop"

function Resolve-Command([string[]]$Names) {
  $localBin = Join-Path (Split-Path $PSScriptRoot -Parent) "node_modules\.bin"
  foreach ($name in $Names) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) {
      return $cmd.Source
    }
    foreach ($candidate in @(
      (Join-Path $localBin "$name.cmd"),
      (Join-Path $localBin "$name.ps1"),
      (Join-Path $localBin $name)
    )) {
      if (Test-Path $candidate) {
        return $candidate
      }
    }
  }
  throw "Required command not found. Tried: $($Names -join ', ')"
}

function Invoke-Native([string]$Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
  }
}

$circom = Resolve-Command @("circom2", "circom")
$snarkjs = Resolve-Command @("snarkjs")

$circuitFile = Join-Path $PSScriptRoot "$Circuit.circom"
if (-not (Test-Path $circuitFile)) {
  throw "Circuit file not found: $circuitFile"
}

$buildPath = Join-Path $PSScriptRoot $BuildDir
if (-not (Test-Path $buildPath)) {
  New-Item -ItemType Directory -Path $buildPath | Out-Null
}

$ptauPath = Join-Path $PSScriptRoot $Ptau
if (-not (Test-Path $ptauPath) -and -not $CreatePtau) {
  throw "Powers of Tau file not found: $ptauPath"
}

Push-Location $PSScriptRoot
try {
  if (-not (Test-Path $ptauPath)) {
    Invoke-Native $snarkjs @("powersoftau", "new", "bn128", "10", "pot10_0000.ptau", "-v")
    Invoke-Native $snarkjs @("powersoftau", "contribute", "pot10_0000.ptau", "pot10_0001.ptau", "--name=NaviSecret local contribution", "-e=navisecret-zkp")
    Invoke-Native $snarkjs @("powersoftau", "prepare", "phase2", "pot10_0001.ptau", $Ptau, "-v")
  }

  Invoke-Native $circom @("$Circuit.circom", "--r1cs", "--wasm", "--sym", "-o", $BuildDir)

  if ($CompileOnly) {
    Write-Host "Circuit compilation complete: $Circuit"
    return
  }

  $r1csPath = Join-Path $BuildDir "$Circuit.r1cs"
  $zkey0 = Join-Path $BuildDir "${Circuit}_0000.zkey"
  $zkeyFinal = Join-Path $BuildDir "${Circuit}_final.zkey"
  $vkey = Join-Path $BuildDir "${Circuit}_verification_key.json"

  Invoke-Native $snarkjs @("groth16", "setup", $r1csPath, $Ptau, $zkey0)
  Invoke-Native $snarkjs @("zkey", "contribute", $zkey0, $zkeyFinal, "--name=NaviSecret contributor", "-e=navisecret-zkp")
  Invoke-Native $snarkjs @("zkey", "export", "verification_key", $zkeyFinal, $vkey)

  Write-Host "NaviSecret-ZKP artifact generation complete: $Circuit"
}
finally {
  Pop-Location
}
