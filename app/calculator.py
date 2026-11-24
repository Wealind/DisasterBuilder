import math

from app.database import SessionLocal
from app.models import Category, Item, Product


PRIORITY_ORDER = {
    "essential": 0,
    "recommended": 1,
    "optional": 2,
}


def calculate_quantity(
    calc_type,
    daily_rate,
    fixed_rate,
    target_count,
    days,
):
    if calc_type in ("person_day", "pet_day"):
        quantity = (
            target_count * days * (daily_rate or 0)
        )

    elif calc_type == "group_day":
        quantity = days * (daily_rate or 0)

    elif calc_type == "person":
        quantity = target_count * (
            fixed_rate if fixed_rate is not None else 1
        )

    elif calc_type == "fixed":
        quantity = fixed_rate or 0

    else:
        raise ValueError(
            f"Unknown calculation type: {calc_type}"
        )

    return math.ceil(quantity)


def calculate_supplies(
    adults: int,
    children: int,
    days: int,
    owned: dict | None = None,
    infants: int = 0,
    seniors: int = 0,
    pets: int = 0,
    storage_type: str = "all",
    go_days: int = 1,
    backpack_capacity: float = 30,
    max_carry_weight: float = 10,
    owned_go: dict | None = None,
    sort_by: str = "category",
):
    people = adults + children

    owned = owned or {}
    owned_go = owned_go or {}

    group_counts = {
        "all": people,
        "infant": infants,
        "senior": seniors,
        "pet": pets,
    }

    db = SessionLocal()

    try:
        items = (
            db.query(Item)
            .join(Category)
            .filter(Item.is_active.is_(True))
            .order_by(
                Category.sort_order,
                Item.sort_order,
            )
            .all()
        )

        products = (
            db.query(Product)
            .filter(
                Product.is_active.is_(True),
                Product.quantity_per_package > 0,
            )
            .order_by(Product.id)
            .all()
        )

        product_by_item = {}

        for product in products:
            product_by_item.setdefault(
                product.item_id,
                product,
            )

        results = []

        total_price = 0
        has_unpriced_items = False

        total_go_weight = 0
        total_go_volume = 0

        unknown_weight_count = 0
        unknown_volume_count = 0

        for item in items:

            condition = item.condition_type or "all"
            target_count = group_counts.get(condition, 0)

            if target_count <= 0:
                continue

            item_storage = item.storage_type or "home"

            # ====================================
            # 自宅備蓄数量
            # ====================================

            home_required = 0

            if item_storage in ("home", "both"):
                home_required = calculate_quantity(
                    item.calculation_type,
                    item.quantity_per_person_day,
                    item.fixed_quantity,
                    target_count,
                    days,
                )

            # ====================================
            # 非常持ち出し数量
            # ====================================

            go_required = 0

            if item_storage in ("go", "both"):
                go_required = calculate_quantity(
                    item.go_calculation_type
                    or item.calculation_type,

                    item.go_quantity_per_person_day
                    if item.go_calculation_type
                    else item.quantity_per_person_day,

                    item.go_fixed_quantity
                    if item.go_calculation_type
                    else item.fixed_quantity,

                    target_count,
                    go_days,
                )

            # ====================================
            # 持ち出し重量・容量
            # ====================================

            go_weight = None
            go_volume = None

            if go_required > 0:

                if item.weight_kg is not None:
                    go_weight = (
                        go_required * item.weight_kg
                    )

                    total_go_weight += go_weight

                else:
                    unknown_weight_count += 1

                if item.volume_l is not None:
                    go_volume = (
                        go_required * item.volume_l
                    )

                    total_go_volume += go_volume

                else:
                    unknown_volume_count += 1

            # ====================================
            # 所有済み数量
            # ====================================

            home_owned = max(
                0,
                float(owned.get(str(item.id), 0))
            )

            go_owned = max(
                0,
                float(owned_go.get(str(item.id), 0))
            )

            # ====================================
            # 表示対象
            # ====================================

            if storage_type == "home":

                if home_required <= 0:
                    continue

                required = home_required
                owned_quantity = home_owned

                shortage = max(
                    0,
                    home_required - home_owned
                )

            elif storage_type == "go":

                if go_required <= 0:
                    continue

                required = go_required
                owned_quantity = go_owned

                shortage = max(
                    0,
                    go_required - go_owned
                )

            else:

                required = (
                    home_required + go_required
                )

                owned_quantity = (
                    home_owned + go_owned
                )

                shortage = (
                    max(0, home_required - home_owned)
                    + max(0, go_required - go_owned)
                )

            # ====================================
            # 商品選定
            # ====================================

            product = product_by_item.get(item.id)
            product_data = None

            if product:

                packages = math.ceil(
                    shortage / product.quantity_per_package
                )

                subtotal = None

                if product.price is not None:
                    subtotal = packages * product.price
                    total_price += subtotal

                elif packages > 0:
                    has_unpriced_items = True

                product_data = {
                    "id": product.id,
                    "name": product.name,
                    "quantity_per_package":
                        product.quantity_per_package,
                    "price": product.price,
                    "url": product.product_url,
                    "packages": packages,
                    "subtotal": subtotal,
                }

            elif shortage > 0:
                has_unpriced_items = True

            # ====================================
            # 結果
            # ====================================

            results.append({
                "id": item.id,
                "category": item.category.name,
                "name": item.name,
                "unit": item.unit,

                "quantity": required,
                "owned": owned_quantity,
                "shortage": shortage,

                "home_required": home_required,
                "go_required": go_required,

                "home_owned": home_owned,
                "go_owned": go_owned,

                "home_shortage": max(
                    0, home_required - home_owned
                ),

                "go_shortage": max(
                    0, go_required - go_owned
                ),

                "go_weight": (
                    round(go_weight, 3)
                    if go_weight is not None
                    else None
                ),

                "go_volume": (
                    round(go_volume, 3)
                    if go_volume is not None
                    else None
                ),

                "storage_type": item_storage,
                "priority": item.priority or "recommended",
                "condition_type": condition,

                "product": product_data,
            })

        # ========================================
        # 並び替え
        # ========================================

        if sort_by == "priority":
            results.sort(
                key=lambda item: (
                    item["shortage"] <= 0,
                    PRIORITY_ORDER.get(
                        item["priority"], 99
                    ),
                )
            )

        # ========================================
        # 重量・容量判定
        # ========================================

        capacity_usage = (
            total_go_volume / backpack_capacity * 100
        )

        weight_usage = (
            total_go_weight / max_carry_weight * 100
        )

        return {
            "adults": adults,
            "children": children,
            "people": people,

            "days": days,
            "go_days": go_days,

            "infants": infants,
            "seniors": seniors,
            "pets": pets,

            "storage_type": storage_type,

            "items": results,

            "total_price": (
                None if has_unpriced_items
                else total_price
            ),

            "backpack_capacity": backpack_capacity,
            "max_carry_weight": max_carry_weight,

            "total_go_weight": round(total_go_weight, 2),
            "total_go_volume": round(total_go_volume, 2),

            "capacity_usage": round(capacity_usage, 1),
            "weight_usage": round(weight_usage, 1),

            "capacity_exceeded":
                total_go_volume > backpack_capacity,

            "weight_exceeded":
                total_go_weight > max_carry_weight,

            "unknown_weight_count": unknown_weight_count,
            "unknown_volume_count": unknown_volume_count,
        }

    finally:
        db.close()