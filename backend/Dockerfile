FROM node:20-slim
WORKDIR /app

RUN apt-get update -qq && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN mkdir -p /app/uploads

ENV UPLOADS_DIR=/app/uploads
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx ts-node --transpile-only --compiler-options '{\"module\":\"CommonJS\"}' src/index.ts"]
