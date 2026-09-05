from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from fastapi import HTTPException, status
from app.models.watchlist import Watchlist, WatchlistItem
from app.schemas.watchlist import WatchlistCreate, WatchlistUpdate, WatchlistItemCreate
from app.providers.mock_provider import MockMarketDataProvider

class WatchlistService:

    @staticmethod
    def create_watchlist(db: Session, user_id: int, schema: WatchlistCreate) -> Watchlist:
        watchlist = Watchlist(user_id=user_id, name=schema.name)
        db.add(watchlist)
        db.commit()
        db.refresh(watchlist)
        return watchlist

    @staticmethod
    def get_user_watchlists(db: Session, user_id: int) -> List[Watchlist]:
        return db.query(Watchlist).filter(Watchlist.user_id == user_id).all()

    @staticmethod
    def get_watchlist_by_id(db: Session, user_id: int, watchlist_id: int) -> Watchlist:
        watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id, Watchlist.user_id == user_id).first()
        if not watchlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Watchlist with ID {watchlist_id} not found."
            )
        return watchlist

    @staticmethod
    def update_watchlist(db: Session, user_id: int, watchlist_id: int, schema: WatchlistUpdate) -> Watchlist:
        watchlist = WatchlistService.get_watchlist_by_id(db, user_id, watchlist_id)
        if schema.name:
            watchlist.name = schema.name
        db.commit()
        db.refresh(watchlist)
        return watchlist

    @staticmethod
    def delete_watchlist(db: Session, user_id: int, watchlist_id: int):
        watchlist = WatchlistService.get_watchlist_by_id(db, user_id, watchlist_id)
        db.delete(watchlist)
        db.commit()

    @staticmethod
    def add_item(db: Session, user_id: int, watchlist_id: int, schema: WatchlistItemCreate) -> WatchlistItem:
        watchlist = WatchlistService.get_watchlist_by_id(db, user_id, watchlist_id)
        symbol = schema.symbol.strip().upper()

        # Validate symbol length / format
        if not symbol or len(symbol) > 15 or not symbol.isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid stock symbol format: '{symbol}'"
            )

        # Check duplicate stock in same watchlist
        existing = db.query(WatchlistItem).filter(
            WatchlistItem.watchlist_id == watchlist.id,
            WatchlistItem.symbol == symbol
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock '{symbol}' is already present in watchlist '{watchlist.name}'."
            )

        now = datetime.now(timezone.utc)
        item = WatchlistItem(
            watchlist_id=watchlist.id,
            symbol=symbol,
            added_at=now,
            last_seen_at=now
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def remove_item(db: Session, user_id: int, watchlist_id: int, symbol: str):
        watchlist = WatchlistService.get_watchlist_by_id(db, user_id, watchlist_id)
        sym = symbol.strip().upper()

        item = db.query(WatchlistItem).filter(
            WatchlistItem.watchlist_id == watchlist.id,
            WatchlistItem.symbol == sym
        ).first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Symbol '{sym}' not found in watchlist."
            )

        db.delete(item)
        db.commit()
