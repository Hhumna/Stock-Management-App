"""
app/models/user.py
------------------
User model — supports admin and staff roles with secure password hashing.
"""

from datetime import datetime, timezone
import enum

from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db


class UserRole(enum.Enum):
    admin = "admin"
    staff = "staff"


class User(db.Model):
    __tablename__ = "users"

    id           = db.Column(db.Integer, primary_key=True)
    name         = db.Column(db.String(120), nullable=False)
    email        = db.Column(db.String(200), nullable=False, unique=True, index=True)
    password_hash= db.Column(db.String(256), nullable=False)
    role         = db.Column(
                       db.Enum(UserRole),
                       nullable=False,
                       default=UserRole.staff,
                   )
    created_at   = db.Column(
                       db.DateTime(timezone=True),
                       nullable=False,
                       default=lambda: datetime.now(timezone.utc),
                   )

    # Relationships
    transactions = db.relationship(
        "StockTransaction",
        back_populates="performed_by_user",
        lazy="dynamic",
    )

    # ------------------------------------------------------------------
    # Password helpers
    # ------------------------------------------------------------------

    def set_password(self, password: str) -> None:
        """Hash and store a plain-text password. Never store the raw value."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Return True if *password* matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    # ------------------------------------------------------------------
    # Serialisation guard — password_hash must NEVER appear in output
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Return a safe dict representation — password_hash is excluded."""
        return {
            "id":         self.id,
            "name":       self.name,
            "email":      self.email,
            "role":       self.role.value,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role.value!r}>"
