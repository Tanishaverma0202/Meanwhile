from fastapi import APIRouter, Depends, Query
from typing import List, Dict
from app.schemas.market import MarketSnapshotResponse
from app.providers.singleton import shared_market_provider as market_provider

router = APIRouter(prefix="/market", tags=["Market Data"])

@router.get("/quote/{symbol}", response_model=MarketSnapshotResponse)
def get_quote(symbol: str):
    return market_provider.get_quote(symbol)

@router.get("/benchmark", response_model=MarketSnapshotResponse)
def get_benchmark():
    return market_provider.get_benchmark_quote("NIFTY50")

@router.get("/symbols", response_model=List[str])
def get_available_symbols():
    return list(market_provider.base_data.keys())
