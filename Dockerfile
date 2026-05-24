# Dockerfile (for dynamic site with Node adapter)

# ---- Build Stage ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Build produces output in /app/dist (including server/entry.mjs)

# ---- Runtime Stage ----
# Use the same Node.js version for runtime
FROM node:24-alpine AS runtime
WORKDIR /app

# Set environment variable to signal production mode
ENV NODE_ENV=production

# Copy only the necessary build artifacts and production node_modules
# Note: You might need 'npm ci --omit=dev' in the build stage for smaller node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Astro's Node adapter typically runs on port 4321 by default
EXPOSE 4321

# Set HOST env var to make the server listen on all interfaces within the container
ENV HOST="0.0.0.0"
# Set PORT env var (Astro Node adapter reads this)
ENV PORT="4321"

# Command to start the Node.js server produced by the Astro build
CMD ["node", "dist/server/entry.mjs"]