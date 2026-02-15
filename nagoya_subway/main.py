from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from solver import SubwaySolver

app = FastAPI(title="Subway Route Solver API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 開発中はすべて許可
    allow_methods=["*"],
    allow_headers=["*"],
)

FILES = ["setting/station.lp", "setting/zone.lp", "subway_rules.lp"]
solver = SubwaySolver(FILES)

class SolveRequest(BaseModel):
    endpoints: List[str] = []
    via_hard: List[str] = []
    via_soft: List[str] = []
    budget: int = 5
    min_budget: int = 1

# 3. APIエンドポイント（ブラウザから叩く場所）
@app.post("/solve")
async def solve_route(req: SolveRequest):
    try:
        results = solver.solve(
            endpoints=req.endpoints,
            via_hard=req.via_hard,
            via_soft=req.via_soft,
            budget=req.budget,
            min_budget=req.min_budget
        )
        
        if not results:
            return {"status": "success", "message": "No routes found", "results": []}
            
        return {"status": "success", "results": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# サーバー起動確認用
@app.get("/")
def read_root():
    return {"message": "Subway Solver API is running!"}