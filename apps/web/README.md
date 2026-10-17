# NaviSecret Web Client

The primary web frontend for NaviSecret — a privacy-preserving real-time location sharing and encrypted secret capsule platform with interactive map visualization, friend management, chat, and Pulse encounters.

## Tech Stack

- **Vite 7** + **React 19** + **TypeScript**
- **Tailwind CSS 4** with Material 3 design tokens
- **Leaflet** / **react-leaflet** for map rendering
- **NaviClient** for standalone Fastify REST & WebSocket multiplexing
- **ZeroProof ZKP** client verification engine

## Key Features

- **Interactive Map:** Real-time friend locations with Casper Mode privacy
- **Pulse ⚡:** Instant proximity encounters and mutual discovery
- **Capsule 🎁:** Location-bound encrypted data drops (AES-256-GCM + PBKDF2)
- **Footprint 👣:** Movement trail visualization
- **World Unveil 🌍:** Fog-of-war area exploration grid
- **Casper Mode 👻:** Cute ghost privacy mode for silent browsing
- **Real-time Social:** Friend requests, messaging, and location reactions

## Development

```bash
# From monorepo root
pnpm dev:web

# Or from this directory
pnpm dev
```

## Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```
