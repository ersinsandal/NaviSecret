# NaviSecret — Standalone Production Deployment Guide
**Author & Owner:** Ersin Sandal (SliferSoft)  
**Architecture:** Node.js 22 (Fastify) + Redis 7 + PostgreSQL 16 + Vite Web SPA  
**Target Environment:** Physical Dedicated Server, VPS (Ubuntu / Debian / AlmaLinux), or Cloud VM  

---

## 1. Prerequisites

- Docker Engine 24.0+ & Docker Compose v2.20+
- At least 2 GB RAM and 1 vCPU (Recommended: 4 GB RAM, 2 vCPUs)
- Open ports: `80`/`443` (for Web proxy) or internal `3000` (Web), `8000` (Fastify API)

---

## 2. Quick Start (Single Command)

1. Clone or copy the NaviSecret repository to your production server:
   ```bash
   cd /opt/navisecret
   ```

2. Generate secure production keys:
   ```bash
   node scripts/setup-env.mjs
   ```

3. Launch the complete 4-container production stack:
   ```bash
   docker compose up -d --build
   ```

4. Verify all services are healthy and running:
   ```bash
   docker compose ps
   ```

---

## 3. Production Architecture Overview

The NaviSecret production stack operates without any third-party Backend-as-a-Service (BaaS) dependencies:

| Service | Container Name | Image | Port (Host) | Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Web SPA** | `navisecret_web` | `nginx:alpine` | `3000` | Pre-built Vite SPA with WebSocket & REST reverse proxy |
| **API Server** | `navisecret_api` | `node:22-alpine` | `8000` | Fastify REST API, JWT auth, WebSocket multiplexing, uploads |
| **Geospatial Store**| `navisecret_redis` | `redis:7-alpine` | `6379` | In-memory presence, Casper Mode, `GEOADD`/`GEOSEARCH` |
| **Relational DB** | `navisecret_postgres` | `postgres:16-alpine` | `5433` | 10 clean relational tables (users, pulses, capsules, social) |

---

## 4. Reverse Proxy & SSL Setup (Nginx Host Example)

To expose NaviSecret to the internet with HTTPS:

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

---

## 5. Backups & Disaster Recovery

- **PostgreSQL Database:**
  ```bash
  docker exec -t navisecret_postgres pg_dump -U postgres postgres > backup_$(date +%F).sql
  ```
- **Redis State:**
  ```bash
  docker exec navisecret_redis redis-cli BGSAVE
  ```
- **Uploaded Media Files:**
  Backup the Docker named volume `navisecret_uploads`.
