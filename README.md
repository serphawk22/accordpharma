# Accord Pharma CRM API

This repository contains a FastAPI CRM backend using Neon PostgreSQL as its only application database. It does not fall back to SQLite or another provider. The current implementation includes authentication and role checks, scoped CRM endpoints, a PostgreSQL health check, and a schema for CRM, inventory, support, compliance, AI/automation metadata, approvals, and audit records. OpenAPI/Swagger is served at `/docs`.

## Angular frontend

The `frontend/` directory contains the PharmaConnect CRM Angular application. It can be started without Neon; API-backed pages display a connection error when FastAPI is unavailable. Run `cd frontend; npm install; npm start` in a second terminal and open `http://localhost:4200`. For full API functionality, configure and start the backend as described below, and set `CORS_ORIGINS=http://localhost:4200` in `backend/.env`.

The current frontend integrates authentication, dashboard, CRM, orders, inventory/lot viewing, tenders, support, notifications, pharmacovigilance, user listing/creation, and audit reads. Features without backend endpoints are identified rather than simulated. See [frontend/BACKEND_API_GAPS.md](./frontend/BACKEND_API_GAPS.md).

## Prerequisites

- Python 3.11 or newer.
- A Neon PostgreSQL project and its connection string.
- SMTP credentials if password-reset email delivery is required.

## Local development setup

1. Create a Neon PostgreSQL project and copy its connection URL. Rotate credentials that have been shared outside the backend secret store.
2. From the repository root, create and activate a virtual environment and install dependencies:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

3. Set `DATABASE_URL` in `backend/.env` to the Neon connection URL. Keep credentials only in this backend file. Generate a new JWT secret locally, for example:

   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

   Put the generated value in `JWT_SECRET_KEY`. Do not use a short or example value.
4. Configure CORS with exact browser origins in `CORS_ORIGINS`. For local Angular development, `http://localhost:4200` is the example default. Wildcard origins are rejected.
5. Review the migration and apply it explicitly:

   ```powershell
   alembic upgrade head
   ```

   The application never runs migrations automatically. Do not run downgrade/reset/drop commands against a production database. The new CRM/auth migration is forward-only.
6. Create the initial administrator interactively. A 12-character minimum password is required; only an Argon2 hash is stored:

   ```powershell
   python -m app.cli create-admin
   ```

7. To populate a development database with fictional data, first set `APP_ENV=development` and `ALLOW_DEMO_SEED=true` in that development environment only. Then run:

   ```powershell
   python -m app.cli seed-demo --records 100
   ```

   The command prompts for a strong password for fictional role accounts. To seed records under the existing super-admin without creating demo logins, add `--use-existing-admin`. It creates at least 100 linked, fictional records per CRM and operations data table; it is repeatable and does not remove or overwrite existing records. Restricted safety-report examples contain synthetic placeholders only. AI and automation executions are simulation records and do not call external services. Authentication and role reference tables are not bulk-seeded. Never enable demo seeding on a production database.
8. Start the API:

   ```powershell
   uvicorn app.main:app --reload
   ```

9. Verify the live PostgreSQL connection:

   ```powershell
   Invoke-RestMethod http://localhost:8000/api/v1/health
   ```

   The endpoint runs `SELECT 1`; a failed database check returns HTTP 503 and does not reveal credentials, hostnames, or exception details.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required Neon PostgreSQL URL; never expose it to the frontend. |
| `TEST_DATABASE_URL` | Separate disposable PostgreSQL database used only by opt-in integration tests. |
| `ALLOW_TEST_DB_SCHEMA_DROP` | Must be `true` to allow integration tests to create and drop their uniquely named temporary schema in `TEST_DATABASE_URL`. |
| `APP_ENV` | Runtime environment. Demo seeding only works when set to `development`. |
| `ALLOW_DEMO_SEED` | Must be `true` to run the explicit fictional demo seed command. |
| `JWT_SECRET_KEY` | Random secret of at least 32 bytes for signed access tokens. |
| `ACCESS_TOKEN_MINUTES` | Short-lived access-token lifetime, default 15 minutes. |
| `REFRESH_TOKEN_DAYS` | Rotating refresh-token lifetime; only token hashes are stored. |
| `PASSWORD_RESET_MINUTES` | One-use reset token expiry. |
| `FRONTEND_URL`, `BACKEND_URL` | Public application URLs. Password reset links use `FRONTEND_URL`. |
| `CORS_ORIGINS` | Comma-separated explicit browser origins; `*` is prohibited. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_TLS` | Backend SMTP delivery for password resets. Reset tokens are never returned by the public API. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Reserved for a future AI integration phase; neither is returned to clients. |
| `LOG_LEVEL` | Backend log level. Passwords, reset tokens, JWTs, and database URLs must not be logged. |
| `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`, `DB_POOL_RECYCLE`, `DB_CONNECT_TIMEOUT` | Small hosted-PostgreSQL pool and timeout settings. |

`postgresql://` connection URLs are normalized to the psycopg 3 SQLAlchemy dialect while preserving query options, including Neon pooler options. Direct and pooler URLs are accepted as supplied; use a separate Neon branch/project for development and testing.

