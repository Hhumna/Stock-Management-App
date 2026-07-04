"""
app/models/category.py
----------------------
Category model — groups products into logical families.
"""

from datetime import datetime, timezone

from app.extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(120), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    created_at  = db.Column(
                      db.DateTime(timezone=True),
                      nullable=False,
                      default=lambda: datetime.now(timezone.utc),
                  )

    # One-to-many: a category has many products
    products = db.relationship(
        "Product",
        back_populates="category",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        return {
            "id":          self.id,
            "name":        self.name,
            "description": self.description,
            "created_at":  self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name!r}>"
