<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg" />
    <img src="assets/logo-dark.svg" alt="NaviSecret Logo" width="340" />
  </picture>
</p>

<p align="center">
  <strong>Enterprise-Grade, Privacy-First Spatial Computing & Location-Bound Encrypted Content Platform</strong>
</p>

<p align="center">
  <a href="README.tr.md">
    <img src="https://img.shields.io/badge/DOKÜMANTASYON-TÜRKÇE%20İÇİN%20TIKLAYIN-0052cc?style=for-the-badge&logo=googledocs&logoColor=white" alt="Türkçe Dokümantasyon" />
  </a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Node.js-22%20LTS-339933.svg?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 22">
  <img src="https://img.shields.io/badge/Fastify-5.x-000000.svg?style=flat-square&logo=fastify&logoColor=white" alt="Fastify">
  <img src="https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16">
  <img src="https://img.shields.io/badge/Redis-7-DC382D.svg?style=flat-square&logo=redis&logoColor=white" alt="Redis 7">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/ZKP-Groth16-orange.svg?style=flat-square" alt="Groth16 ZKP">
</p>

---

## Executive Summary

**NaviSecret** is an open-source, sovereign, privacy-preserving spatial computing platform. It enables real-time peer location synchronization, location-bound encrypted data drops, differentially private spatial logging, and zero-knowledge proximity proofs without subjecting users to persistent surveillance or centralized data exposure.

Traditional location-based services store precise geospatial coordinate trails in plaintext on remote servers, introducing severe surveillance and breach risks. NaviSecret departs from this paradigm by implementing **cryptographic location gating**:
- Location data can be dynamically obfuscated using **Local Differential Privacy** (Planar Laplace Noise).
- Physical drops and secret payloads are encrypted client-side using **AES-256-GCM**, where decryption keys are derived strictly on-site from physical proximity verifications (PBKDF2 key derivation).
- Proximity verification can be formally attested on-chain or peer-to-peer using **Groth16 Zero-Knowledge Proofs (zk-SNARKs)**, proving that a client is within radius $R$ of a landmark without disclosing their exact coordinates $(\text{lat}, \text{lon})$.
- The entire infrastructure is self-hosted, independent of third-party cloud backends, running as a lean 4-container Docker stack requiring approximately 100 MB of RAM.

---

## Architecture Overview

NaviSecret operates on an asynchronous, event-driven microservices architecture designed for minimal latency, cryptographic security, and minimal resource utilization.

<p align="center">
  <img src="assets/system-overview.svg" alt="NaviSecret System Overview" width="920" />
</p>

