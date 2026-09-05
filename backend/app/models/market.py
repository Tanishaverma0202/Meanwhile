from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from app.core.database import Base

class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    price = Column(Float, nullable=False)
    change = Column(Float, nullable=False, default=0.0)
    change_percent = Column(Float, nullable=False, default=0.0)
    volume = Column(Float, nullable=False, default=0.0)
    avg_volume_20d = Column(Float, nullable=False, default=1.0)
    volatility_30d = Column(Float, nullable=False, default=0.015)
    benchmark_symbol = Column(String, nullable=True, default="NIFTY50")
    benchmark_price_change_pct = Column(Float, nullable=True, default=0.0)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    source = Column(String, nullable=False, default="MOCK_PROVIDER")
    data_quality = Column(String, nullable=False, default="FRESH") # FRESH, DELAYED, STALE, CONFLICTING
