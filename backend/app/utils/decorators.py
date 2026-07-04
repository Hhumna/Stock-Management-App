"""
app/utils/decorators.py
-----------------------
Reusable route decorators.

admin_required
    Wraps a route so that it first verifies a valid JWT **and** checks that the
    caller's role claim equals "admin".  Returns 403 if the role check fails.

Usage
-----
    from app.utils.decorators import admin_required

    @bp.delete("/<int:id>")
    @admin_required
    def delete_item(id):
        ...
"""

from __future__ import annotations

from functools import wraps
from typing import Callable

from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def admin_required(fn: Callable) -> Callable:
    """Decorator: require a valid JWT whose role claim is ``"admin"``."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        # verify_jwt_in_request will abort with 401/422 if the token is missing/invalid
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "admin":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Admin access required.",
                    }
                ),
                403,
            )
        return fn(*args, **kwargs)

    return wrapper
