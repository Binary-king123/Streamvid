#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  StreamVid — One-Command VPS Deployment
#  Germany server (Hostinger KVM4 recommended)
#  Usage: bash deploy.sh
#
#  BEFORE RUNNING:
#    1. cp backend/.env.production.example backend/.env
#    2. nano backend/.env         → fill JWT_SECRET, passwords
#    3. cp frontend/.env.production.example frontend/.env.local
#    4. nano frontend/.env.local  → set NEXT_PUBLIC_API_URL=https://yourdomain.com
#    5. bash deploy.sh            ← that's it
# ═══════════════════════════════════════════════════════════════════════════════
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}"
echo "╔════════════════════════════════════════╗"
echo "║   StreamVid — Deployment Script        ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── 0. Guard: .env files ──────────────────────────────────────────────────────
if [ ! -f "backend/.env" ]; then
  echo -e "${RED}❌ ERROR: backend/.env not found!${NC}"
  echo "   cp backend/.env.production.example backend/.env"
  echo "   nano backend/.env   # Set JWT_SECRET and DB password"
  exit 1
fi

if [ ! -f "frontend/.env.local" ]; then
  echo -e "${RED}❌ ERROR: frontend/.env.local not found!${NC}"
  echo "   cp frontend/.env.production.example frontend/.env.local"
  echo "   nano frontend/.env.local   # Set NEXT_PUBLIC_API_URL=https://yourdomain.com"
  exit 1
fi

# ─── Auto-read domain from frontend .env.local ──────────────────────────────
DOMAIN=$(grep NEXT_PUBLIC_API_URL frontend/.env.local | cut -d'=' -f2 | sed 's|https://||;s|http://||;s|/.*||')
if [ -z "$DOMAIN" ]; then
  echo -e "${RED}❌ ERROR: NEXT_PUBLIC_API_URL not set in frontend/.env.local${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓ Domain detected: ${BOLD}$DOMAIN${NC}"

SITE_MODE=$(grep NEXT_PUBLIC_SITE_MODE frontend/.env.local | cut -d'=' -f2 || echo "mainstream")
echo -e "  ${GREEN}✓ Site mode: ${BOLD}$SITE_MODE${NC}"

# ─── 1. System packages ────────────────────────────────────────────────────────
echo -e "\n${BOLD}[1/9] System packages...${NC}"
sudo apt update -y -q
sudo apt install -y -q nginx ffmpeg git curl build-essential \
  certbot python3-certbot-nginx python3-pip \
  postgresql postgresql-contrib redis-server

# yt-dlp (for admin URL video import)
sudo pip3 install -U yt-dlp -q 2>/dev/null || (
  sudo curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp
)
echo -e "  ${GREEN}✓ Done${NC}"

# ─── 2. Node.js 20 ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[2/9] Node.js 20...${NC}"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

  sudo apt install -y -q nodejs
fi
echo -e "  ${GREEN}✓ Node $(node -v) | npm $(npm -v)${NC}"

# ─── 3. PM2 ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[3/9] PM2...${NC}"
sudo npm install -g pm2 --silent
echo -e "  ${GREEN}✓ PM2 $(pm2 -v)${NC}"

# ─── 4. PostgreSQL ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[4/9] PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Read DB password from backend .env
DB_PASS=$(grep ^DATABASE_URL backend/.env | grep -oP '(?<=:)[^@]+(?=@)')
DB_PASS="${DB_PASS:-securepassword}"

sudo -u postgres psql -q <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'streamvid_user') THEN
    CREATE USER streamvid_user WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE streamvid' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'streamvid')\gexec
ALTER ROLE streamvid_user SET client_encoding TO 'utf8';
ALTER ROLE streamvid_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE streamvid_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE streamvid TO streamvid_user;
\c streamvid
GRANT ALL ON SCHEMA public TO streamvid_user;
EOF
echo -e "  ${GREEN}✓ Database ready${NC}"

# ─── 5. Redis ──────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[5/9] Redis...${NC}"
sudo sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
sudo systemctl enable redis-server
sudo systemctl restart redis-server
echo -e "  ${GREEN}✓ Redis bound to localhost${NC}"

# ─── 6. Storage directories ────────────────────────────────────────────────────
echo -e "\n${BOLD}[6/9] Storage directories...${NC}"
CURRENT_USER=$(whoami)
sudo mkdir -p /var/www/videos /var/www/uploads /var/log/streamvid
sudo chown -R "$CURRENT_USER":"$CURRENT_USER" /var/www/videos /var/www/uploads /var/log/streamvid
sudo chmod 755 /var/www/videos /var/www/uploads
echo -e "  ${GREEN}✓ /var/www/videos, /var/www/uploads, /var/log/streamvid${NC}"

# ─── 7. Install + Build app ────────────────────────────────────────────────────
echo -e "\n${BOLD}[7/9] Installing & building app...${NC}"

echo "  → Backend..."
cd backend
npm ci --silent
npx prisma generate
npx prisma migrate deploy
cd ..

echo "  → Frontend..."
cd frontend
npm ci --silent
npm run build
# Standalone output requires static dir copy
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
cd ..
echo -e "  ${GREEN}✓ Build complete${NC}"

# ─── 8. Nginx — auto-inject domain ────────────────────────────────────────────
echo -e "\n${BOLD}[8/9] Nginx...${NC}"
NGINX_CONF="/etc/nginx/sites-available/streamvid"
sudo cp nginx/streamvid.conf "$NGINX_CONF"
# Replace placeholder with real domain from .env
sudo sed -i "s/yourdomain\.com/$DOMAIN/g" "$NGINX_CONF"
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/streamvid
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx
echo -e "  ${GREEN}✓ Nginx configured for $DOMAIN${NC}"

# ─── 9. PM2 start ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[9/9] Starting app with PM2...${NC}"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# Register PM2 startup hook for auto-restart on server reboot
STARTUP_CMD=$(pm2 startup 2>/dev/null | grep "sudo" | tail -1)
[ -n "$STARTUP_CMD" ] && eval "$STARTUP_CMD" || true

echo ""
echo -e "${GREEN}${BOLD}"
echo "╔════════════════════════════════════════╗"
echo "║   ✅ Deployment Complete!              ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Domain:    ${BOLD}https://$DOMAIN${NC}"
echo -e "  Site mode: ${BOLD}$SITE_MODE${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo -e "  1. Point your domain DNS A-record to this server IP:"
echo -e "     ${BOLD}$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')${NC}"
echo ""
echo -e "  2. Get free SSL certificate:"
echo -e "     ${BOLD}sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
echo ""
echo -e "  3. Create your admin account:"
echo -e "     ${BOLD}curl -X POST https://$DOMAIN/api/auth/seed \\"
echo -e "       -H 'Content-Type: application/json' \\"
echo -e "       -d '{\"email\":\"admin@$DOMAIN\",\"password\":\"CHANGE_ME\"}'${NC}"
echo ""
echo -e "  4. Submit sitemap to Google:"
echo -e "     ${BOLD}https://search.google.com/search-console${NC}"
echo -e "     Submit: https://$DOMAIN/sitemap.xml"
echo ""
echo -e "  Monitoring:"
echo -e "  ${BOLD}pm2 list${NC}       — see all processes"
echo -e "  ${BOLD}pm2 logs${NC}       — live logs"
echo -e "  ${BOLD}pm2 restart all${NC} — restart"
echo ""
pm2 list
