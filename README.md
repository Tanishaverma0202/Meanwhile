---
title: Meanwhile
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# Meanwhile

**Know what changed while you were away.**

---

## Problem

Most market watchlists answer: *"What is happening right now?"*

That is the wrong question for an investor who checks their watchlist once or twice a day.

The real questions are:
- What changed **since I last checked**?
- Which changes actually **deserve my attention**?
- **Why** does a particular movement matter?

A list of prices with red and green arrows does not answer any of these. Meanwhile does.

---

## Solution

Meanwhile is an intelligent market catch-up engine. When a user returns to their watchlist, they see:

1. **How long since they last checked**
2. **A ranked list of what moved materially** — not everything, only what crossed meaningful thresholds
3. **Why each movement is significant** — benchmark-relative performance, volume anomaly, volatility context
4. **A clear confidence indicator** — so stale or conflicting data is never mistaken for fresh truth

The user then clicks "Catch Up & Mark as Seen" to reset the baseline.

---

## How Meanwhile is Different

| Normal Watchlist | Meanwhile |
|---|---|
| Shows current prices | Shows change since last visit |
| Displays everything | Surfaces only material changes |
| No context | Compares vs. NIFTY 50 benchmark |
| No explanation | Explains *why* the change matters |
| Ignores data quality | Explicitly handles stale/conflicting feeds |
| No attention budget | Caps prominent alerts at 5 items |

---

## Core Workflow

```
User creates watchlist → adds stocks
  ↓
User leaves (meanwhile, market moves)
  ↓
User returns
  ↓
Meanwhile queries current market state
  ↓
Computes delta from last_seen_at timestamp
  ↓
Scores each stock (0–100 attention score)
  ↓
Ranks by score → applies attention budget (top 5)
  ↓
Explains top changes with human-readable bullets
  ↓
User reads catch-up → marks as seen
```

---

## Attention Scoring Formula

```
attention_score (0–100) =
    price_score           [0–30]   min((|Δ%| / 5.0) × 30,  30)
  + volume_score          [0–20]   min(((vol_ratio − 1) / 1.5) × 20, 20)
  + market_relative_score [0–20]   min((|Δ% − NIFTY%| / 4.0) × 20, 20)
  + volatility_score      [0–15]   min((|Δ%| / σ_30d / 3.0) × 15, 15)
  + event_signal_score    [0–15]   step-function on |Δ%| + vol_ratio
```

**Severity thresholds** (centralized in `config.py`):

| Score | Severity |
|---|---|
| 0 – 30 | Normal |
| 31 – 60 | Worth Watching |
| 61 – 80 | Meaningful |
| 81 – 100 | **High Attention** |

The scoring engine is **100% deterministic**: the same inputs always produce the same score.

---

## Data Quality

| Status | Meaning | Effect on Score |
|---|---|---|
| FRESH | Updated < 5 minutes ago | Full score |
| DELAYED | Updated 5–30 minutes ago | −5 pts penalty |
| STALE | Updated > 30 minutes ago | −25 pts, capped at 60 |
| CONFLICTING | Feed sources disagree materially | Score forced to 0 |

Stale data is displayed with a warning. Conflicting data is **suppressed from high-attention ranking** entirely, with an explicit alert. This prevents false alarms from bad data.

---

## Architecture

```
User
  ↓
React UI (TypeScript · Tailwind CSS)
  ↓
FastAPI REST API  /api/v1/
  ├── Auth            → JWT demo login
  ├── Watchlists      → CRUD
  ├── Attention Feed  → SinceLastCheckService + MeaningfulChangeEngine
  ├── Market Data     → MarketDataProvider abstraction
  └── Simulation      → Scenario injection (evaluator tool)
  ↓
SQLAlchemy ORM (SQLite / PostgreSQL)
  ↓
MarketDataProvider
  ├── MockMarketDataProvider (demo + tests)
  └── RealMarketDataProvider (pluggable)
```

---

## Key Engineering Decisions

| Decision | Why | Trade-off |
|---|---|---|
| Deterministic scoring | Auditable, reproducible, no hallucination risk | Less adaptive than ML |
| Market-relative scoring | Removes broad market noise | Requires a benchmark feed |
| Attention budget (top 5) | Prevents alert fatigue | Items 6–10 are collapsed |
| Stale data caps score | Prevents false high-attention alerts | Genuine breakouts on stale feeds are downgraded |
| Conflicting data suppresses score | Prevents acting on bad data | Requires feed reconciliation to restore alerts |
| Modular monolith | Simple, testable, zero network overhead | Vertical scaling only |

---

## Edge Cases

See [`EDGE_CASES.md`](./EDGE_CASES.md) for the full red-team test matrix.

---

## What We Deliberately Did Not Build

- Automated buy/sell execution
- LLM-generated commentary or advice
- Price predictions or forecasting
- Portfolio optimization
- Crypto, options, or derivatives support
- Kafka, Redis, or microservices
- Social features or external notifications

Every excluded feature was a conscious decision. Meanwhile solves one problem well.

---

## Demo (90-second flow)

1. Open `http://localhost:3000`
2. See the Attention Feed → *"Since you last checked · 6h 51m"*
3. Click **"Volume Spike (3.8×)"** in Market Scenarios toolbar
4. Feed recalculates → TATAMOTORS / INFY rise to **High Attention**
5. Click any attention row → Stock Detail Drawer opens
6. Read *"Why this matters"* and score breakdown (0–100)
7. See intraday price timeline chart
8. Click **"Catch Up & Mark as Seen"**
9. Click **"Reset"** → feed returns to normal state
10. Switch to **"Conflicting Data Feed"** → see score suppressed to 0 with explanation

---

## Run & Deploy

### One-Command Production Run (Docker Compose)

```bash
docker-compose up -d --build
```
- App: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health Status: http://localhost:8000/health

### Local Development Setup

#### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Tests
```bash
cd backend
.\venv\Scripts\python.exe -m pytest -v
# 12 tests, all pass
```

For cloud deployment details (Vercel, Render, Railway, AWS), see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Python 3.14, FastAPI, Pydantic v2 |
| ORM | SQLAlchemy 2.0 |
| Database | SQLite (demo) / PostgreSQL (production) |
| Auth | python-jose (JWT), PBKDF2-SHA256 hashing |
| Tests | pytest, pytest-asyncio |

---

> **Meanwhile highlights market changes; it does not provide investment advice.**
