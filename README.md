<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg" />
    <img src="assets/logo-dark.svg" alt="NaviSecret Logo" width="360" />
  </picture>
</p>

<p align="center">
  <strong>Every place holds a secret.</strong><br />
  <em>Privacy-first spatial social network, encrypted location capsules, real-time proximity discovery, and zero-knowledge location proofs.</em>
</p>

<p align="center">
  <a href="README.tr.md">
    <img src="https://img.shields.io/badge/DOKÜMANTASYON-TÜRKÇE%20İÇİN%20TIKLAYIN-0052cc?style=for-the-badge&logo=readme&logoColor=white" alt="Türkçe Dokümantasyon" />
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
  <img src="https://img.shields.io/badge/ZKP-Groth16-F58025.svg?style=flat-square" alt="Groth16 ZKP">
  <img src="https://img.shields.io/badge/Encryption-AES--256--GCM-9cf.svg?style=flat-square" alt="AES-256-GCM">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20TR%20%7C%20RU-brightgreen.svg?style=flat-square" alt="Multi-Language">
</p>

---

## The Vision: "Every Place Holds a Secret"

In a hyper-connected world, personal privacy has been traded away for convenience. Commercial location apps continuously stream raw GPS coordinates to ad brokers and centralized surveillance databases, treating human movement as a monetization metric.

**NaviSecret restores the enchantment and sovereignty of physical space.**

Imagine walking past an ordinary street bench, an ancient city fountain, or a secluded cliffside, knowing that right at those exact coordinates sits an invisible, encrypted digital capsule — a heartfelt letter, a memory left by a traveler, an audio recording from years ago, or a secret treasure hunt clue. You cannot open it from a couch thousands of miles away. The server itself cannot open it. **You must physically stand there to unlock its secret.**

NaviSecret transforms the physical globe into an encrypted living canvas of human connections, spontaneous encounters, and digital artifacts:
- **Anchor Memories & Secrets to Real-World Coordinates**: Leave encrypted letters, photos, or voice notes that only unlock when designated recipients or curious explorers stand within a 20-meter geofenced perimeter.
- **Serendipitous Proximity Encounters (NaviBump)**: Discover when friends cross your path in the physical world and initiate a secure peer handshake.
- **Zero-Knowledge Mathematical Privacy (NaviZKP)**: Prove you were at a landmark, event, or checkpoint without ever revealing your actual coordinate trajectory $(\text{lat}, \text{lon})$ to the server or public ledger.
- **Sovereign, Self-Hosted Freedom**: Zero reliance on proprietary cloud BaaS. Runs independently on your own hardware in a lean, ~100 MB RAM containerized stack.

---

## What Can Users Do in NaviSecret?

### 1. Leave Geo-Anchored Secret Capsules (NaviDrop)
- **Time & Memory Capsules**: Lock a message at the spot where you first met your partner, set to unlock only on your anniversary when returning to that exact bench.
- **Urban Scavenger Hunts**: Craft multi-stage city adventures where each clue unlocks the coordinates to the next physical landmark.
- **Digital Dead-Drops**: Share sensitive files or private notes with peers that exist purely in physical space, immune to remote interception.
- **Cryptographic Spatial Gating**: Payloads are encrypted client-side with `AES-256-GCM`. The decryption key is derived on-site using PBKDF2 over geofence proximity verification. The host server holds only ciphertext and never sees plain content.

<p align="center">
  <img src="assets/geodrop-flow.svg" alt="GeoDrop Architecture Flow" width="720" />
</p>

### 2. Discover Peers Nearby with NaviBump & Radar
- **Spatial Radar**: Visual compass and proximity radar displaying real-time distance and direction to nearby friends and discovered capsules.
- **NaviBump Physical Pairing**: When two users carrying NaviSecret are physically near each other, the app detects proximity and allows an instant one-tap contact exchange and secure chat session.
- **Nearby Messaging**: Safely communicate with peers in your immediate vicinity without giving away your exact domestic address.

### 3. Mathematical Anonymity with Zero-Knowledge Proofs (NaviZKP)
- Built on Groth16 zk-SNARK circuits written in Circom.
- Allows a user to generate a succinct cryptographic proof attesting:
  $$\text{"I am currently within radius } R \text{ of landmark } (x_0, y_0)\text{"}$$
