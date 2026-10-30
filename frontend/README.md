# PharmaConnect CRM frontend

This Angular standalone application can run independently of the FastAPI backend or Neon. Without the backend it displays connection errors and never substitutes sample records.

## Requirements

- Node.js 20.19+, 22.12+, or 24+ (the scaffold was created with Node 24).
- npm.
- A running FastAPI backend and configured PostgreSQL database for authenticated CRM data.

## Start the frontend on Windows

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. The API base URL is configured in `src/environments/environment.ts`; its local default is `http://127.0.0.1:8000/api/v1`.

The application stores bearer access and rotating refresh tokens in tab-scoped `sessionStorage` to match the backend contract. It does not store passwords or backend secrets. Browser token storage has XSS exposure; production deployments should use a trusted origin and a strict content security policy.

## Start the backend

In a second PowerShell terminal:

```powershell
cd backend
if (-not (Test-Path .venv)) { python -m venv .venv }
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Configure backend\.env and verify the database target before migration.
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If `backend\.env` already exists, do not overwrite it with `Copy-Item`; update its values deliberately. Configure `DATABASE_URL`, a new `JWT_SECRET_KEY`, and `CORS_ORIGINS=http://localhost:4200`. Use a dedicated development Neon branch/database and review the target before applying migrations. The frontend server starts without a working database; authenticated API access still requires the backend's PostgreSQL and JWT configuration.

## Checks

```powershell
npm test -- --watch=false
npm run build
```

See [BACKEND_API_GAPS.md](./BACKEND_API_GAPS.md) for implemented integrations and unavailable backend capabilities.
