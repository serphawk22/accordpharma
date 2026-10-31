import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.crm import router as crm_router
from app.api.operations import router as operations_router
from app.api.dashboard import router as dashboard_router
from app.api.restricted import router as restricted_router
from app.api.audit import router as audit_router
from app.api.sales_accounts import router as sales_accounts_router
from app.api.sales_management import router as sales_management_router
from app.api.sales_work import router as sales_work_router
from app.api.pharma_commercial import router as pharma_commercial_router
from app.api.routes import router
from app.config import get_settings
from app.core.security import validate_auth_configuration
from app.db.session import configure_database, dispose_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    validate_auth_configuration(settings)
    configure_database(settings)
    try:
        yield
    finally:
        dispose_database()


app = FastAPI(title="Accord Pharma API", version="0.1.0", lifespan=lifespan)

settings = get_settings()
raw_origins = [
    origin.strip().rstrip("/")
    for origin in settings.cors_origins.split(",")
    if origin.strip()
]
default_origins = [
    "https://accordpharma.vercel.app",
    "https://accordpharma-production.up.railway.app",
    "http://localhost:3000",
    "http://localhost:4200",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4200",
]
if settings.frontend_url:
    default_origins.append(settings.frontend_url.strip().rstrip("/"))
if settings.backend_url:
    default_origins.append(settings.backend_url.strip().rstrip("/"))

# Deduplicate origins while preserving order
cors_origins = list(dict.fromkeys([o for o in raw_origins + default_origins if o and o != "*"]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/")
def root():
    st = get_settings()
    return {
        "status": "online",
        "service": "Accord Pharma API",
        "version": "0.1.0",
        "frontend": st.frontend_url,
        "docs": "/docs",
        "health": "/health",
        "api_v1_health": "/api/v1/health",
    }


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(router)
app.include_router(auth_router)
app.include_router(crm_router)
app.include_router(operations_router)
app.include_router(dashboard_router)
app.include_router(restricted_router)
app.include_router(audit_router)
app.include_router(sales_work_router)
app.include_router(sales_accounts_router)
app.include_router(sales_management_router)
app.include_router(pharma_commercial_router)
