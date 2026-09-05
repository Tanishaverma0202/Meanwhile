import math
from typing import List, Optional
from datetime import datetime, timezone
from app.core.config import settings
from app.schemas.market import MarketSnapshotResponse, DataQuality
from app.schemas.change_event import ChangeEventResponse, SeverityLevel, ScoreBreakdownSchema

class MeaningfulChangeEngine:
    """
    Deterministic attention scoring engine (0–100).

    Formula (no double-counting):
      Price Movement     max 35 pts   — how large was the absolute move?
      Volume Anomaly     max 25 pts   — was trading activity unusual?
      Market-Relative    max 25 pts   — did the stock diverge from NIFTY?
      Volatility         max 15 pts   — did the move exceed normal σ?
    
    Hard suppression rules applied AFTER scoring:
      CONFLICTING data → score = 0, alert suppressed
      STALE data       → score penalised –25, capped at WATCH level
      DELAYED data     → score penalised –5

    These are separate from attention: a stock can have a high score but LOW
    confidence if the data quality is poor.
    """

    @staticmethod
    def calculate_meaningfulness_score(
        current_snapshot: MarketSnapshotResponse,
        previous_snapshot: Optional[MarketSnapshotResponse] = None,
        benchmark_snapshot: Optional[MarketSnapshotResponse] = None,
        watchlist_id: Optional[int] = None
    ) -> ChangeEventResponse:

        symbol = current_snapshot.symbol
        curr_price = current_snapshot.price

        # Price change vs baseline
        if previous_snapshot and previous_snapshot.price > 0:
            prev_price = previous_snapshot.price
            price_change_pct = ((curr_price - prev_price) / prev_price) * 100.0
        else:
            prev_price = curr_price - current_snapshot.change
            price_change_pct = current_snapshot.change_percent

        abs_price_pct = abs(price_change_pct)

        # ── 1. Price Movement Score (max 35) ─────────────────────────────────
        # 35 pts at 5% move; scales linearly below
        price_score = min(35.0, (abs_price_pct / 5.0) * 35.0)

        # ── 2. Volume Anomaly Score (max 25) ─────────────────────────────────
        # 25 pts at 2.5× average; no credit for below-average volume
        vol_ratio = 1.0
        if current_snapshot.avg_volume_20d > 0:
            vol_ratio = current_snapshot.volume / current_snapshot.avg_volume_20d

        vol_change_pct = (vol_ratio - 1.0) * 100.0

        if vol_ratio <= 1.0:
            volume_score = 0.0
        else:
            volume_score = min(25.0, ((vol_ratio - 1.0) / 1.5) * 25.0)

        # ── 3. Market-Relative Movement Score (max 25) ───────────────────────
        # Measures how much the stock diverged from NIFTY 50
        # 25 pts at 5 pp divergence; scores both over- and under-performance
        benchmark_pct = 0.0
        if benchmark_snapshot:
            benchmark_pct = benchmark_snapshot.change_percent
        elif current_snapshot.benchmark_price_change_pct is not None:
            benchmark_pct = current_snapshot.benchmark_price_change_pct

        relative_move_pct = price_change_pct - benchmark_pct
        abs_relative_pct = abs(relative_move_pct)

        market_relative_score = min(25.0, (abs_relative_pct / 5.0) * 25.0)

        # ── 4. Volatility Deviation Score (max 15) ───────────────────────────
        # Compares today's move to the stock's typical daily range (30d σ)
        # 15 pts at 3σ move
        daily_vol = current_snapshot.volatility_30d if current_snapshot.volatility_30d > 0 else 0.015
        daily_vol_pct = daily_vol * 100.0

        volatility_ratio = abs_price_pct / daily_vol_pct if daily_vol_pct > 0 else 1.0
        volatility_score = min(15.0, (volatility_ratio / 3.0) * 15.0)

        # event_score removed — was derived from same price/volume signals (double-counting)

        # ── Market-Wide Beta Dampening ─────────────────────────────────────────
        # If the benchmark moved strongly (|benchmark| >= 1.5%), and this stock tracks the benchmark
        # (|relative_move_pct| < 1.5%), the price action is broad market noise (beta) rather than
        # an idiosyncratic stock event (alpha). We dampen price & volatility scores so broad rallies
        # don't trigger widespread false alerts.
        if abs(benchmark_pct) >= 1.5 and abs_relative_pct < 1.5:
            beta_factor = 0.25 + 0.75 * (abs_relative_pct / 1.5)
            price_score *= beta_factor
            volatility_score *= beta_factor

        raw_total_score = price_score + volume_score + market_relative_score + volatility_score

        # ── 5. Data Quality Adjustments (hard suppression rules) ─────────────
        data_quality = current_snapshot.data_quality
        penalty = 0.0
        reasons: List[str] = []

        if data_quality == DataQuality.CONFLICTING:
            total_score = 0.0
            severity = SeverityLevel.NORMAL
            reasons.append("Conflicting market data detected. Attention suppressed until verified across sources.")
        elif data_quality == DataQuality.STALE:
            penalty = 25.0
            total_score = max(0.0, raw_total_score - penalty)
            # Cap below HIGH_ATTENTION so stale data never surfaces as top alert
            if total_score > settings.SEVERITY_WATCH_MAX:
                total_score = settings.SEVERITY_WATCH_MAX
            reasons.append("Market data is stale (45+ min). Attention score suppressed for data reliability.")
        elif data_quality == DataQuality.DELAYED:
            penalty = 5.0
            total_score = max(0.0, raw_total_score - penalty)
            reasons.append("Data feed delayed; score slightly reduced for timestamp latency.")
        else:
            total_score = raw_total_score

        total_score = float(round(min(100.0, max(0.0, total_score))))

        # ── 6. Severity classification ────────────────────────────────────────
        if data_quality != DataQuality.CONFLICTING:
            if total_score > settings.SEVERITY_MEANINGFUL_MAX:
                severity = SeverityLevel.HIGH_ATTENTION
            elif total_score > settings.SEVERITY_WATCH_MAX:
                severity = SeverityLevel.MEANINGFUL
            elif total_score > settings.SEVERITY_NORMAL_MAX:
                severity = SeverityLevel.WATCH
            else:
                severity = SeverityLevel.NORMAL

        # ── 7. Market outperformance label ───────────────────────────────────
        outperformance_label = ""
        if data_quality != DataQuality.CONFLICTING:
            if price_change_pct >= 0 and relative_move_pct >= 1.0:
                outperformance_label = (
                    f"{symbol} moved significantly above the broader market "
                    f"(+{abs_relative_pct:.1f} pp vs NIFTY {benchmark_pct:+.2f}%)."
                )
            elif price_change_pct >= 0 and relative_move_pct < 0:
                outperformance_label = (
                    f"Stock gained, but lagged the NIFTY 50 benchmark "
                    f"by {abs_relative_pct:.1f} percentage point."
                )
            elif price_change_pct < 0 and relative_move_pct < 0:
                outperformance_label = (
                    f"Stock declined more than NIFTY 50 ({benchmark_pct:+.2f}%)."
                )
            elif price_change_pct < 0 and relative_move_pct >= 0:
                outperformance_label = (
                    f"Stock declined, but held up better than NIFTY 50 ({benchmark_pct:+.2f}%)."
                )
            else:
                outperformance_label = (
                    f"Movement closely matched NIFTY 50 ({benchmark_pct:+.2f}%)."
                )

        # ── 8. Why-this-matters bullets ──────────────────────────────────────
        if data_quality != DataQuality.CONFLICTING:
            if abs_relative_pct >= 0.5:
                direction_word = "above" if relative_move_pct >= 0 else "below"
                reasons.append(
                    f"The stock moved {abs_relative_pct:.1f} pp {direction_word} NIFTY 50 ({benchmark_pct:+.2f}%)."
                )
            else:
                reasons.append(f"Movement closely tracked NIFTY 50 ({benchmark_pct:+.2f}%).")

            if vol_ratio >= 1.2:
                reasons.append(f"Volume at {vol_ratio:.1f}× the 20-day average — unusual trading activity.")
            elif vol_ratio <= 0.8:
                reasons.append(f"Volume at {vol_ratio:.1f}× average — below-normal trading activity.")

            if volatility_ratio >= 1.5:
                reasons.append(
                    f"Move is {volatility_ratio:.1f}× the stock's typical daily range (30d σ)."
                )

            if abs(benchmark_pct) >= 1.5 and abs_relative_pct < 1.5:
                reasons.append(
                    f"Market-wide movement detected (NIFTY {benchmark_pct:+.2f}%). Move tracks broad market; attention score dampened to filter out market beta."
                )

        breakdown = ScoreBreakdownSchema(
            price_score=round(price_score),
            volume_score=round(volume_score),
            market_relative_score=round(market_relative_score),
            volatility_score=round(volatility_score),
            event_score=0,  # removed — was double-counting price+volume signals
            data_quality_penalty=round(penalty),
            total_score=round(total_score)
        )

        return ChangeEventResponse(
            symbol=symbol,
            watchlist_id=watchlist_id,
            detected_at=current_snapshot.timestamp,
            previous_price=round(prev_price, 2),
            current_price=round(curr_price, 2),
            price_change_percent=round(price_change_pct, 2),
            volume_change_percent=round(vol_change_pct, 2),
            volume_multiplier=round(vol_ratio, 1),
            market_relative_change=round(relative_move_pct, 2),
            market_outperformance_label=outperformance_label,
            score=round(total_score),
            severity=severity,
            reasons=reasons,
            score_breakdown=breakdown,
            data_quality=data_quality,
            timeline=current_snapshot.timeline,
            is_within_attention_budget=True
        )
