import math

from app.database import SessionLocal
from app.models import Category, Item, Product


def calculate_supplies(
    adults: int,
    children: int,
    days: int,
    owned: dict | None = None,
):
    people = adults + children
    owned = owned or {}

    db = SessionLocal()

    try:
        items = (
            db.query(Item)
            .join(Category)
            .filter(Item.is_active.is_(True))
            .order_by(Category.sort_order, Item.sort_order)
            .all()
        )

        results = []
        total_price = 0
        has_unpriced_items = False

        for item in items:
            if item.calculation_type == "person_day":
                required = (
                    (item.quantity_per_person_day or 0)
                    * people
                    * days
                )
            elif item.calculation_type == "person":
                required = people
            elif item.calculation_type == "fixed":
                required = item.fixed_quantity or 0
            else:
                raise ValueError(
                    f"Unknown calculation type: {item.calculation_type}"
                )

            required = math.ceil(required)

            owned_quantity = max(
                0,
                float(owned.get(str(item.id), 0))
            )

            shortage = max(0, required - owned_quantity)

            product = (
                db.query(Product)
                .filter(
                    Product.item_id == item.id,
                    Product.is_active.is_(True),
                    Product.quantity_per_package > 0,
                )
                .order_by(Product.id)
                .first()
            )

            packages = 0
            subtotal = None
            product_data = None

            if product is not None:
                packages = math.ceil(
                    shortage / product.quantity_per_package
                )

                if product.price is not None:
                    subtotal = packages * product.price
                    total_price += subtotal
                elif packages > 0:
                    has_unpriced_items = True

                product_data = {
                    "id": product.id,
                    "name": product.name,
                    "quantity_per_package": product.quantity_per_package,
                    "price": product.price,
                    "url": product.product_url,
                    "packages": packages,
                    "subtotal": subtotal,
                }

            elif shortage > 0:
                has_unpriced_items = True

            results.append({
                "id": item.id,
                "category": item.category.name,
                "name": item.name,
                "unit": item.unit,
                "quantity": required,
                "owned": owned_quantity,
                "shortage": shortage,
                "product": product_data,
            })

        return {
            "adults": adults,
            "children": children,
            "people": people,
            "days": days,
            "items": results,
            "total_price": (
                None if has_unpriced_items else total_price
            ),
        }

    finally:
        db.close()