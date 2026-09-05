from fastapi import APIRouter
from app.api.v1 import auth, watchlists, attention, market, simulation

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(watchlists.router)
api_router.include_router(attention.router)
api_router.include_router(market.router)
api_router.include_router(simulation.router)
