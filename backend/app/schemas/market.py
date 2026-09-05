from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class DataQuality(str, Enum):
    FRESH = "FRESH"
    DELAYED = "DELAYED"
    STALE = "STALE"
    CONFLICTING = "CONFLICTING"

class SimulationScenario(str, Enum):
    NORMAL = "NORMAL"
    VOLUME_SPIKE = "VOLUME_SPIKE"
    MARKET_RALLY = "MARKET_RALLY"
    EARNINGS_BREAKOUT = "EARNINGS_BREAKOUT"
    STALE_DATA = "STALE_DATA"
    CONFLICTING_DATA = "CONFLICTING_DATA"

class PriceTimelinePointSchema(BaseModel):
    time: str
    price: float

class MarketRegimeSchema(BaseModel):
    benchmark_symbol: str = "NIFTY50"
    benchmark_change_pct: float = 0.50
    advancing_pct: float = 62.0
    advancing_count: int = 31
    declining_count: int = 19
    volatility_regime: str = "Normal"
    regime_label: str = "Stock-specific movement detected"

class MarketSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: float
    avg_volume_20d: float
    volatility_30d: float
    benchmark_symbol: Optional[str] = "NIFTY50"
    benchmark_price_change_pct: Optional[float] = 0.0
    timestamp: datetime
    source: str
    data_quality: DataQuality
    timeline: List[PriceTimelinePointSchema] = []
