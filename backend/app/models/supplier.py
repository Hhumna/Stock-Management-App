"""
app/models/supplier.py
----------------------
Supplier model — companies or individuals who supply stock.
"""

from datetime import datetime, timezone

from app.extensions import db


class Supplier(db.Model):
    __tablename__ = "suppliers"

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(200), nullable=False)
    contact_email = db.Column(db.String(200), nullable=False)
    phone         = db.Column(db.String(50), nullable=False)
    address       = db.Column(db.Text, nullable=True)
    created_at    = db.Column(
                        db.DateTime(timezone=True),
                        nullable=False,
                        default=lambda: datetime.now(timezone.utc),
                    )

    # One-to-many: a supplier can supply many products
    products = db.relationship(
        "Product",
        back_populates="supplier",
        lazy="dynamic",
    )

    def to_dict(self) -> dict:
        return {
            "id":            self.id,
            "name":          self.name,
            "contact_email": self.contact_email,
            "phone":         self.phone,
            "address":       self.address,
            "created_at":    self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Supplier id={self.id} name={self.name!r}>"
