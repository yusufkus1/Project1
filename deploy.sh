#!/bin/bash
# Deploy to Raspberry Pi
# Usage: bash deploy.sh [rpi-user@192.168.1.77]

RPI=${1:-"pi@192.168.1.77"}
APP_DIR="/home/pi/Project1"

echo "Deploying to $RPI..."

ssh "$RPI" "
  set -e
  if [ ! -d '$APP_DIR' ]; then
    git clone https://github.com/yusufkus1/Project1.git '$APP_DIR'
  fi
  cd '$APP_DIR'
  git pull origin main
  if [ ! -f .env ]; then
    cp .env.example .env
    echo 'IMPORTANT: Edit $APP_DIR/.env with your secrets before first run!'
    exit 1
  fi
  docker compose down --remove-orphans
  docker compose up -d --build
  docker compose ps
"

echo "Done. App running at http://192.168.1.77"
