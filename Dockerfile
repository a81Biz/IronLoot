# ===========================================
# Iron Loot API - Production Dockerfile
# ===========================================
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies for build
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and config files
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S ironloot && \
    adduser -S ironloot -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=ironloot:ironloot /app/dist ./dist
COPY --from=builder --chown=ironloot:ironloot /app/node_modules ./node_modules
COPY --from=builder --chown=ironloot:ironloot /app/package*.json ./

# Set environment
ENV NODE_ENV=production

# Use non-root user
USER ironloot

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main"]
