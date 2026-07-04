"""
app/schemas/product.py
-----------------------
Marshmallow schemas for Product.

ProductSchema       — list/create/update (flat foreign keys).
ProductDetailSchema — single product with nested category + supplier info.
ProductWriteSchema  — load-only for create/update (quantity NOT writable here).
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE

from .category import CategorySchema
from .supplier import SupplierSchema


class ProductSchema(Schema):
    """Flat product representation — used in list responses."""

    class Meta:
        unknown = EXCLUDE

    id            = fields.Int(dump_only=True)
    name          = fields.Str(
                        required=True,
                        validate=validate.Length(min=1, max=200, error="Name must be 1–200 characters."),
                    )
    sku           = fields.Str(
                        required=True,
                        validate=validate.Length(min=1, max=100, error="SKU must be 1–100 characters."),
                    )
    category_id   = fields.Int(load_default=None, allow_none=True)
    supplier_id   = fields.Int(load_default=None, allow_none=True)
    quantity      = fields.Int(dump_only=True)          # read-only — only changes via transactions
    reorder_level = fields.Int(load_default=10, validate=validate.Range(min=0))
    unit_price    = fields.Decimal(
                        required=True,
                        as_string=True,
                        validate=validate.Range(min=0, error="Unit price must be >= 0."),
                    )
    is_low_stock  = fields.Bool(dump_only=True)
    created_at    = fields.DateTime(dump_only=True, format="iso")
    updated_at    = fields.DateTime(dump_only=True, format="iso")


class ProductDetailSchema(ProductSchema):
    """Single-product response with nested category and supplier objects,
    plus recent transactions (injected by the route as a plain list)."""

    category     = fields.Nested(CategorySchema, dump_only=True, allow_none=True)
    supplier     = fields.Nested(SupplierSchema, dump_only=True, allow_none=True)
    recent_transactions = fields.List(fields.Dict(), dump_only=True)


class ProductWriteSchema(Schema):
    """Load-only schema for POST / PUT — quantity is intentionally excluded."""

    class Meta:
        unknown = EXCLUDE

    name          = fields.Str(
                        required=True,
                        validate=validate.Length(min=1, max=200),
                    )
    sku           = fields.Str(
                        required=True,
                        validate=validate.Length(min=1, max=100),
                    )
    category_id   = fields.Int(load_default=None, allow_none=True)
    supplier_id   = fields.Int(load_default=None, allow_none=True)
    reorder_level = fields.Int(load_default=10, validate=validate.Range(min=0))
    unit_price    = fields.Decimal(
                        required=True,
                        as_string=True,
                        validate=validate.Range(min=0),
                    )

    @validates("unit_price")
    def validate_price(self, value):  # noqa: D102
        if value < 0:
            raise ValidationError("Unit price must be non-negative.")
        return value
