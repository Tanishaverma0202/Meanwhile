# Production Deployment Guide — Meanwhile

This document outlines deployment steps for hosting **Meanwhile** in production environments.

---

## 1. Docker Compose (One-Click Production Run)

The repository includes a production-ready `docker-compose.yml` orchestrating the FastAPI backend and Nginx static frontend.

```bash
# Clone repository
git clone https://github.com/your-username/meanwhile.git
cd meanwhile

# Launch full stack
docker-compose up -d --build

# Verify status
docker-compose ps
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Health Check:** http://localhost:8000/health

### Single-container Docker deployment

Platforms that expect a `Dockerfile` at the repository root can use the included root image:

```bash
docker build -t meanwhile .
docker run --rm -p 3000:80 meanwhile
```

- **Application:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

The root image serves the frontend through Nginx and proxies `/api/` and `/health` to the bundled FastAPI backend. Use the Compose setup above when separate frontend and backend containers are preferred.

### Render

Create a new **Web Service** in Render and connect this repository. Use these settings:

- **Environment:** Docker
- **Dockerfile Path:** `./Dockerfile`
- **Docker Build Context Directory:** `.`
- **Health Check Path:** `/health`
- **Environment Variables:** `DATABASE_URL=sqlite:///./meanwhile.db`, `MARKET_DATA_PROVIDER=MOCK`

Render will build the root `Dockerfile` and deploy the application at the generated Render URL. The existing `render.yaml` is also available if Blueprint support appears in your Render account later.

---

## 2. Deploying to Vercel (Frontend) & Render / Railway (Backend)

### Frontend Deployment (Vercel)
1. Import repository into Vercel.
2. Set Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add Rewrite in `vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/api/v1/:path*", "destination": "https://your-backend-url.onrender.com/api/v1/:path*" },
       { "source": "/health", "destination": "https://your-backend-url.onrender.com/health" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

### Backend Deployment (Render / Railway / AWS App Runner)
1. Set Root Directory: `backend`
2. Environment: `Python 3`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Environment Variables:
   - `SECRET_KEY`: Random 64-character hex string
   - `DATABASE_URL`: `sqlite:///./meanwhile.db` (or PostgreSQL URI)
   - `MARKET_DATA_PROVIDER`: `MOCK` (or `REAL`)

---

## 3. Database Migration Path (SQLite → PostgreSQL)

For enterprise scale (>100k users), set `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://user:password@pg-host:5432/meanwhile_db
```

SQLAlchemy automatically generates PostgreSQL schema upon server startup.

---

## 4. Health & Security Verification

- **Health Monitoring:** `GET /health` returns JSON uptime, database connection status, and provider info.
- **Security Headers:** Automatic `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, and strict CORS policies.
