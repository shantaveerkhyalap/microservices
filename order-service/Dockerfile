# ──────────────────────────────────────────────────────────────────────
# STAGE 1: Build Stage
# ──────────────────────────────────────────────────────────────────────
# Start with a Node.js Alpine base for build efficiency
FROM node:20-alpine3.21 AS builder

RUN apk update && apk upgrade --no-cache

# Directory during build
WORKDIR /app/order-service

# Dependencies manifest copy for efficient build cache
COPY order-service/package*.json ./

# Production dependency installation only
RUN npm ci --only=production

# ──────────────────────────────────────────────────────────────────────
# STAGE 2: Production Stage
# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine3.21

RUN apk update && apk upgrade --no-cache

# Security: Creating non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Target application directory
WORKDIR /app

# Copy production node_modules from builder
COPY --from=builder /app/order-service/node_modules ./order-service/node_modules

# Copy shared utilities (mq, logic, shared db config)
COPY shared/ ./shared/

# Copy service source code
COPY order-service/ ./order-service/

# Set final working directory to the service
WORKDIR /app/order-service

# Security: Use non-root user
USER appuser

# Service port disclosure
EXPOSE 3003

# Proactive health checks for Docker orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3003/health || exit 1

# Start-up command
CMD ["node", "server.js"]
