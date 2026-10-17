<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg" />
    <img src="assets/logo-dark.svg" alt="NaviSecret Logo" width="340" />
  </picture>
</p>

<p align="center">
  <strong>Privacy-First Real-Time Location Sharing & Geo-Anchored Secret Capsule Platform</strong>
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
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20TR%20%7C%20RU-brightgreen.svg?style=flat-square" alt="Multi-Language">
</p>

---

## Overview

**NaviSecret** is an open-source, sovereign, privacy-first spatial social platform. It combines real-time location sharing with friends, proximity-based physical encounters, and location-anchored encrypted digital capsules that can only be unlocked when arriving at real-world coordinates.

Unlike conventional tracking applications that continuously monetize and centralize user coordinate histories, NaviSecret puts privacy and self-hosting first:
- **Zero Third-Party Cloud Dependencies**: The platform is 100% self-hosted and independent. It requires no external Backend-as-a-Service (BaaS) platforms or proprietary map API keys.
- **Granular Privacy & Ghost Mode**: Users maintain granular control over their location visibility, choosing between Precise coordinates, Obfuscated/Fuzzy presence, or immediate Ghost Mode with countdown timers.
- **Location-Bound Capsules**: Users can leave encrypted messages, photos, and digital secrets pinned to specific physical locations. These capsules only unlock when authorized peers physically enter the geofenced perimeter.
- **Ultra-Lightweight Resource Footprint**: The entire production stack runs in four containerized microservices via Docker Compose, consuming only approximately 100 MB of total RAM.

---

## Core Capabilities

### 1. Real-Time Social Map & Radar
- Live coordinate synchronization across peers with sub-second latency powered by native WebSockets and Redis Pub/Sub.
- High-performance Leaflet cartography with seamless toggling between detailed OpenStreetMap street views and satellite imagery without tracking scripts.
- Visual proximity radar indicating distance and heading towards friends and nearby capsules.

### 2. Geo-Anchored Secret Capsules (NaviDrop)
- Anchor digital content (messages, media, clues) to specific coordinates with a configurable unlock radius (e.g., 25m, 50m, 100m).
- Content remains encrypted on the server; clients can only request and unlock the payload when physical proximity is verified.
- Time-delayed capsules allowing creators to schedule expiration dates or delayed reveals.

### 3. NaviBump (Proximity Pairing)
- Physical proximity detection alerting users when mutual friends cross paths in the real world.
- One-tap instant peer handshake to exchange contacts and start real-time communication.

### 4. Privacy Shield & Ghost Mode
- **Precise Mode**: Shares exact GPS coordinates with designated friends or groups.
- **Fuzzy / Blurred Mode**: Perturbs coordinates with random noise to communicate general vicinity without disclosing exact addresses.
- **Ghost Mode**: One-tap complete cloaking that instantly conceals the user from the map, featuring auto-revert countdown timers (e.g., 1 hour, 8 hours, indefinite).

### 5. In-App Chat & Live Reactions
- End-to-end direct messaging between friends and custom group chats.
- Real-time emoji reactions and interactive map pokes sent directly to friend avatars.

### 6. Exploration & Footprints (Visited Territory)
- Records personal exploration history and travel trails without persistent server-side trail exposure.
- Gamified area coverage displaying discovered neighborhoods and places.

### 7. Native Multi-Language System (i18n)
- Built-in zero-dependency translation engine supporting **English (`en`)**, **Turkish (`tr`)**, and **Russian (`ru`)**.
- Dynamic, instantaneous UI language switching across all navigation bars, modals, settings, and notifications without page reloads.

---

## System Architecture

