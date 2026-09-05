from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.market import MarketSnapshotResponse

class WatchlistItemCreate(BaseModel):
    symbol: str = Field(..., description="Stock ticker symbol, e.g. INFY, RELIANCE")

class WatchlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    watchlist_id: int
    symbol: str
    added_at: datetime
    last_seen_at: datetime
    latest_snapshot: Optional[MarketSnapshotResponse] = None

class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class WatchlistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)

class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    created_at: datetime
    items: List[WatchlistItemResponse] = []
