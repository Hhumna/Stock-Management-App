"""
app/schemas/transaction.py
--------------------------
Marshmallow schemas for StockTransaction.

TransactionSchema      — dump (list / detail responses).
TransactionWriteSchema — load-only for POST /api/transactions.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE


class TransactionSchema(Schema):
    """Serialise a StockTransaction for API responses."""

    class Meta:
        unknown = EXCLUDE

    id           = fields.Int(dump_only=True)
    product_id   = fields.Int(dump_only=True)
    type         = fields.Method("get_type", dump_only=True)
    quantity     = fields.Int(dump_only=True)
    reason       = fields.Str(dump_only=True, allow_none=True)
    performed_by = fields.Int(dump_only=True, allow_none=True)
    timestamp    = fields.DateTime(dump_only=True, format="iso")

    def get_type(self, obj) -> str:  # noqa: D102
        return obj.type.value if hasattr(obj.type, "value") else str(obj.type)


class TransactionWriteSchema(Schema):
    """Validate POST /api/transactions request body.

    Notes
    -----
    - ``performed_by`` is NOT accepted from the request body — it is always
      pulled from the JWT identity in the route handler.
    - ``quantity`` must be a positive integer.
    """

    class Meta:
        unknown = EXCLUDE

    product_id = fields.Int(
                     required=True,
                     error_messages={"required": "product_id is required."},
                 )
    type       = fields.Str(
                     required=True,
                     validate=validate.OneOf(["IN", "OUT"], error="type must be 'IN' or 'OUT'."),
                 )
    quantity   = fields.Int(
                     required=True,
                     validate=validate.Range(min=1, error="quantity must be a positive integer."),
                 )
    reason     = fields.Str(
                     load_default=None,
                     allow_none=True,
                     validate=validate.Length(max=200),
                 )

    @validates("quantity")
    def positive(self, value: int) -> int:  # noqa: D102
        if value <= 0:
            raise ValidationError("quantity must be a positive integer.")
        return value
