"""
schemas/simulation.py — Response schemas for the Twin Simulation feature.

These extend the base feed schemas without contaminating them.
"""

from pydantic import BaseModel
from typing import List
from app.schemas.market import DataQuality
from app.schemas.change_event import SinceLastCheckResponse, SeverityLevel, ConfidenceLevel


class TwinComparisonRow(BaseModel):
    """One row in the side-by-side baseline vs current comparison table."""
    symbol: str
    company_name: str
    sector: str
    baseline_price: float
    current_price: float
    price_change_percent: float
    severity: SeverityLevel
    volume_multiplier: float
    data_quality: DataQuality
    confidence: ConfidenceLevel
    score: int


class SimulationFeedResponse(SinceLastCheckResponse):
    """
    Extends SinceLastCheckResponse with simulation metadata and twin comparison.
    All fields from the base response are preserved so the frontend feed rendering
    works without modification.
    """
    simulation_id: str              # "SIM-04"
    scenario_type: str              # "STOCK_BREAKOUT"
    scenario_label: str             # "Stock Breakout"
    scenario_description: str       # human-readable explanation
    scenario_number: int            # 4 (numeric, for ordering)
    twin_comparison: List[TwinComparisonRow]  # all 15 stocks baseline vs current