NaviSecret is built on a modern, decoupled microservices architecture designed for resilience, security, and low latency:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Web Application                            │
│           (React 19, TypeScript, Tailwind CSS 4, Leaflet Cartography)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket (Port 3000)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Nginx Web Server Container                          │
│         - Production Single Page Application (SPA) Serving                  │
│         - Reverse Proxy for /api/* and /ws (WebSocket Upgrades)             │
│         - Hardened Security Headers (CSP, HSTS, X-Frame-Options)            │
│         - Dual-Stack IPv4 and IPv6 Support                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Upstream Reverse Proxy
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NaviSecret API Engine (Port 8000)                       │
│         - Node.js 22 LTS + Fastify 5.x Asynchronous Framework               │
│         - Native Real-Time WebSocket Server (/ws)                           │
│         - JWT Authentication & Bcrypt Password Hashing                      │
│         - Hybrid Database Engine (PostgreSQL 16 + SQLite Fallback)          │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
┌────────────────────────────────┐           ┌────────────────────────────────┐
│      PostgreSQL 16 (:5433)     │           │         Redis 7 (:6379)        │
│  - Spatial Coordinate Indexes  │           │  - In-Memory Geospatial Cache  │
│  - Relational Data Integrity   │           │  - High-Throughput Pub/Sub     │
│  - Users, Capsules, Friends    │           │  - Ephemeral Presence States   │
└────────────────────────────────┘           └────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 19.x | Modern UI rendering and concurrent state management |
| **Language** | TypeScript | 5.6.x | Strict end-to-end type safety across client and server |
| **Bundler & Tooling** | Vite | 6.x | Instant hot module replacement and optimized production builds |
| **Styling** | Tailwind CSS | 4.x | Compact, utility-first responsive interface styling |
| **Cartography** | Leaflet / React-Leaflet | 1.9.x | Open, vendor-neutral map engine (OpenStreetMap / Esri) |
| **Icons** | Lucide React | Latest | Clean, scalable vector iconography |
| **Backend Server** | Fastify (Node.js) | 5.x / 22 LTS | High-throughput asynchronous REST API and WebSocket gateway |
| **Primary Database** | PostgreSQL | 16 Alpine | Relational storage, spatial queries, and data integrity |
| **Fallback Database** | SQLite (better-sqlite3) | 3.x | Embedded local database fallback for lightweight deployments |
| **Cache & Message Broker** | Redis | 7 Alpine | Geospatial caching, presence tracking, and Pub/Sub events |
| **Reverse Proxy** | Nginx | Alpine | Static asset delivery, TLS termination, and reverse proxying |
| **Containerization** | Docker & Docker Compose | Latest | Reproducible, 4-container production deployment |

---

## Project Structure

```
NaviSecret/
├── apps/
│   ├── web/                          # Frontend Application (React 19 + Vite)
│   │   ├── src/
│   │   │   ├── components/           # UI Components (Map, Radar, Modals, Chat, Dock)
│   │   │   ├── hooks/                # Custom React Hooks (useAuth, useLocation, useLanguage)
│   │   │   ├── i18n/                 # Localization Engine (en, tr, ru dictionaries & store)
│   │   │   └── types/                # Frontend Data Models & Interfaces
│   │   └── vite.config.ts            # Vite Build & Proxy Configuration
│   │
│   └── server/                       # Backend Application (Fastify + Node.js 22)
│       ├── src/
│       │   ├── database/             # PostgreSQL & SQLite Hybrid Database Connector
│       │   ├── modules/              # Modular Domain Routes:
│       │   │   ├── auth/             # User Registration, Login, Token Management
│       │   │   ├── capsules/         # Secret Geo-Capsule Creation & Unlock Logic
│       │   │   ├── chat/             # Direct & Group Messaging Endpoints
│       │   │   ├── footprints/       # Trail Recording & Visited Exploration
│       │   │   ├── groups/           # Social Circles & Group Management
│       │   │   ├── places/           # Saved Favorite Locations
│       │   │   ├── presence/         # Real-Time Location Pulses & Ghost Mode
│       │   │   ├── reactions/        # Emoji Reactions & Pings
│       │   │   └── social/           # Friendship Requests, Accept, Block Lists
│       │   ├── realtime/             # Native WebSocket Server & Event Handler
│       │   ├── redis/                # Redis Pub/Sub & Geospatial Cache Connector
│       │   └── index.ts              # Server Entrypoint
│       └── Dockerfile                # Production Server Containerfile
│
├── docker/
│   ├── nginx/
│   │   └── default.conf              # Nginx Reverse Proxy & Header Configuration
│   └── init-db/
│       └── 01-schema.sql             # PostgreSQL Database Schema Bootstrap
│
├── assets/                           # Vector Logos, Icons, and Architecture Diagrams
├── compose.yaml                      # Complete Docker Compose Stack Definition
├── Dockerfile                        # Production Web Frontend Containerfile
└── package.json                      # Monorepo Workspace Configuration
```

---

## Production Deployment with Docker

NaviSecret is ready to run out of the box with Docker Compose.

### Prerequisites

- **Docker Engine** (v24.0 or higher)
- **Docker Compose** (v2.20 or higher)
- Available ports: `3000` (Web UI) and `8000` (API Gateway)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ersinsandal/NaviSecret.git
   cd NaviSecret
   ```

2. **Prepare environment configuration:**
   ```bash
   cp .env.example .env
   ```
   *Verify or adjust your `JWT_SECRET`, database credentials, and external ports.*

3. **Start the complete stack:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify container health:**
   ```bash
   docker compose ps
   ```

   All four services should report **Up (healthy)**:
   ```
   NAME                  IMAGE                   STATUS                    PORTS
   navisecret_api        navisecret-api:latest   Up (healthy)              0.0.0.0:8000->8000/tcp
   navisecret_postgres   postgres:16-alpine      Up (healthy)              0.0.0.0:5433->5432/tcp
   navisecret_redis      redis:7-alpine          Up (healthy)              0.0.0.0:6379->6379/tcp
   navisecret_web        navisecret-web:latest   Up (healthy)              0.0.0.0:3000->80/tcp
   ```

5. **Open the application:**
   - Web Application: `http://localhost:3000`
   - API Health Check: `http://localhost:8000/health`
   - WebSocket Server: `ws://localhost:8000/ws`

---

## Local Development Setup

For running and modifying the code directly on your local machine:

### Prerequisites

- **Node.js**: `22.x LTS`
- **pnpm**: `10.x` or higher

### Steps

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start the backend server:**
   ```bash
   pnpm dev:server
   ```
   *Runs Fastify on `http://localhost:8000` with hot-reload enabled.*

3. **Start the frontend application:**
   ```bash
   pnpm dev:web
   ```
   *Runs Vite on `http://localhost:5173`.*

4. **Build production bundles:**
   ```bash
   pnpm build:server
   pnpm build:web
   ```

---

## REST API Reference

All protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user with username and password |
| `POST` | `/api/auth/login` | Authenticate user and obtain a JWT bearer token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/avatar` | Upload and update user avatar image |

### Presence & Location (`/api/presence`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/presence/pulse` | Send location heartbeat (latitude, longitude, accuracy) |
| `GET` | `/api/presence/friends` | Get real-time coordinates of visible friends |
| `POST` | `/api/presence/ghost` | Toggle Ghost Mode on or off with expiration timer |

### Secret Capsules (`/api/capsules`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/capsules` | Create a new location-anchored secret capsule |
| `GET` | `/api/capsules/nearby` | Retrieve capsules within the user's visible vicinity |
| `POST` | `/api/capsules/:id/unlock` | Verify proximity and unlock capsule contents |

### Social & Friends (`/api/social`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/social/friends` | List accepted friends |
| `POST` | `/api/social/request` | Send a friend request by username or tag |
| `POST` | `/api/social/accept` | Accept an incoming friend request |
| `POST` | `/api/social/block` | Block a user from viewing location |

### Chat & Messaging (`/api/chat`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/chat/conversations` | List active conversations and recent messages |
| `GET` | `/api/chat/:userId/messages` | Retrieve message history with a friend |
| `POST` | `/api/chat/:userId/messages` | Send a direct message |

---

## Real-Time WebSocket Protocol

Clients connect to `ws://localhost:8000/ws` with token authentication.

```json
// Client -> Server: Location Update
{
  "type": "LOCATION_PULSE",
  "data": {
    "latitude": 41.0082,
    "longitude": 28.9784,
    "accuracy": 8.5
  }
}

// Server -> Client: Friend Moved
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

## Security & Privacy Guidelines

- **Bcrypt Password Security**: All user credentials are encrypted with salt rounds before database persistence.
- **Strict Network Isolation**: PostgreSQL and Redis containers do not expose public WAN ports in production; only Nginx and the Fastify API accept ingress traffic.
- **Geofence Enforcement**: Capsule content is withheld by the backend until the client coordinates genuinely fall within the designated unlock perimeter.
- **Zero Third-Party Tracking**: No telemetry, analytics pixels, or commercial tracking libraries are included in the frontend bundle.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2026 Ersin Sandal (SliferSoft)
```
