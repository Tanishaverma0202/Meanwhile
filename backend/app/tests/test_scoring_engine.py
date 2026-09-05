import pytest
from datetime import datetime, timezone
from app.schemas.market import MarketSnapshotResponse, DataQuality
from app.schemas.change_event import SeverityLevel
from app.services.scoring_engine import MeaningfulChangeEngine

def create_snapshot(
    symbol: str = "TEST",
    price: float = 100.0,
    change_pct: float = 0.0,
    volume: float = 1000000.0,
    avg_vol: float = 1000000.0,
    volatility: float = 0.015,
    benchmark_pct: float = 0.0,
    data_quality: DataQuality = DataQuality.FRESH
) -> MarketSnapshotResponse:
    return MarketSnapshotResponse(
        symbol=symbol,
        price=price,
        change=price * (change_pct / 100.0),
        change_percent=change_pct,
        volume=volume,
        avg_volume_20d=avg_vol,
        volatility_30d=volatility,
        benchmark_symbol="NIFTY50",
        benchmark_price_change_pct=benchmark_pct,
        timestamp=datetime.now(timezone.utc),
        source="TEST_SOURCE",
        data_quality=data_quality
    )

def test_minor_movement_classified_as_normal():
    snap = create_snapshot(change_pct=0.2, volume=1000000, avg_vol=1000000)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.severity == SeverityLevel.NORMAL
    assert event.score <= 30.0

def test_moderate_movement_classified_as_watch_or_meaningful():
    snap = create_snapshot(change_pct=2.0, volume=1500000, avg_vol=1000000)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.severity in [SeverityLevel.WATCH, SeverityLevel.MEANINGFUL]
    assert event.score > 30.0

def test_large_move_with_volume_spike_is_high_attention():
    snap = create_snapshot(change_pct=5.5, volume=3500000, avg_vol=1000000, benchmark_pct=0.5)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.severity == SeverityLevel.HIGH_ATTENTION
    assert event.score > 80.0
    assert len(event.reasons) > 0

def test_broad_market_rally_reduces_relative_score():
    # Stock moves +4.0%, but benchmark also moves +3.8% (Relative move: +0.2%)
    snap = create_snapshot(change_pct=4.0, volume=1000000, avg_vol=1000000, benchmark_pct=3.8)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.score_breakdown.market_relative_score < 5.0

def test_outperforming_stock_gets_high_relative_score():
    # Stock moves +4.8%, benchmark moves +0.5% (Relative move: +4.3%)
    snap = create_snapshot(change_pct=4.8, volume=2100000, avg_vol=1000000, benchmark_pct=0.5)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.score_breakdown.market_relative_score >= 18.0
    assert "moved significantly" in event.market_outperformance_label

def test_stale_data_penalizes_and_caps_score():
    snap = create_snapshot(change_pct=6.0, volume=3000000, avg_vol=1000000, data_quality=DataQuality.STALE)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.severity != SeverityLevel.HIGH_ATTENTION
    assert event.score <= 60.0
    assert any("stale" in r for r in event.reasons)

def test_conflicting_data_suppresses_attention_score():
    snap = create_snapshot(change_pct=8.0, volume=5000000, avg_vol=1000000, data_quality=DataQuality.CONFLICTING)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.severity == SeverityLevel.NORMAL
    assert event.score == 0.0
    assert any("Conflicting" in r for r in event.reasons)

def test_negative_movement_scoring():
    # Stock drops -5.5% with high volume in a flat market
    snap = create_snapshot(change_pct=-5.5, volume=3500000, avg_vol=1000000, benchmark_pct=0.0)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.severity == SeverityLevel.HIGH_ATTENTION
    assert event.score > 80.0
    assert event.price_change_percent == -5.5

def test_boundary_severity_thresholds():
    # Verify severity classification across boundary scores
    from app.core.config import settings
    assert settings.SEVERITY_NORMAL_MAX == 30.0
    assert settings.SEVERITY_WATCH_MAX == 60.0
    assert settings.SEVERITY_MEANINGFUL_MAX == 80.0

def test_missing_volume_handling():
    # Zero volume average should default gracefully without division by zero
    snap = create_snapshot(change_pct=1.0, volume=1000000, avg_vol=0.0)
    event = MeaningfulChangeEngine.calculate_meaningfulness_score(snap)
    assert event.volume_multiplier == 1.0
    assert event.score_breakdown.volume_score == 0.0

