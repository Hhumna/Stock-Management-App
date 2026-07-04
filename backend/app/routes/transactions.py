"""
app/routes/transactions.py
--------------------------
Stock transaction routes.

POST /api/transactions/     — record a stock movement (atomic: txn + qty update)
GET  /api/transactions/     — paginated list with filters
GET  /api/transactions/<id> — single transaction detail
"""

from datetime import datetime, timezone
import csv
import io

from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import Product, StockTransaction, TransactionType, User
from app.schemas import TransactionSchema, TransactionWriteSchema
from app.utils import success_response, error_response

transactions_bp = Blueprint("transactions", __name__)

_schema      = TransactionSchema()
_schema_many = TransactionSchema(many=True)
_write       = TransactionWriteSchema()


# ---------------------------------------------------------------------------
# POST /
# ---------------------------------------------------------------------------

@transactions_bp.post("/")
@jwt_required()
def create_transaction():
    """Record a stock movement atomically.

    Rules
    -----
    - Type IN  : always allowed; adds to product.quantity.
    - Type OUT : rejected with 400 if requested qty > current stock.
    - performed_by is taken from the JWT identity (never from the request body).
    - The StockTransaction insert and the Product.quantity update run inside a
      single DB transaction so they succeed or fail together.
    """
    json_body = request.get_json(silent=True) or {}

    try:
        data = _write.load(json_body)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    user_id    = int(get_jwt_identity())
    product_id = data["product_id"]
    qty        = data["quantity"]
    tx_type    = TransactionType[data["type"]]   # "IN" / "OUT" → enum
    reason     = data.get("reason")

    # Fetch product — lock the row for update to avoid race conditions
    product = db.session.get(Product, product_id)
    if not product:
        return error_response(f"Product {product_id} not found.", 404)

    # Validate stock availability for OUT movements
    if tx_type == TransactionType.OUT:
        if qty > product.quantity:
            return error_response(
                f"Insufficient stock. Requested {qty} but only "
                f"{product.quantity} unit(s) available.",
                400,
            )

    # --- Atomic update inside a single DB transaction ---
    try:
        txn = StockTransaction(
            product_id   = product_id,
            type         = tx_type,
            quantity     = qty,
            reason       = reason,
            performed_by = user_id,
            timestamp    = datetime.now(timezone.utc),
        )
        db.session.add(txn)

        # Update product quantity
        if tx_type == TransactionType.IN:
            product.quantity += qty
        else:
            product.quantity -= qty

        db.session.commit()
    except Exception as exc:  # noqa: BLE001
        db.session.rollback()
        return error_response(f"Transaction failed: {exc}", 500)

    return success_response(
        data={"transaction": _schema.dump(txn)},
        message=f"Stock {'added' if tx_type == TransactionType.IN else 'removed'} successfully.",
        status_code=201,
    )


# ---------------------------------------------------------------------------
# GET /export/csv — must be registered BEFORE /
# ---------------------------------------------------------------------------

@transactions_bp.get("/export/csv")
@jwt_required()
def export_transactions_csv():
    """Export all stock transactions matching filters as a CSV file."""
    product_id = request.args.get("product_id", type=int)
    tx_type    = request.args.get("type", "").upper()
    start_date = request.args.get("start_date")
    end_date   = request.args.get("end_date")

    query = StockTransaction.query

    if product_id:
        query = query.filter_by(product_id=product_id)

    if tx_type in ("IN", "OUT"):
        query = query.filter_by(type=TransactionType[tx_type])

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            query = query.filter(StockTransaction.timestamp >= start_dt)
        except ValueError:
            return error_response("Invalid start_date format. Use YYYY-MM-DD.", 400)

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
            from datetime import timedelta
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(StockTransaction.timestamp < end_dt)
        except ValueError:
            return error_response("Invalid end_date format. Use YYYY-MM-DD.", 400)

    transactions = query.order_by(StockTransaction.timestamp.desc()).all()

    # Generate CSV in-memory
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")

    # Header row
    writer.writerow([
        "Date", "Product SKU", "Product Name", 
        "Type", "Quantity", "Reason", "Performed By"
    ])

    for t in transactions:
        sku = t.product.sku if t.product else ""
        name = t.product.name if t.product else ""
        performed_by_name = t.performed_by_user.name if t.performed_by_user else "System / Unknown"
        timestamp_str = t.timestamp.isoformat() if t.timestamp else ""

        writer.writerow([
            timestamp_str,
            sku,
            name,
            t.type.value,
            t.quantity,
            t.reason or "",
            performed_by_name
        ])

    csv_data = output.getvalue()
    output.close()

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"transactions_export_{today_str}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@transactions_bp.get("/")
@jwt_required()
def list_transactions():
    """Paginated list of transactions with optional filters.

    Query params
    ------------
    page       int
    per_page   int   (max 100)
    product_id int
    type       str   IN | OUT
    start_date str   ISO 8601 date, e.g. 2024-01-01
    end_date   str   ISO 8601 date, e.g. 2024-12-31
    """
    page     = request.args.get("page",     1,   type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)

    product_id = request.args.get("product_id", type=int)
    tx_type    = request.args.get("type", "").upper()
    start_date = request.args.get("start_date")
    end_date   = request.args.get("end_date")

    query = StockTransaction.query

    if product_id:
        query = query.filter_by(product_id=product_id)

    if tx_type in ("IN", "OUT"):
        query = query.filter_by(type=TransactionType[tx_type])

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            query = query.filter(StockTransaction.timestamp >= start_dt)
        except ValueError:
            return error_response("Invalid start_date format. Use YYYY-MM-DD.", 400)

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
            # Include the entire end day
            from datetime import timedelta
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(StockTransaction.timestamp < end_dt)
        except ValueError:
            return error_response("Invalid end_date format. Use YYYY-MM-DD.", 400)

    query = query.order_by(StockTransaction.timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return success_response(
        data={
            "transactions": _schema_many.dump(pagination.items),
            "total":        pagination.total,
            "pages":        pagination.pages,
            "page":         pagination.page,
            "per_page":     pagination.per_page,
        },
        message="Transactions retrieved.",
    )


# ---------------------------------------------------------------------------
# GET /<id>
# ---------------------------------------------------------------------------

@transactions_bp.get("/<int:txn_id>")
@jwt_required()
def get_transaction(txn_id: int):
    """Return a single transaction's full detail."""
    txn = db.session.get(StockTransaction, txn_id)
    if not txn:
        return error_response(f"Transaction {txn_id} not found.", 404)

    return success_response(data={"transaction": _schema.dump(txn)}, message="Transaction retrieved.")