- The verification verifies the proximity claim with 100% mathematical certainty while leaking **zero information** about the user's actual coordinates $(x_1, y_1)$.

<p align="center">
  <img src="assets/zkp-flow.svg" alt="Zero Knowledge Proof Proximity Verification" width="720" />
</p>

### 4. Dynamic Privacy Shield & Ghost Mode
- **Precise Mode**: Shares exact GPS coordinates with trusted close friends or family.
- **Fuzzy / Obfuscated Mode**: Applies **Local Differential Privacy (Planar Laplace Noise)** to coordinates before transmission, communicating the general neighborhood while mathematically preventing exact address deduction.
- **Ghost Mode**: One-tap complete cloaking that instantly removes the user from the map, featuring auto-expiring timers (e.g., 30 minutes, 2 hours, 8 hours, indefinite).

### 5. In-App Real-Time Chat & Live Map Reactions
- Direct 1-on-1 messaging and custom group chat channels with unread badge indicators.
- Interactive map reactions: Send live emoji pings and visual pokes directly onto friend markers on the map.

### 6. Exploration & Footprints (Fog-of-War Discovery)
- Gamified personal exploration: The map begins shrouded in fog-of-war and gradually reveals visited districts, streets, and territories as you explore the world.
- Private breadcrumb trail recording with local distance-sampling that does not expose historical paths to the server.

### 7. Native Multi-Language System (i18n)
- Seamless, zero-dependency runtime translation engine.
- Instant switching between **English (`en`)**, **Turkish (`tr`)**, and **Russian (`ru`)** across the entire UI with persistent preferences.

---

## System Architecture

NaviSecret operates on an asynchronous, decoupled microservices stack designed for high throughput, cryptographic integrity, and minimal resource usage:

<p align="center">
  <img src="assets/system-overview.svg" alt="NaviSecret System Architecture Overview" width="920" />
