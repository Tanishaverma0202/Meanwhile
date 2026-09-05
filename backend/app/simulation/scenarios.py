"""
scenarios.py — Deterministic Twin Simulation Scenario Engine

Defines:
  - DEMO_WATCHLIST: 15 recognisable NIFTY 50 stocks
  - DEMO_BASELINE: fixed "last seen" prices (what the user saw before)
  - ScenarioEngine.generate(): returns current market snapshots per scenario

Each scenario applies precise price/volume/data-quality overrides to
specific stocks so the scoring engine produces predictable, explainable,
educationally different results for each demo run.

Score thresholds (from config):
  NORMAL ≤ 30 | WATCH ≤ 60 | MEANINGFUL ≤ 80 | HIGH_ATTENTION > 80
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple
from app.schemas.market import MarketSnapshotResponse, DataQuality, PriceTimelinePointSchema, MarketRegimeSchema

# ──────────────────────────────────────────────────────────────────────────────
# Fixed Demo Watchlist — 15 recognisable NIFTY 50 large-caps
# ──────────────────────────────────────────────────────────────────────────────

DEMO_WATCHLIST: List[Dict] = [
    {"symbol": "RELIANCE",   "company": "Reliance Industries",   "sector": "Energy"},
    {"symbol": "HDFCBANK",   "company": "HDFC Bank",             "sector": "Banking"},
    {"symbol": "ICICIBANK",  "company": "ICICI Bank",            "sector": "Banking"},
    {"symbol": "SBIN",       "company": "State Bank of India",   "sector": "Banking"},
    {"symbol": "INFY",       "company": "Infosys",               "sector": "IT"},
    {"symbol": "TCS",        "company": "Tata Consultancy Svcs", "sector": "IT"},
    {"symbol": "BHARTIARTL", "company": "Bharti Airtel",         "sector": "Telecom"},
    {"symbol": "LT",         "company": "Larsen & Toubro",       "sector": "Infrastructure"},
    {"symbol": "TATAMOTORS", "company": "Tata Motors",           "sector": "Automobile"},
    {"symbol": "M&M",        "company": "Mahindra & Mahindra",   "sector": "Automobile"},
    {"symbol": "ITC",        "company": "ITC",                   "sector": "FMCG"},
    {"symbol": "SUNPHARMA",  "company": "Sun Pharmaceutical",    "sector": "Healthcare"},
    {"symbol": "BAJFINANCE", "company": "Bajaj Finance",         "sector": "Financial Svcs"},
    {"symbol": "AXISBANK",   "company": "Axis Bank",             "sector": "Banking"},
    {"symbol": "MARUTI",     "company": "Maruti Suzuki",         "sector": "Automobile"},
]

DEMO_SYMBOLS = [s["symbol"] for s in DEMO_WATCHLIST]

# ──────────────────────────────────────────────────────────────────────────────
# DEMO_BASELINE — fixed "last seen" prices
# This is what the user's watchlist was showing at their last check.
# Every simulation measures current vs these numbers.
# ──────────────────────────────────────────────────────────────────────────────

DEMO_BASELINE: Dict[str, Dict] = {
    "RELIANCE":   {"price": 2952.00, "avg_volume_20d": 3_500_000,  "volatility_30d": 0.014},
    "HDFCBANK":   {"price": 1610.00, "avg_volume_20d": 7_500_000,  "volatility_30d": 0.016},
    "ICICIBANK":  {"price": 1195.00, "avg_volume_20d": 5_200_000,  "volatility_30d": 0.012},
    "SBIN":       {"price":  825.00, "avg_volume_20d": 8_000_000,  "volatility_30d": 0.019},
    "INFY":       {"price": 1842.00, "avg_volume_20d": 4_000_000,  "volatility_30d": 0.018},
    "TCS":        {"price": 4088.00, "avg_volume_20d": 2_200_000,  "volatility_30d": 0.015},
    "BHARTIARTL": {"price": 1421.00, "avg_volume_20d": 4_000_000,  "volatility_30d": 0.013},
    "LT":         {"price": 3580.00, "avg_volume_20d": 2_200_000,  "volatility_30d": 0.018},
    "TATAMOTORS": {"price":  820.00, "avg_volume_20d": 6_000_000,  "volatility_30d": 0.022},
    "M&M":        {"price": 3120.00, "avg_volume_20d": 1_800_000,  "volatility_30d": 0.019},
    "ITC":        {"price":  462.00, "avg_volume_20d": 12_000_000, "volatility_30d": 0.013},
    "SUNPHARMA":  {"price": 1655.00, "avg_volume_20d": 1_800_000,  "volatility_30d": 0.014},
    "BAJFINANCE": {"price": 7002.00, "avg_volume_20d": 1_200_000,  "volatility_30d": 0.021},
    "AXISBANK":   {"price": 1178.00, "avg_volume_20d": 6_000_000,  "volatility_30d": 0.016},
    "MARUTI":     {"price":12240.00, "avg_volume_20d":   800_000,  "volatility_30d": 0.016},
}

# ──────────────────────────────────────────────────────────────────────────────
# Ordered scenario rotation — 8 scenarios in a fixed, reproducible sequence
# ──────────────────────────────────────────────────────────────────────────────

SCENARIO_SEQUENCE = [
    "NORMAL",
    "STOCK_BREAKOUT",
    "VOLUME_SHOCK",
    "BROAD_RALLY",
    "SECTOR_ROTATION",
    "STALE_DATA",
    "CONFLICTING_DATA",
    "MIXED_MARKET",
]

SCENARIO_METADATA: Dict[str, Dict] = {
    "NORMAL": {
        "label":       "Normal Market",
        "description": "Small, routine movements across the board — most stocks moved within their daily noise band.",
        "advancing":   28,
        "declining":   22,
        "nifty_pct":   0.50,
        "volatility":  "Low",
    },
    "STOCK_BREAKOUT": {
        "label":       "Stock Breakout",
        "description": "One stock is moving dramatically more than the broader market — a stock-specific event is in play.",
        "advancing":   31,
        "declining":   19,
        "nifty_pct":   0.50,
        "volatility":  "Normal",
    },
    "VOLUME_SHOCK": {
        "label":       "Volume Shock",
        "description": "Price is moderate, but trading volume is running at 4× the daily average — unusual institutional activity detected.",
        "advancing":   26,
        "declining":   24,
        "nifty_pct":   0.40,
        "volatility":  "Normal",
    },
    "BROAD_RALLY": {
        "label":       "Broad Market Rally",
        "description": "NIFTY 50 is up +3.2%. Most stocks moved with the market. Meanwhile suppresses market-driven noise.",
        "advancing":   44,
        "declining":    6,
        "nifty_pct":   3.20,
        "volatility":  "Normal",
    },
    "SECTOR_ROTATION": {
        "label":       "Sector Rotation",
        "description": "Auto stocks are surging while IT lags. Relative sector performance is what matters here.",
        "advancing":   30,
        "declining":   20,
        "nifty_pct":   0.80,
        "volatility":  "Elevated",
    },
    "STALE_DATA": {
        "label":       "Stale Data Feed",
        "description": "Some market data feeds have not updated in 45+ minutes. Attention scores are suppressed for stale sources.",
        "advancing":   27,
        "declining":   23,
        "nifty_pct":   0.80,
        "volatility":  "Normal",
    },
    "CONFLICTING_DATA": {
        "label":       "Conflicting Feeds",
        "description": "Two data sources disagree on INFY's price by ₹59. Attention is suppressed until data is verified.",
        "advancing":   29,
        "declining":   21,
        "nifty_pct":   0.50,
        "volatility":  "Normal",
    },
    "MIXED_MARKET": {
        "label":       "Mixed Market",
        "description": "Financials rally strongly while IT declines. Opposite movements in the same session reveal portfolio exposure.",
        "advancing":   25,
        "declining":   25,
        "nifty_pct":   0.30,
        "volatility":  "Elevated",
    },
}

# ──────────────────────────────────────────────────────────────────────────────
# Per-scenario stock overrides
# Format: symbol → (price_change_pct, volume_multiplier, data_quality)
# price_change_pct is applied to DEMO_BASELINE price to produce current price
# ──────────────────────────────────────────────────────────────────────────────

SCENARIO_OVERRIDES: Dict[str, Dict[str, Tuple]] = {
    # ── Scenario 1: Normal Market ────────────────────────────────────────────
    # Expected output: ≤1 event reaches WATCH, most are NORMAL
    "NORMAL": {
        "RELIANCE":   (+0.40, 1.0,  DataQuality.FRESH),
        "HDFCBANK":   (+0.70, 1.0,  DataQuality.FRESH),
        "ICICIBANK":  (+0.55, 0.9,  DataQuality.FRESH),
        "SBIN":       (+0.30, 1.1,  DataQuality.FRESH),
        "INFY":       (-0.30, 1.0,  DataQuality.FRESH),
        "TCS":        (+0.50, 0.8,  DataQuality.FRESH),
        "BHARTIARTL": (+0.20, 0.9,  DataQuality.FRESH),
        "LT":         (+0.45, 1.0,  DataQuality.FRESH),
        "TATAMOTORS": (+0.60, 1.0,  DataQuality.FRESH),
        "M&M":        (+0.35, 0.9,  DataQuality.FRESH),
        "ITC":        (+0.20, 1.0,  DataQuality.FRESH),
        "SUNPHARMA":  (-0.10, 1.0,  DataQuality.FRESH),
        "BAJFINANCE": (+0.80, 1.1,  DataQuality.FRESH),
        "AXISBANK":   (-0.25, 0.9,  DataQuality.FRESH),
        "MARUTI":     (+0.40, 1.0,  DataQuality.FRESH),
    },
    # ── Scenario 2: Stock Breakout ───────────────────────────────────────────
    # TATAMOTORS: score ≈ 93 → HIGH_ATTENTION
    # INFY:       score ≈ 40 → WATCH/MEANINGFUL
    # HDFCBANK:   score ≈ 18 → NORMAL (beats NIFTY only slightly)
    # All others: ≈ NORMAL
    "STOCK_BREAKOUT": {
        "RELIANCE":   (+0.40, 1.0,  DataQuality.FRESH),
        "HDFCBANK":   (+1.10, 1.1,  DataQuality.FRESH),
        "ICICIBANK":  (+0.70, 0.9,  DataQuality.FRESH),
        "SBIN":       (+0.50, 1.0,  DataQuality.FRESH),
        "INFY":       (+2.10, 1.6,  DataQuality.FRESH),  # meaningful, moderate volume
        "TCS":        (+0.30, 0.9,  DataQuality.FRESH),
        "BHARTIARTL": (+0.60, 1.0,  DataQuality.FRESH),
        "LT":         (+0.80, 1.0,  DataQuality.FRESH),
        "TATAMOTORS": (+7.80, 3.4,  DataQuality.FRESH),  # ← STAR of this scenario
        "M&M":        (+0.50, 0.9,  DataQuality.FRESH),
        "ITC":        (+0.30, 1.0,  DataQuality.FRESH),
        "SUNPHARMA":  (+0.20, 1.0,  DataQuality.FRESH),
        "BAJFINANCE": (+0.90, 1.0,  DataQuality.FRESH),
        "AXISBANK":   (+0.40, 0.9,  DataQuality.FRESH),
        "MARUTI":     (+0.60, 1.0,  DataQuality.FRESH),
    },
    # ── Scenario 3: Volume Shock ─────────────────────────────────────────────
    # INFY: moderate price +2.1% but volume 4.1× → score ≈ 72 → MEANINGFUL
    # LT:   solid +3.8% with 2.2× → MEANINGFUL
    # Rest: quiet
    "VOLUME_SHOCK": {
        "RELIANCE":   (+0.30, 1.0,  DataQuality.FRESH),
        "HDFCBANK":   (+0.50, 1.0,  DataQuality.FRESH),
        "ICICIBANK":  (+0.40, 0.9,  DataQuality.FRESH),
        "SBIN":       (+0.20, 1.1,  DataQuality.FRESH),
        "INFY":       (+2.10, 4.1,  DataQuality.FRESH),  # ← volume shock protagonist
        "TCS":        (+0.35, 1.0,  DataQuality.FRESH),
        "BHARTIARTL": (+0.50, 0.9,  DataQuality.FRESH),
        "LT":         (+3.80, 2.2,  DataQuality.FRESH),  # secondary signal
        "TATAMOTORS": (+0.70, 1.1,  DataQuality.FRESH),
        "M&M":        (+0.40, 1.0,  DataQuality.FRESH),
        "ITC":        (+0.15, 1.0,  DataQuality.FRESH),
        "SUNPHARMA":  (+0.25, 0.9,  DataQuality.FRESH),
        "BAJFINANCE": (+0.60, 1.0,  DataQuality.FRESH),
        "AXISBANK":   (+0.30, 0.9,  DataQuality.FRESH),
        "MARUTI":     (+0.45, 1.0,  DataQuality.FRESH),
    },
    # ── Scenario 4: Broad Market Rally ──────────────────────────────────────
    # NIFTY: +3.2%. Everything moves with the market.
    # Meanwhile should surface almost nothing (relative scores ≈ 0)
    # Only ICICIBANK is +0.4pp above NIFTY — small WATCH at best
    "BROAD_RALLY": {
        "RELIANCE":   (+3.40, 1.1,  DataQuality.FRESH),  # +0.2pp above NIFTY → NORMAL
        "HDFCBANK":   (+3.00, 1.0,  DataQuality.FRESH),
        "ICICIBANK":  (+3.60, 1.1,  DataQuality.FRESH),  # +0.4pp → NORMAL
        "SBIN":       (+3.20, 1.2,  DataQuality.FRESH),
        "INFY":       (+3.10, 1.0,  DataQuality.FRESH),
        "TCS":        (+2.90, 0.9,  DataQuality.FRESH),
        "BHARTIARTL": (+2.80, 1.0,  DataQuality.FRESH),
        "LT":         (+3.30, 1.1,  DataQuality.FRESH),
        "TATAMOTORS": (+3.00, 1.0,  DataQuality.FRESH),
        "M&M":        (+2.70, 0.9,  DataQuality.FRESH),
        "ITC":        (+3.20, 1.0,  DataQuality.FRESH),
        "SUNPHARMA":  (+3.10, 1.0,  DataQuality.FRESH),
        "BAJFINANCE": (+3.50, 1.1,  DataQuality.FRESH),
        "AXISBANK":   (+3.10, 1.0,  DataQuality.FRESH),
        "MARUTI":     (+2.90, 0.9,  DataQuality.FRESH),
    },
    # ── Scenario 5: Sector Rotation ──────────────────────────────────────────
    # Auto: surges (+4-5% relative to NIFTY +0.8%) → HIGH/MEANINGFUL
    # IT:   falls below NIFTY → WATCH
    "SECTOR_ROTATION": {
        "RELIANCE":   (+0.90, 1.0,  DataQuality.FRESH),
        "HDFCBANK":   (+0.80, 1.0,  DataQuality.FRESH),
        "ICICIBANK":  (+0.70, 0.9,  DataQuality.FRESH),
        "SBIN":       (+1.00, 1.1,  DataQuality.FRESH),
        "INFY":       (-1.50, 1.5,  DataQuality.FRESH),  # ← lags market (−2.3pp relative)
        "TCS":        (-1.20, 1.3,  DataQuality.FRESH),  # ← lags market
        "BHARTIARTL": (+0.60, 0.9,  DataQuality.FRESH),
        "LT":         (+1.40, 1.1,  DataQuality.FRESH),
        "TATAMOTORS": (+4.80, 2.2,  DataQuality.FRESH),  # ← MEANINGFUL/HIGH
        "M&M":        (+5.10, 2.5,  DataQuality.FRESH),  # ← HIGH_ATTENTION (best auto)
        "ITC":        (+0.50, 1.0,  DataQuality.FRESH),
        "SUNPHARMA":  (+0.30, 1.0,  DataQuality.FRESH),
        "BAJFINANCE": (+0.80, 1.0,  DataQuality.FRESH),
        "AXISBANK":   (+0.90, 1.0,  DataQuality.FRESH),
        "MARUTI":     (+4.20, 1.8,  DataQuality.FRESH),  # ← WATCH/MEANINGFUL
    },
    # ── Scenario 6: Stale Data ───────────────────────────────────────────────
    # TCS and HDFCBANK feeds are 45 min stale → suppressed scores
    # INFY: genuine +2.4%, fresh → WATCH
    # LT: genuine +4.1%, fresh → MEANINGFUL
    "STALE_DATA": {
        "RELIANCE":   (+0.40, 1.0,  DataQuality.FRESH),
        "HDFCBANK":   (+2.80, 1.8,  DataQuality.STALE),   # ← STALE: score suppressed
        "ICICIBANK":  (+0.60, 0.9,  DataQuality.FRESH),
        "SBIN":       (+0.35, 1.0,  DataQuality.FRESH),
        "INFY":       (+2.40, 1.5,  DataQuality.FRESH),   # ← genuine signal
        "TCS":        (+3.50, 2.0,  DataQuality.STALE),   # ← STALE: score suppressed
        "BHARTIARTL": (+0.50, 0.9,  DataQuality.FRESH),
        "LT":         (+4.10, 2.1,  DataQuality.FRESH),   # ← genuine meaningful
        "TATAMOTORS": (+0.70, 1.0,  DataQuality.FRESH),
        "M&M":        (+0.40, 0.9,  DataQuality.FRESH),
        "ITC":        (+0.20, 1.0,  DataQuality.FRESH),
        "SUNPHARMA":  (+0.30, 1.0,  DataQuality.FRESH),
        "BAJFINANCE": (+0.80, 1.0,  DataQuality.FRESH),
        "AXISBANK":   (+0.50, 0.9,  DataQuality.FRESH),
        "MARUTI":     (+0.60, 1.0,  DataQuality.FRESH),
    },
    # ── Scenario 7: Conflicting Data ─────────────────────────────────────────
    # INFY: two providers disagree by ₹59 → attention zeroed (CONFLICTING)
    # LT: +4.1%, genuine → MEANINGFUL (surfaces instead)
    # BAJFINANCE: +3.6%, genuine → WATCH/MEANINGFUL
    "CONFLICTING_DATA": {
        "RELIANCE":   (+0.50, 1.0,  DataQuality.FRESH),
        "HDFCBANK":   (+0.70, 0.9,  DataQuality.FRESH),
        "ICICIBANK":  (+0.60, 1.0,  DataQuality.FRESH),
        "SBIN":       (+0.40, 1.1,  DataQuality.FRESH),
        "INFY":       (+5.60, 2.2,  DataQuality.CONFLICTING),  # ← SUPPRESSED
        "TCS":        (+0.30, 0.8,  DataQuality.FRESH),
        "BHARTIARTL": (+0.50, 0.9,  DataQuality.FRESH),
        "LT":         (+4.10, 2.1,  DataQuality.FRESH),        # ← surfaces instead
        "TATAMOTORS": (+0.80, 1.0,  DataQuality.FRESH),
        "M&M":        (+0.40, 0.9,  DataQuality.FRESH),
        "ITC":        (+0.20, 1.0,  DataQuality.FRESH),
        "SUNPHARMA":  (+0.30, 1.0,  DataQuality.FRESH),
        "BAJFINANCE": (+3.60, 1.8,  DataQuality.FRESH),        # ← secondary
        "AXISBANK":   (+0.60, 1.0,  DataQuality.FRESH),
        "MARUTI":     (+0.50, 0.9,  DataQuality.FRESH),
    },
    # ── Scenario 8: Mixed Market ─────────────────────────────────────────────
    # BAJFINANCE & SBIN rally hard (financials); TCS & INFY drop (IT sells off)
    # NIFTY: +0.3% (nearly flat overall)
    "MIXED_MARKET": {
        "RELIANCE":   (+0.30, 1.0,  DataQuality.FRESH),
        "HDFCBANK":   (+1.20, 1.2,  DataQuality.FRESH),
        "ICICIBANK":  (+1.80, 1.5,  DataQuality.FRESH),
        "SBIN":       (+4.20, 2.0,  DataQuality.FRESH),        # ← MEANINGFUL (financials)
        "INFY":       (-2.80, 1.7,  DataQuality.FRESH),        # ← WATCH/MEANINGFUL (IT sell)
        "TCS":        (-3.20, 1.8,  DataQuality.FRESH),        # ← MEANINGFUL (IT sell)
        "BHARTIARTL": (+0.40, 0.9,  DataQuality.FRESH),
        "LT":         (+0.60, 1.0,  DataQuality.FRESH),
        "TATAMOTORS": (+0.50, 1.0,  DataQuality.FRESH),
        "M&M":        (+0.30, 0.9,  DataQuality.FRESH),
        "ITC":        (+0.20, 1.0,  DataQuality.FRESH),
        "SUNPHARMA":  (+0.40, 1.0,  DataQuality.FRESH),
        "BAJFINANCE": (+5.80, 2.8,  DataQuality.FRESH),        # ← HIGH_ATTENTION
        "AXISBANK":   (+2.10, 1.6,  DataQuality.FRESH),
        "MARUTI":     (+0.40, 0.9,  DataQuality.FRESH),
    },
}


# ──────────────────────────────────────────────────────────────────────────────
# ScenarioEngine — builds MarketSnapshotResponse objects per scenario
# ──────────────────────────────────────────────────────────────────────────────

class ScenarioEngine:

    @staticmethod
    def build_timeline(baseline_price: float, current_price: float) -> list:
        """Generate a simple 4-point intraday timeline from baseline → current."""
        diff = current_price - baseline_price
        return [
            {"time": "09:15 AM", "price": round(baseline_price + diff * 0.10, 2)},
            {"time": "11:30 AM", "price": round(baseline_price + diff * 0.40, 2)},
            {"time": "01:45 PM", "price": round(baseline_price + diff * 0.75, 2)},
            {"time": "03:30 PM", "price": round(current_price, 2)},
        ]

    @staticmethod
    def get_benchmark(scenario_type: str) -> MarketSnapshotResponse:
        """Return the NIFTY50 benchmark snapshot for this scenario."""
        meta = SCENARIO_METADATA[scenario_type]
        nifty_pct = meta["nifty_pct"]
        nifty_baseline = 24_500.0
        nifty_change = nifty_baseline * (nifty_pct / 100.0)
        nifty_current = nifty_baseline + nifty_change
        now = datetime.now(timezone.utc)
        return MarketSnapshotResponse(
            symbol="NIFTY50",
            price=round(nifty_current, 2),
            change=round(nifty_change, 2),
            change_percent=nifty_pct,
            volume=100_000_000.0,
            avg_volume_20d=100_000_000.0,
            volatility_30d=0.009,
            benchmark_symbol="NIFTY50",
            benchmark_price_change_pct=nifty_pct,
            timestamp=now,
            source="SIMULATION",
            data_quality=DataQuality.FRESH,
            timeline=[
                PriceTimelinePointSchema(time="09:15 AM", price=round(nifty_baseline + nifty_change * 0.1, 2)),
                PriceTimelinePointSchema(time="03:30 PM", price=round(nifty_current, 2)),
            ]
        )

    @staticmethod
    def generate(scenario_type: str, baseline: Dict) -> Dict[str, MarketSnapshotResponse]:
        """
        Returns a dict: symbol → MarketSnapshotResponse for every demo stock
        under the given scenario. Uses the provided baseline.
        """
        now = datetime.now(timezone.utc)
        overrides = SCENARIO_OVERRIDES.get(scenario_type, SCENARIO_OVERRIDES["NORMAL"])
        meta = SCENARIO_METADATA[scenario_type]
        nifty_pct = meta["nifty_pct"]
        snapshots: Dict[str, MarketSnapshotResponse] = {}

        for entry in DEMO_WATCHLIST:
            sym = entry["symbol"]
            base = baseline[sym]

            # Default if no override
            change_pct, vol_mult, dq = overrides.get(sym, (0.30, 1.0, DataQuality.FRESH))

            baseline_price = base["price"]
            current_price  = round(baseline_price * (1.0 + change_pct / 100.0), 2)
            change         = round(current_price - baseline_price, 2)
            avg_vol        = base["avg_volume_20d"]
            volume         = avg_vol * vol_mult

            # Stale data → timestamp 45 min ago
            ts = now if dq != DataQuality.STALE else (now - timedelta(minutes=45))

            timeline_raw = ScenarioEngine.build_timeline(baseline_price, current_price)
            timeline_pts = [PriceTimelinePointSchema(**pt) for pt in timeline_raw]

            snapshots[sym] = MarketSnapshotResponse(
                symbol=sym,
                price=current_price,
                change=change,
                change_percent=change_pct,
                volume=round(volume),
                avg_volume_20d=avg_vol,
                volatility_30d=base["volatility_30d"],
                benchmark_symbol="NIFTY50",
                benchmark_price_change_pct=nifty_pct,
                timestamp=ts,
                source="TWIN_SIMULATION",
                data_quality=dq,
                timeline=timeline_pts,
            )

        return snapshots

    @staticmethod
    def get_regime(scenario_type: str) -> MarketRegimeSchema:
        """Return the MarketRegime description for this scenario."""
        meta = SCENARIO_METADATA[scenario_type]
        total = meta["advancing"] + meta["declining"]
        return MarketRegimeSchema(
            benchmark_symbol="NIFTY50",
            benchmark_change_pct=meta["nifty_pct"],
            advancing_pct=round(meta["advancing"] / total * 100, 1),
            advancing_count=meta["advancing"],
            declining_count=meta["declining"],
            volatility_regime=meta["volatility"],
            regime_label=meta["label"],
        )
