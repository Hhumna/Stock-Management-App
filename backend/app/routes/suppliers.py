"""
app/routes/suppliers.py
-----------------------
Supplier CRUD routes — mirrors categories pattern.

GET    /api/suppliers/        — list all, ?search=
POST   /api/suppliers/        — create  [admin]
GET    /api/suppliers/<id>    — single supplier
PUT    /api/suppliers/<id>    — update  [admin]
DELETE /api/suppliers/<id>    — delete  [admin, 409 if products reference it]
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.extensions import db
from app.models import Supplier
from app.schemas import SupplierSchema
from app.utils import success_response, error_response
from app.utils.decorators import admin_required

suppliers_bp = Blueprint("suppliers", __name__)

_schema      = SupplierSchema()
_schema_many = SupplierSchema(many=True)


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@suppliers_bp.get("/")
def list_suppliers():
    """List all suppliers. Supports ?search= for name filtering."""
    search = request.args.get("search", "").strip()
    query  = Supplier.query

    if search:
        query = query.filter(Supplier.name.ilike(f"%{search}%"))

    suppliers = query.order_by(Supplier.name).all()
    return success_response(
        data={"suppliers": _schema_many.dump(suppliers), "total": len(suppliers)},
        message="Suppliers retrieved.",
    )


# ---------------------------------------------------------------------------
# POST /
# ---------------------------------------------------------------------------

@suppliers_bp.post("/")
@admin_required
def create_supplier():
    """Create a new supplier. Requires admin JWT."""
    json_body = request.get_json(silent=True) or {}

    try:
        data = _schema.load(json_body)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    supplier = Supplier(**data)
    db.session.add(supplier)
    db.session.commit()

    return success_response(
        data={"supplier": _schema.dump(supplier)},
        message="Supplier created.",
        status_code=201,
    )


# ---------------------------------------------------------------------------
# GET /<id>
# ---------------------------------------------------------------------------

@suppliers_bp.get("/<int:supplier_id>")
def get_supplier(supplier_id: int):
    """Return a single supplier with its product count."""
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier:
        return error_response(f"Supplier {supplier_id} not found.", 404)

    result = _schema.dump(supplier)
    result["product_count"] = supplier.products.count()
    return success_response(data={"supplier": result}, message="Supplier retrieved.")


# ---------------------------------------------------------------------------
# PUT /<id>
# ---------------------------------------------------------------------------

@suppliers_bp.put("/<int:supplier_id>")
@admin_required
def update_supplier(supplier_id: int):
    """Update supplier details. Requires admin JWT."""
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier:
        return error_response(f"Supplier {supplier_id} not found.", 404)

    json_body = request.get_json(silent=True) or {}
    try:
        data = _schema.load(json_body, partial=True)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    for field, value in data.items():
        setattr(supplier, field, value)

    db.session.commit()
    return success_response(data={"supplier": _schema.dump(supplier)}, message="Supplier updated.")


# ---------------------------------------------------------------------------
# DELETE /<id>
# ---------------------------------------------------------------------------

@suppliers_bp.delete("/<int:supplier_id>")
@admin_required
def delete_supplier(supplier_id: int):
    """Delete a supplier. Returns 409 if any products still reference it."""
    supplier = db.session.get(Supplier, supplier_id)
    if not supplier:
        return error_response(f"Supplier {supplier_id} not found.", 404)

    product_count = supplier.products.count()
    if product_count > 0:
        return error_response(
            f"Cannot delete: {product_count} product(s) are supplied by this supplier. "
            "Reassign or delete those products first.",
            409,
        )

    db.session.delete(supplier)
    db.session.commit()
    return success_response(message=f"Supplier '{supplier.name}' deleted.")
