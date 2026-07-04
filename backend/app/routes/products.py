"""
app/routes/products.py
----------------------
Product CRUD routes.

GET    /api/products/           — paginated list + filters + sorting
POST   /api/products/           — create  [jwt_required]
GET    /api/products/low-stock  — low-stock report
GET    /api/products/<id>       — detail + nested category/supplier + recent txns
PUT    /api/products/<id>       — update details  [jwt_required]
                                   NOTE: quantity is read-only here;
                                   use POST /api/transactions to change it.
DELETE /api/products/<id>       — hard-delete  [admin]

Deletion strategy: HARD DELETE.
Stock transactions are cascade-deleted with the product (see model definition).
"""

from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy import asc, desc
import csv
import io
from datetime import datetime, timezone

from app.extensions import db
from app.models import Product
from app.schemas import ProductSchema, ProductDetailSchema, ProductWriteSchema, TransactionSchema
from app.utils import success_response, error_response
from app.utils.decorators import admin_required

products_bp = Blueprint("products", __name__)

_schema        = ProductSchema()
_schema_many   = ProductSchema(many=True)
_detail_schema = ProductDetailSchema()
_write_schema  = ProductWriteSchema()
_txn_schema    = TransactionSchema(many=True)

# Columns allowed for sorting
_SORTABLE = {
    "name":       Product.name,
    "quantity":   Product.quantity,
    "unit_price": Product.unit_price,
    "created_at": Product.created_at,
    "sku":        Product.sku,
}


# ---------------------------------------------------------------------------
# GET /export/csv — must be registered BEFORE /<id>
# ---------------------------------------------------------------------------

@products_bp.get("/export/csv")
@jwt_required()
def export_products_csv():
    """Export all products matching filters as a CSV file."""
    category_id = request.args.get("category_id", type=int)
    search      = request.args.get("search", "").strip()

    query = Product.query

    if category_id:
        query = query.filter_by(category_id=category_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Product.name.ilike(like) | Product.sku.ilike(like)
        )

    products = query.order_by(Product.name).all()

    # Generate CSV in-memory
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")

    # Header row
    writer.writerow([
        "SKU", "Name", "Category", "Supplier", 
        "Quantity", "Reorder Level", "Unit Price", 
        "Status", "Last Updated"
    ])

    for p in products:
        category_name = p.category.name if p.category else ""
        supplier_name = p.supplier.name if p.supplier else ""
        status = "Low Stock" if p.is_low_stock else "In Stock"
        last_updated = p.updated_at.isoformat() if p.updated_at else ""
        
        writer.writerow([
            p.sku,
            p.name,
            category_name,
            supplier_name,
            p.quantity,
            p.reorder_level,
            str(p.unit_price),
            status,
            last_updated
        ])

    csv_data = output.getvalue()
    output.close()

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"products_export_{today_str}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ---------------------------------------------------------------------------
# GET /low-stock  — must be registered BEFORE /<id> to avoid routing conflict
# ---------------------------------------------------------------------------

@products_bp.get("/low-stock")
def low_stock():
    """Return all products where quantity <= reorder_level."""
    products = (
        Product.query
        .filter(Product.is_low_stock)
        .order_by(Product.quantity.asc())
        .all()
    )
    return success_response(
        data={"products": _schema_many.dump(products), "total": len(products)},
        message=f"{len(products)} low-stock product(s) found.",
    )


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@products_bp.get("/")
def list_products():
    """Paginated product list with optional filters and sorting.

    Query params
    ------------
    page        int   default 1
    per_page    int   default 20, max 100
    category_id int
    supplier_id int
    search      str   matches name or SKU (case-insensitive)
    sort_by     str   name | quantity | unit_price | created_at | sku
    order       str   asc (default) | desc
    """
    # Pagination
    page     = request.args.get("page",     1,   type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)

    # Filters
    category_id = request.args.get("category_id", type=int)
    supplier_id = request.args.get("supplier_id", type=int)
    search      = request.args.get("search", "").strip()

    # Sorting
    sort_by = request.args.get("sort_by", "name")
    order   = request.args.get("order",   "asc").lower()

    query = Product.query

    if category_id:
        query = query.filter_by(category_id=category_id)
    if supplier_id:
        query = query.filter_by(supplier_id=supplier_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Product.name.ilike(like) | Product.sku.ilike(like)
        )

    sort_col = _SORTABLE.get(sort_by, Product.name)
    query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return success_response(
        data={
            "products":  _schema_many.dump(pagination.items),
            "total":     pagination.total,
            "pages":     pagination.pages,
            "page":      pagination.page,
            "per_page":  pagination.per_page,
        },
        message="Products retrieved.",
    )


