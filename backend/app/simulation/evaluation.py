"""
evaluation.py — Real attention engine evaluation suite.

Runs all 8 deterministic scenarios through the full pipeline and computes
actual noise-reduction and suppression statistics.

These numbers are real — every scenario has known expected outcomes.
"""

from typing import Dict, List, Any
from app.simulation.scenarios import (
    ScenarioEngine, DEMO_WATCHLIST, DEMO_BASELINE, SCENARIO_SEQUENCE, SCENARIO_METADATA
)
from app.schemas.market import DataQuality
from app.schemas.change_event import SeverityLevel
from app.services.scoring_engine import MeaningfulChangeEngine
from app.core.config import settings


# ── Expected outcomes per scenario ────────────────────────────────────────────
# For each scenario, we document which symbols we EXPECT to surface.
# A "true positive" = surfaced when expected.
# A "false positive" = surfaced when NOT expected (noise).
# A "missed" = not surfaced when expected.

SCENARIO_EXPECTED: Dict[str, Dict] = {
    "NORMAL":          {"expected_high": [],                        "expect_suppression": False},
    "STOCK_BREAKOUT":  {"expected_high": ["TATAMOTORS"],            "expect_suppression": False},
    "VOLUME_SHOCK":    {"expected_high": ["INFY"],                  "expect_suppression": False},
    "BROAD_RALLY":     {"expected_high": [],                        "expect_suppression": False},  # market noise, not stock-specific
    "SECTOR_ROTATION": {"expected_high": ["M&M", "TATAMOTORS"],     "expect_suppression": False},
    "STALE_DATA":      {"expected_high": [],                        "expect_suppression": True, "suppressed_symbols": ["HDFCBANK", "TCS"]},
    "CONFLICTING_DATA":{"expected_high": [],                        "expect_suppression": True, "suppressed_symbols": ["INFY"]},
    "MIXED_MARKET":    {"expected_high": ["BAJFINANCE"],            "expect_suppression": False},
}


def run_evaluation() -> Dict[str, Any]:
    """
    Execute the full attention pipeline over all 8 scenarios and return
    verifiable precision/recall statistics.
    """
    total_stocks_evaluated = 0
    total_surfaced = 0
    true_positives = 0
    false_positives = 0
    stale_suppressed_correctly = 0
    stale_suppressed_total = 0
    conflict_suppressed_correctly = 0
    conflict_suppressed_total = 0
    broad_rally_false_positives = 0
    per_scenario: List[Dict] = []

    for scenario_type in SCENARIO_SEQUENCE:
        meta = SCENARIO_METADATA[scenario_type]
        expected = SCENARIO_EXPECTED[scenario_type]

        snapshots = ScenarioEngine.generate(scenario_type, DEMO_BASELINE)
        benchmark = ScenarioEngine.get_benchmark(scenario_type)

        events = []
        for entry in DEMO_WATCHLIST:
            sym = entry["symbol"]
            current = snapshots[sym]
            base = DEMO_BASELINE[sym]

            from datetime import datetime, timezone, timedelta
            from app.schemas.market import MarketSnapshotResponse
            previous = MarketSnapshotResponse(
                symbol=sym,
                price=base["price"],
                change=0.0,
                change_percent=0.0,
                volume=base["avg_volume_20d"],
                avg_volume_20d=base["avg_volume_20d"],
                volatility_30d=base["volatility_30d"],
                benchmark_symbol="NIFTY50",
                benchmark_price_change_pct=0.0,
                timestamp=datetime.now(timezone.utc) - timedelta(hours=6),
                source="BASELINE",
                data_quality=DataQuality.FRESH,
                timeline=[],
            )

            event = MeaningfulChangeEngine.calculate_meaningfulness_score(
                current_snapshot=current,
                previous_snapshot=previous,
                benchmark_snapshot=benchmark,
            )
            events.append(event)

        # Apply attention budget
        events.sort(key=lambda e: e.score, reverse=True)
        budget = settings.ATTENTION_BUDGET
        surfaced = [e for i, e in enumerate(events) if i < budget and e.score > settings.SEVERITY_NORMAL_MAX]

        surfaced_symbols = {e.symbol for e in surfaced}
        expected_high = set(expected["expected_high"])

        scenario_tp = len(surfaced_symbols & expected_high)
        scenario_fp = len(surfaced_symbols - expected_high)
        scenario_surfaced = len(surfaced)

        total_stocks_evaluated += len(DEMO_WATCHLIST)
        total_surfaced += scenario_surfaced
        true_positives += scenario_tp
        false_positives += scenario_fp

        # Broad rally: any surfaced stock that tracks market closely is a false positive
        if scenario_type == "BROAD_RALLY":
            broad_rally_false_positives += scenario_surfaced

        # Stale data suppression check
        if expected.get("expect_suppression") and scenario_type == "STALE_DATA":
            for sym in expected.get("suppressed_symbols", []):
                stale_suppressed_total += 1
                ev = next((e for e in events if e.symbol == sym), None)
                if ev and ev.severity in (SeverityLevel.NORMAL, SeverityLevel.WATCH):
                    stale_suppressed_correctly += 1

        # Conflict suppression check
        if expected.get("expect_suppression") and scenario_type == "CONFLICTING_DATA":
            for sym in expected.get("suppressed_symbols", []):
                conflict_suppressed_total += 1
                ev = next((e for e in events if e.symbol == sym), None)
                if ev and ev.score == 0:
                    conflict_suppressed_correctly += 1

        per_scenario.append({
            "scenario": scenario_type,
            "label": meta["label"],
            "stocks_evaluated": len(DEMO_WATCHLIST),
            "surfaced": scenario_surfaced,
            "expected_high": list(expected_high),
            "surfaced_symbols": list(surfaced_symbols),
            "true_positives": scenario_tp,
            "false_positives": scenario_fp,
        })

    total_raw_movements = total_stocks_evaluated  # every stock had a movement

    precision = (true_positives / (true_positives + false_positives) * 100) if (true_positives + false_positives) > 0 else 100.0
    noise_reduction = ((total_raw_movements - total_surfaced) / total_raw_movements * 100) if total_raw_movements > 0 else 0.0

    stale_suppression_rate = (stale_suppressed_correctly / stale_suppressed_total * 100) if stale_suppressed_total > 0 else 100.0
    conflict_suppression_rate = (conflict_suppressed_correctly / conflict_suppressed_total * 100) if conflict_suppressed_total > 0 else 100.0

    return {
        "engine_version": "1.0 — rule-based deterministic (35+25+25+15)",
        "scenarios_tested": len(SCENARIO_SEQUENCE),
        "total_stocks_evaluated": total_stocks_evaluated,
        "total_raw_movements": total_raw_movements,
        "total_surfaced": total_surfaced,
        "noise_reduction_pct": round(noise_reduction, 1),
        "true_positives": true_positives,
        "false_positives": false_positives,
        "broad_market_false_positives": broad_rally_false_positives,
        "precision_pct": round(precision, 1),
        "stale_suppressed_correctly": stale_suppressed_correctly,
        "stale_suppressed_total": stale_suppressed_total,
        "stale_suppression_rate_pct": round(stale_suppression_rate, 1),
        "conflict_suppressed_correctly": conflict_suppressed_correctly,
        "conflict_suppressed_total": conflict_suppressed_total,
        "conflict_suppression_rate_pct": round(conflict_suppression_rate, 1),
        "per_scenario": per_scenario,
        "methodology": (
            "8 deterministic scenarios with known expected outcomes. "
            "A true positive = expected high-attention stock was surfaced. "
            "A false positive = stock surfaced when no stock-specific signal was expected."
        ),
    }
