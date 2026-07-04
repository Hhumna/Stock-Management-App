"""
app/models/__init__.py
----------------------
Import all models here so:
  1. Flask-Migrate (Alembic) can discover every table.
  2. Callers can do:  from app.models import User, Product, ...
"""

from .user              import User, UserRole
from .category          import Category
from .supplier          import Supplier
from .product           import Product
from .stock_transaction import StockTransaction, TransactionType

__all__ = [
    "User",
    "UserRole",
    "Category",
    "Supplier",
    "Product",
    "StockTransaction",
    "TransactionType",
]
