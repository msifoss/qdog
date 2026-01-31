# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./public

# Generate Prisma client
RUN npx prisma generate

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/qdog.db"
ENV PORT=3000

EXPOSE 3000

# Run migrations and start server
CMD npx prisma db push --skip-generate && node src/index.js
