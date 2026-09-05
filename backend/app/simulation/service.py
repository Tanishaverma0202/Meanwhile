"""
service.py — SimulationService

Runs the full Meanwhile pipeline for a given simulation scenario:
  1. Generate current market snapshots via ScenarioEngine
  2. Score each stock with MeaningfulChangeEngine against the baseline (not DB)
  3. Rank and apply attention budget
  4. Build TwinComparisonRow list for the side-by-side view
  5. Return SimulationFeedResponse

No database access. No real user state contamination.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict

from app.simulation.scenarios import (
    ScenarioEngine, DEMO_WATCHLIST, DEMO_BASELINE,
    SCENARIO_METADATA, SCENARIO_SEQUENCE
)
from app.simulation.state import SimulationState
from app.schemas.market import MarketSnapshotResponse, DataQuality
from app.schemas.change_event import (
    SinceLastCheckResponse, AttentionSummary,
    ChangeEventResponse, SeverityLevel, ConfidenceLevel
)
from app.schemas.simulation import SimulationFeedResponse, TwinComparisonRow
from app.services.scoring_engine import MeaningfulChangeEngine
from app.core.config import settings


class SimulationService:

    @staticmethod
    def _build_baseline_snapshot(sym: str, baseline: Dict) -> MarketSnapshotResponse:
        """Create a 'previous' snapshot from the given baseline data."""
        base = baseline[sym]
        now = datetime.now(timezone.utc)
        return MarketSnapshotResponse(
            symbol=sym,
            price=base["price"],
            change=0.0,
            change_percent=0.0,
            volume=base["avg_volume_20d"],
            avg_volume_20d=base["avg_volume_20d"],
            volatility_30d=base["volatility_30d"],
            benchmark_symbol="NIFTY50",
            benchmark_price_change_pct=0.0,
            timestamp=now - timedelta(hours=6),
            source="BASELINE",
            data_quality=DataQuality.FRESH,
            timeline=[],
        )

    @staticmethod
    def evaluate(state: SimulationState) -> SimulationFeedResponse:
        """
        Full pipeline execution for the current simulation state.
        Returns a complete SimulationFeedResponse ready for the frontend.
        """
        scenario_type = state.scenario_type
        meta = SCENARIO_METADATA[scenario_type]
        now = datetime.now(timezone.utc)

        # 1. Generate current market snapshots
        snapshots: Dict[str, MarketSnapshotResponse] = ScenarioEngine.generate(scenario_type, state.current_baseline)
        state.last_snapshots = snapshots
        benchmark = ScenarioEngine.get_benchmark(scenario_type)
        regime = ScenarioEngine.get_regime(scenario_type)

        # 2. Score every stock through the real MeaningfulChangeEngine
        all_events: List[ChangeEventResponse] = []
        high_cnt = meaningful_cnt = watch_cnt = normal_cnt = 0

        for entry in DEMO_WATCHLIST:
            sym = entry["symbol"]
            current = snapshots[sym]
            previous = SimulationService._build_baseline_snapshot(sym, state.current_baseline)

            event = MeaningfulChangeEngine.calculate_meaningfulness_score(
                current_snapshot=current,
                previous_snapshot=previous,
                benchmark_snapshot=benchmark,
            )
            
            # 2.5 Apply Confidence Level
            if current.data_quality == DataQuality.FRESH:
                event.confidence = ConfidenceLevel.HIGH
            elif current.data_quality == DataQuality.DELAYED:
                event.confidence = ConfidenceLevel.REDUCED
            elif current.data_quality == DataQuality.STALE:
                event.confidence = ConfidenceLevel.LOW
            elif current.data_quality == DataQuality.CONFLICTING:
                event.confidence = ConfidenceLevel.SUPPRESSED
                
            all_events.append(event)

            if event.severity == SeverityLevel.HIGH_ATTENTION:
                high_cnt += 1
            elif event.severity == SeverityLevel.MEANINGFUL:
                meaningful_cnt += 1
            elif event.severity == SeverityLevel.WATCH:
                watch_cnt += 1
            else:
                normal_cnt += 1

        # 3. Sort by score descending
        all_events.sort(key=lambda e: e.score, reverse=True)

        # 4. Apply attention budget
        budget = settings.ATTENTION_BUDGET
        top_events: List[ChangeEventResponse] = []
        other_events: List[ChangeEventResponse] = []

        for idx, ev in enumerate(all_events):
            if idx < budget and ev.score > settings.SEVERITY_NORMAL_MAX:
                ev.is_within_attention_budget = True
                top_events.append(ev)
            else:
                ev.is_within_attention_budget = False
                other_events.append(ev)

        has_material = (high_cnt + meaningful_cnt + watch_cnt) > 0

        # 5. Build twin comparison rows (all 15 stocks)
        twin_comparison: List[TwinComparisonRow] = []
        event_map = {ev.symbol: ev for ev in all_events}

        for entry in DEMO_WATCHLIST:
            sym = entry["symbol"]
            base = state.current_baseline[sym]
            ev = event_map.get(sym)
            
            conf = ConfidenceLevel.HIGH
            if snapshots[sym].data_quality == DataQuality.DELAYED:
                conf = ConfidenceLevel.REDUCED
            elif snapshots[sym].data_quality == DataQuality.STALE:
                conf = ConfidenceLevel.LOW
            elif snapshots[sym].data_quality == DataQuality.CONFLICTING:
                conf = ConfidenceLevel.SUPPRESSED
                
            twin_comparison.append(TwinComparisonRow(
                symbol=sym,
                company_name=entry["company"],
                sector=entry["sector"],
                baseline_price=base["price"],
                current_price=snapshots[sym].price,
                price_change_percent=snapshots[sym].change_percent,
                severity=ev.severity if ev else SeverityLevel.NORMAL,
                volume_multiplier=ev.volume_multiplier if ev else 1.0,
                data_quality=snapshots[sym].data_quality,
                confidence=conf,
                score=int(ev.score) if ev else 0,
            ))

        # 6. Elapsed time label — dynamic based on last_checked_at
        elapsed_delta = now - state.last_checked_at
        total_minutes = int(elapsed_delta.total_seconds() / 60)
        if total_minutes < 1:
            elapsed_str = "just now"
        elif total_minutes < 60:
            elapsed_str = f"{total_minutes}m ago"
        else:
            hours = total_minutes // 60
            mins = total_minutes % 60
            elapsed_str = f"{hours}h {mins}m ago" if mins > 0 else f"{hours}h ago"

        # Generate market story
        story = "The market is mixed; stock-specific movements dominate."
        if scenario_type == "NORMAL":
            story = "Normal market session. No major anomalies or broad movements detected."
        elif scenario_type == "STOCK_BREAKOUT":
            story = "The broader market was quiet, but Tata Motors experienced a major breakout."
        elif scenario_type == "VOLUME_SHOCK":
            story = "Price action is muted, but institutional volume shocks were detected in IT."
        elif scenario_type == "BROAD_RALLY":
            story = "Strong broad market rally. Most stocks are simply tracking the NIFTY 50."
        elif scenario_type == "SECTOR_ROTATION":
            story = "Capital is rotating. Automobile stocks are surging while IT stocks lag behind."
        elif scenario_type == "STALE_DATA":
            story = "Several data feeds are stale. Attention is suppressed until fresh data arrives."
        elif scenario_type == "CONFLICTING_DATA":
            story = "Data providers are returning conflicting quotes for INFY. Alerts suppressed."
        elif scenario_type == "MIXED_MARKET":
            story = "The market is heavily mixed. Financials rally while IT faces selling pressure."

        summary = AttentionSummary(
            total_watched=len(DEMO_WATCHLIST),
            high_attention_count=high_cnt,
            meaningful_count=meaningful_cnt,
            watch_count=watch_cnt,
            normal_count=normal_cnt,
            last_checked_at=state.last_checked_at,
            elapsed_time_formatted=elapsed_str,
            has_material_changes=has_material,
            attention_budget=budget,
            market_story=story,
        )

        # Build scenario description summary for material-changes header
        desc = meta["description"]

        return SimulationFeedResponse(
            simulation_id=state.simulation_id,
            scenario_type=scenario_type,
            scenario_label=meta["label"],
            scenario_description=desc,
            scenario_number=state.simulation_number,
            summary=summary,
            market_regime=regime,
            top_events=top_events,
            other_events=other_events,
            events=all_events,
            benchmark_symbol=benchmark.symbol,
            benchmark_change_pct=benchmark.change_percent,
            twin_comparison=twin_comparison,
        )
