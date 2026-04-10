# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application files
COPY scripts ./scripts
COPY scheduler.js .
COPY public ./public

# Generate .env from environment variables (optional)
# We'll rely on env vars passed at runtime instead

# Final stage
FROM node:20-alpine

WORKDIR /app

# Install git (needed for commits)
RUN apk add --no-cache git openssh-client

# Copy from builder
COPY --from=builder /app ./

# Set environment variables
ENV NODE_ENV=production

# Run the scheduler
ENTRYPOINT ["node", "scheduler.js"]
