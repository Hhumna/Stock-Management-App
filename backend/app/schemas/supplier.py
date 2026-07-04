"""
app/schemas/supplier.py
-----------------------
Marshmallow schemas for Supplier.
"""

from marshmallow import Schema, fields, validate, EXCLUDE


class SupplierSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    id            = fields.Int(dump_only=True)
    name          = fields.Str(
                        required=True,
                        validate=validate.Length(min=1, max=200, error="Name must be 1–200 characters."),
                    )
    contact_email = fields.Email(required=True, error_messages={"required": "Contact email is required."})
    phone         = fields.Str(
                        required=True,
                        validate=validate.Length(min=1, max=50, error="Phone must be 1–50 characters."),
                    )
    address       = fields.Str(load_default=None, allow_none=True)
    created_at    = fields.DateTime(dump_only=True, format="iso")
