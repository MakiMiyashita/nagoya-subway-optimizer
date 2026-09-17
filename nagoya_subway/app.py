from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .solver_v2 import SubwaySolver
except ImportError:
    from solver_v2 import SubwaySolver


BASE_DIR = Path(__file__).resolve().parent
FILES = [BASE_DIR / "setting" / "station.lp", BASE_DIR / "setting" / "zone.lp", BASE_DIR / "subway_rules.lp"]

app = FastAPI(title="Nagoya Subway Pass Route API", version="0.2.0")
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

solver = SubwaySolver(FILES)


class SolveRequest(BaseModel):
    endpoints: list[str] = Field(default_factory=list, max_length=2)
    via_hard: list[str] = Field(default_factory=list)
    via_soft: list[str] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list)
    budget: int = Field(default=5, ge=1, le=5)
    min_budget: int = Field(default=1, ge=1, le=5)
    max_results: int = Field(default=50, ge=1, le=50)


@app.post("/solve")
def solve_route(request: SolveRequest):
    positive_stations = set(request.endpoints + request.via_hard + request.via_soft)
    if len(positive_stations) < 2:
        raise HTTPException(status_code=422, detail="異なる指定駅を2駅以上選んでください．")
    if request.min_budget > request.budget:
        raise HTTPException(status_code=422, detail="予算下限は予算上限以下にしてください．")

    try:
        return solver.solve(
            endpoints=request.endpoints,
            via_hard=request.via_hard,
            via_soft=request.via_soft,
            avoid=request.avoid,
            budget=request.budget,
            min_budget=request.min_budget,
            max_results=request.max_results,
            timeout_seconds=float(os.getenv("SOLVER_TIMEOUT_SECONDS", "6")),
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail="経路計算エンジンでエラーが発生した．") from error


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Nagoya Subway Pass Route API"}
