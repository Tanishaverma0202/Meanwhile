from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
from app.schemas.market import DataQuality, PriceTimelinePointSchema, MarketRegimeSchema

class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    REDUCED = "REDUCED"
    LOW = "LOW"
    SUPPRESSED = "SUPPRESSED"

class SeverityLevel(str, Enum):
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    MEANINGFUL = "MEANINGFUL"
    HIGH_ATTENTION = "HIGH_ATTENTION"

class ScoreBreakdownSchema(BaseModel):
    price_score: int = 0          # Max 35
    volume_score: int = 0         # Max 25
    market_relative_score: int = 0 # Max 25
    volatility_score: int = 0     # Max 15
    event_score: int = 0          # 0 (deprecated)
    data_quality_penalty: int = 0
    total_score: int = 0

class ChangeEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    symbol: str
    watchlist_id: Optional[int] = None
    detected_at: datetime
    previous_price: float
    current_price: float
    price_change_percent: float
    volume_change_percent: float
    volume_multiplier: float = 1.0
    market_relative_change: float
    market_outperformance_label: str = ""
    score: int
    severity: SeverityLevel
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    reasons: List[str]
    score_breakdown: ScoreBreakdownSchema
    data_quality: DataQuality
    timeline: List[PriceTimelinePointSchema] = []
    is_within_attention_budget: bool = True

class AttentionSummary(BaseModel):
    total_watched: int
    high_attention_count: int
    meaningful_count: int
    watch_count: int
    normal_count: int
    last_checked_at: Optional[datetime] = None
    elapsed_time_formatted: str
    has_material_changes: bool = True
    attention_budget: int = 5
    market_story: str = ""

class SinceLastCheckResponse(BaseModel):
    summary: AttentionSummary
    market_regime: MarketRegimeSchema
    top_events: List[ChangeEventResponse]
    other_events: List[ChangeEventResponse]
    events: List[ChangeEventResponse] # For backward compatibility
    benchmark_symbol: str = "NIFTY50"
    benchmark_change_pct: float = 0.0
