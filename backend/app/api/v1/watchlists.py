from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.watchlist import (
    WatchlistCreate, WatchlistUpdate, WatchlistResponse,
    WatchlistItemCreate, WatchlistItemResponse
)
from app.services.watchlist_service import WatchlistService
from app.providers.singleton import shared_market_provider as market_provider

router = APIRouter(prefix="/watchlists", tags=["Watchlists"])

@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def create_watchlist(
    schema: WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    watchlist = WatchlistService.create_watchlist(db, current_user.id, schema)
    return WatchlistResponse.model_validate(watchlist)

@router.get("", response_model=List[WatchlistResponse])
def get_watchlists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    watchlists = WatchlistService.get_user_watchlists(db, current_user.id)
    results = []
    for wl in watchlists:
        res = WatchlistResponse.model_validate(wl)
        # Enrich items with latest market snapshot
        for item_res in res.items:
            item_res.latest_snapshot = market_provider.get_quote(item_res.symbol)
        results.append(res)
    return results

@router.get("/{watchlist_id}", response_model=WatchlistResponse)
def get_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    watchlist = WatchlistService.get_watchlist_by_id(db, current_user.id, watchlist_id)
    res = WatchlistResponse.model_validate(watchlist)
    for item_res in res.items:
        item_res.latest_snapshot = market_provider.get_quote(item_res.symbol)
    return res

@router.patch("/{watchlist_id}", response_model=WatchlistResponse)
def update_watchlist(
    watchlist_id: int,
    schema: WatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    watchlist = WatchlistService.update_watchlist(db, current_user.id, watchlist_id, schema)
    return WatchlistResponse.model_validate(watchlist)

@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    WatchlistService.delete_watchlist(db, current_user.id, watchlist_id)

@router.post("/{watchlist_id}/items", response_model=WatchlistItemResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    watchlist_id: int,
    schema: WatchlistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = WatchlistService.add_item(db, current_user.id, watchlist_id, schema)
    res = WatchlistItemResponse.model_validate(item)
    res.latest_snapshot = market_provider.get_quote(item.symbol)
    return res

@router.delete("/{watchlist_id}/items/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(
    watchlist_id: int,
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    WatchlistService.remove_item(db, current_user.id, watchlist_id, symbol)
