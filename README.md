# StreamVid — Short-Form Video Streaming Platform

A minimal, fast, and monetization-ready short-form video platform (1–3 min, 360p max) built to run on a single Hostinger KVM4 VPS (4 vCPU, 16 GB RAM, 200 GB NVMe).

---

## Project Structure

```
streamvid/
├── backend/          # Fastify API + BullMQ Worker
│   ├── prisma/       # Database schema + migrations
│   └── src/
│       ├── server.js
│       ├── lib/      # prisma.js, redis.js
│       ├── routes/   # auth.js, videos.js, analytics.js, admin.js, ads.js
│       └── worker/   # queue.js, processor.js (FFmpeg pipeline)
├── frontend/         # Next.js + TailwindCSS
│   └── src/
│       ├── app/      # layout, page, /genre, /watch, /admin
│       ├── components/ # VideoCard, Navbar, VideoPlayer
│       └── lib/      # api.js
└── nginx/            # streamvid.conf (deploy to /etc/nginx/sites-available/)
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL running locally
- Redis running locally
- FFmpeg installed (`ffmpeg --version`)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env — fill in DATABASE_URL, REDIS_URL, JWT_SECRET

npm install
npx prisma migrate dev --name init  # Creates all DB tables
npm run start                        # Start API on :4000
# In a separate terminal:
npm run worker                       # Start FFmpeg encoding worker
```

### 2. Create First Admin User

```bash
# One-time seed (disable this endpoint after running!)
curl -X POST http://localhost:4000/api/auth/seed \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"supersecurepassword"}'
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:4000

npm install
npm run dev    # Start frontend on :3000
```

### 4. Access Admin Panel
Go to: `http://localhost:3000/admin`
Login with the credentials you created above.

---

## Production Deployment (VPS)

### 1. Environment
```bash
# On the VPS, create storage directory
sudo mkdir -p /var/www/videos
sudo chown -R www-data:www-data /var/www/videos
sudo chmod 755 /var/www/videos

# Install FFmpeg
sudo apt install ffmpeg -y
```

### 2. Environment Files
```bash
# Backend
cp backend/.env.example backend/.env
# Set production DATABASE_URL, REDIS_URL, JWT_SECRET, VIDEO_STORAGE_PATH=/var/www/videos

# Frontend
cp frontend/.env.local.example frontend/.env.local
# Set NEXT_PUBLIC_API_URL=https://yourdomain.com
# Set NEXT_PUBLIC_CDN_URL=https://cdn.yourdomain.com  ← Cloudflare
```

### 3. Database Migration
```bash
cd backend && npx prisma migrate deploy
```

### 4. Build Frontend
```bash
cd frontend && npm run build
```

### 5. PM2 Process Manager
```bash
npm install -g pm2
# Start API
pm2 start backend/src/server.js --name streamvid-api --interpreter node
# Start Worker
pm2 start backend/src/worker/processor.js --name streamvid-worker --interpreter node
# Start Frontend
pm2 start npm --name streamvid-web -- start --prefix frontend
pm2 save && pm2 startup
```

### 6. Nginx
```bash
sudo cp nginx/streamvid.conf /etc/nginx/sites-available/streamvid
sudo ln -s /etc/nginx/sites-available/streamvid /etc/nginx/sites-enabled/
# Edit streamvid.conf — replace 'yourdomain.com' with your domain
sudo nginx -t && sudo systemctl reload nginx
```

### 7. SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Monetization Setup

**Ad configuration is fully dynamic** — no code changes needed to swap ad networks.
1. Login to `/admin`
2. Go to the **Ads** tab
3. Paste your VAST URLs or banner HTML snippets:

| Slot | Source |
|------|--------|
| Pre-Roll VAST URL | ExoClick / TrafficJunky VAST tag |
| Top Banner | ExoClick HTML banner code |
| Grid Inline Banner | ExoClick HTML banner code |
| Sidebar Banner | ExoClick HTML banner code |
| Popunder Script | ExoClick popunder JS snippet |

**ExoClick:** https://www.exoclick.com  
**TrafficJunky:** https://www.trafficjunky.com

> Paste your ad zone codes directly into the Admin panel. They are stored in the DB and served to all pages without redeployment.

---

## Cloudflare CDN Setup (Strongly Recommended)
1. Add your domain to Cloudflare
2. Point Cloudflare nameservers at Hostinger
3. Create a Cloudflare Page Rule:
   - URL: `yourdomain.com/videos/*`
   - Setting: **Cache Level = Cache Everything**
   - Edge TTL: 1 year
4. Set `NEXT_PUBLIC_CDN_URL=https://yourdomain.com` in frontend `.env.local`

---

## Key API Endpoints

### Public
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/videos/home?page=1` | Paginated home feed |
| GET | `/api/videos/genre/:slug?page=1` | By genre |
| GET | `/api/videos/:id` | Video + recommended + related |
| POST | `/api/analytics/view` | Record view after 5s |
| GET | `/api/ads/config` | Get current ad tags |
| GET | `/api/videos/genres/list` | All genres |

### Admin (requires login)
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/admin/videos/upload` | Upload new video |
| PUT | `/api/admin/videos/:id` | Edit video |
| DELETE | `/api/admin/videos/:id` | Delete video |
| GET | `/api/admin/analytics?days=30` | Analytics data |
| PUT | `/api/admin/ads` | Update ad config |
