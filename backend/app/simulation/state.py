"""
state.py — In-memory simulation session state.

Tracks the current simulation number and which scenario is active.
Never touches the database — completely separate from real user state.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any
import copy
from app.simulation.scenarios import SCENARIO_SEQUENCE, DEMO_BASELINE


class SimulationState:
    """Global simulation state — single instance shared across all API calls."""

    def __init__(self):
        # Start at -1 so the first call to advance() moves to index 0 (NORMAL)
        self._index = -1
        self.current_baseline: Dict[str, Dict[str, Any]] = copy.deepcopy(DEMO_BASELINE)
        self.last_checked_at = datetime.now(timezone.utc) - timedelta(hours=4, minutes=34)
        self.last_snapshots = None

    @property
    def simulation_number(self) -> int:
        """1-based simulation counter shown in the UI (SIM-01, SIM-02, …)."""
        return max(1, self._index + 1)

    @property
    def scenario_type(self) -> str:
        if self._index < 0:
            return SCENARIO_SEQUENCE[0]
        return SCENARIO_SEQUENCE[self._index % len(SCENARIO_SEQUENCE)]

    @property
    def simulation_id(self) -> str:
        return f"SIM-{self.simulation_number:02d}"

    def advance(self) -> str:
        """Move to the next scenario in the rotation. Returns new scenario_type."""
        self._index += 1
        return self.scenario_type

    def reset(self):
        """Reset to the very beginning (used for testing and explicit explore)."""
        self._index = -1
        self.current_baseline = copy.deepcopy(DEMO_BASELINE)
        self.last_checked_at = datetime.now(timezone.utc) - timedelta(hours=4, minutes=34)
        self.last_snapshots = None
        
    def acknowledge(self):
        """Mark as seen: updates the baseline to the latest snapshots."""
        if self.last_snapshots:
            for sym, snap in self.last_snapshots.items():
                self.current_baseline[sym]["price"] = snap.price
            self.last_checked_at = datetime.now(timezone.utc)


# Single shared instance — imported by API routes
simulation_state = SimulationState()
