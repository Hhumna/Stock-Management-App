"""
app/__init__.py
---------------
Application factory.

Usage
-----
  from app import create_app
  app = create_app()          # uses FLASK_ENV from .env
  app = create_app("testing") # override for tests
"""

from __future__ import annotations

import os

from flask import Flask, jsonify
from marshmallow import ValidationError as MarshmallowValidationError
from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError
from jwt.exceptions import ExpiredSignatureError, DecodeError

from .extensions import cors, db, jwt, migrate


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__, instance_relative_config=True)

    # ------------------------------------------------------------------
    # 1. Load configuration
    # ------------------------------------------------------------------
    from config import config_map  # noqa: PLC0415

    env = config_name or os.getenv("FLASK_ENV", "development")
    cfg_class = config_map.get(env, config_map["development"])
    app.config.from_object(cfg_class)

    # Ensure the instance folder exists (SQLite lives there)
    os.makedirs(app.instance_path, exist_ok=True)

    # ------------------------------------------------------------------
    # 2. Initialise extensions
    # ------------------------------------------------------------------
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    if app.config.get("DEBUG"):
        cors.init_app(app, origins="*", supports_credentials=True)
    else:
        cors.init_app(
            app,
            origins=app.config.get("CORS_ORIGINS", []),
            supports_credentials=True,
        )

    # ------------------------------------------------------------------
    # 3. Import models so Flask-Migrate / Alembic discovers all tables
    # ------------------------------------------------------------------
    with app.app_context():
        from app import models  # noqa: F401 — side-effect import

    # ------------------------------------------------------------------
    # 4. Register blueprints
    # ------------------------------------------------------------------
    _register_blueprints(app)

    # ------------------------------------------------------------------
    # 5. Register custom CLI commands
    # ------------------------------------------------------------------
    _register_cli(app)

    # ------------------------------------------------------------------
    # 6. Global error handlers — always return JSON, never HTML
    # ------------------------------------------------------------------
    _register_error_handlers(app)

    return app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register_cli(app: Flask) -> None:
    """Attach custom flask CLI commands to the app."""
    from .utils.seed import seed_db_command  # noqa: PLC0415
    app.cli.add_command(seed_db_command)


def _register_blueprints(app: Flask) -> None:
    """Import and register all route blueprints."""
    from .routes.health        import health_bp
    from .routes.auth          import auth_bp
    from .routes.products      import products_bp
    from .routes.categories    import categories_bp
    from .routes.suppliers     import suppliers_bp
    from .routes.transactions  import transactions_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp,          url_prefix="/api/auth")
    app.register_blueprint(products_bp,      url_prefix="/api/products")
    app.register_blueprint(categories_bp,    url_prefix="/api/categories")
    app.register_blueprint(suppliers_bp,     url_prefix="/api/suppliers")
    app.register_blueprint(transactions_bp,  url_prefix="/api/transactions")


def _register_error_handlers(app: Flask) -> None:
    """Register global JSON error handlers — replaces Flask's default HTML pages."""

    def _err(message: str, status: int, **extra):
        resp = {"success": False, "error": message}
        resp.update(extra)
        return jsonify(resp), status

    # Standard HTTP errors
    @app.errorhandler(400)
    def bad_request(e):
        return _err(str(e.description) if hasattr(e, "description") else "Bad request.", 400)

    @app.errorhandler(401)
    def unauthorized(e):
        return _err("Authentication required.", 401)

    @app.errorhandler(403)
    def forbidden(e):
        return _err("You do not have permission to perform this action.", 403)

    @app.errorhandler(404)
    def not_found(e):
        return _err(str(e.description) if hasattr(e, "description") else "Resource not found.", 404)

    @app.errorhandler(405)
    def method_not_allowed(e):
        return _err("Method not allowed.", 405)

    @app.errorhandler(409)
    def conflict(e):
        return _err(str(e.description) if hasattr(e, "description") else "Conflict.", 409)

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()  # ensure clean state after unexpected crash
        return _err("An internal server error occurred. Please try again later.", 500)

    # Marshmallow validation errors that bubble up unhandled
    @app.errorhandler(MarshmallowValidationError)
    def marshmallow_error(e):
        return _err("Validation failed.", 400, errors=e.messages)

    # JWT-specific errors
    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return _err("Your session has expired. Please log in again.", 401)

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return _err(f"Invalid token: {reason}", 422)

    @jwt.unauthorized_loader
    def missing_token(reason):
        return _err("Authorization token is missing.", 401)

    @jwt.revoked_token_loader
    def revoked_token(jwt_header, jwt_payload):
        return _err("This token has been revoked.", 401)
