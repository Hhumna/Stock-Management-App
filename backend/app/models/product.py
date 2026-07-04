"""
app/models/product.py
---------------------
Product model — the core inventory item with stock tracking and low-stock detection.
"""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.hybrid import hybrid_property

from app.extensions import db


class Product(db.Model):
    __tablename__ = "products"

    # ------------------------------------------------------------------
    # Columns
    # ------------------------------------------------------------------
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(200), nullable=False)
    sku           = db.Column(db.String(100), nullable=False, unique=True, index=True)
    category_id   = db.Column(
                        db.Integer,
                        db.ForeignKey("categories.id", ondelete="SET NULL"),
                        nullable=True,
                        index=True,
                    )
    supplier_id   = db.Column(
                        db.Integer,
                        db.ForeignKey("suppliers.id", ondelete="SET NULL"),
                        nullable=True,
                        index=True,
                    )
    quantity      = db.Column(db.Integer, nullable=False, default=0)
    reorder_level = db.Column(db.Integer, nullable=False, default=10)
    unit_price    = db.Column(db.Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    created_at    = db.Column(
                        db.DateTime(timezone=True),
                        nullable=False,
                        default=lambda: datetime.now(timezone.utc),
                    )
    updated_at    = db.Column(
                        db.DateTime(timezone=True),
                        nullable=False,
                        default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc),
                    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    category     = db.relationship("Category", back_populates="products")
    supplier     = db.relationship("Supplier", back_populates="products")
    transactions = db.relationship(
        "StockTransaction",
        back_populates="product",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    # ------------------------------------------------------------------
    # Table-level indexes
    # ------------------------------------------------------------------
    __table_args__ = (
        db.Index("ix_products_category_id", "category_id"),
    )

    # ------------------------------------------------------------------
    # Computed property
    # ------------------------------------------------------------------

    @hybrid_property
    def is_low_stock(self) -> bool:
        """True when current quantity is at or below the reorder level."""
        return self.quantity <= self.reorder_level

    @is_low_stock.expression
    def is_low_stock(cls):  # noqa: N805
        """SQLAlchemy expression for filtering low-stock products in queries."""
        return cls.quantity <= cls.reorder_level

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "id":            self.id,
            "name":          self.name,
            "sku":           self.sku,
            "category_id":   self.category_id,
            "supplier_id":   self.supplier_id,
            "quantity":      self.quantity,
            "reorder_level": self.reorder_level,
            "unit_price":    str(self.unit_price),
            "is_low_stock":  self.is_low_stock,
            "created_at":    self.created_at.isoformat(),
            "updated_at":    self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return (
            f"<Product id={self.id} sku={self.sku!r} "
            f"qty={self.quantity} low_stock={self.is_low_stock}>"
        )