### Core Infrastructure Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Client Browser / PWA                            │
│           (React 19, Tailwind CSS 4, Leaflet, Web Crypto API)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket (Reverse Proxy)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Nginx Web Container (:3000)                         │
│         - Static SPA Distribution & Asset Caching                           │
│         - Reverse Proxy for /api/* and /ws (WebSocket upgrades)             │
│         - Strict CSP, HSTS, and Dual-Stack (IPv4 / IPv6) Support            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Upstream Reverse Proxy
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NaviSecret API Engine (:8000)                           │
│         - Node.js 22 LTS + Fastify 5.x Framework                            │
│         - High-Throughput Native WebSocket Real-Time Gateway                │
│         - JWT Authentication & Role-Based Access Control                    │
│         - Hybrid Database Engine (PostgreSQL 16 + Embedded SQLite)          │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
┌────────────────────────────────┐           ┌────────────────────────────────┐
│      PostgreSQL 16 (:5433)     │           │         Redis 7 (:6379)        │
│  - Spatial Geometry Indexes    │           │  - In-Memory Geospatial Cache  │
│  - Relational Integrity        │           │  - Real-Time Pub/Sub Gateway   │
│  - RLS Security Policies       │           │  - Ephemeral Session States    │
└────────────────────────────────┘           └────────────────────────────────┘
```

---

## Key Modules & Capabilities

### 1. NaviDrop: Location-Anchored Encrypted Drops
NaviDrop allows users to anchor digital media (text, images, audio, secret archives) to specific physical coordinates. 
- **Client-Side Cryptography**: Files are encrypted in the client browser with `AES-256-GCM`.
- **Spatial Key Derivation**: Decryption keys are derived on-site using PBKDF2 over geofence proximity verifications combined with high-entropy client salts.
- **Zero-Knowledge Storage**: The backend server and database store ciphertext solely as encrypted blobs. The host system never possesses knowledge of the content or the keys.

<p align="center">
  <img src="assets/geodrop-flow.svg" alt="GeoDrop Flow" width="700" />
</p>

### 2. NaviBump & Real-Time Social Map
- **Dynamic Proximity Pairing**: Devices in close physical range can initiate a secure handshake to exchange peer credentials.
- **WebSocket Event Propagation**: Location updates and pings are propagated with millisecond latency via Redis Pub/Sub and Fastify WebSockets.
- **Interactive Map Controls**: Full-featured Leaflet cartography supporting OpenStreetMap and Esri satellite overlays with zero external proprietary map API keys.

### 3. NaviZKP: Zero-Knowledge Proximity Verification
- Implements Groth16 zk-SNARK circuits written in Circom.
- Allows a prover (prover's coordinates $x_1, y_1$) to convince a verifier (target landmark $x_0, y_0$ and radius $R$) that:
  $$(x_1 - x_0)^2 + (y_1 - y_0)^2 \le R^2$$
- The proof verification reveals **zero information** regarding the prover's actual coordinates.

<p align="center">
  <img src="assets/zkp-flow.svg" alt="ZKP Flow" width="700" />
</p>

### 4. Differential Privacy & Ghost Mode
- **Planar Laplace Noise**: For users requiring obfuscated presence, coordinates are fuzzed using local differential privacy noise before leaving the client device.
- **Spatial Grid Snapping**: Quantizes coordinates to discrete geometric cells to inhibit trajectory-reconstruction attacks.
- **Ghost Mode**: One-click total privacy mode providing immediate location cloaking with configurable auto-expiration timers.

### 5. Multi-Language Enterprise Architecture (i18n)
- Custom reactive, type-safe internationalization engine with zero third-party bundle weight.
- Dynamic runtime language switching between **English (`en`)**, **Turkish (`tr`)**, and **Russian (`ru`)**.
- Universal localization covering all authentication forms, map controls, modal dialogues, drop creators, and system notifications.
- Automatic persistence in browser `localStorage` and HTML `lang` attributes.

---

## Technical Specifications

| Tier | Component | Technology / Library | Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend** | Single Page Application | React 19, TypeScript 5.6, Vite 6 | High-performance rendering, concurrent mode, rapid compilation |
| **Styling** | UI Framework | Tailwind CSS 4, Lucide React | Modern utility-first CSS engine, compact bundle size |
| **Cartography** | Mapping & Geolocation | Leaflet 1.9, React-Leaflet | Open-source, vendor-neutral map engine, tile layer flexibility |
| **Backend** | API Gateway & WebSocket | Node.js 22 LTS, Fastify 5.x | Low overhead, high-throughput I/O, native JSON serialization |
| **Database** | Relational & Geospatial | PostgreSQL 16 (with SQLite Fallback) | ACID compliance, spatial indexing, resilient multi-engine strategy |
| **Cache / Broker** | Real-Time Pub/Sub | Redis 7 Alpine | Sub-millisecond latency for location fan-out and spatial indexing |
| **Cryptography** | Client-Side Security | Web Crypto API, snarkjs, circomlibjs | Native browser performance for AES-GCM, PBKDF2, and Groth16 proofs |
| **Deployment** | Containerization | Docker, Docker Compose, Nginx Alpine | Immutable, self-contained microservices requiring ~100 MB RAM |

---

## Monorepo Directory Structure

```
navisecret/
├── apps/
│   ├── web/                          # Production Web Application (SPA)
│   │   ├── src/
│   │   │   ├── components/           # UI Components (Modals, Map, Controls, LanguageSwitcher)
│   │   │   ├── hooks/                # React Hooks (useAuth, useLocation, useLanguage)
│   │   │   ├── i18n/                 # Localization Engine (en, tr, ru dictionaries & store)
│   │   │   └── types/                # Frontend TypeScript Interfaces
│   │   └── vite.config.ts            # Vite Build Configuration
│   │
│   └── server/                       # Production Backend API (Fastify)
│       ├── src/
│       │   ├── database/             # PostgreSQL / SQLite Hybrid Adapter & Schema
│       │   ├── routes/               # Modular REST Routes (auth, drops, friends, location)
│       │   ├── websocket/            # Real-Time WebSocket Gateway
│       │   └── index.ts              # Server Entrypoint
│       └── Dockerfile                # Production Node.js 22 Alpine Dockerfile
│
├── packages/
│   ├── sdk/                          # @navisecret/sdk — Client Location Sharing Core
│   └── geo-drop/                     # @navisecret/geo-drop — Cryptographic Drop Engine
│       ├── circuits/                 # Circom zk-SNARK Proximity Circuits
│       └── contracts/                # Optional EVM On-Chain Registry (Solidity)
│
├── docker/
│   ├── nginx/
│   │   └── default.conf              # Nginx Reverse Proxy & Header Hardening
│   └── init-db/
│       └── 01-schema.sql             # PostgreSQL Container Bootstrap Schema
│
├── docs/                             # Engineering Architecture & Deployment Guides
├── assets/                           # Vector Visualizations, Schematics, and Logos
├── compose.yaml                      # Multi-Service Docker Compose Orchestration
├── Dockerfile                        # Nginx Frontend Container Definition
└── package.json                      # pnpm Workspace Configuration
```

---

## Production Deployment with Docker

NaviSecret is packaged as a turn-key Docker Compose deployment. The entire stack launches four isolated containers connected via a private bridge network.

### Prerequisites

- **Docker Engine**: Version 24.0 or higher
- **Docker Compose**: Version 2.20 or higher
- Open inbound ports: `3000` (Web UI) and `8000` (API Gateway)

### Deployment Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ersinsandal/NaviSecret.git
   cd NaviSecret
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to configure your `JWT_SECRET`, database passwords, and external domain names.*

3. **Launch the production container stack:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify container status and health:**
   ```bash
   docker compose ps
   ```

   Expected output:
   ```
   NAME                  IMAGE                   STATUS                    PORTS
   navisecret_api        navisecret-api:latest   Up (healthy)              0.0.0.0:8000->8000/tcp
   navisecret_postgres   postgres:16-alpine      Up (healthy)              0.0.0.0:5433->5432/tcp
   navisecret_redis      redis:7-alpine          Up (healthy)              0.0.0.0:6379->6379/tcp
   navisecret_web        navisecret-web:latest   Up (healthy)              0.0.0.0:3000->80/tcp
   ```

5. **Access the application:**
   - Web Frontend: `http://localhost:3000`
   - API Health Endpoint: `http://localhost:8000/health`
   - Real-Time WebSocket Gateway: `ws://localhost:8000/ws`

---

## Local Development Workflow

For active development within the TypeScript monorepo:

### Prerequisites

- **Node.js**: `22.x LTS`
- **pnpm**: `10.x` or higher

### Step-by-Step Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Build internal workspace packages:**
   ```bash
   pnpm build
   ```

3. **Start the Fastify Backend Server:**
   ```bash
   pnpm dev:server
   ```
   *The server will start on `http://localhost:8000` with hot-reload enabled via `tsx`.*

4. **Start the Vite Web Application:**
   ```bash
   pnpm dev:web
   ```
   *The client interface will start on `http://localhost:5173`.*

5. **Execute test verification suite:**
   ```bash
   pnpm test
   ```

---

## REST & WebSocket API Reference

### Authentication Endpoints

| Method | Endpoint | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Create a new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT bearer token |
| `GET` | `/api/auth/me` | Bearer Token | Retrieve authenticated user profile |
| `POST` | `/api/auth/avatar` | Bearer Token | Upload profile avatar (multipart image) |

### Location & Social Endpoints

| Method | Endpoint | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/location/update` | Bearer Token | Push updated coordinates (with privacy noise) |
| `GET` | `/api/location/friends` | Bearer Token | Retrieve currently visible friend coordinates |
| `POST` | `/api/friends/request` | Bearer Token | Send friend invitation by username or code |
| `POST` | `/api/friends/accept` | Bearer Token | Accept incoming friend request |
| `POST` | `/api/friends/block` | Bearer Token | Block user from location tracking |

### Encrypted GeoDrop Endpoints

| Method | Endpoint | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/drops` | Bearer Token | Publish encrypted drop ciphertext with geofence |
| `GET` | `/api/drops/nearby` | Bearer Token | Query encrypted drop headers within bounding box |
| `POST` | `/api/drops/:id/unlock` | Bearer Token | Submit proximity proof / key to unlock drop payload |

### Real-Time WebSocket Protocol

Connect to `ws://localhost:8000/ws` with authorization header or token query parameter:

```json
// Client location update message
{
  "type": "LOCATION_UPDATE",
  "payload": {
    "latitude": 41.0082,
    "longitude": 28.9784,
    "accuracy": 12.5,
    "timestamp": 1792261400000
  }
}

// Server broadcast to authorized peers
{
  "event": "PEER_LOCATION",
  "data": {
    "userId": "usr_99f2a4",
    "displayName": "Alex",
    "latitude": 41.0081,
    "longitude": 28.9780,
    "status": "online"
  }
}
```

---

## Cryptographic & Mathematical Models

### 1. Spatial Key Derivation
Keys for decrypting physical drop payloads are derived without server interaction:

$$K = \text{PBKDF2}(\text{PRF}=\text{HMAC-SHA256},\ S=\text{Geohash}_8(\text{lat}, \text{lon}) \parallel \text{Salt}_{\text{drop}},\ c=100\,000,\ \text{len}=256)$$

The derived key $K$ decrypts the payload using authenticated `AES-256-GCM`:

$$P = \text{AES-GCM-Decrypt}(K,\ IV,\ C,\ T)$$

Where $C$ is the ciphertext, $IV$ is the initialization vector, and $T$ is the 128-bit authentication tag.

### 2. Differential Privacy Perturbation
When obfuscation mode is activated, precise coordinates are perturbed using a two-dimensional Planar Laplace distribution:

$$f(r, \theta) = \frac{\epsilon^2}{2\pi} e^{-\epsilon r}$$

Where $\epsilon$ is the privacy budget. Coordinates are transformed from polar displacement $(r, \theta)$ back to WGS-84 coordinates before network transmission.

---

## Security & Privacy Considerations

- **Zero-Knowledge Architecture**: The server infrastructure is treated as an untrusted intermediary for sensitive drop payloads. Plaintext secrets are never transmitted.
- **Independent Infrastructure**: No vendor lock-in or telemetry data transmitted to external BaaS providers (Supabase, Firebase, or Google Maps).
- **Transport Layer Security**: All container communication is encapsulated within an internal Docker bridge network; the Nginx gateway terminates SSL/TLS with modern cipher suites.
- **Strict Content Security Policy**: Embedded in all HTML distributions preventing cross-site scripting (XSS) and unauthorized data egress.

---

## Contributing

We welcome contributions from security researchers, cryptography practitioners, and developers.

1. Fork the repository on GitHub.
2. Create a feature branch: `git checkout -b feature/crypto-enhancement`.
3. Commit your changes: `git commit -m 'feat: implement spatial proof optimization'`.
4. Ensure all test suites pass: `pnpm test`.
5. Push to your branch: `git push origin feature/crypto-enhancement`.
6. Submit a Pull Request.

Please review our [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for detailed guidelines.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2026 Ersin Sandal (SliferSoft)
```
