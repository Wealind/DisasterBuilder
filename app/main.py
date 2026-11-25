import math

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from pydantic import BaseModel, Field, field_validator, model_validator

from app.database import Base, engine, check_database_connection
from app.calculator import calculate_supplies
from app import models


# ========================================
# ディレクトリ設定
# ========================================

BASE_DIR = Path(__file__).resolve().parent

templates = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)


# ========================================
# 起動・終了処理
# ========================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    Base.metadata.create_all(bind=engine)

    yield


# ========================================
# FastAPI
# ========================================

app = FastAPI(
    title="Disaster Builder",
    description="家庭向け防災用品構成・備蓄管理サービス",
    version="0.7.0",
    lifespan=lifespan,
)


# ========================================
# 静的ファイル
# ========================================

app.mount(
    "/static",
    StaticFiles(
        directory=str(BASE_DIR / "static")
    ),
    name="static",
)


# ========================================
# リクエストモデル
# ========================================

class CalculateRequest(BaseModel):

    # 家族構成

    adults: int = Field(
        ge=0,
        le=30
    )

    children: int = Field(
        ge=0,
        le=30
    )

    infants: int = Field(
        default=0,
        ge=0,
        le=30
    )

    seniors: int = Field(
        default=0,
        ge=0,
        le=30
    )

    pets: int = Field(
        default=0,
        ge=0,
        le=30
    )

    # 備蓄日数

    days: int = Field(
        ge=1,
        le=30
    )

    go_days: int = Field(
        default=1,
        ge=1,
        le=3
    )

    # 非常持ち出し条件

    backpack_capacity: float = Field(
        default=30,
        gt=0,
        le=1000
    )

    max_carry_weight: float = Field(
        default=10,
        gt=0,
        le=500
    )

    # 表示区分

    storage_type: str = Field(
        default="all",
        pattern=r"^(all|home|go)$"
    )

    # 並び順

    sort_by: str = Field(
        default="category",
        pattern=r"^(category|priority)$"
    )

    # 自宅備蓄の所有数量

    owned: dict[str, float] = Field(
        default_factory=dict
    )

    # 非常持ち出しの所有数量

    owned_go: dict[str, float] = Field(
        default_factory=dict
    )

    # 選択済み商品

    selected_products: dict[str, int] = Field(
        default_factory=dict
    )


    # ========================================
    # 所有数量のバリデーション
    # ========================================

    @field_validator("owned", "owned_go")
    @classmethod
    def validate_owned(cls, values):

        for item_id, quantity in values.items():

            if not math.isfinite(quantity):

                raise ValueError(
                    f"Invalid quantity: {item_id}"
                )

            if quantity < 0:

                raise ValueError(
                    f"Quantity must be non-negative: {item_id}"
                )

        return values


    # ========================================
    # 家族構成のバリデーション
    # ========================================

    @model_validator(mode="after")
    def validate_family(self):

        if self.adults + self.children < 1:

            raise ValueError(
                "家族の人数は1人以上にしてください。"
            )

        if self.infants > self.children:

            raise ValueError(
                "乳幼児の人数は子供の人数以下にしてください。"
            )

        if self.seniors > self.adults:

            raise ValueError(
                "高齢者の人数は大人の人数以下にしてください。"
            )

        return self


# ========================================
# 共通ページ表示
# ========================================

def render_page(
    request: Request,
    page: str
):

    return templates.TemplateResponse(
        request=request,
        name=f"{page}.html",
        context={
            "active_page": page,
        },
    )


# ========================================
# ダッシュボード
# ========================================

@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request):

    return render_page(
        request,
        "dashboard"
    )


# ========================================
# 防災用品の構成
# ========================================

@app.get("/builder", response_class=HTMLResponse)
def builder(request: Request):

    return render_page(
        request,
        "builder"
    )


# ========================================
# 自宅備蓄管理
# ========================================

@app.get("/stock", response_class=HTMLResponse)
def stock(request: Request):

    return render_page(
        request,
        "stock"
    )


# ========================================
# 非常持ち出し管理
# ========================================

@app.get("/backpack", response_class=HTMLResponse)
def backpack(request: Request):

    return render_page(
        request,
        "backpack"
    )


# ========================================
# 期限・点検管理
# ========================================

@app.get("/expiry", response_class=HTMLResponse)
def expiry(request: Request):

    return render_page(
        request,
        "expiry"
    )


# ========================================
# 購入リスト
# ========================================

@app.get("/shopping", response_class=HTMLResponse)
def shopping(request: Request):

    return render_page(
        request,
        "shopping"
    )


# ========================================
# 購入・消費履歴
# ========================================

@app.get("/history", response_class=HTMLResponse)
def history(request: Request):

    return render_page(
        request,
        "history"
    )


# ========================================
# 家庭設定
# ========================================

@app.get("/settings", response_class=HTMLResponse)
def settings(request: Request):

    return render_page(
        request,
        "settings"
    )


# ========================================
# ヘルスチェック
# ========================================

@app.get("/health")
def health():

    check_database_connection()

    return {
        "status": "ok"
    }


# ========================================
# 防災用品計算API
# ========================================

@app.post("/api/calculate")
def calculate(data: CalculateRequest):

    return calculate_supplies(
        **data.model_dump()
    )