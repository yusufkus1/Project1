# Builder runs on amd64 (native on Mac) — avoids armv7 Prisma binary issue
FROM --platform=linux/amd64 node:20-slim AS builder
WORKDIR /app

RUN apt-get update -qq && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Production image targets the real platform (arm/v7 on RPI3)
FROM node:20-slim
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Skip prisma generate postinstall — we copy the generated client from builder instead
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
RUN npm ci --omit=dev

# Copy generated Prisma client (amd64 binary present but never loaded — driver adapter used)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads

ENV UPLOADS_DIR=/app/uploads
EXPOSE 3001

# migrate.js uses pg directly (no native Prisma binary needed for migrations)
CMD ["sh", "-c", "node dist/migrate.js && node dist/index.js"]
