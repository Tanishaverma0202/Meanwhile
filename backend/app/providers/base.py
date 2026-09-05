from abc import ABC, abstractmethod
from typing import List, Dict
from app.schemas.market import MarketSnapshotResponse

class MarketDataProvider(ABC):

    @abstractmethod
    def get_quote(self, symbol: str) -> MarketSnapshotResponse:
        """Fetch latest market snapshot for a single symbol."""
        pass

    @abstractmethod
    def get_batch_quotes(self, symbols: List[str]) -> Dict[str, MarketSnapshotResponse]:
        """Fetch latest market snapshots for multiple symbols."""
        pass

    @abstractmethod
    def get_benchmark_quote(self, benchmark_symbol: str = "NIFTY50") -> MarketSnapshotResponse:
        """Fetch latest market snapshot for broad market benchmark."""
        pass
