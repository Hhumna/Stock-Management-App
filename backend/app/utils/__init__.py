"""
utils/__init__.py
-----------------
Utility helpers shared across blueprints.

Functions defined here:
  - success_response(data, message, status_code)  → standard JSON envelope
  - error_response(message, status_code)          → standard error JSON envelope
  - paginate(query, schema, page, per_page)       → paginated result dict
"""

from flask import jsonify
from flask.wrappers import Response


# ---------------------------------------------------------------------------
# Response formatting
# ---------------------------------------------------------------------------

def success_response(
    data=None,
    message: str = "Success",
    status_code: int = 200,
) -> tuple[Response, int]:
    """Return a standardised success JSON response.

    Shape
    -----
    {
        "success": true,
        "message": "...",
        "data": { ... }   // or null
    }
    """
    payload = {
        "success": True,
        "message": message,
        "data": data,
    }
    return jsonify(payload), status_code


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    errors=None,
) -> tuple[Response, int]:
    """Return a standardised error JSON response.

    Shape
    -----
    {
        "success": false,
        "message": "...",
        "errors": { ... }  // or null
    }
    """
    payload = {
        "success": False,
        "message": message,
        "errors": errors,
    }
    return jsonify(payload), status_code


# ---------------------------------------------------------------------------
# Pagination helper (to be wired up when models exist)
# ---------------------------------------------------------------------------

def paginate(query, schema, page: int = 1, per_page: int = 20) -> dict:
    """Paginate a SQLAlchemy query and serialise results via a Marshmallow schema.

    Parameters
    ----------
    query:
        A SQLAlchemy ``Query`` object (not yet executed).
    schema:
        An instantiated Marshmallow schema with ``many=True``.
    page:
        Current page number (1-indexed).
    per_page:
        Number of items per page.

    Returns
    -------
    dict
        ``{"items": [...], "total": int, "pages": int, "page": int, "per_page": int}``
    """
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": schema.dump(pagination.items),
        "total": pagination.total,
        "pages": pagination.pages,
        "page": pagination.page,
        "per_page": pagination.per_page,
    }
