#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# StreamVid VPS Production Deploy Script
# Run as: bash deploy.sh
# ═══════════════════════════════════════════════════════════════
set -e

echo ""
echo "🚀 StreamVid Deploy — $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APP_DIR="/var/www/streamvid"   # Change to your VPS path
cd "$APP_DIR"

# ── 1. Pull latest code ──────────────────────────────────────────
echo "📦 Pulling latest code..."
git pull origin main

# ── 2. Backend: install deps + migrate ──────────────────────────
echo ""
echo "🔧 Backend setup..."
cd backend
npm ci --omit=dev
npx prisma migrate deploy
npx prisma generate
cd ..

# ── 3. Frontend: install + build ────────────────────────────────
echo ""
echo "🏗  Building frontend..."
cd frontend
npm ci --omit=dev
npm run build
cd ..

# ── 4. Reload PM2 processes ─────────────────────────────────────
echo ""
echo "♻️  Reloading PM2..."
pm2 reload ecosystem.config.cjs --update-env

# ── 5. Save PM2 state ───────────────────────────────────────────
pm2 save

# ── 6. Health check ─────────────────────────────────────────────
echo ""
echo "🩺 Health check..."
sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health)
if [ "$STATUS" = "200" ]; then
    echo "✅ API is healthy (HTTP $STATUS)"
else
    echo "❌ API health check failed (HTTP $STATUS). Check logs: pm2 logs streamvid-api"
    exit 1
fi

echo ""
echo "✅ Deploy complete!"
echo "📊 Check with: pm2 status"
echo "📋 Logs: pm2 logs"
