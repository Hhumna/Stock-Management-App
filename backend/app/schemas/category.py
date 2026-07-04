"""
app/schemas/category.py
-----------------------
Marshmallow schemas for Category.

CategorySchema         — full dump + load (create/update).
CategoryDetailSchema   — dump with product_count (GET /<id>).
"""

from marshmallow import Schema, fields, validate, EXCLUDE


class CategorySchema(Schema):
    class Meta:
        unknown = EXCLUDE

    id          = fields.Int(dump_only=True)
    name        = fields.Str(
                      required=True,
                      validate=validate.Length(min=1, max=120, error="Name must be 1–120 characters."),
                  )
    description = fields.Str(load_default=None, allow_none=True)
    created_at  = fields.DateTime(dump_only=True, format="iso")


class CategoryDetailSchema(CategorySchema):
    """Extends CategorySchema with a product count (computed by the route)."""

    product_count = fields.Int(dump_only=True)
