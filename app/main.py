from contextlib import asynccontextmanager
from pathlib import Path
import math

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
)

from app.database import (
    Base,
    engine,
    check_database_connection,
)

from app import models
from app.calculator import calculate_supplies


BASE_DIR = Path(__file__).resolve().parent

templates = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Disaster Builder",
    version="0.5.0",
    lifespan=lifespan,
)


class CalculateRequest(BaseModel):

    adults: int = Field(ge=0, le=30)
    children: int = Field(ge=0, le=30)

    days: int = Field(ge=1, le=30)
    go_days: int = Field(default=1, ge=1, le=3)

    infants: int = Field(default=0, ge=0, le=30)
    seniors: int = Field(default=0, ge=0, le=30)
    pets: int = Field(default=0, ge=0, le=30)

    backpack_capacity: float = Field(
        default=30,
        gt=0,
        le=1000,
    )

    max_carry_weight: float = Field(
        default=10,
        gt=0,
        le=500,
    )

    storage_type: str = Field(
        default="all",
        pattern="^(all|home|go)$",
    )

    sort_by: str = Field(
        default="category",
        pattern="^(category|priority)$",
    )

    owned: dict[str, float] = Field(
        default_factory=dict
    )

    owned_go: dict[str, float] = Field(
        default_factory=dict
    )

    @field_validator("owned", "owned_go")
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

        if self.infants > self.children:
            raise ValueError(
                "乳幼児の人数は子供の人数以下にしてください"
            )

        if self.seniors > self.adults:
            raise ValueError(
                "高齢者の人数は大人の人数以下にしてください"
            )

        return self


@app.get("/", response_class=HTMLResponse)
def index(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={},
    )


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


@app.post("/api/calculate")
def calculate(data: CalculateRequest):

    return calculate_supplies(
        **data.model_dump()
    )