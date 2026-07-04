"""
app/routes/auth.py
------------------
Authentication routes.

POST /api/auth/register   — create account
POST /api/auth/login      — get access + refresh tokens
POST /api/auth/refresh    — rotate access token
GET  /api/auth/me         — current user profile
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from marshmallow import ValidationError

from app.extensions import db
from app.models import User, UserRole
from app.schemas import UserSchema, RegisterSchema, LoginSchema
from app.utils import success_response, error_response

auth_bp = Blueprint("auth", __name__)

_user_schema = UserSchema()
_register_schema = RegisterSchema()
_login_schema = LoginSchema()


def _make_tokens(user: User) -> tuple[str, str]:
    """Create an access + refresh token pair for *user*."""
    additional_claims = {"role": user.role.value, "name": user.name}
    # JWT identity must be a string
    access  = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh = create_refresh_token(identity=str(user.id))
    return access, refresh


# ---------------------------------------------------------------------------
# POST /register
# ---------------------------------------------------------------------------

@auth_bp.post("/register")
def register():
    """Create a new user account.

    Body
    ----
    name, email, password, role (optional; only respected if caller has admin JWT)
    """
    json_body = request.get_json(silent=True) or {}

    try:
        data = _register_schema.load(json_body)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    # Only allow role selection if the request carries a valid admin token
    requested_role = data.get("role", "staff")
    final_role = UserRole.staff  # safe default

    try:
        verify_jwt = __import__("flask_jwt_extended", fromlist=["verify_jwt_in_request"])
        verify_jwt.verify_jwt_in_request(optional=True)
        claims = get_jwt()
        if claims.get("role") == "admin" and requested_role == "admin":
            final_role = UserRole.admin
    except Exception:  # noqa: BLE001
        pass  # no / invalid JWT → role stays "staff"

    # Check e-mail uniqueness
    if User.query.filter_by(email=data["email"].lower()).first():
        return error_response("An account with this email already exists.", 409)

    user = User(
        name  = data["name"],
        email = data["email"].lower(),
        role  = final_role,
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    access, refresh = _make_tokens(user)
    return success_response(
        data={
            "user":          _user_schema.dump(user),
            "access_token":  access,
            "refresh_token": refresh,
        },
        message="Account created successfully.",
        status_code=201,
    )


# ---------------------------------------------------------------------------
# POST /login
# ---------------------------------------------------------------------------

@auth_bp.post("/login")
def login():
    """Authenticate and receive JWT tokens."""
    json_body = request.get_json(silent=True) or {}

    try:
        data = _login_schema.load(json_body)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    user = User.query.filter_by(email=data["email"].lower()).first()
    if not user or not user.check_password(data["password"]):
        return error_response("Invalid email or password.", 401)

    access, refresh = _make_tokens(user)
    return success_response(
        data={
            "user":          _user_schema.dump(user),
            "access_token":  access,
            "refresh_token": refresh,
        },
        message="Login successful.",
    )


# ---------------------------------------------------------------------------
# POST /refresh
# ---------------------------------------------------------------------------

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    """Return a new access token using a valid refresh token."""
    user_id = get_jwt_identity()
    user    = db.session.get(User, int(user_id))
    if not user:
        return error_response("User not found.", 404)

    additional_claims = {"role": user.role.value, "name": user.name}
    new_access = create_access_token(identity=user_id, additional_claims=additional_claims)
    return success_response(
        data={"access_token": new_access},
        message="Token refreshed.",
    )


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------

@auth_bp.get("/me")
@jwt_required()
def me():
    """Return the currently authenticated user's profile."""
    user_id = get_jwt_identity()
    user    = db.session.get(User, int(user_id))
    if not user:
        return error_response("User not found.", 404)

    return success_response(
        data={"user": _user_schema.dump(user)},
        message="Profile retrieved.",
    )
