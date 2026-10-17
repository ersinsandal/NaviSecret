# NaviSecret — Production Self-Hosted Deployment Guide

This guide details how to deploy and operate the full **NaviSecret** location sharing and encrypted GeoDrop platform using Docker Compose.

---

## 1. System Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| **CPU** | 2 cores (x86_64 or ARM64) | 4 cores |
| **RAM** | 2 GB | 4 GB+ |
| **Disk Storage** | 10 GB SSD | 30 GB+ SSD |
| **Operating System** | Linux (Ubuntu 22.04+, Debian 12+, RHEL 9+), macOS, or Windows with Docker Desktop | Ubuntu 24.04 LTS / Debian 12 |
| **Software** | Docker 20.10+ & Docker Compose v2.0+ (or v5+) | Docker Engine 26+ with Compose v2.27+ |

> [!IMPORTANT]
> **Browser Geolocation API Security Requirement:** Modern browsers (Chrome, Safari, Firefox, Edge) restrict the Geolocation API (`navigator.geolocation`) exclusively to **Secure Contexts** (`https://` or `http://localhost`). If deploying to a public domain, **HTTPS with a valid SSL/TLS certificate is mandatory**.

---

## 2. Quickstart Deployment (Single-Step Launch)

### Step 1: Clone and Navigate to the Repository

```bash
cd /opt/navisecret
```

### Step 2: Configure Environment Variables

```bash
# Copy template environment file
cp .env.example .env

# Generate cryptographically secure production keys
node scripts/generate-keys.mjs
```

Edit `.env` and replace the placeholder values with the generated production keys, your database password, and your public domain names:

```dotenv
SITE_URL=https://navisecret.yourdomain.com
API_EXTERNAL_URL=https://navisecret.yourdomain.com
WEB_PORT=3000
KONG_HTTP_PORT=8000
POSTGRES_PORT=5432
```

### Step 3: Launch Containers

```bash
# Build and start all services in detached mode
docker compose up -d --build

# Verify all containers are running and healthy
docker compose ps
```

Visit `http://localhost:3000` (or your domain) to access the NaviSecret web application.

---

## 3. Architecture & Service Breakdown

The self-hosted deployment runs 7 coordinated containers on an isolated Docker bridge network (`navisecret_network`):

```mermaid
flowchart TD
    Client["Browser / Mobile Client"] -->|Port 80 / 443| Nginx["Web (Nginx) :3000"]
    Nginx -->|SPA Static Assets| Frontend["React 19 Leaflet UI"]
    Nginx -->|/auth, /rest, /realtime, /storage| Kong["Kong API Gateway :8000"]
    
    Kong -->|/auth/v1| Auth["GoTrue Auth :9999"]
    Kong -->|/rest/v1| Rest["PostgREST :3000"]
    Kong -->|/realtime/v1 (WS)| Realtime["Supabase Realtime :4000"]
    Kong -->|/storage/v1| Storage["Storage API :5000"]
    
    Auth --> DB[("PostgreSQL 15 (PostGIS + RLS)")]
    Rest --> DB
    Realtime --> DB
    Storage --> DB
    Storage --> StorageVol[("navisecret_storage_data")]
    DB --> DBVol[("navisecret_db_data")]
```

| Service | Container Name | Base Image | Role | Port (Host / Internal) |
|---|---|---|---|---|
| **web** | `navisecret_web` | `node:22-alpine` &rarr; `nginx:alpine` | Serves optimized React 19 SPA, proxies API routes to Kong | `3000:80` |
| **kong** | `navisecret_kong` | `kong:2.8.1-alpine` | API Gateway routing requests to internal microservices | `8000:8000` |
| **auth** | `navisecret_auth` | `supabase/gotrue:v2.164.0` | JWT issuance, password hashing, session recovery | `9999` (internal) |
| **rest** | `navisecret_rest` | `postgrest/postgrest:v12.2.8` | Auto-generated REST API over PostgreSQL with RLS | `3000` (internal) |
| **realtime** | `navisecret_realtime` | `supabase/realtime:v2.34.47` | WebSocket engine for real-time location streaming & chat | `4000` (internal) |
| **storage** | `navisecret_storage` | `supabase/storage-api:v1.16.2` | Manages avatar uploads & encrypted attachments | `5000` (internal) |
| **db** | `navisecret_db` | `supabase/postgres:15.6.1.130` | PostgreSQL 15 database with PostGIS, RLS, & NaviSecret schema | `5432:5432` |

---

## 4. Persistent Volumes & Data Safety

All stateful data is preserved in Docker named volumes that survive container restarts, rebuilds, and updates:

1. **`navisecret_db_data`**: Stores PostgreSQL cluster data files, user accounts, location histories, friends, groups, chat rooms, and GeoDrop metadata.
2. **`navisecret_storage_data`**: Stores binary avatar image files and media uploads.

> [!CAUTION]
> **Never run `docker compose down -v` in production.** The `-v` flag permanently removes named volumes. Always use `docker compose down` to preserve your database and storage files.

---

## 5. Reverse Proxy & HTTPS Configuration

To deploy on a public server with Let's Encrypt SSL certificates, use Nginx, Caddy, or Traefik as the edge reverse proxy.

### Nginx Example (`/etc/nginx/sites-available/navisecret.conf`):

```nginx
server {
    listen 80;
    server_name navisecret.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name navisecret.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/navisecret.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/navisecret.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Maximum file upload size for avatars & attachments
    client_max_body_size 50M;

    # Forward to NaviSecret Web Container
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # WebSocket connection upgrade for Realtime location streaming
    location /realtime/v1/ {
        proxy_pass http://127.0.0.1:3000/realtime/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

---

## 6. Maintenance & Management Commands

### Inspect Service Status

```bash
docker compose ps
```

### View Live Logs

```bash
# Stream all logs
docker compose logs -f

# Stream specific service logs
docker compose logs -f web
docker compose logs -f db
docker compose logs -f realtime
```

### Stop Services Safely

```bash
docker compose down
```

### Restart a Single Service

```bash
docker compose restart realtime
```

### Upgrade / Pull Updated Images

```bash
docker compose pull
docker compose up -d --build
```

---

## 7. Troubleshooting & Diagnostics

### 1. Database Connection Failed on Initial Startup
- Ensure the `POSTGRES_PASSWORD` in `.env` does not contain special shell characters (e.g. `$`, `!`, `&`) that get misinterpreted by Docker Compose. Use alphanumeric or base64url strings.
- Verify PostgreSQL is healthy: `docker inspect --format='{{json .State.Health.Status}}' navisecret_db`.

### 2. Realtime WebSocket Not Connecting
- Ensure your reverse proxy has WebSocket upgrade headers configured (`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "Upgrade";`).
- Confirm that the `supabase_realtime` publication exists in PostgreSQL (`SELECT * FROM pg_publication;`).

### 3. Geolocation Permission Denied / Inactive
- Verify the site is loaded over `https://` (or `http://localhost`). Browsers strictly block GPS geolocation on plain `http://` over remote networks.
- Tap the "Retry" button on the NaviSecret GPS warning banner after granting permissions in your browser bar.
