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

    # 必要数量を計算する方式
    calculation_type = Column(String(30), nullable=False)

    # 1人1日あたりの必要数量など
    quantity_per_person_day = Column(Float, nullable=True)

    # 人数に依存しない固定数量など
    fixed_quantity = Column(Float, nullable=True)

    # 初期状態で計算対象にするか
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

    # 1パッケージで補える用品数量
    quantity_per_package = Column(Float, nullable=False)

    price = Column(Integer, nullable=True)

    product_url = Column(String(1000), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    item = relationship("Item")