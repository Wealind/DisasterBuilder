from app.database import SessionLocal
from app.models import Category, Item, Product


# ========================================
# カテゴリマスター
# ========================================

CATEGORIES = [
    ("飲料水・食料", 1),
    ("トイレ・衛生", 2),
    ("照明・電源", 3),
    ("防寒・生活", 4),
    ("避難用品", 5),
    ("医療・救急", 6),
    ("情報・通信", 7),
    ("調理・生活用品", 8),
    ("乳幼児用品", 9),
    ("高齢者用品", 10),
    ("ペット用品", 11),
]


# ========================================
# 防災用品マスター
# ========================================
#
# name
# category
# unit
# calculation_type
# rate
# storage_type
# priority
# condition_type
#
# person_day : 人数 × 日数 × rate
# person     : 人数 × rate
# fixed      : rate
# group_day  : 日数 × rate
# pet_day    : ペット数 × 日数 × rate
#
# storage_type:
# home : 自宅備蓄
# go   : 非常持ち出し
# both : 共通
#
# priority:
# essential   : 必須
# recommended : 推奨
# optional    : 任意
#
# condition_type:
# all    : 全員
# infant : 乳幼児
# senior : 高齢者
# pet    : ペット
# ========================================

ITEMS = [

    # 飲料水・食料

    ("飲料水", "飲料水・食料", "L",
     "person_day", 3, "both", "essential", "all"),

    ("非常食", "飲料水・食料", "食",
     "person_day", 3, "both", "essential", "all"),

    # トイレ・衛生

    ("携帯トイレ", "トイレ・衛生", "回",
     "person_day", 5, "both", "essential", "all"),

    ("ウェットティッシュ", "トイレ・衛生", "枚",
     "person_day", 3, "home", "recommended", "all"),

    ("トイレットペーパー", "トイレ・衛生", "ロール",
     "fixed", 4, "home", "essential", "all"),

    ("ポリ袋", "トイレ・衛生", "枚",
     "fixed", 30, "home", "recommended", "all"),

    ("マスク", "トイレ・衛生", "枚",
     "person_day", 1, "both", "recommended", "all"),

    ("手指消毒用品", "トイレ・衛生", "本",
     "fixed", 1, "home", "recommended", "all"),

    ("生理用品", "トイレ・衛生", "セット",
     "fixed", 1, "go", "recommended", "all"),

    # 照明・電源

    ("懐中電灯", "照明・電源", "個",
     "fixed", 2, "both", "essential", "all"),

    ("LEDランタン", "照明・電源", "個",
     "fixed", 2, "home", "recommended", "all"),

    ("モバイルバッテリー", "照明・電源", "個",
     "fixed", 2, "both", "essential", "all"),

    ("乾電池", "照明・電源", "本",
     "fixed", 12, "home", "recommended", "all"),

    ("充電ケーブル", "照明・電源", "本",
     "fixed", 2, "go", "essential", "all"),

    # 防寒・生活

    ("アルミブランケット", "防寒・生活", "枚",
     "person", 1, "go", "recommended", "all"),

    ("毛布", "防寒・生活", "枚",
     "person", 1, "home", "recommended", "all"),

    ("使い捨てカイロ", "防寒・生活", "個",
     "person_day", 1, "home", "optional", "all"),

    ("レインコート", "防寒・生活", "着",
     "person", 1, "go", "recommended", "all"),

    ("軍手", "防寒・生活", "組",
     "person", 1, "go", "recommended", "all"),

    ("タオル", "防寒・生活", "枚",
     "person", 2, "both", "recommended", "all"),

    # 避難用品

    ("防災リュック", "避難用品", "個",
     "person", 1, "go", "essential", "all"),

    # 医療・救急

    ("救急セット", "医療・救急", "セット",
     "fixed", 1, "both", "essential", "all"),

    ("常備薬・処方薬", "医療・救急", "セット",
     "person", 1, "go", "essential", "all"),

    ("絆創膏", "医療・救急", "枚",
     "fixed", 20, "home", "recommended", "all"),

    # 情報・通信

    ("携帯ラジオ", "情報・通信", "台",
     "fixed", 1, "go", "recommended", "all"),

    ("緊急連絡先メモ", "情報・通信", "枚",
     "fixed", 1, "go", "essential", "all"),

    ("現金・小銭", "情報・通信", "セット",
     "fixed", 1, "go", "essential", "all"),

    # 調理・生活用品

    ("カセットコンロ", "調理・生活用品", "台",
     "fixed", 1, "home", "recommended", "all"),

    ("カセットガス", "調理・生活用品", "本",
     "group_day", 1, "home", "recommended", "all"),

    ("紙皿", "調理・生活用品", "枚",
     "person_day", 1, "home", "optional", "all"),

    ("ラップ", "調理・生活用品", "本",
     "fixed", 1, "home", "recommended", "all"),

    # 乳幼児用品

    ("乳児用ミルク", "乳幼児用品", "セット",
     "fixed", 1, "both", "essential", "infant"),

    ("紙おむつ", "乳幼児用品", "枚",
     "person_day", 6, "both", "essential", "infant"),

    ("おしりふき", "乳幼児用品", "枚",
     "person_day", 8, "both", "essential", "infant"),

    ("哺乳瓶・授乳用品", "乳幼児用品", "セット",
     "fixed", 1, "go", "recommended", "infant"),

    # 高齢者用品

    ("介護用品", "高齢者用品", "セット",
     "person", 1, "both", "recommended", "senior"),

    ("大人用おむつ", "高齢者用品", "枚",
     "person_day", 4, "both", "recommended", "senior"),

    # ペット用品

    ("ペットフード", "ペット用品", "食",
     "pet_day", 2, "both", "essential", "pet"),

    ("ペット用飲料水", "ペット用品", "L",
     "pet_day", 1, "both", "essential", "pet"),

    ("ペット用トイレ用品", "ペット用品", "セット",
     "fixed", 1, "go", "recommended", "pet"),

    ("ペット用キャリー", "ペット用品", "個",
     "person", 1, "go", "recommended", "pet"),
]


