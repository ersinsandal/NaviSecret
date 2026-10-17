# ==============================================================================
# NaviSecret Backend Server - Production Container
# Stack: Node.js 22 Alpine + Fastify
# ==============================================================================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Copy server package definition
COPY apps/server/package.json ./package.json

# Install only production dependencies
RUN npm install --omit=dev --no-audit --no-fund

# Copy pre-compiled server dist and database schema
COPY apps/server/dist ./dist
COPY apps/server/src/database/schema.sql ./src/database/schema.sql

EXPOSE 8000

CMD ["node", "dist/index.js"]
