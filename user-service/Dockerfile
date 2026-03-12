# ──────────────────────────────────────────────────────────────────────
# STAGE 1: Build Stage
# ──────────────────────────────────────────────────────────────────────
# Alpine images are used for their small size and security
FROM node:20-alpine3.21 AS builder

RUN apk update && apk upgrade --no-cache

# Working directory during build
WORKDIR /app/user-service

# Copy dependencies first for efficient layer caching
COPY user-service/package*.json ./

# Install production-only dependencies
RUN npm ci --only=production

# ──────────────────────────────────────────────────────────────────────
# STAGE 2: Production Stage
# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine3.21

RUN apk update && apk upgrade --no-cache

# Security: Create a non-privileged user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Application directory
WORKDIR /app

# Copy the installed dependencies from the builder stage
COPY --from=builder /app/user-service/node_modules ./user-service/node_modules

# Copy the shared utilities (database/auth/mq helpers)
COPY shared/ ./shared/

# Copy the service-specific code
COPY user-service/ ./user-service/

# Set scope to the user-service folder
WORKDIR /app/user-service

# Security: Run as non-root user
USER appuser

# Expose the service port
EXPOSE 3001

# Healthcheck: Informs Docker if the container is correctly responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1

# Start the Node.js application
CMD ["node", "server.js"]