# ========================================
# 非常持ち出し用品マスター
# ========================================
#
# name
# calculation_type
# rate
# weight_kg : 1単位あたりの重量（kg）
# volume_l  : 1単位あたりの容量（L）
#
# 重量・容量は暫定値
# Noneは未登録・個別確認が必要な用品
# ========================================

GO_ITEMS = [

    ("飲料水", "person_day", 1, 1.0, 1.1),
    ("非常食", "person_day", 3, 0.15, 0.3),

    ("携帯トイレ", "person_day", 5, 0.035, 0.08),
    ("マスク", "person_day", 1, 0.005, 0.015),
    ("生理用品", "fixed", 1, None, None),

    ("懐中電灯", "fixed", 2, 0.15, 0.25),
    ("モバイルバッテリー", "fixed", 2, 0.25, 0.2),
    ("充電ケーブル", "fixed", 2, 0.03, 0.05),

    ("アルミブランケット", "person", 1, 0.06, 0.2),
    ("レインコート", "person", 1, 0.15, 0.4),
    ("軍手", "person", 1, 0.05, 0.15),
    ("タオル", "person", 1, 0.1, 0.4),

    ("防災リュック", "person", 1, 0.6, 0),

    ("救急セット", "fixed", 1, 0.3, 0.8),
    ("常備薬・処方薬", "person", 1, None, None),

    ("携帯ラジオ", "fixed", 1, 0.2, 0.3),
    ("緊急連絡先メモ", "fixed", 1, 0.01, 0.01),
    ("現金・小銭", "fixed", 1, None, None),

    ("乳児用ミルク", "fixed", 1, None, None),
    ("紙おむつ", "person_day", 6, 0.04, 0.25),
    ("おしりふき", "person_day", 8, 0.005, 0.01),
    ("哺乳瓶・授乳用品", "fixed", 1, None, None),

    ("介護用品", "person", 1, None, None),
    ("大人用おむつ", "person_day", 4, 0.08, 0.5),

    ("ペットフード", "pet_day", 2, None, None),
    ("ペット用飲料水", "pet_day", 1, 1.0, 1.1),
    ("ペット用トイレ用品", "fixed", 1, None, None),
    ("ペット用キャリー", "person", 1, None, None),
]


