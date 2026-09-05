from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.change_event import SinceLastCheckResponse, ChangeEventResponse
from app.services.since_last_check_service import SinceLastCheckService
from app.services.scoring_engine import MeaningfulChangeEngine
from app.providers.singleton import shared_market_provider as market_provider

router = APIRouter(prefix="/attention", tags=["Attention Engine"])

@router.get("/since-last-check", response_model=SinceLastCheckResponse)
def get_since_last_check_feed(
    watchlist_id: Optional[int] = Query(None, description="Optional filter by watchlist ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Main catch-up endpoint returning ranked market changes since the user's last check,
    categorized by severity (HIGH_ATTENTION, MEANINGFUL, WATCH, NORMAL).
    """
    return SinceLastCheckService.get_since_last_check_feed(
        db=db,
        user_id=current_user.id,
        provider=market_provider,
        watchlist_id=watchlist_id
    )

@router.post("/acknowledge-seen")
def acknowledge_seen(
    watchlist_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks current attention items as seen, updating last_seen_at timestamp to NOW.
    """
    SinceLastCheckService.acknowledge_seen(db, current_user.id, watchlist_id)
    return {"message": "All current items marked as seen successfully."}

@router.get("/why/{symbol}", response_model=ChangeEventResponse)
def get_why_breakdown(
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns full transparent mathematical score breakdown and bullet reasons for a specific stock.
    """
    snapshot = market_provider.get_quote(symbol)
    benchmark = market_provider.get_benchmark_quote()
    return MeaningfulChangeEngine.calculate_meaningfulness_score(
        current_snapshot=snapshot,
        benchmark_snapshot=benchmark
    )
