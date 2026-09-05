# Architecture — Meanwhile

## System Overview

Meanwhile is a **modular monolith** designed around a single core problem: computing what changed in a user's market watchlist since they last checked, ranking those changes by significance, and explaining them clearly.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        USER                             │
└──────────────────────────┬──────────────────────────────┘
                           │ Browser (localhost:3000)
                           ▼
┌─────────────────────────────────────────────────────────┐
│            React UI  (TypeScript · Tailwind CSS)        │
│                                                         │
│  Header · MarketRegimeBar · MarketSimulatorBar          │
│  AttentionSummaryBanner · AttentionRow                  │
│  StockDetailDrawer · WatchlistManager                   │
│  ArchitectureTab                                        │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API  (localhost:8000)
                           ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI  /api/v1/                          │
│                                                         │
│  /auth            → demo login, JWT token               │
│  /watchlists      → CRUD, item add/remove               │
│  /attention       → since-last-check feed,              │
│                     acknowledge-seen                    │
│  /market          → direct snapshot queries             │
│  /simulation      → scenario set/reset (demo tool)      │
└──────┬────────────────┬──────────────────┬──────────────┘
       │                │                  │
       ▼                ▼                  ▼
┌─────────────┐  ┌────────────────┐  ┌──────────────────┐
│  Watchlist  │  │ SinceLastCheck │  │  Simulation      │
│  Service    │  │ Service        │  │  Controller      │
└─────────────┘  └───────┬────────┘  └──────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
  ┌─────────────────┐    ┌─────────────────────────┐
  │ Meaningful      │    │  MarketDataProvider      │
  │ Change Engine   │    │  (abstraction layer)     │
  │ (Scoring Engine)│    │                          │
  │                 │    │  MockMarketDataProvider  │
  │ Deterministic   │    │  RealMarketDataProvider  │
  │ 0–100 score     │    └─────────────────────────┘
  └─────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│              SQLAlchemy ORM                             │
│                                                         │
│  User            (id, email, hashed_password)           │
│  Watchlist       (id, user_id, name, created_at)        │
│  WatchlistItem   (id, watchlist_id, symbol, last_seen_at)│
│  MarketSnapshot  (id, symbol, price, vol, quality, ts)  │
│  ChangeEvent     (id, symbol, score, severity, reasons) │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
                    SQLite (demo)
                  PostgreSQL (production)
```

---

## Data Flow: "Since You Last Checked"

```
1. User opens Meanwhile
2. GET /attention/since-last-check
3. Fetch all WatchlistItems for user → extract last_seen_at timestamps
4. Fetch current market snapshots for all symbols (batch)
5. Fetch NIFTY 50 benchmark snapshot
6. For each symbol:
   a. compute price_change_pct from snapshot
   b. compute vol_ratio vs avg_volume_20d
   c. compute relative_move = Δ% − NIFTY%
   d. compute volatility_ratio = |Δ%| / σ_30d
   e. compute 5-component attention score (0–100)
   f. apply data quality adjustment (stale/conflicting penalty)
   g. classify severity (NORMAL / WATCH / MEANINGFUL / HIGH_ATTENTION)
   h. generate human-readable bullet reasons
7. Sort all events by score (descending)
8. Apply attention budget: top 5 non-NORMAL events → top_events
9. Remaining events → other_events
10. Return SinceLastCheckResponse
```

---

## Database Schema

```sql
CREATE TABLE users (
    id           INTEGER PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL DEFAULT 'Investor',
    hashed_password TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE watchlists (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id),
    name       TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE watchlist_items (
    id           INTEGER PRIMARY KEY,
    watchlist_id INTEGER REFERENCES watchlists(id),
    symbol       TEXT NOT NULL,
    added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (watchlist_id, symbol)           -- prevents duplicates
);
-- Indexes: (watchlist_id), (symbol), (last_seen_at)

CREATE TABLE market_snapshots (
    id              INTEGER PRIMARY KEY,
    symbol          TEXT NOT NULL,
    price           FLOAT,
    change_percent  FLOAT,
    volume          FLOAT,
    avg_volume_20d  FLOAT,
    volatility_30d  FLOAT,
    data_quality    TEXT,
    source          TEXT,
    timestamp       TIMESTAMP
);
-- Indexes: (symbol, timestamp)

CREATE TABLE change_events (
    id                  INTEGER PRIMARY KEY,
    symbol              TEXT NOT NULL,
    watchlist_id        INTEGER REFERENCES watchlists(id),
    detected_at         TIMESTAMP,
    previous_price      FLOAT,
    current_price       FLOAT,
    price_change_pct    FLOAT,
    volume_change_pct   FLOAT,
    market_relative_pct FLOAT,
    score               FLOAT,
    severity            TEXT,
    reasons             TEXT,  -- JSON array
    score_breakdown     TEXT   -- JSON object
);
-- Indexes: (watchlist_id, detected_at), (symbol)
```

---

## Scaling Considerations

| Scale | Recommended Change |
|---|---|
| Current (demo) | Synchronous scoring on API thread. SQLite. |
| 1k users | Move scoring to async background task. Switch to PostgreSQL. |
| 10k users | Extract market-data ingestion to a separate process. Add Redis cache for benchmark. |
| 100k users | Scoring engine as a separate worker pool. Read replicas for database. |

---

## Security Boundaries

- All database access uses SQLAlchemy ORM (parameterised queries — no SQL injection).
- JWT tokens are signed with a secret key stored in environment variables.
- CORS is restricted to localhost origins in development.
- No user-facing endpoint exposes raw database errors or stack traces.
- Passwords are hashed with PBKDF2-SHA256 (100,000 iterations).
