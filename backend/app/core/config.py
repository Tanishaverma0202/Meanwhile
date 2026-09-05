import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Meanwhile"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./meanwhile.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "meanwhile-secret-key-groww-2026-hackathon-super-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days for demo ease
    
    # Data Quality Freshness Thresholds (in seconds)
    FRESH_THRESHOLD_SECONDS: int = 300      # < 5 minutes is FRESH
    DELAYED_THRESHOLD_SECONDS: int = 1800   # 5-30 minutes is DELAYED
    # > 30 minutes is STALE
    
    # Centralized Scoring Severity Thresholds (0-100)
    SEVERITY_NORMAL_MAX: float = 30.0
    SEVERITY_WATCH_MAX: float = 60.0
    SEVERITY_MEANINGFUL_MAX: float = 80.0
    # 81.0 - 100.0 is HIGH_ATTENTION

    # Product Attention Budget (max prominent items surfaced)
    ATTENTION_BUDGET: int = 5
    
    # Market Data Mode
    MARKET_DATA_PROVIDER: str = os.getenv("MARKET_DATA_PROVIDER", "MOCK") # MOCK or REAL

    class Config:
        case_sensitive = True

settings = Settings()