# ---------------------------------------------------------------------------
# POST /
# ---------------------------------------------------------------------------

@products_bp.post("/")
@jwt_required()
def create_product():
    """Create a new product (initial quantity = 0; use a transaction to add stock)."""
    json_body = request.get_json(silent=True) or {}

    try:
        data = _write_schema.load(json_body)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    # SKU uniqueness
    if Product.query.filter_by(sku=data["sku"]).first():
        return error_response(f"SKU '{data['sku']}' is already in use.", 409)

    product = Product(**data)
    db.session.add(product)
    db.session.commit()

    return success_response(
        data={"product": _schema.dump(product)},
        message="Product created.",
        status_code=201,
    )


# ---------------------------------------------------------------------------
# GET /<id>
# ---------------------------------------------------------------------------

@products_bp.get("/<int:product_id>")
def get_product(product_id: int):
    """Return full product detail with nested category/supplier and last 10 transactions."""
    product = db.session.get(Product, product_id)
    if not product:
        return error_response(f"Product {product_id} not found.", 404)

    result = _detail_schema.dump(product)

    # Inject last 10 transactions — query directly to avoid AppenderQuery.property issue
    from app.models import StockTransaction  # noqa: PLC0415
    recent_txns = (
        StockTransaction.query
        .filter_by(product_id=product_id)
        .order_by(StockTransaction.timestamp.desc())
        .limit(10)
        .all()
    )
    result["recent_transactions"] = _txn_schema.dump(recent_txns)
    result["category"] = product.category.to_dict() if product.category else None
    result["supplier"] = product.supplier.to_dict() if product.supplier else None

    return success_response(data={"product": result}, message="Product retrieved.")


# ---------------------------------------------------------------------------
# PUT /<id>
# ---------------------------------------------------------------------------

@products_bp.put("/<int:product_id>")
@jwt_required()
def update_product(product_id: int):
    """Update product metadata.

    Note: quantity is intentionally excluded — use POST /api/transactions to
    change stock levels atomically.
    """
    product = db.session.get(Product, product_id)
    if not product:
        return error_response(f"Product {product_id} not found.", 404)

    json_body = request.get_json(silent=True) or {}
    try:
        data = _write_schema.load(json_body, partial=True)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    # SKU uniqueness check (only if SKU is being changed)
    new_sku = data.get("sku")
    if new_sku and new_sku != product.sku:
        if Product.query.filter_by(sku=new_sku).first():
            return error_response(f"SKU '{new_sku}' is already in use.", 409)

    for field, value in data.items():
        setattr(product, field, value)

    db.session.commit()
    return success_response(data={"product": _schema.dump(product)}, message="Product updated.")


# ---------------------------------------------------------------------------
# DELETE /<id>
# ---------------------------------------------------------------------------

@products_bp.delete("/<int:product_id>")
@admin_required
def delete_product(product_id: int):
    """Hard-delete a product and all its associated stock transactions (cascade).

    Design decision: HARD DELETE.
    Stock transactions are cascade-deleted automatically (see Product model).
    If you need a soft-delete / archive approach, add an `is_archived` boolean
    column to Product and filter it out of list queries instead.
    """
    product = db.session.get(Product, product_id)
    if not product:
        return error_response(f"Product {product_id} not found.", 404)

    name = product.name
    db.session.delete(product)
    db.session.commit()
    return success_response(message=f"Product '{name}' and all its transactions deleted.")
