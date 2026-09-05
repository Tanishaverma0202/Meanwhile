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
docker run --rm -p 3000:7860 meanwhile
```

- **Application:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

The root image serves the frontend through Nginx and proxies `/api/` and `/health` to the bundled FastAPI backend. Use the Compose setup above when separate frontend and backend containers are preferred.

### Hugging Face Spaces (no card required)

Create a new public Space, choose **Docker** as the SDK, and upload or connect this repository. The metadata at the top of `README.md` tells Spaces to build the root `Dockerfile` and expose port `7860`. Set these Space variables:

- `DATABASE_URL=sqlite:///./meanwhile.db`
- `MARKET_DATA_PROVIDER=MOCK`

The free CPU Space may sleep when idle, and its SQLite data is not durable.

### Cloudflare Pages

Cloudflare Pages hosts the React frontend only. Create a Pages project connected to this repository with:

- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variable:** `VITE_API_BASE_URL=https://YOUR-BACKEND-DOMAIN/api/v1`

The FastAPI backend must be deployed separately, for example on PythonAnywhere. If no `VITE_API_BASE_URL` is set, the frontend uses `/api/v1`, which only works when a proxy or same-origin backend is configured.

### PythonAnywhere

PythonAnywhere does not run this repository's Docker container directly. Deploy the repository as one Python web app instead:

1. Clone the repository into PythonAnywhere and open a Bash console.
2. Create and activate a virtual environment, then install the backend dependencies:
  ```bash
  cd ~/Meanwhile
  python3.13 -m venv venv
  source venv/bin/activate
  python -m pip install --upgrade pip
  python -m pip install -r backend/requirements.txt
  python -c "from a2wsgi import WSGIMiddleware; print('a2wsgi installed')"
  ```
   PythonAnywhere does not provide `npm` in a standard Bash console. The repository includes the built React files in `frontend/dist`, so no frontend build is required there.
3. In the PythonAnywhere **Web** tab, create a manual web app using the same Python version as the virtual environment.
4. Set the virtualenv path to `/home/YOUR_USERNAME/Meanwhile/venv`.
5. Open the WSGI configuration file shown by PythonAnywhere, usually `/var/www/YOUR_USERNAME_pythonanywhere_com_wsgi.py`, and replace its contents with:
  ```python
  import os
  import sys

  os.environ.setdefault("SECRET_KEY", "replace-with-a-long-random-secret")
  os.environ.setdefault("DATABASE_URL", "sqlite:////home/YOUR_USERNAME/Meanwhile/backend/meanwhile.db")
  os.environ.setdefault("MARKET_DATA_PROVIDER", "MOCK")

  sys.path.insert(0, "/home/YOUR_USERNAME/Meanwhile/backend")

  from wsgi import application
  ```
  This imports the repository's `backend/wsgi.py`, which uses `ASGIMiddleware` to adapt FastAPI's ASGI interface to PythonAnywhere's WSGI server.
6. Add these environment variables in the Web tab or WSGI file:
  - `SECRET_KEY`: a long random value
  - `DATABASE_URL`: `sqlite:////home/YOUR_USERNAME/Meanwhile/backend/meanwhile.db`
  - `MARKET_DATA_PROVIDER`: `MOCK`
7. Reload the web app and open the PythonAnywhere URL. The frontend and `/api/v1/` API use the same origin.

If the error still says `No module named 'a2wsgi'`, the Web tab is using a different virtualenv. In Bash, run these exact checks:

```bash
/home/YOUR_USERNAME/Meanwhile/venv/bin/python -m pip install --upgrade -r /home/YOUR_USERNAME/Meanwhile/backend/requirements.txt
/home/YOUR_USERNAME/Meanwhile/venv/bin/python -c "from a2wsgi import ASGIMiddleware; print('a2wsgi OK')"
```

The second command must print `a2wsgi OK`. Set the Web tab virtualenv to that same `/home/YOUR_USERNAME/Meanwhile/venv` path, then reload. Do not put `from a2wsgi import ASGIMiddleware` in the PythonAnywhere WSGI file; it should only contain `from wsgi import application` after adding the backend path.

The included `backend/wsgi.py` adapts FastAPI for PythonAnywhere and serves the committed `frontend/dist` with SPA fallback. Rebuild the frontend locally with `cd frontend; npm install; npm run build` whenever frontend code changes, then commit the updated `frontend/dist` files. SQLite is suitable for a demo, but PythonAnywhere filesystem storage is not a substitute for a managed production database.
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
