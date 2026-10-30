from collections.abc import Generator
from threading import Lock

from sqlalchemy import Engine, create_engine
from sqlalchemy.exc import ArgumentError
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, get_settings

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None
_engine_lock = Lock()


def normalize_database_url(database_url: str) -> str:
    try:
        url = make_url(database_url)
    except ArgumentError as exc:
        raise ValueError("DATABASE_URL is not a valid SQLAlchemy URL") from exc

    if url.drivername in {"postgres", "postgresql", "postgresql+psycopg2"}:
        url = url.set(drivername="postgresql+psycopg")
    elif url.drivername != "postgresql+psycopg":
        raise ValueError("DATABASE_URL must use PostgreSQL with the psycopg 3 driver")

    if not url.host or not url.database or not url.username:
        raise ValueError("DATABASE_URL must include a PostgreSQL host, database, and username")
    return url.render_as_string(hide_password=False)


def configure_database(settings: Settings | None = None) -> Engine:
    global _engine, _session_factory
    selected_settings = settings or get_settings()
    if not selected_settings.database_url.strip():
        raise RuntimeError("DATABASE_URL must be configured before starting the application")
    normalized_url = normalize_database_url(selected_settings.database_url)

    with _engine_lock:
        if _engine is None:
            _engine = create_engine(
                normalized_url,
                pool_size=selected_settings.db_pool_size,
                max_overflow=selected_settings.db_max_overflow,
                pool_timeout=selected_settings.db_pool_timeout,
                pool_recycle=selected_settings.db_pool_recycle,
                pool_pre_ping=True,
                pool_use_lifo=True,
                connect_args={"connect_timeout": selected_settings.db_connect_timeout},
            )
            _session_factory = sessionmaker(
                bind=_engine,
                class_=Session,
                autoflush=False,
                expire_on_commit=False,
            )
        return _engine


def get_session_factory() -> sessionmaker[Session]:
    factory = _session_factory
    if factory is None:
        configure_database()
        factory = _session_factory
    if factory is None:
        raise RuntimeError("Database session factory could not be initialized")
    return factory


def get_db() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def dispose_database() -> None:
    global _engine, _session_factory
    with _engine_lock:
        if _engine is not None:
            _engine.dispose()
        _engine = None
        _session_factory = None
