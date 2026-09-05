from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False, default="Investor")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    watchlists = relationship("Watchlist", back_populates="owner", cascade="all, delete-orphan")
