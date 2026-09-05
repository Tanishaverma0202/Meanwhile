from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from app.providers.base import MarketDataProvider
from app.schemas.market import MarketSnapshotResponse, DataQuality, SimulationScenario, PriceTimelinePointSchema, MarketRegimeSchema

class MockMarketDataProvider(MarketDataProvider):
    """
    Mock Market Data Provider delivering realistic Indian stock market snapshots.
    Supports on-demand scenario simulation (Normal, Volume Spike, Stale Data, Conflicting Data).
    """

    def __init__(self):
        self.active_scenario: SimulationScenario = SimulationScenario.NORMAL
        # Base realistic prices & 20-day averages
        self.base_data = {
            "INFY": {
                "price": 1745.0,
                "change": 80.0,
                "change_percent": 4.80,
                "volume": 8400000.0,
                "avg_volume_20d": 4000000.0, # 2.1x volume surge
                "volatility_30d": 0.018,
                "timeline": [
                    {"time": "09:15 AM", "price": 1665.0},
                    {"time": "11:30 AM", "price": 1690.0},
                    {"time": "01:45 PM", "price": 1720.0},
                    {"time": "03:30 PM", "price": 1745.0},
                ]
            },
            "RELIANCE": {
                "price": 2980.0,
                "change": 14.5,
                "change_percent": 0.49,
                "volume": 3200000.0,
                "avg_volume_20d": 3500000.0,
                "volatility_30d": 0.014,
                "timeline": [
                    {"time": "09:15 AM", "price": 2965.5},
                    {"time": "11:30 AM", "price": 2972.0},
                    {"time": "01:45 PM", "price": 2978.0},
                    {"time": "03:30 PM", "price": 2980.0},
                ]
            },
            "TCS": {
                "price": 4120.0,
                "change": -35.0,
                "change_percent": -0.84,
                "volume": 2100000.0,
                "avg_volume_20d": 2200000.0,
                "volatility_30d": 0.015,
                "timeline": [
                    {"time": "09:15 AM", "price": 4155.0},
                    {"time": "11:30 AM", "price": 4140.0},
                    {"time": "01:45 PM", "price": 4130.0},
                    {"time": "03:30 PM", "price": 4120.0},
                ]
            },
            "HDFCBANK": {
                "price": 1640.0,
                "change": 42.0,
                "change_percent": 2.63,
                "volume": 12500000.0,
                "avg_volume_20d": 7500000.0, # 1.66x volume
                "volatility_30d": 0.016,
                "timeline": [
                    {"time": "09:15 AM", "price": 1598.0},
                    {"time": "11:30 AM", "price": 1612.0},
                    {"time": "01:45 PM", "price": 1628.0},
                    {"time": "03:30 PM", "price": 1640.0},
                ]
            },
            "TATAMOTORS": {
                "price": 985.0,
                "change": 58.0,
                "change_percent": 6.25,
                "volume": 18500000.0,
                "avg_volume_20d": 6000000.0, # 3.08x volume spike!
                "volatility_30d": 0.022,
                "timeline": [
                    {"time": "09:15 AM", "price": 927.0},
                    {"time": "11:30 AM", "price": 948.0},
                    {"time": "01:45 PM", "price": 970.0},
                    {"time": "03:30 PM", "price": 985.0},
                ]
            },
            "ICICIBANK": {
                "price": 1210.0,
                "change": 3.0,
                "change_percent": 0.25,
                "volume": 5000000.0,
                "avg_volume_20d": 5200000.0,
                "volatility_30d": 0.012,
                "timeline": [
                    {"time": "09:15 AM", "price": 1207.0},
                    {"time": "03:30 PM", "price": 1210.0},
                ]
            },
            "WIPRO": {
                "price": 525.0,
                "change": 1.2,
                "change_percent": 0.23,
                "volume": 1800000.0,
                "avg_volume_20d": 2000000.0,
                "volatility_30d": 0.017,
                "timeline": [
                    {"time": "09:15 AM", "price": 523.8},
                    {"time": "03:30 PM", "price": 525.0},
                ]
            },
            "BHARTIARTL": {
                "price": 1450.0,
                "change": 22.0,
                "change_percent": 1.54,
                "volume": 4100000.0,
                "avg_volume_20d": 4000000.0,
                "volatility_30d": 0.013,
                "timeline": [
                    {"time": "09:15 AM", "price": 1428.0},
                    {"time": "03:30 PM", "price": 1450.0},
                ]
            },
            "KOTAKBANK": {
                "price": 1820.0,
                "change": 28.5,
                "change_percent": 1.59,
                "volume": 3500000.0,
                "avg_volume_20d": 3200000.0,
                "volatility_30d": 0.015,
                "timeline": [
                    {"time": "09:15 AM", "price": 1791.5},
                    {"time": "03:30 PM", "price": 1820.0},
                ]
            },
            "LT": {
                "price": 3650.0,
                "change": 95.0,
                "change_percent": 2.67,
                "volume": 4800000.0,
                "avg_volume_20d": 2200000.0, # 2.18x volume surge
                "volatility_30d": 0.018,
                "timeline": [
                    {"time": "09:15 AM", "price": 3555.0},
                    {"time": "11:30 AM", "price": 3590.0},
                    {"time": "01:45 PM", "price": 3625.0},
                    {"time": "03:30 PM", "price": 3650.0},
                ]
            },
            "AXISBANK": {
                "price": 1180.0,
                "change": -12.0,
                "change_percent": -1.01,
                "volume": 6200000.0,
                "avg_volume_20d": 6000000.0,
                "volatility_30d": 0.016,
                "timeline": [
                    {"time": "09:15 AM", "price": 1192.0},
                    {"time": "03:30 PM", "price": 1180.0},
                ]
            },
            "SBIN": {
                "price": 845.0,
                "change": 28.5,
                "change_percent": 3.49,
                "volume": 18500000.0,
                "avg_volume_20d": 8000000.0, # 2.31x volume surge
                "volatility_30d": 0.019,
                "timeline": [
                    {"time": "09:15 AM", "price": 816.5},
                    {"time": "11:30 AM", "price": 828.0},
                    {"time": "01:45 PM", "price": 838.0},
                    {"time": "03:30 PM", "price": 845.0},
                ]
            },
            "BAJFINANCE": {
                "price": 7150.0,
                "change": 210.0,
                "change_percent": 3.02,
                "volume": 2800000.0,
                "avg_volume_20d": 1200000.0, # 2.33x volume surge
                "volatility_30d": 0.021,
                "timeline": [
                    {"time": "09:15 AM", "price": 6940.0},
                    {"time": "11:30 AM", "price": 7020.0},
                    {"time": "03:30 PM", "price": 7150.0},
                ]
            },
            "TITAN": {
                "price": 3420.0,
                "change": 48.0,
                "change_percent": 1.42,
                "volume": 1500000.0,
                "avg_volume_20d": 1400000.0,
                "volatility_30d": 0.017,
                "timeline": [
                    {"time": "09:15 AM", "price": 3372.0},
                    {"time": "03:30 PM", "price": 3420.0},
                ]
            },
            "SUNPHARMA": {
                "price": 1680.0,
                "change": 32.0,
                "change_percent": 1.94,
                "volume": 2200000.0,
                "avg_volume_20d": 1800000.0,
                "volatility_30d": 0.014,
                "timeline": [
                    {"time": "09:15 AM", "price": 1648.0},
                    {"time": "03:30 PM", "price": 1680.0},
                ]
            },
            "MARUTI": {
                "price": 12400.0,
                "change": 180.0,
                "change_percent": 1.47,
                "volume": 850000.0,
                "avg_volume_20d": 800000.0,
                "volatility_30d": 0.016,
                "timeline": [
                    {"time": "09:15 AM", "price": 12220.0},
                    {"time": "03:30 PM", "price": 12400.0},
                ]
            },
            "ASIANPAINT": {
                "price": 2890.0,
                "change": -42.0,
                "change_percent": -1.43,
                "volume": 1200000.0,
                "avg_volume_20d": 1300000.0,
                "volatility_30d": 0.015,
                "timeline": [
                    {"time": "09:15 AM", "price": 2932.0},
                    {"time": "03:30 PM", "price": 2890.0},
                ]
            },
            "ULTRACEMCO": {
                "price": 11200.0,
                "change": 140.0,
                "change_percent": 1.26,
                "volume": 450000.0,
                "avg_volume_20d": 420000.0,
                "volatility_30d": 0.014,
                "timeline": [
                    {"time": "09:15 AM", "price": 11060.0},
                    {"time": "03:30 PM", "price": 11200.0},
                ]
            },
            "TATASTEEL": {
                "price": 158.0,
                "change": 4.2,
                "change_percent": 2.73,
                "volume": 28000000.0,
                "avg_volume_20d": 14000000.0, # 2.0x volume
                "volatility_30d": 0.024,
                "timeline": [
                    {"time": "09:15 AM", "price": 153.8},
                    {"time": "03:30 PM", "price": 158.0},
                ]
            },
            "NTPC": {
                "price": 395.0,
                "change": 8.5,
                "change_percent": 2.20,
                "volume": 11000000.0,
                "avg_volume_20d": 8500000.0,
                "volatility_30d": 0.018,
                "timeline": [
                    {"time": "09:15 AM", "price": 386.5},
                    {"time": "03:30 PM", "price": 395.0},
                ]
            },
            "HAL": {
                "price": 4650.0,
                "change": 245.0,
                "change_percent": 5.57,
                "volume": 6500000.0,
                "avg_volume_20d": 2100000.0, # 3.1x volume surge
                "volatility_30d": 0.024,
                "timeline": [
                    {"time": "09:15 AM", "price": 4405.0},
                    {"time": "11:30 AM", "price": 4510.0},
                    {"time": "01:45 PM", "price": 4600.0},
                    {"time": "03:30 PM", "price": 4650.0},
                ]
            },
            "NESTLEIND": {
                "price": 2520.0,
                "change": -15.0,
                "change_percent": -0.59,
                "volume": 850000.0,
                "avg_volume_20d": 900000.0,
                "volatility_30d": 0.012,
                "timeline": [
                    {"time": "09:15 AM", "price": 2535.0},
                    {"time": "03:30 PM", "price": 2520.0},
                ]
            },
            "DLF": {
                "price": 875.0,
                "change": 35.0,
                "change_percent": 4.17,
                "volume": 8200000.0,
                "avg_volume_20d": 3200000.0, # 2.56x volume
                "volatility_30d": 0.022,
                "timeline": [
                    {"time": "09:15 AM", "price": 840.0},
                    {"time": "01:45 PM", "price": 862.0},
                    {"time": "03:30 PM", "price": 875.0},
                ]
            },
            "ADANIENT": {
                "price": 3150.0,
                "change": 115.0,
                "change_percent": 3.79,
                "volume": 7500000.0,
                "avg_volume_20d": 2600000.0, # 2.88x volume
                "volatility_30d": 0.028,
                "timeline": [
                    {"time": "09:15 AM", "price": 3035.0},
                    {"time": "03:30 PM", "price": 3150.0},
                ]
            },
            "BEL": {
                "price": 295.0,
                "change": 8.4,
                "change_percent": 2.93,
                "volume": 14500000.0,
                "avg_volume_20d": 8000000.0,
                "volatility_30d": 0.021,
                "timeline": [
                    {"time": "09:15 AM", "price": 286.6},
                    {"time": "03:30 PM", "price": 295.0},
                ]
            },
            "JIOFIN": {
                "price": 345.0,
                "change": 6.2,
                "change_percent": 1.83,
                "volume": 18000000.0,
                "avg_volume_20d": 13000000.0,
                "volatility_30d": 0.019,
                "timeline": [
                    {"time": "09:15 AM", "price": 338.8},
                    {"time": "03:30 PM", "price": 345.0},
                ]
            },
            "ZOMATO": {
                "price": 265.0,
                "change": 12.4,
                "change_percent": 4.91,
                "volume": 32000000.0,
                "avg_volume_20d": 10000000.0, # 3.2x volume breakout
                "volatility_30d": 0.026,
                "timeline": [
                    {"time": "09:15 AM", "price": 252.6},
                    {"time": "11:30 AM", "price": 258.0},
                    {"time": "03:30 PM", "price": 265.0},
                ]
            },
            "POWERGRID": {
                "price": 335.0,
                "change": -1.0,
                "change_percent": -0.30,
                "volume": 5400000.0,
                "avg_volume_20d": 6000000.0,
                "volatility_30d": 0.011,
                "timeline": [
                    {"time": "09:15 AM", "price": 336.0},
                    {"time": "03:30 PM", "price": 335.0},
                ]
            },
            "COALINDIA": {
                "price": 490.0,
                "change": 5.8,
                "change_percent": 1.20,
                "volume": 9200000.0,
                "avg_volume_20d": 8500000.0,
                "volatility_30d": 0.017,
                "timeline": [
                    {"time": "09:15 AM", "price": 484.2},
                    {"time": "03:30 PM", "price": 490.0},
                ]
            },
            "TRENT": {
                "price": 7250.0,
                "change": 415.0,
                "change_percent": 6.07,
                "volume": 3400000.0,
                "avg_volume_20d": 1000000.0, # 3.4x retail volume surge
                "volatility_30d": 0.025,
                "timeline": [
                    {"time": "09:15 AM", "price": 6835.0},
                    {"time": "11:30 AM", "price": 7010.0},
                    {"time": "03:30 PM", "price": 7250.0},
                ]
            },
            "NIFTY50": {
                "price": 24850.0,
                "change": 124.0,
                "change_percent": 0.50, # Broad market benchmark moved +0.5%
                "volume": 100000000.0,
                "avg_volume_20d": 100000000.0,
                "volatility_30d": 0.009,
                "timeline": [
                    {"time": "09:15 AM", "price": 24726.0},
                    {"time": "03:30 PM", "price": 24850.0},
                ]
            }
        }
        self.twin_simulation_seed = 0

    def reset_scenario(self):
        """Resets scenario to NORMAL and rotates to the next Twin Simulation market state."""
        self.active_scenario = SimulationScenario.NORMAL
        self.twin_simulation_seed = (self.twin_simulation_seed + 1) % 4

    def set_scenario(self, scenario: SimulationScenario):
        """Allows testing specific market edge cases interactively."""
        self.active_scenario = scenario

    def get_market_regime(self) -> MarketRegimeSchema:
        bench = self.get_benchmark_quote()
        bench_pct = bench.change_percent
        
        twin_titles = [
            "Tech & Defense Surge",
            "Banking & Financials Surge",
            "Industrials & Metals Breakout",
            "FMCG & Pharma Shift"
        ]
        
        if self.active_scenario == SimulationScenario.NORMAL:
            regime_label = f"Twin Market #{self.twin_simulation_seed + 1}: {twin_titles[self.twin_simulation_seed]}"
        elif self.active_scenario == SimulationScenario.VOLUME_SPIKE:
            regime_label = "Unusual trading activity detected"
        elif self.active_scenario == SimulationScenario.EARNINGS_BREAKOUT:
            regime_label = "Stock-specific movement detected"
        elif self.active_scenario == SimulationScenario.MARKET_RALLY:
            regime_label = "Broad market movement detected"
        elif self.active_scenario == SimulationScenario.STALE_DATA:
            regime_label = "Market data is stale"
        elif self.active_scenario == SimulationScenario.CONFLICTING_DATA:
            regime_label = "Feed disagreement detected"
        else:
            regime_label = "Market movement within expected range"

        return MarketRegimeSchema(
            benchmark_symbol="NIFTY50",
            benchmark_change_pct=bench_pct,
            advancing_pct=65.0,
            advancing_count=33,
            declining_count=17,
            volatility_regime="Normal",
            regime_label=regime_label
        )

    def get_benchmark_quote(self, benchmark_symbol: str = "NIFTY50") -> MarketSnapshotResponse:
        data = self.base_data.get(benchmark_symbol, self.base_data["NIFTY50"])
        now = datetime.now(timezone.utc)
        
        if self.active_scenario == SimulationScenario.MARKET_RALLY:
            change_pct = 3.20
        else:
            change_pct = data["change_percent"]
            
        timeline_pts = [PriceTimelinePointSchema(**pt) for pt in data.get("timeline", [])]

        return MarketSnapshotResponse(
            symbol=benchmark_symbol,
            price=data["price"],
            change=data["change"],
            change_percent=change_pct,
            volume=data["volume"],
            avg_volume_20d=data["avg_volume_20d"],
            volatility_30d=data["volatility_30d"],
            benchmark_symbol=benchmark_symbol,
            benchmark_price_change_pct=change_pct,
            timestamp=now,
            source="MOCK_NATIVE",
            data_quality=DataQuality.FRESH,
            timeline=timeline_pts
        )

    def get_quote(self, symbol: str) -> MarketSnapshotResponse:
        sym = symbol.upper()
        now = datetime.now(timezone.utc)
        benchmark = self.get_benchmark_quote()
        
        # Fallback for unknown symbols
        raw = self.base_data.get(sym, {
            "price": 500.0,
            "change": 1.0,
            "change_percent": 0.20,
            "volume": 1000000.0,
            "avg_volume_20d": 1000000.0,
            "volatility_30d": 0.015,
            "timeline": [{"time": "09:15 AM", "price": 499.0}, {"time": "03:30 PM", "price": 500.0}]
        })
        
        price = raw["price"]
        change = raw["change"]
        change_pct = raw["change_percent"]
        volume = raw["volume"]
        avg_vol = raw["avg_volume_20d"]
        volatility = raw["volatility_30d"]
        data_quality = DataQuality.FRESH
        timestamp = now
        timeline = raw.get("timeline", [])

        # Twin Simulation Overrides (when in NORMAL scenario)
        if self.active_scenario == SimulationScenario.NORMAL:
            seed = self.twin_simulation_seed
            if seed == 0:
                # Tech & Defense Rally
                if sym in ["HAL", "ZOMATO", "TRENT", "INFY", "TATAMOTORS"]:
                    mult = 3.4 if sym == "HAL" else 3.1 if sym == "TRENT" else 2.8
                    volume = avg_vol * mult
                    change_pct = 7.40 if sym == "HAL" else 6.50 if sym == "TRENT" else 5.80 if sym == "ZOMATO" else 4.80
                    change = price * (change_pct / 100.0)
            elif seed == 1:
                # Banking & Financials Surge
                if sym in ["HDFCBANK", "ICICIBANK", "BAJFINANCE", "SBIN", "DLF"]:
                    mult = 3.2 if sym == "BAJFINANCE" else 2.8 if sym == "HDFCBANK" else 2.6
                    volume = avg_vol * mult
                    change_pct = 5.50 if sym == "BAJFINANCE" else 4.80 if sym == "HDFCBANK" else 4.90 if sym == "SBIN" else 4.20
                    change = price * (change_pct / 100.0)
            elif seed == 2:
                # Industrials & Metals Breakout
                if sym in ["LT", "TATASTEEL", "ADANIENT", "COALINDIA", "BEL"]:
                    mult = 3.9 if sym == "ADANIENT" else 3.4 if sym == "TATASTEEL" else 2.9
                    volume = avg_vol * mult
                    change_pct = 6.80 if sym == "ADANIENT" else 6.10 if sym == "TATASTEEL" else 5.20 if sym == "LT" else 4.50
                    change = price * (change_pct / 100.0)
            elif seed == 3:
                # FMCG & Pharma Shift
                if sym in ["SUNPHARMA", "NESTLEIND", "POWERGRID", "MARUTI", "TITAN"]:
                    mult = 2.5 if sym == "SUNPHARMA" else 2.4 if sym == "MARUTI" else 2.1
                    volume = avg_vol * mult
                    change_pct = 4.50 if sym == "MARUTI" else 4.20 if sym == "SUNPHARMA" else 4.40 if sym == "TITAN" else 3.20
                    change = price * (change_pct / 100.0)

        # Scenario overrides
        if self.active_scenario == SimulationScenario.VOLUME_SPIKE and sym in ["INFY", "TATAMOTORS", "HAL", "ZOMATO"]:
            volume = avg_vol * 3.8
            change_pct = 5.20
            change = price * 0.052
        elif self.active_scenario == SimulationScenario.EARNINGS_BREAKOUT and sym in ["INFY", "HAL", "TRENT"]:
            change_pct = 7.80
            change = price * 0.078
            volume = avg_vol * 4.2
        elif self.active_scenario == SimulationScenario.STALE_DATA and sym in ["INFY", "RELIANCE", "HDFCBANK"]:
            data_quality = DataQuality.STALE
            timestamp = now - timedelta(minutes=45) # 45 mins old
        elif self.active_scenario == SimulationScenario.CONFLICTING_DATA and sym in ["INFY", "TATAMOTORS"]:
            data_quality = DataQuality.CONFLICTING
        elif self.active_scenario == SimulationScenario.MARKET_RALLY:
            pass

        timeline_pts = [PriceTimelinePointSchema(**pt) for pt in timeline]

        return MarketSnapshotResponse(
            symbol=sym,
            price=price,
            change=change,
            change_percent=change_pct,
            volume=volume,
            avg_volume_20d=avg_vol,
            volatility_30d=volatility,
            benchmark_symbol="NIFTY50",
            benchmark_price_change_pct=benchmark.change_percent,
            timestamp=timestamp,
            source="MOCK_PROVIDER",
            data_quality=data_quality,
            timeline=timeline_pts
        )

    def get_batch_quotes(self, symbols: List[str]) -> Dict[str, MarketSnapshotResponse]:
        return {s.upper(): self.get_quote(s) for s in symbols}
