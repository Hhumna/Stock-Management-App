"""
app/models/stock_transaction.py
--------------------------------
StockTransaction model — records every inventory movement (IN or OUT).
"""

from datetime import datetime, timezone
import enum

from app.extensions import db


class TransactionType(enum.Enum):
    IN  = "IN"
    OUT = "OUT"


class StockTransaction(db.Model):
    __tablename__ = "stock_transactions"

    id           = db.Column(db.Integer, primary_key=True)
    product_id   = db.Column(
                       db.Integer,
                       db.ForeignKey("products.id", ondelete="CASCADE"),
                       nullable=False,
                       index=True,
                   )
    type         = db.Column(
                       db.Enum(TransactionType),
                       nullable=False,
                   )
    quantity     = db.Column(db.Integer, nullable=False)  # always positive
    reason       = db.Column(db.String(200), nullable=True)
    performed_by = db.Column(
                       db.Integer,
                       db.ForeignKey("users.id", ondelete="SET NULL"),
                       nullable=True,
                       index=True,
                   )
    timestamp    = db.Column(
                       db.DateTime(timezone=True),
                       nullable=False,
                       default=lambda: datetime.now(timezone.utc),
                       index=True,
                   )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    product           = db.relationship("Product",  back_populates="transactions")
    performed_by_user = db.relationship("User",     back_populates="transactions")

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "product_id":   self.product_id,
            "type":         self.type.value,
            "quantity":     self.quantity,
            "reason":       self.reason,
            "performed_by": self.performed_by,
            "timestamp":    self.timestamp.isoformat(),
        }

    def __repr__(self) -> str:
        return (
            f"<StockTransaction id={self.id} "
            f"product_id={self.product_id} "
            f"type={self.type.value!r} "
            f"qty={self.quantity}>"
        )
