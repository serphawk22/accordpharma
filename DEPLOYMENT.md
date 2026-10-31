# Deployment Guide · Accord Pharma

This document provides step-by-step instructions for deploying the **Accord Pharma Backend on Railway** and **Frontend on Vercel**.

---

## 1. Deploying the Backend on Railway

The backend is built with FastAPI and PostgreSQL (SQLAlchemy / psycopg 3). Both a `Dockerfile` and a `Procfile` / `railway.json` are included.

### Steps to Deploy on Railway:
1. Log in to [Railway](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select `serphawk22/accordpharma`.
4. If asked for **Root Directory**, you can either:
   - Leave it as `/` (the root `Dockerfile` and `railway.json` are pre-configured to build the backend), or
   - Set it to `backend`.
5. Under **Variables**, configure the following environment variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (e.g. `postgresql://user:pass@host/neondb?sslmode=require`).
   - `JWT_SECRET_KEY`: A strong 64-char random string (e.g., generated with `python -c "import secrets; print(secrets.token_urlsafe(48))"`).
   - `APP_ENV`: `production` (or `development`).
   - `CORS_ORIGINS`: `https://accordpharma.vercel.app,https://accordpharma-production.up.railway.app,http://localhost:3000,http://localhost:4200`
   - `OPENAI_MODEL`: `gpt-4o`
   - `OPENAI_API_KEY`: Your OpenAI API key (optional)
   - `FRONTEND_URL`: `https://accordpharma.vercel.app`
   - `BACKEND_URL`: `https://accordpharma-production.up.railway.app`
   - `LOG_LEVEL`: `INFO`
6. Click **Deploy**. Railway will run the health check against `/health` and assign a public domain.

---

## 2. Deploying the Frontend on Vercel

The repository provides two frontends:
- **`accordpharma-next`** (Next.js 16 App Router full-stack commercial CRM) — *Recommended*
- **`frontend`** (Angular 20 SPA)

### Deploying Next.js (`accordpharma-next`):
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** → **Project** and import `serphawk22/accordpharma`.
3. In **Project Settings**:
   - **Root Directory**: Click **Edit** and select `accordpharma-next`.
   - **Framework Preset**: Next.js (automatically detected).
4. In **Environment Variables** (optional, if overriding backend API target):
   - `NEXT_PUBLIC_API_URL`: `https://accordpharma-production.up.railway.app`
5. Click **Deploy**.

### Deploying Angular (`frontend`):
1. In Vercel, import `serphawk22/accordpharma`.
2. In **Project Settings**:
   - **Root Directory**: Click **Edit** and select `frontend`.
   - **Framework Preset**: Angular.
   - **Output Directory**: `dist/frontend/browser` (preconfigured in `frontend/vercel.json`).
3. Click **Deploy**.

---

## 3. CORS & Connectivity Check
Once both services are deployed:
1. Update `CORS_ORIGINS` in Railway with the exact Vercel production domain.
2. Visit `https://your-backend.up.railway.app/health` to verify backend status.
3. Visit `https://your-backend.up.railway.app/docs` to verify OpenAPI / Swagger interactive docs.
