#!/bin/bash
set -e

REGISTRY="ghcr.io/yusufkus1"
BACKEND_IMAGE="$REGISTRY/project1-backend:latest"
FRONTEND_IMAGE="$REGISTRY/project1-frontend:latest"

echo "🔨 Building images for linux/arm/v7 (RPI3)..."

docker buildx build \
  --platform linux/arm/v7 \
  --tag "$BACKEND_IMAGE" \
  --push \
  ./backend

docker buildx build \
  --platform linux/arm/v7 \
  --tag "$FRONTEND_IMAGE" \
  --push \
  ./frontend

echo ""
echo "✅ Images pushed! RPI3'te çalıştır:"
echo "  docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d"
