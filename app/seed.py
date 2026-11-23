
from app.database import SessionLocal
from app.models import Category, Item, Product


# ========================================
# カテゴリ初期データ
# ========================================

CATEGORIES = [
    ("飲料水・食料", 1),
    ("トイレ・衛生", 2),
    ("照明・電源", 3),
    ("防寒・生活", 4),
    ("避難用品", 5),
]


# ========================================
# 防災用品初期データ
# ========================================

ITEMS = [
    {
        "category": "飲料水・食料",
        "name": "飲料水",
        "unit": "L",
        "calculation_type": "person_day",
        "quantity_per_person_day": 3.0,
        "sort_order": 1,
    },
    {
        "category": "飲料水・食料",
        "name": "非常食",
        "unit": "食",
        "calculation_type": "person_day",
        "quantity_per_person_day": 3.0,
        "sort_order": 2,
    },
    {
        "category": "トイレ・衛生",
        "name": "携帯トイレ",
        "unit": "回",
        "calculation_type": "person_day",
        "quantity_per_person_day": 5.0,
        "sort_order": 1,
    },
    {
        "category": "照明・電源",
        "name": "懐中電灯",
        "unit": "個",
        "calculation_type": "fixed",
        "fixed_quantity": 2,
        "sort_order": 1,
    },
    {
        "category": "防寒・生活",
        "name": "アルミブランケット",
        "unit": "枚",
        "calculation_type": "person",
        "sort_order": 1,
    },
    {
        "category": "避難用品",
        "name": "防災リュック",
        "unit": "個",
        "calculation_type": "person",
        "sort_order": 1,
    },
]


# ========================================
# 商品初期データ
# ========================================

PRODUCTS = [
    {
        "item": "飲料水",
        "name": "保存水 2L×6本",
        "quantity_per_package": 12,
    },
    {
        "item": "非常食",
        "name": "非常食 12食セット",
        "quantity_per_package": 12,
    },
    {
        "item": "携帯トイレ",
        "name": "携帯トイレ 50回分",
        "quantity_per_package": 50,
    },
    {
        "item": "懐中電灯",
        "name": "LED懐中電灯",
        "quantity_per_package": 1,
    },
    {
        "item": "アルミブランケット",
        "name": "アルミブランケット 5枚セット",
        "quantity_per_package": 5,
    },
    {
        "item": "防災リュック",
        "name": "防災用リュック",
        "quantity_per_package": 1,
    },
]


# ========================================
# 初期データ登録
# ========================================

def seed_data():
    db = SessionLocal()

    try:
        # --------------------------------
        # 1. カテゴリ登録
        # --------------------------------

        for name, sort_order in CATEGORIES:
            category = (
                db.query(Category)
                .filter(Category.name == name)
                .first()
            )

            if category is None:
                category = Category(
                    name=name,
                    sort_order=sort_order,
                )
                db.add(category)

        db.flush()

        categories = {
            category.name: category
            for category in db.query(Category).all()
        }

        # --------------------------------
        # 2. 防災用品登録
        # --------------------------------

        for data in ITEMS:
            item = (
                db.query(Item)
                .filter(Item.name == data["name"])
                .first()
            )

            if item is not None:
                continue

            item = Item(
                category_id=categories[data["category"]].id,
                name=data["name"],
                unit=data["unit"],
                calculation_type=data["calculation_type"],
                quantity_per_person_day=data.get(
                    "quantity_per_person_day"
                ),
                fixed_quantity=data.get("fixed_quantity"),
                sort_order=data["sort_order"],
            )

            db.add(item)

        db.flush()

        # --------------------------------
        # 3. 商品登録
        # --------------------------------

        items = {
            item.name: item
            for item in db.query(Item).all()
        }

        for data in PRODUCTS:
            item = items.get(data["item"])

            if item is None:
                continue

            product = (
                db.query(Product)
                .filter(
                    Product.item_id == item.id,
                    Product.name == data["name"],
                )
                .first()
            )

            if product is not None:
                continue

            db.add(
                Product(
                    item_id=item.id,
                    name=data["name"],
                    quantity_per_package=data[
                        "quantity_per_package"
                    ],
                    price=None,
                    product_url=None,
                )
            )

        db.commit()

        print("Initial disaster data inserted successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
