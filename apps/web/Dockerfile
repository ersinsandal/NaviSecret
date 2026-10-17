# ==============================================================================
# NaviSecret Web Application - Production Multi-Stage Dockerfile
# Stage 1: Build TypeScript libraries and Vite production bundle
# Stage 2: Serve optimized assets with Nginx
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for deterministic pnpm package management
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root manifest and workspace package definitions
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/geo-drop/package.json ./packages/geo-drop/
COPY apps/web/package.json ./apps/web/

# Install dependencies across all workspace packages
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY packages/sdk/ ./packages/sdk/
COPY packages/geo-drop/ ./packages/geo-drop/
COPY apps/web/ ./apps/web/

# Build workspace libraries first
RUN pnpm --filter @navisecret/sdk build
RUN pnpm --filter @navisecret/geo-drop build

# Build web frontend
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter web build

# ==============================================================================
# Runner Stage
# ==============================================================================
FROM nginx:alpine AS runner

# Remove default nginx configurations
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy built frontend assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy Nginx server configuration
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
