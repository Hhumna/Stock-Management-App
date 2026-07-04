"""
app/routes/categories.py
------------------------
Category CRUD routes.

GET    /api/categories/        — list all, ?search=
POST   /api/categories/        — create  [admin]
GET    /api/categories/<id>    — single + product_count
PUT    /api/categories/<id>    — update  [admin]
DELETE /api/categories/<id>    — delete  [admin, 409 if products exist]
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.extensions import db
from app.models import Category, Product
from app.schemas import CategorySchema, CategoryDetailSchema
from app.utils import success_response, error_response
from app.utils.decorators import admin_required

categories_bp = Blueprint("categories", __name__)

_schema        = CategorySchema()
_schema_many   = CategorySchema(many=True)
_detail_schema = CategoryDetailSchema()


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@categories_bp.get("/")
def list_categories():
    """List all categories. Supports ?search= for name filtering."""
    search = request.args.get("search", "").strip()
    query  = Category.query

    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))

    categories = query.order_by(Category.name).all()
    return success_response(
        data={"categories": _schema_many.dump(categories), "total": len(categories)},
        message="Categories retrieved.",
    )


# ---------------------------------------------------------------------------
# POST /
# ---------------------------------------------------------------------------

@categories_bp.post("/")
@admin_required
def create_category():
    """Create a new category. Requires admin JWT."""
    json_body = request.get_json(silent=True) or {}

    try:
        data = _schema.load(json_body)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    if Category.query.filter_by(name=data["name"]).first():
        return error_response(f"Category '{data['name']}' already exists.", 409)

    category = Category(**data)
    db.session.add(category)
    db.session.commit()

    return success_response(
        data={"category": _schema.dump(category)},
        message="Category created.",
        status_code=201,
    )


# ---------------------------------------------------------------------------
# GET /<id>
# ---------------------------------------------------------------------------

@categories_bp.get("/<int:category_id>")
def get_category(category_id: int):
    """Return a single category with its product count."""
    category = db.session.get(Category, category_id)
    if not category:
        return error_response(f"Category {category_id} not found.", 404)

    result = _detail_schema.dump(category)
    result["product_count"] = category.products.count()
    return success_response(data={"category": result}, message="Category retrieved.")


# ---------------------------------------------------------------------------
# PUT /<id>
# ---------------------------------------------------------------------------

@categories_bp.put("/<int:category_id>")
@admin_required
def update_category(category_id: int):
    """Update a category's name and/or description. Requires admin JWT."""
    category = db.session.get(Category, category_id)
    if not category:
        return error_response(f"Category {category_id} not found.", 404)

    json_body = request.get_json(silent=True) or {}
    try:
        data = _schema.load(json_body, partial=True)
    except ValidationError as exc:
        return error_response("Validation failed.", 400, errors=exc.messages)

    # Check name uniqueness if name is being changed
    new_name = data.get("name")
    if new_name and new_name != category.name:
        if Category.query.filter_by(name=new_name).first():
            return error_response(f"Category '{new_name}' already exists.", 409)

    for field, value in data.items():
        setattr(category, field, value)

    db.session.commit()
    return success_response(data={"category": _schema.dump(category)}, message="Category updated.")


# ---------------------------------------------------------------------------
# DELETE /<id>
# ---------------------------------------------------------------------------

@categories_bp.delete("/<int:category_id>")
@admin_required
def delete_category(category_id: int):
    """Delete a category. Returns 409 if any products still reference it."""
    category = db.session.get(Category, category_id)
    if not category:
        return error_response(f"Category {category_id} not found.", 404)

    product_count = category.products.count()
    if product_count > 0:
        return error_response(
            f"Cannot delete: {product_count} product(s) belong to this category. "
            "Reassign or delete those products first.",
            409,
        )

    db.session.delete(category)
    db.session.commit()
    return success_response(message=f"Category '{category.name}' deleted.")
