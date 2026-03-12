# ──────────────────────────────────────────────────────────────────────
# STAGE 1: Build Stage
# ──────────────────────────────────────────────────────────────────────
# Using node:20-alpine as the base image for a small, secure footprint
FROM node:20-alpine AS builder

RUN apk update && apk upgrade --no-cache

# Set the working directory for the build process
WORKDIR /app/api-gateway

# Copy package files first to leverage Docker layer caching
# This ensures that 'npm install' only runs if dependencies change
COPY api-gateway/package*.json ./

# Install only production dependencies to keep the image lean
RUN npm ci --only=production

# ──────────────────────────────────────────────────────────────────────
# STAGE 2: Production Stage
# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine

RUN apk update && apk upgrade --no-cache

# Create a non-root group and user for better security
# This prevents the application from running with root privileges inside the container
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set the final working directory
WORKDIR /app

# Copy built node_modules from the builder stage
COPY --from=builder /app/api-gateway/node_modules ./api-gateway/node_modules

# Copy the shared utilities folder (Required by the service)
COPY shared/ ./shared/

# Copy the actual service source code
COPY api-gateway/ ./api-gateway/

# Switch the working directory to the service folder
WORKDIR /app/api-gateway

# Use the non-root user for execution
USER appuser

# Document that the service listens on port 3000
EXPOSE 3000

# Health check to allow Docker to monitor the container's status
# If the /health endpoint fails 3 times, the container is marked as unhealthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# The command to start the application
CMD ["node", "server.js"]
