"""
extensions.py
-------------
Instantiate Flask extensions here (no app object yet) to avoid circular imports.
Each extension is initialised with the app inside create_app() via init_app().
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db: SQLAlchemy = SQLAlchemy()
migrate: Migrate = Migrate()
jwt: JWTManager = JWTManager()
cors: CORS = CORS()