# ========================================
# 商品マスター（仮データ）
# ========================================

PRODUCTS = [
    ("飲料水", "保存水 2L×6本", 12),
    ("非常食", "非常食 12食セット", 12),
    ("携帯トイレ", "携帯トイレ 50回分", 50),
    ("懐中電灯", "LED懐中電灯", 1),
    ("アルミブランケット", "アルミブランケット 5枚セット", 5),
    ("防災リュック", "防災用リュック", 1),
]


DAILY_TYPES = (
    "person_day",
    "group_day",
    "pet_day",
)

FIXED_TYPES = (
    "fixed",
    "person",
)


# ========================================
# マスターデータ登録
# ========================================

def seed_data():

    db = SessionLocal()

    try:

        # ====================================
        # カテゴリ登録・更新
        # ====================================

        for name, order in CATEGORIES:

            category = (
                db.query(Category)
                .filter_by(name=name)
                .first()
            )

            if category is None:

                category = Category(
                    name=name,
                    sort_order=order,
                )

                db.add(category)

            else:

                category.sort_order = order

        db.flush()

        categories = {
            category.name: category
            for category in db.query(Category).all()
        }

        print("Categories updated:", len(CATEGORIES))


        # ====================================
        # 非常持ち出しマスターの辞書化
        # ====================================

        go_items = {
            name: (calc_type, rate, weight, volume)
            for name, calc_type, rate, weight, volume
            in GO_ITEMS
        }


        # ====================================
        # 防災用品登録・更新
        # ====================================

        for order, row in enumerate(ITEMS, start=1):

            (
                name,
                category_name,
                unit,
                calc_type,
                rate,
                storage_type,
                priority,
                condition_type,
            ) = row

            item = (
                db.query(Item)
                .filter_by(name=name)
                .first()
            )

            if item is None:

                item = Item(name=name)
                db.add(item)

            item.category_id = categories[category_name].id

            item.unit = unit
            item.calculation_type = calc_type

            item.quantity_per_person_day = (
                rate if calc_type in DAILY_TYPES else None
            )

            item.fixed_quantity = (
                rate if calc_type in FIXED_TYPES else None
            )

            item.storage_type = storage_type
            item.priority = priority
            item.condition_type = condition_type
            item.sort_order = order


            # ================================
            # 非常持ち出し用計算基準
            # ================================

            if name in go_items:

                (
                    go_calc_type,
                    go_rate,
                    weight,
                    volume,
                ) = go_items[name]

                item.go_calculation_type = go_calc_type

                item.go_quantity_per_person_day = (
                    go_rate
                    if go_calc_type in DAILY_TYPES
                    else None
                )

                item.go_fixed_quantity = (
                    go_rate
                    if go_calc_type in FIXED_TYPES
                    else None
                )

                item.weight_kg = weight
                item.volume_l = volume

            else:

                if storage_type in ("go", "both"):
                    raise ValueError(
                        f"Missing GO_ITEMS definition: {name}"
                    )

                item.go_calculation_type = None
                item.go_quantity_per_person_day = None
                item.go_fixed_quantity = None
                item.weight_kg = None
                item.volume_l = None

        db.flush()

        print("Items updated:", len(ITEMS))
        print("Go items updated:", len(GO_ITEMS))


        # ====================================
        # 商品マスター登録
        # ====================================

        items = {
            item.name: item
            for item in db.query(Item).all()
        }

        added_products = 0

        for item_name, name, quantity in PRODUCTS:

            item = items[item_name]

            product = (
                db.query(Product)
                .filter_by(
                    item_id=item.id,
                    name=name,
                )
                .first()
            )

            if product is None:

                product = Product(
                    item_id=item.id,
                    name=name,
                    quantity_per_package=quantity,
                    price=None,
                    product_url=None,
                )

                db.add(product)

                added_products += 1


        # ====================================
        # 保存
        # ====================================

        db.commit()

        print("New products:", added_products)
        print("Disaster master data updated successfully.")

    except Exception:

        db.rollback()
        raise

    finally:

        db.close()


if __name__ == "__main__":

    seed_data()