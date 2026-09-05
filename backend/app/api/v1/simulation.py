"""
api/v1/simulation.py — Simulation control endpoints.

POST /simulation/new      → Advance to next scenario, run full pipeline, return feed
GET  /simulation/current  → Return current feed without advancing state
POST /simulation/set-scenario → Jump to a specific scenario explicitly
POST /simulation/reset    → Alias for /new (for backward compat)
"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.schemas.market import SimulationScenario
from app.schemas.simulation import SimulationFeedResponse
from app.simulation.state import simulation_state
from app.simulation.service import SimulationService
from app.simulation.scenarios import SCENARIO_SEQUENCE, SCENARIO_METADATA

router = APIRouter(prefix="/simulation", tags=["Twin Simulation"])


class ScenarioRequest(BaseModel):
    scenario: str  # accepts SCENARIO_SEQUENCE string values


@router.post("/new", response_model=SimulationFeedResponse)
def new_simulation():
    """
    Advance to the next scenario in the rotation and run the full
    Meanwhile attention pipeline. Returns a complete feed response.

    Pipeline: generate snapshots → score → rank → apply budget → explain
    """
    simulation_state.advance()
    return SimulationService.evaluate(simulation_state)


@router.get("/current", response_model=SimulationFeedResponse)
def get_current_simulation():
    """
    Return the current simulation feed without advancing the state.
    Called on initial page load to hydrate the UI.
    """
    # If never advanced, do an implicit first advance
    if simulation_state._index < 0:
        simulation_state.advance()
    return SimulationService.evaluate(simulation_state)


@router.post("/set-scenario", response_model=SimulationFeedResponse)
def set_simulation_scenario(req: ScenarioRequest):
    """
    Jump to a specific named scenario explicitly.
    Used by the individual scenario pills in the UI.
    """
    scenario = req.scenario.upper()
    if scenario in SCENARIO_SEQUENCE:
        idx = SCENARIO_SEQUENCE.index(scenario)
        simulation_state._index = idx
    return SimulationService.evaluate(simulation_state)


@router.post("/reset", response_model=SimulationFeedResponse)
def reset_simulation():
    """Alias for /new — backward compatibility."""
    simulation_state.advance()
    return SimulationService.evaluate(simulation_state)


@router.post("/acknowledge", response_model=SimulationFeedResponse)
def acknowledge_simulation():
    """
    Mark as seen: updates the stateful baseline to the current scenario's prices,
    resets last_checked_at to now. Subsequent simulations will compare against
    these new prices, demonstrating the stateful product loop.
    """
    simulation_state.acknowledge()
    return SimulationService.evaluate(simulation_state)


@router.get("/evaluation")
def get_evaluation_metrics():
    """
    Runs the full attention engine over all 8 deterministic scenarios and
    returns verifiable precision/recall/suppression statistics.
    These numbers come from real pipeline execution — not hardcoded.
    """
    from app.simulation.evaluation import run_evaluation
    return run_evaluation()



@router.get("/scenarios")
def list_scenarios():
    """Returns metadata for all available scenarios."""
    return [
        {
            "id": s,
            "label": SCENARIO_METADATA[s]["label"],
            "description": SCENARIO_METADATA[s]["description"],
        }
        for s in SCENARIO_SEQUENCE
    ]
