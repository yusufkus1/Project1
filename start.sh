#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 TodoApp başlatılıyor..."

# Start PostgreSQL if not running
if ! /opt/homebrew/opt/postgresql@16/bin/pg_isready -q 2>/dev/null; then
  echo "📦 PostgreSQL başlatılıyor..."
  brew services start postgresql@16
  sleep 2
fi

# Start backend
echo "⚙️  Backend başlatılıyor (port 3001)..."
cd "$SCRIPT_DIR/backend"
/opt/homebrew/bin/npx ts-node --compiler-options '{"module":"CommonJS"}' src/index.ts &
BACKEND_PID=$!

sleep 3

# Start frontend
echo "🎨 Frontend başlatılıyor (port 5173)..."
cd "$SCRIPT_DIR/frontend"
/opt/homebrew/bin/npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Uygulama hazır!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Durdurmak için Ctrl+C"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Sunucular durduruldu.'" EXIT
wait
