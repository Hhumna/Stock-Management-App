"""
app/schemas/user.py
-------------------
Marshmallow schemas for User serialisation and deserialisation.

UserSchema        — safe dump (no password_hash), used for all responses.
RegisterSchema    — load-only for POST /api/auth/register.
LoginSchema       — load-only for POST /api/auth/login.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE


class UserSchema(Schema):
    """Serialise a User instance for API responses.  password_hash is NEVER included."""

    class Meta:
        unknown = EXCLUDE  # ignore extra keys on load

    id         = fields.Int(dump_only=True)
    name       = fields.Str(dump_only=True)
    email      = fields.Email(dump_only=True)
    role       = fields.Method("get_role", dump_only=True)
    created_at = fields.DateTime(dump_only=True, format="iso")

    def get_role(self, obj) -> str:  # noqa: D102
        return obj.role.value if hasattr(obj.role, "value") else str(obj.role)


class RegisterSchema(Schema):
    """Validate POST /api/auth/register request body."""

    class Meta:
        unknown = EXCLUDE

    name     = fields.Str(
                   required=True,
                   validate=validate.Length(min=1, max=120, error="Name must be 1–120 characters."),
               )
    email    = fields.Email(required=True, error_messages={"required": "Email is required."})
    password = fields.Str(
                   required=True,
                   validate=validate.Length(min=6, error="Password must be at least 6 characters."),
                   load_only=True,
               )
    role     = fields.Str(
                   load_default="staff",
                   validate=validate.OneOf(["admin", "staff"], error="Role must be 'admin' or 'staff'."),
               )

    @validates("email")
    def validate_email_format(self, value: str) -> str:  # noqa: D102
        return value.lower().strip()


class LoginSchema(Schema):
    """Validate POST /api/auth/login request body."""

    class Meta:
        unknown = EXCLUDE

    email    = fields.Email(required=True, error_messages={"required": "Email is required."})
    password = fields.Str(required=True, load_only=True, error_messages={"required": "Password is required."})
