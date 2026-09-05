from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from datetime import datetime, timezone
from app.core.database import Base

class ChangeEvent(Base):
    __tablename__ = "change_events"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=True, index=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    previous_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    price_change_percent = Column(Float, nullable=False)
    volume_change_percent = Column(Float, nullable=False, default=0.0)
    market_relative_change = Column(Float, nullable=False, default=0.0)
    score = Column(Float, nullable=False, default=0.0)
    severity = Column(String, nullable=False, default="NORMAL") # NORMAL, WATCH, MEANINGFUL, HIGH_ATTENTION
    reasons = Column(Text, nullable=False) # JSON array stored as text
    score_breakdown = Column(Text, nullable=False) # JSON object stored as text
    data_quality = Column(String, nullable=False, default="FRESH")