## Authentication

The login endpoint returns a short-lived bearer access token and a rotating opaque refresh token. Keep both on the client securely; never put them in logs or URLs. Refresh tokens are stored as hashes, rotated on refresh, and revoked on logout, password changes, reset, and account deactivation. Reuse of a revoked refresh token revokes the user's outstanding refresh sessions.

Example login:

```powershell
$body = @{ email = "admin@example.invalid"; password = "<your-password>" } | ConvertTo-Json
$tokens = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/auth/login -ContentType "application/json" -Body $body
$headers = @{ Authorization = "Bearer $($tokens.access_token)" }
Invoke-RestMethod -Headers $headers http://localhost:8000/api/v1/auth/me
```

Password reset delivery requires SMTP settings. If SMTP is not configured or delivery fails, the public forgot-password endpoint still returns the same generic response, and no reset token is exposed. Login attempts are rate limited in PostgreSQL by a hashed account/IP key (eight failures per 15-minute window).

## API overview

All application endpoints are under `/api/v1`:

- Authentication: `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me`.
- Users: `GET/POST /users`, `GET/PATCH /users/{user_id}`, `PATCH /users/{user_id}/status`.
- Dashboard: `/dashboard/summary`, `/dashboard/sales-performance`, `/dashboard/pipeline`, `/dashboard/recent-activities`, `/dashboard/alerts`.
- CRM: `/accounts`, `/contacts`, `/opportunities`, `/products`, including the documented detail and create/update operations, and opportunity activity history.
- Commerce and operations: `/orders`, `/inventory`, `/tenders`, `/support/tickets`, and `/notifications`.
- Restricted safety data: `/pharmacovigilance/intakes` is isolated to pharmacovigilance officers and super administrators, with reads and status changes audited.
- `GET /health` checks database connectivity.

Use `/docs` for request/response schemas and the complete route list. Protected records are scoped by ownership, territory, or module role where available. Account removal archives records. Orders can only be submitted when an assigned distributor and sufficient stock are available; shipment, delivery, invoicing, and payment states are intentionally not represented. Inventory changes create traceable movements and use atomic PostgreSQL balance updates to reject negative stock. Pharmaceutical adjustments require lot numbers, and order reservations consume non-expired lots by earliest expiry first. Lot balances are available at `/inventory/lots`. Idempotency keys are supported for order creation and inventory adjustments.

## Tests

From `backend`:

```powershell
python -m pytest
python -m compileall -q app migrations tests
```

Unit tests do not connect to a database. PostgreSQL integration tests require all of the following:

1. `TEST_DATABASE_URL` points to a dedicated disposable PostgreSQL database.
2. `DATABASE_URL` is configured separately so tests can verify the host/database differ.
3. `ALLOW_TEST_DB_SCHEMA_DROP=true` is explicitly set for the test process.

Integration tests apply Alembic migrations inside a randomly named schema and drop only that schema at teardown. Never point `TEST_DATABASE_URL` at production.

## Security and known limitations

- Keep `.env` out of source control. Never put database/API secrets in Angular configuration or API responses.
- Users and roles are enforced in dependencies; sales records use assigned-user or territory scoping, distributor records use explicit manager assignment, support notes hide internal comments from non-support users, and pharmacovigilance data has a separate route and role policy.
- Audit entries are written for implemented sensitive/business actions. No public audit-event mutation API is provided.
- This is an initial CRM backend, not an audited pharmaceutical production deployment. External identity verification, formal account recovery operations, security monitoring, and operational retention/backups still need organization-specific review.
- SMTP reset email is synchronous; deploy a monitored mail delivery provider and configure TLS.
- AI SDK calls and workflows are not implemented in this phase. Restricted safety data is not connected to AI.
- No live Neon connection or migration was run as part of this change.

## Troubleshooting

- `DATABASE_URL must be configured`: copy the Neon URL into `backend/.env`, ensure it is a PostgreSQL URL, and do not fall back to SQLite.
- Authentication startup fails: set a random `JWT_SECRET_KEY` of at least 32 bytes.
- Password reset requests do not arrive: configure SMTP values and verify outbound connectivity; the public API intentionally does not reveal whether the address exists.
- `alembic upgrade head` fails: inspect the reported PostgreSQL error, confirm the target Neon branch, and review migrations before retrying. Do not reset the database.
- Integration tests are skipped: configure the dedicated test database, a different primary database, and the explicit schema-drop opt-in.
