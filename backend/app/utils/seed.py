"""
app/utils/seed.py
-----------------
Database seeding script — invoked via:

    flask seed-db

Creates:
  • 2 users        (1 admin + 1 staff)
  • 4 categories
  • 3 suppliers
  • 15 products    (some deliberately below reorder_level)
  • 20 stock transactions (mix of IN/OUT spread over the last 30 days)

Running the command a second time is idempotent — it clears and re-seeds.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import click
from flask.cli import with_appcontext

from app.extensions import db
from app.models import (
    Category,
    Product,
    StockTransaction,
    Supplier,
    TransactionType,
    User,
    UserRole,
)


# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

USERS = [
    {
        "name":     "Alice Admin",
        "email":    "alice@stockflow.dev",
        "password": "Admin@1234",
        "role":     UserRole.admin,
    },
    {
        "name":     "Bob Staff",
        "email":    "bob@stockflow.dev",
        "password": "Staff@5678",
        "role":     UserRole.staff,
    },
]

CATEGORIES = [
    {"name": "Electronics",  "description": "Gadgets, components, and consumer electronics"},
    {"name": "Office Supplies", "description": "Stationery, paper, and office consumables"},
    {"name": "Furniture",    "description": "Desks, chairs, and storage solutions"},
    {"name": "Cleaning",     "description": "Cleaning materials and janitorial supplies"},
]

SUPPLIERS = [
    {
        "name":          "TechCore Distributors",
        "contact_email": "orders@techcore.io",
        "phone":         "+1-800-555-0101",
        "address":       "123 Silicon Ave, San Jose, CA 95134",
    },
    {
        "name":          "OfficeWorld Supply Co.",
        "contact_email": "supply@officeworld.com",
        "phone":         "+1-800-555-0202",
        "address":       "456 Stationery Blvd, Chicago, IL 60601",
    },
    {
        "name":          "CleanPro Industries",
        "contact_email": "sales@cleanpro.net",
        "phone":         "+1-800-555-0303",
        "address":       None,
    },
]

# Each product: (name, sku, category_index, supplier_index|None, qty, reorder_level, unit_price)
# Products with qty <= reorder_level are deliberately low-stock.
PRODUCTS = [
    # Electronics (cat 0) — TechCore (sup 0)
    ("USB-C Hub 7-Port",         "ELEC-001", 0, 0,    45, 10, "34.99"),
    ("Wireless Keyboard",        "ELEC-002", 0, 0,     8, 10, "49.99"),   # LOW STOCK ← qty 8 ≤ 10
    ("27-inch Monitor",          "ELEC-003", 0, 0,    20, 5,  "299.00"),
    ("Laptop Stand Aluminium",   "ELEC-004", 0, 0,     3, 15, "27.50"),   # LOW STOCK ← qty 3 ≤ 15
    ("Webcam 1080p",             "ELEC-005", 0, 0,    12, 8,  "65.00"),

    # Office Supplies (cat 1) — OfficeWorld (sup 1)
    ("A4 Paper Ream 500-Sheet",  "OFFC-001", 1, 1,   200, 50, "5.99"),
    ("Ballpoint Pen Box 50",     "OFFC-002", 1, 1,    30, 20, "8.49"),
    ("Stapler Heavy Duty",       "OFFC-003", 1, 1,     5, 10, "14.99"),   # LOW STOCK ← qty 5 ≤ 10
    ("Sticky Notes 3x3 Pk12",   "OFFC-004", 1, 1,    18, 15, "3.75"),
    ("Whiteboard Markers Pk8",   "OFFC-005", 1, 1,     6, 10, "6.20"),    # LOW STOCK ← qty 6 ≤ 10

    # Furniture (cat 2) — OfficeWorld (sup 1)
    ("Ergonomic Office Chair",   "FURN-001", 2, 1,    10, 3,  "249.00"),
    ("Standing Desk 140cm",      "FURN-002", 2, 1,     2, 2,  "549.00"),  # LOW STOCK ← qty 2 ≤ 2
    ("3-Drawer Filing Cabinet",  "FURN-003", 2, 1,     8, 4,  "119.50"),

    # Cleaning (cat 3) — CleanPro (sup 2), some no supplier
    ("Multi-Surface Spray 5L",   "CLEN-001", 3, 2,    40, 20, "12.99"),
    ("Microfibre Cloth Pk10",    "CLEN-002", 3, None,  3, 10, "7.50"),    # LOW STOCK ← qty 3 ≤ 10
]

REASONS_IN  = ["restock", "initial stock", "supplier delivery", "correction"]
REASONS_OUT = ["sale", "damaged", "internal use", "correction"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _random_past_dt(days: int = 30) -> datetime:
    """Return a random UTC datetime within the last *days* days."""
    offset = random.randint(0, days * 24 * 60)  # minutes
    return datetime.now(timezone.utc) - timedelta(minutes=offset)


# ---------------------------------------------------------------------------
# Core seeding function
# ---------------------------------------------------------------------------

def _run_seed() -> None:
    """Clear tables and insert fresh seed data."""
    click.echo("[SEED]  Seeding database ...\n")

    # ── Wipe existing data (order matters for FK constraints) ──
    # -- Wipe existing data (order matters for FK constraints) --
    StockTransaction.query.delete()
    Product.query.delete()
    Category.query.delete()
    Supplier.query.delete()
    User.query.delete()
    db.session.commit()
    click.echo("   [OK] Cleared existing data")

    # -- Users --
    users: list[User] = []
    for u in USERS:
        user = User(name=u["name"], email=u["email"], role=u["role"])
        user.set_password(u["password"])
        db.session.add(user)
        users.append(user)
    db.session.flush()
    click.echo(f"   [OK] Inserted {len(users)} users")

    # -- Categories --
    categories: list[Category] = []
    for c in CATEGORIES:
        cat = Category(name=c["name"], description=c["description"])
        db.session.add(cat)
        categories.append(cat)
    db.session.flush()
    click.echo(f"   [OK] Inserted {len(categories)} categories")

    # -- Suppliers --
    suppliers: list[Supplier] = []
    for s in SUPPLIERS:
        sup = Supplier(
            name=s["name"],
            contact_email=s["contact_email"],
            phone=s["phone"],
            address=s["address"],
        )
        db.session.add(sup)
        suppliers.append(sup)
    db.session.flush()
    click.echo(f"   [OK] Inserted {len(suppliers)} suppliers")

    # -- Products --
    products: list[Product] = []
    for (name, sku, cat_idx, sup_idx, qty, reorder, price) in PRODUCTS:
        prod = Product(
            name          = name,
            sku           = sku,
            category_id   = categories[cat_idx].id,
            supplier_id   = suppliers[sup_idx].id if sup_idx is not None else None,
            quantity      = qty,
            reorder_level = reorder,
            unit_price    = Decimal(price),
        )
        db.session.add(prod)
        products.append(prod)
    db.session.flush()
    click.echo(f"   [OK] Inserted {len(products)} products")

    # -- Stock Transactions (20 entries) --
    transaction_count = 0
    for i in range(20):
        prod    = random.choice(products)
        tx_type = random.choice([TransactionType.IN, TransactionType.OUT])
        qty     = random.randint(1, 20)
        reason  = random.choice(REASONS_IN if tx_type == TransactionType.IN else REASONS_OUT)
        user    = random.choice(users)

        tx = StockTransaction(
            product_id   = prod.id,
            type         = tx_type,
            quantity     = qty,
            reason       = reason,
            performed_by = user.id,
            timestamp    = _random_past_dt(30),
        )
        db.session.add(tx)
        transaction_count += 1

    db.session.commit()
    click.echo(f"   [OK] Inserted {transaction_count} stock transactions")

    # -- Summary --
    click.echo("\n[COUNTS]  Table counts after seeding:")
    click.echo(f"   users              : {User.query.count()}")
    click.echo(f"   categories         : {Category.query.count()}")
    click.echo(f"   suppliers          : {Supplier.query.count()}")
    click.echo(f"   products           : {Product.query.count()}")
    click.echo(f"   stock_transactions : {StockTransaction.query.count()}")

    # ── Low-stock report ──
    low_stock = Product.query.filter(Product.is_low_stock).all()
    click.echo(f"\n[WARN]  Low-stock products ({len(low_stock)} of {len(products)}):")
    for p in low_stock:
        click.echo(f"   >> [{p.sku}] {p.name}  qty={p.quantity}  reorder_level={p.reorder_level}")

    # ── Test credentials ──
    click.echo("\n[CREDS]  Test credentials:")
    for u in USERS:
        click.echo(f"   [OK] {u['role'].value:<6}  {u['email']}  /  {u['password']}")

    click.echo("\n[DONE]  Seeding complete!\n")


# ---------------------------------------------------------------------------
# Flask CLI command
# ---------------------------------------------------------------------------

@click.command("seed-db")
@with_appcontext
def seed_db_command() -> None:
    """Seed the database with demo data (clears existing rows first)."""
    _run_seed()
