from __future__ import annotations

import os
import threading
import uuid
from pathlib import Path
from typing import Any

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
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

solver = SubwaySolver(FILES)
jobs: dict[str, dict[str, Any]] = {}
jobs_lock = threading.Lock()


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


def validate_request(request: SolveRequest) -> None:
    positive_stations = set(request.endpoints + request.via_hard + request.via_soft)
    if len(positive_stations) < 2:
        raise HTTPException(status_code=422, detail="異なる指定駅を2駅以上選んでください．")
    if request.min_budget > request.budget:
        raise HTTPException(status_code=422, detail="予算下限は予算上限以下にしてください．")


def run_search_job(job_id: str, request: SolveRequest, stop_event: threading.Event) -> None:
    def update(response: dict[str, Any]) -> None:
        with jobs_lock:
            job = jobs.get(job_id)
            if job is not None:
                job["response"] = response

    try:
        response = solver.solve(
            endpoints=request.endpoints,
            via_hard=request.via_hard,
            via_soft=request.via_soft,
            avoid=request.avoid,
            budget=request.budget,
            min_budget=request.min_budget,
            max_results=request.max_results,
            timeout_seconds=None,
            progress_callback=update,
            should_stop=stop_event.is_set,
            return_all_results=True,
        )
        all_results = response.pop("_all_results")
        with jobs_lock:
            jobs[job_id]["response"] = response
            jobs[job_id]["all_results"] = all_results
            jobs[job_id]["status"] = "stopped" if response["search"]["stopped"] else "complete"
    except (ValueError, RuntimeError) as error:
        with jobs_lock:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = str(error)


@app.post("/solve/jobs", status_code=202)
def create_search_job(request: SolveRequest):
    validate_request(request)
    job_id = uuid.uuid4().hex
    stop_event = threading.Event()
    with jobs_lock:
        jobs[job_id] = {
            "status": "running",
            "response": {
                "results": [],
                "search": {
                    "complete": False,
                    "timed_out": False,
                    "stopped": False,
                    "has_more": False,
                    "returned_count": 0,
                    "candidate_count": 0,
                    "models_seen": 0,
                    "discovered_count": 0,
                    "elapsed_seconds": 0,
                },
            },
            "error": None,
            "all_results": [],
            "stop_event": stop_event,
        }
    threading.Thread(target=run_search_job, args=(job_id, request, stop_event), daemon=True).start()
    return {"job_id": job_id}


@app.get("/solve/jobs/{job_id}")
def get_search_job(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="探索ジョブが見つかりません．")
        return {
            "status": job["status"],
            "response": job["response"],
            "error": job["error"],
        }


@app.get("/solve/jobs/{job_id}/results")
def get_search_job_results(
    job_id: str,
    sort_key: str = "recommended",
    min_satisfied: int = 0,
    max_zone: int = 5,
    min_stations: int = 0,
    station_ids: str = "",
):
    if sort_key not in {"recommended", "satisfaction", "zone", "stations"}:
        raise HTTPException(status_code=422, detail="並び順が不正です．")

    with jobs_lock:
        job = jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="探索ジョブが見つかりません．")
        if job["status"] == "running":
            raise HTTPException(status_code=409, detail="探索が完了していません．")
        all_results = list(job["all_results"])
        search = dict(job["response"]["search"])

    station_filter = {station for station in station_ids.split(",") if station}
    filtered = [
        route for route in all_results
        if len(route["satisfied"]) >= min_satisfied
        and route["zone"] <= max_zone
        and route["stations_count"] >= min_stations
        and (not station_filter or any(station in station_filter for station in route["route_names"]))
    ]

    if sort_key == "satisfaction":
        key = lambda route: (-len(route["satisfied"]), route["zone"], -route["stations_count"])
    elif sort_key == "zone":
        key = lambda route: (route["zone"], -len(route["satisfied"]), -route["stations_count"])
    elif sort_key == "stations":
        key = lambda route: (-route["stations_count"], -len(route["satisfied"]), route["zone"])
    else:
        key = lambda route: (-len(route["satisfied"]), route["zone"], -route["stations_count"])

    filtered.sort(key=key)
    results = filtered[:50]
    search.update({
        "returned_count": len(results),
        "candidate_count": len(filtered),
        "has_more": len(filtered) > len(results) or search["stopped"] or search["timed_out"],
    })
    return {"results": results, "search": search}


@app.delete("/solve/jobs/{job_id}")
def stop_search_job(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="探索ジョブが見つかりません．")
        job["stop_event"].set()
    return {"status": "stopping"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Nagoya Subway Pass Route API"}
