"""
routes/health.py
----------------
Health-check endpoint — the very first thing to verify after startup.

GET /api/health  →  200 {"status": "ok", "message": "Stock Management API is running"}
"""

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health_check():
    """Return a simple liveness signal.

    Test via curl:
        curl http://localhost:5000/api/health
        curl http://<your-lan-ip>:5000/api/health
    """
    return jsonify({"status": "ok", "message": "Stock Management API is running"}), 200
