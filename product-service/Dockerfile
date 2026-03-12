# ──────────────────────────────────────────────────────────────────────
# STAGE 1: Build Stage
# ──────────────────────────────────────────────────────────────────────
# Base image for building the application
FROM node:20-alpine AS builder

RUN apk update && apk upgrade --no-cache

# Working directory for build
WORKDIR /app/product-service

# Copy dependencies manifest
COPY product-service/package*.json ./

# Install only production-ready dependencies for a smaller final image
RUN npm ci --only=production

# ──────────────────────────────────────────────────────────────────────
# STAGE 2: Production Stage
# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine

RUN apk update && apk upgrade --no-cache

# Security: Create a restricted user so the app doesn't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set the base directory for the service
WORKDIR /app

# Bring in the prepared node_modules from the builder stage
COPY --from=builder /app/product-service/node_modules ./product-service/node_modules

# Shared utilities: Essential helper scripts for db, auth, and messaging
COPY shared/ ./shared/

# Service-specific implementation
COPY product-service/ ./product-service/

# Set working directory to the specific service folder
WORKDIR /app/product-service

# Security: Run as non-privileged user
USER appuser

# Expose service port
EXPOSE 3002

# Health check: Proactive monitoring of container performance
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3002/health || exit 1

# Launch the service
CMD ["node", "server.js"]
