"""
Singleton market data provider — single shared instance used across all API routes.
This ensures simulation scenario and twin_simulation_seed state is consistent
across attention, watchlist, market, and simulation endpoints.
"""
from app.providers.mock_provider import MockMarketDataProvider

# One instance, shared by all routers
shared_market_provider = MockMarketDataProvider()
