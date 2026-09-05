from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.models.watchlist import Watchlist, WatchlistItem
from app.models.change_event import ChangeEvent
from app.schemas.change_event import (
    SinceLastCheckResponse, AttentionSummary, ChangeEventResponse, SeverityLevel
)
from app.schemas.market import MarketRegimeSchema
from app.providers.base import MarketDataProvider
from app.services.scoring_engine import MeaningfulChangeEngine

class SinceLastCheckService:

    @staticmethod
    def format_elapsed_time(seconds: float) -> str:
        if seconds < 5:
            return "Just now"
        if seconds < 60:
            return f"{int(seconds)}s ago"
        minutes = int(seconds // 60)
        if minutes < 60:
            return f"{minutes}m ago"
        hours = int(minutes // 60)
        rem_mins = minutes % 60
        if hours < 24:
            return f"{hours}h {rem_mins}m ago" if rem_mins > 0 else f"{hours}h ago"
        days = int(hours // 24)
        rem_hours = hours % 24
        return f"{days}d {rem_hours}h ago"

    @staticmethod
    def get_since_last_check_feed(
        db: Session,
        user_id: int,
        provider: MarketDataProvider,
        watchlist_id: Optional[int] = None
    ) -> SinceLastCheckResponse:
        
        query = db.query(WatchlistItem).join(Watchlist).filter(Watchlist.user_id == user_id)
        if watchlist_id:
            query = query.filter(WatchlistItem.watchlist_id == watchlist_id)
        
        items = query.all()
        now = datetime.now(timezone.utc)
        market_regime = provider.get_market_regime()

        if not items:
            return SinceLastCheckResponse(
                summary=AttentionSummary(
                    total_watched=0,
                    high_attention_count=0,
                    meaningful_count=0,
                    watch_count=0,
                    normal_count=0,
                    last_checked_at=now,
                    elapsed_time_formatted="Just now",
                    has_material_changes=False,
                    attention_budget=settings.ATTENTION_BUDGET
                ),
                market_regime=market_regime,
                top_events=[],
                other_events=[],
                events=[],
                benchmark_symbol="NIFTY50",
                benchmark_change_pct=market_regime.benchmark_change_pct
            )

        # Earliest last_seen_at
        last_seen_times = [item.last_seen_at for item in items if item.last_seen_at]
        if last_seen_times:
            last_checked = min(last_seen_times)
            if last_checked.tzinfo is None:
                last_checked = last_checked.replace(tzinfo=timezone.utc)
        else:
            last_checked = now - timedelta(hours=6, minutes=51)

        elapsed_seconds = (now - last_checked).total_seconds()
        elapsed_str = SinceLastCheckService.format_elapsed_time(max(0.0, elapsed_seconds))

        unique_symbols = list(set(item.symbol for item in items))
        quotes_map = provider.get_batch_quotes(unique_symbols)
        benchmark_snapshot = provider.get_benchmark_quote("NIFTY50")

        all_events: List[ChangeEventResponse] = []
        high_cnt = 0
        meaningful_cnt = 0
        watch_cnt = 0
        normal_cnt = 0

        for item in items:
            snapshot = quotes_map.get(item.symbol.upper())
            if not snapshot:
                continue

            event = MeaningfulChangeEngine.calculate_meaningfulness_score(
                current_snapshot=snapshot,
                benchmark_snapshot=benchmark_snapshot,
                watchlist_id=item.watchlist_id
            )

            all_events.append(event)

            if event.severity == SeverityLevel.HIGH_ATTENTION:
                high_cnt += 1
            elif event.severity == SeverityLevel.MEANINGFUL:
                meaningful_cnt += 1
            elif event.severity == SeverityLevel.WATCH:
                watch_cnt += 1
            else:
                normal_cnt += 1

        # Sort all events by score descending
        all_events.sort(key=lambda x: x.score, reverse=True)

        # Apply Attention Budget (e.g. max top 5 items)
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

        summary = AttentionSummary(
            total_watched=len(items),
            high_attention_count=high_cnt,
            meaningful_count=meaningful_cnt,
            watch_count=watch_cnt,
            normal_count=normal_cnt,
            last_checked_at=last_checked,
            elapsed_time_formatted=elapsed_str,
            has_material_changes=has_material,
            attention_budget=budget
        )

        return SinceLastCheckResponse(
            summary=summary,
            market_regime=market_regime,
            top_events=top_events,
            other_events=other_events,
            events=all_events, # For backward compatibility
            benchmark_symbol=benchmark_snapshot.symbol,
            benchmark_change_pct=benchmark_snapshot.change_percent
        )

    @staticmethod
    def acknowledge_seen(db: Session, user_id: int, watchlist_id: Optional[int] = None):
        query = db.query(WatchlistItem).join(Watchlist).filter(Watchlist.user_id == user_id)
        if watchlist_id:
            query = query.filter(WatchlistItem.watchlist_id == watchlist_id)
        
        items = query.all()
        now = datetime.now(timezone.utc)
        for item in items:
            item.last_seen_at = now
        
        db.commit()
