from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    sort_order = Column(Integer, nullable=False, default=0)

    items = relationship("Item", back_populates="category")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)

    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=False,
    )

    name = Column(String(100), nullable=False, unique=True)
    unit = Column(String(20), nullable=False)

    # 自宅備蓄用の計算基準
    calculation_type = Column(String(30), nullable=False)
    quantity_per_person_day = Column(Float, nullable=True)
    fixed_quantity = Column(Float, nullable=True)

    # 非常持ち出し用の計算基準
    go_calculation_type = Column(String(30), nullable=True)
    go_quantity_per_person_day = Column(Float, nullable=True)
    go_fixed_quantity = Column(Float, nullable=True)

    # 1単位あたりの重量・容量
    weight_kg = Column(Float, nullable=True)
    volume_l = Column(Float, nullable=True)

    storage_type = Column(
        String(20),
        nullable=False,
        default="home",
    )

    priority = Column(
        String(20),
        nullable=False,
        default="recommended",
    )

    condition_type = Column(
        String(20),
        nullable=False,
        default="all",
    )

    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)

    category = relationship("Category", back_populates="items")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)

    item_id = Column(
        Integer,
        ForeignKey("items.id"),
        nullable=False,
    )

    name = Column(String(200), nullable=False)
    quantity_per_package = Column(Float, nullable=False)

    price = Column(Integer, nullable=True)
    product_url = Column(String(1000), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    item = relationship("Item")