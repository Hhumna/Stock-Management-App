"""
app/schemas/__init__.py
-----------------------
Re-export all schemas so callers can do:
    from app.schemas import UserSchema, ProductSchema, ...
"""

from .user        import UserSchema, RegisterSchema, LoginSchema
from .category    import CategorySchema, CategoryDetailSchema
from .supplier    import SupplierSchema
from .product     import ProductSchema, ProductDetailSchema, ProductWriteSchema
from .transaction import TransactionSchema, TransactionWriteSchema

__all__ = [
    "UserSchema",
    "RegisterSchema",
    "LoginSchema",
    "CategorySchema",
    "CategoryDetailSchema",
    "SupplierSchema",
    "ProductSchema",
    "ProductDetailSchema",
    "ProductWriteSchema",
    "TransactionSchema",
    "TransactionWriteSchema",
]
