
from contextlib import asynccontextmanager
from pathlib import Path
import math

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field, field_validator, model_validator

from app.database import Base, engine, check_database_connection
from app import models
from app.calculator import calculate_supplies


# ========================================
# パス設定
# ========================================

BASE_DIR = Path(__file__).resolve().parent

templates = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)


# ========================================
# アプリ起動処理
# ========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 未作成のテーブルを作成
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Disaster Builder",
    version="0.3.0",
    lifespan=lifespan,
)


# ========================================
# 計算APIの入力モデル
# ========================================

class CalculateRequest(BaseModel):
    adults: int = Field(ge=0, le=30)
    children: int = Field(ge=0, le=30)
    days: int = Field(ge=1, le=30)

    # 所有済み数量
    # キーは用品ID、値は所有数量
    owned: dict[str, float] = Field(default_factory=dict)

    @field_validator("owned")
    @classmethod
    def validate_owned(cls, value):
        for quantity in value.values():
            if not math.isfinite(quantity) or quantity < 0:
                raise ValueError(
                    "所有済み数量は0以上の有限数にしてください"
                )
        return value

    @model_validator(mode="after")
    def validate_people(self):
        if self.adults + self.children < 1:
            raise ValueError(
                "人数は1人以上にしてください"
            )
        return self


# ========================================
# トップページ
# ========================================

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={},
    )


# ========================================
# ヘルスチェック
# ========================================

@app.get("/health")
def health():
    try:
        check_database_connection()

        return {
            "status": "ok",
            "database": "connected",
        }

    except Exception:
        return {
            "status": "error",
            "database": "disconnected",
        }


# ========================================
# 防災用品の必要数量・不足数量計算
# ========================================

@app.post("/api/calculate")
def calculate(data: CalculateRequest):
    return calculate_supplies(
        adults=data.adults,
        children=data.children,
        days=data.days,
        owned=data.owned,
    )