</p>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Client Web Application                             │
│       (React 19, TypeScript, Tailwind CSS 4, Leaflet, Web Crypto API)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket (Reverse Proxy :3000)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Nginx Web Server Container                          │
│         - Production Single Page Application (SPA) Delivery                 │
│         - Upstream Reverse Proxy for /api/* and /ws (WebSocket upgrades)    │
│         - Hardened Security Headers (CSP, HSTS, X-Frame-Options)            │
│         - Dual-Stack IPv4 and IPv6 Support                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Internal Bridge Network
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NaviSecret API Engine (:8000)                           │
│         - Node.js 22 LTS + Fastify 5.x Asynchronous Framework               │
│         - High-Throughput Real-Time WebSocket Server (/ws)                  │
│         - JWT Authentication & Bcrypt Password Security                     │
│         - Hybrid Database Engine (PostgreSQL 16 + Embedded SQLite)          │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
┌────────────────────────────────┐           ┌────────────────────────────────┐
│      PostgreSQL 16 (:5433)     │           │         Redis 7 (:6379)        │
│  - Spatial Geometry Indexes    │           │  - In-Memory Geospatial Cache  │
│  - Relational Data Integrity   │           │  - High-Throughput Pub/Sub     │
│  - Users, Capsules, Footprints │           │  - Ephemeral Presence States   │
└────────────────────────────────┘           └────────────────────────────────┘
```

---

## Technical Specifications

| Tier | Component | Technology | Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend** | Single Page Application | React 19, TypeScript 5.6, Vite 6 | Concurrent rendering, type safety, instant hot reload |
| **UI & Styling** | Visual Design System | Tailwind CSS 4, Lucide React | Modern utility-first CSS, responsive cyberpunk/futuristic aesthetic |
| **Cartography** | Map & Tile Layers | Leaflet 1.9, React-Leaflet | Vendor-neutral, open-source cartography (OpenStreetMap + Esri satellite) |
| **Backend API** | High-Throughput Gateway | Node.js 22 LTS, Fastify 5.x | Ultra-low overhead, rapid JSON serialization, native WebSocket support |
| **Database** | Relational & Spatial | PostgreSQL 16 Alpine | ACID compliance, spatial coordinate querying, SQLite auto-fallback |
| **Cache & Broker**| Presence & Pub/Sub | Redis 7 Alpine | Sub-millisecond coordinate broadcast and ephemeral state cache |
| **Zero-Knowledge**| Proximity Verification | Circom, snarkjs, Groth16 | Provable physical proximity without coordinate leakage |
| **Encryption** | Client-Side Cryptography| Web Crypto API, AES-256-GCM, PBKDF2 | Native in-browser authenticated encryption and key derivation |
| **Deployment** | Containerization | Docker, Docker Compose, Nginx Alpine | Lean ~100 MB RAM multi-service deployment with health monitoring |

---

## Cryptographic & Mathematical Models

### 1. Spatial Key Derivation for Geo-Capsules
When a user anchors an encrypted capsule at coordinate $(\text{lat}, \text{lon})$, decryption keys are not stored on the server. Instead, keys are derived client-side:

$$K = \text{PBKDF2}\Big(\text{PRF}=\text{HMAC-SHA256},\ S=\text{Geohash}_8(\text{lat}, \text{lon}) \parallel \text{Salt}_{\text{capsule}},\ c=100\,000,\ \text{len}=256\Big)$$

The payload is encrypted using authenticated `AES-256-GCM`:

$$C, T = \text{AES-GCM-Encrypt}(K, IV, P)$$

The host server stores only the ciphertext $C$ and tag $T$. To decrypt $P$, a recipient must physically reach the geofence perimeter to construct the matching coordinate input.

### 2. Zero-Knowledge Proximity Proofs (zk-SNARKs)
Using Circom circuits verified via Groth16, the prover demonstrates knowledge of private coordinates $(x_1, y_1)$ such that the Euclidean distance to public landmark $(x_0, y_0)$ satisfies:

$$(x_1 - x_0)^2 + (y_1 - y_0)^2 \le R^2$$

The proof $\pi = (A \in \mathbb{G}_1, B \in \mathbb{G}_2, C \in \mathbb{G}_1)$ is verified in under 5 milliseconds with zero coordinate disclosure.

### 3. Local Differential Privacy (Planar Laplace Perturbation)
When Fuzzy / Blurred Mode is enabled, coordinates are perturbed locally via polar coordinates $(r, \theta)$:

$$f(r, \theta) = \frac{\epsilon^2}{2\pi} e^{-\epsilon r}$$

Where $\epsilon$ represents the privacy budget parameter, effectively masking precise building addresses into generalized district zones.

---

## Project Structure

```
NaviSecret/
├── apps/
│   ├── web/                          # Production Frontend (React 19 + Vite)
│   │   ├── src/
│   │   │   ├── components/           # UI Components (Map, Radar, Modals, Chat, Dock)
│   │   │   │   ├── auth/             # Login & Registration Form
│   │   │   │   ├── bumps/            # NaviBump Proximity Detection Panel
│   │   │   │   ├── capsules/         # Secret Capsule Creation & Unlock Dialogues
│   │   │   │   ├── chat/             # Direct & Group Real-Time Chat
│   │   │   │   ├── map/              # Leaflet Map, Radar, Trails, Exploration
│   │   │   │   └── common/           # Multi-Language Selector & Dynamic Icons
│   │   │   ├── hooks/                # React Hooks (useAuth, useLocation, useLanguage)
│   │   │   ├── i18n/                 # Localization Engine (en, tr, ru dictionaries & store)
│   │   │   └── types/                # Domain Types & Interfaces
│   │   └── vite.config.ts            # Vite Configuration
│   │
│   └── server/                       # Production Backend API (Fastify + Node.js 22)
│       ├── src/
│       │   ├── database/             # PostgreSQL / SQLite Hybrid Connector & Schema
│       │   ├── modules/              # Domain Modules (auth, capsules, chat, presence, social)
│       │   ├── realtime/             # Native WebSocket Real-Time Server
│       │   ├── redis/                # Redis Pub/Sub & Geospatial Cache Connector
│       │   └── index.ts              # Fastify Server Entrypoint
│       └── Dockerfile                # Production Server Containerfile
│
├── packages/
│   ├── sdk/                          # @navisecret/sdk — Core Location Sharing Client
│   └── geo-drop/                     # @navisecret/geo-drop — Cryptographic Drop Engine
│       └── circuits/                 # Circom zk-SNARK Proximity Circuits
│
├── docker/
│   ├── nginx/
│   │   └── default.conf              # Nginx Reverse Proxy & Header Hardening
│   └── init-db/
│       └── 01-schema.sql             # PostgreSQL Container Bootstrap Script
│
├── assets/                           # Vector Schematics, Visual Flows, and Logos
├── compose.yaml                      # 4-Service Docker Compose Production Stack
├── Dockerfile                        # Nginx Web Frontend Containerfile
└── package.json                      # Monorepo Workspace Configuration
```

---

## Quick Start & Deployment

### Production Deployment via Docker Compose (Recommended)

NaviSecret launches as a fully self-contained 4-container stack requiring zero external database or BaaS accounts:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ersinsandal/NaviSecret.git
   cd NaviSecret
   ```

2. **Configure environment settings:**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to customize your `JWT_SECRET`, database credentials, and domain bindings.*

3. **Spin up the stack:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify container health:**
   ```bash
   docker compose ps
   ```

   All 4 containers will report **Up (healthy)**:
   ```
   NAME                  IMAGE                   STATUS                    PORTS
   navisecret_api        navisecret-api:latest   Up (healthy)              0.0.0.0:8000->8000/tcp
   navisecret_postgres   postgres:16-alpine      Up (healthy)              0.0.0.0:5433->5432/tcp
   navisecret_redis      redis:7-alpine          Up (healthy)              0.0.0.0:6379->6379/tcp
   navisecret_web        navisecret-web:latest   Up (healthy)              0.0.0.0:3000->80/tcp
   ```

5. **Access NaviSecret:**
   - Web Application: `http://localhost:3000`
   - API Health Check: `http://localhost:8000/health`
   - Real-Time WebSocket Server: `ws://localhost:8000/ws`

---

## Local Development Workflow

To work directly on the codebase:

### Prerequisites

- **Node.js**: `22.x LTS`
- **pnpm**: `10.x` or higher

### Steps

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Build internal workspace packages:**
   ```bash
   pnpm build
   ```

3. **Start the Fastify API Server:**
   ```bash
   pnpm dev:server
   ```
   *Runs on `http://localhost:8000` with hot reload enabled.*

4. **Start the Vite Web Application:**
   ```bash
   pnpm dev:web
   ```
   *Runs on `http://localhost:5173`.*

5. **Run test verification suite:**
   ```bash
   pnpm test
   ```

---

## REST & WebSocket API Reference

All protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication & Profiles (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new account with username and password |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT bearer token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/avatar` | Upload and update user avatar image |

### Location & Visibility (`/api/presence`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/presence/pulse` | Publish location heartbeat (lat, lon, accuracy) |
| `GET` | `/api/presence/friends` | Retrieve real-time coordinates of visible friends |
| `POST` | `/api/presence/ghost` | Toggle Ghost Mode on or off with expiration timer |

### Secret Capsules (`/api/capsules`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/capsules` | Create a location-anchored encrypted capsule |
| `GET` | `/api/capsules/nearby` | Retrieve capsule headers within current bounding box |
| `POST` | `/api/capsules/:id/unlock` | Verify proximity proof and unlock secret content |

### Social & Friendships (`/api/social`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/social/friends` | List accepted friends with online status |
| `POST` | `/api/social/request` | Send friend request by username or tag |
| `POST` | `/api/social/accept` | Accept incoming friend invitation |
| `POST` | `/api/social/block` | Block user from location tracking |

### Real-Time WebSocket Protocol (`ws://localhost:8000/ws`)

```json
// Client -> Server: Proximity location pulse
{
  "type": "LOCATION_PULSE",
  "data": {
    "latitude": 41.0082,
    "longitude": 28.9784,
    "accuracy": 8.5
  }
}

// Server -> Client: Friend location update
{
  "event": "FRIEND_LOCATION",
  "data": {
    "userId": "usr_7a8b9c",
    "username": "alex",
    "latitude": 41.0089,
    "longitude": 28.9790,
    "updatedAt": 1792261500000
  }
}
```

---

## Security & Privacy Highlights

- **Zero Corporate Surveillance**: Zero tracking pixels, telemetry probes, or commercial advertising SDKs.
- **Client-Side Content Isolation**: Capsule payloads are encrypted before leaving your browser; neither database administrators nor network sniffers can view secrets in plaintext.
- **Bcrypt Password Security**: Credentials hashed with modern salt cost factors.
- **Hardened Container Sandbox**: Isolated Docker bridge network, strict CSP headers, and unprivileged container users.

---

## License & Ownership

NaviSecret is open-source software licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2026 Ersin Sandal (SliferSoft)
```
