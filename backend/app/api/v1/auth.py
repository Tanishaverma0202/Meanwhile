from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.models.watchlist import Watchlist, WatchlistItem
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

def seed_demo_user_if_needed(db: Session) -> User:
    demo_user = db.query(User).filter(User.email == "demo@groww.in").first()
    if not demo_user:
        demo_user = User(
            email="demo@groww.in",
            hashed_password=get_password_hash("groww2026"),
            name="Demo Investor"
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        # Seed default watchlist
        watchlist = Watchlist(user_id=demo_user.id, name="Core Growth Portfolio")
        db.add(watchlist)
        db.commit()
        db.refresh(watchlist)

        # Seed sample stocks with simulated last_seen_at set to 6 hours ago
        six_hours_ago = datetime.now(timezone.utc) - timedelta(hours=6, minutes=24)
        sample_symbols = ["INFY", "RELIANCE", "TCS", "HDFCBANK", "TATAMOTORS", "ICICIBANK", "SBIN", "BAJFINANCE", "LT", "BHARTIARTL", "KOTAKBANK", "TATASTEEL"]
        for sym in sample_symbols:
            item = WatchlistItem(
                watchlist_id=watchlist.id,
                symbol=sym,
                added_at=six_hours_ago,
                last_seen_at=six_hours_ago
            )
            db.add(item)
        db.commit()

    return demo_user

@router.post("/demo-login", response_model=Token)
def demo_login(db: Session = Depends(get_db)):
    """Provides a 1-click instant login for hackathon evaluation."""
    demo_user = seed_demo_user_if_needed(db)
    token = create_access_token(subject=demo_user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(demo_user)
    )

@router.post("/signup", response_model=Token)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )
    
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        name=user_in.name
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=Token)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )
