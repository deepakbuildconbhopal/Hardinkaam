# Dockerfile for HARDINKAAM Cloud-Native Deployment Worker
# Secure Cloud Run & Cloud Build deployment container utilizing Google Cloud ADC
FROM node:20-slim

# Install necessary security tools & clean cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install firebase-tools globally for ADC-based Hosting releases
RUN npm install -g firebase-tools@13.31.0 --no-fund --no-audit

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install worker server dependencies
RUN npm ci --only=production --no-fund --no-audit || npm install --production --no-fund --no-audit

# Copy application sources
COPY . .

# Build Vite client and server
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port for Cloud Run
EXPOSE 3000

# Start server using ADC / Workload Identity (No FIREBASE_TOKEN required)
CMD ["node", "dist/server.cjs"]
