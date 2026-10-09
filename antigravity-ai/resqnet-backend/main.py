from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import networkx as nx
from typing import List, Tuple, Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RouteRequest(BaseModel):
    city_size: int = 20
    step: int = 4
    start_node: Tuple[int, int]
    end_node: Tuple[int, int]
    danger_grid: Dict[str, float]  # Format: "x,z" -> risk_score

class RouteResponse(BaseModel):
    path: List[Tuple[int, int]]
    cost: float
    blocked_edges: int

@app.post("/api/route", response_model=RouteResponse)
async def calculate_route(req: RouteRequest):
    G = nx.Graph()
    
    # Build the city graph
    nodes = []
    for x in range(-req.city_size, req.city_size + req.step, req.step):
        for z in range(-req.city_size, req.city_size + req.step, req.step):
            nodes.append((x, z))
            G.add_node((x, z))
            
    # Add edges (roads)
    for (x, z) in nodes:
        if (x + req.step, z) in G.nodes:
            G.add_edge((x, z), (x + req.step, z))
        if (x, z + req.step) in G.nodes:
            G.add_edge((x, z), (x, z + req.step))

    # Apply weights based on danger_grid
    # If danger is too high, remove the edge or make it heavily penalized
    blocked_count = 0
    for u, v in G.edges():
        u_str = f"{u[0]},{u[1]}"
        v_str = f"{v[0]},{v[1]}"
        
        u_risk = req.danger_grid.get(u_str, 0)
        v_risk = req.danger_grid.get(v_str, 0)
        
        max_risk = max(u_risk, v_risk)
        
        if max_risk >= 90: # Inaccessible
            G[u][v]['weight'] = 100000 # Near infinite
            blocked_count += 1
        elif max_risk >= 65: # Dangerous
            G[u][v]['weight'] = 100 + (max_risk * 2) # Heavy penalty
        elif max_risk >= 40: # Caution
            G[u][v]['weight'] = 10 + max_risk # Moderate penalty
        else: # Safe
            G[u][v]['weight'] = 1.0 # Base cost

    # A* Heuristic (Manhattan distance)
    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    try:
        path = nx.astar_path(G, source=tuple(req.start_node), target=tuple(req.end_node), heuristic=heuristic, weight='weight')
        cost = nx.astar_path_length(G, source=tuple(req.start_node), target=tuple(req.end_node), heuristic=heuristic, weight='weight')
        return RouteResponse(path=path, cost=cost, blocked_edges=blocked_count)
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="No safe path found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
