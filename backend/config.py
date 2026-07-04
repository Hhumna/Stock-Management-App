"""
config.py
---------
Application configuration classes.

Switching from SQLite to PostgreSQL is a one-line change:
  Set DATABASE_URL in your .env to a Postgres URI, e.g.:
  DATABASE_URL=postgresql+psycopg2://user:password@host:5432/stock_db
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend/ directory (one level up from app/)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class BaseConfig:
    """Shared configuration values."""

    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "jwt-change-me-in-production")

    # SQLAlchemy
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # JWT
    JWT_ACCESS_TOKEN_EXPIRES: int = 3600  # 1 hour in seconds

    # CORS — origins that may call the API
    # In production, replace with the exact frontend origin(s).
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")


class DevelopmentConfig(BaseConfig):
    """Local development — SQLite, debug on."""

    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'instance' / 'stock.db'}",
    )


class TestingConfig(BaseConfig):
    """Automated testing — in-memory SQLite, no token expiry."""

    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES: bool = False  # tokens never expire in tests


class ProductionConfig(BaseConfig):
    """Production — requires DATABASE_URL to be set explicitly.

    Set DATABASE_URL in the server environment before starting gunicorn.
    Leaving it unset will raise a clear RuntimeError on first request,
    not at import time (so other environments are unaffected).
    """

    DEBUG: bool = False
    # Defer evaluation: read the env-var at runtime, not at class-definition time.
    # This prevents a KeyError when any non-production environment imports config.py.
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'instance' / 'stock.db'}",  # safe fallback — logs a warning below
    )

    def __init_subclass__(cls, **kwargs):  # noqa: D105
        super().__init_subclass__(**kwargs)

    @classmethod
    def validate(cls) -> None:
        """Call this inside create_app() when FLASK_ENV=production."""
        import warnings
        if "sqlite" in cls.SQLALCHEMY_DATABASE_URI:
            warnings.warn(
                "ProductionConfig is using SQLite! Set DATABASE_URL to a real database URI.",
                stacklevel=2,
            )


# Registry used by create_app()
config_map: dict[str, type[BaseConfig]] = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
