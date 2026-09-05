# Engineering Decisions — Meanwhile

Each decision follows the format: **Decision → Why → Alternative → Trade-off → When we would reconsider**

---

## 01. Deterministic attention scoring (not ML or LLMs)

**Decision:** Attention scores are computed with a fixed weighted formula. No model training, no inference.

**Why:** Financial attention logic must be auditable. A user (or evaluator) should be able to verify exactly why a stock received a score of 84. LLMs introduce non-determinism, hallucination risk, and latency.

**Alternative:** A learned ranking model trained on user interaction signals.

**Trade-off:** Less adaptive. Cannot learn "this user ignores small-cap volume spikes." Requires manual threshold tuning.

**When we would reconsider:** When we have sufficient user interaction data to train a reliable ranking model, and when we can maintain explainability alongside it.

---

## 02. Market-relative scoring (stock Δ% minus NIFTY 50 Δ%)

**Decision:** The attention score includes a component that measures how much a stock moved *relative* to the NIFTY 50 benchmark.

**Why:** A stock rising +3% in a session where NIFTY also rises +3% is unremarkable. A stock rising +3% while NIFTY is flat is unusual and merits attention. Without relative scoring, broad market movements generate false alerts.

**Alternative:** Only use absolute price movement.

**Trade-off:** Requires a benchmark data feed. If the benchmark snapshot is stale, relative scoring degrades gracefully to zero.

**When we would reconsider:** For sector-specific watchlists, we would prefer a sector index (NIFTY IT, NIFTY Bank) over NIFTY 50 as the benchmark.

---

## 03. Attention budget (maximum 5 prominent items)

**Decision:** Only the top 5 scored items appear prominently in the attention feed. Items ranked 6 and below are collapsed under "Other watched stocks."

**Why:** Showing 20 attention cards defeats the purpose of an attention engine. The system must decide what matters, not merely sort everything. An overloaded feed causes users to ignore the most important signals.

**Alternative:** Show all ranked events, rely on the user to scroll.

**Trade-off:** Stocks ranked 6–10 are less visible. Configurable via `settings.ATTENTION_BUDGET`.

**When we would reconsider:** If research shows users regularly need to act on 6th–10th ranked items, we would increase the budget or make it user-configurable per watchlist size.

---

## 04. STALE data caps the attention score; CONFLICTING data suppresses it to zero

**Decision:** Stale snapshots (>30 minutes old) receive a −25 point penalty and are capped at score 60 (WATCH). Conflicting feeds (two sources disagreeing materially) are forced to score 0.

**Why:** It is worse to show a HIGH_ATTENTION alert on bad data than to suppress a real signal temporarily. A false alarm is more damaging to user trust than a missed alert on stale data.

**Alternative:** Always show the score; add a warning banner.

**Trade-off:** Genuine breakouts occurring during feed outages will be downgraded until fresh data is restored. This is the correct trade-off for a financial system.

**When we would reconsider:** If feed reliability improves significantly (99.9% uptime, <2 minute latency), we could relax the stale penalty.

---

## 05. Modular monolith (FastAPI + SQLAlchemy + SQLite/PostgreSQL)

**Decision:** One backend process. One database. Clean module separation internally.

**Why:** Microservices require service discovery, network calls, distributed tracing, and deployment orchestration. For a single-team product, these add friction without benefit. A monolith with clean module boundaries is faster to develop, easier to test, and trivial to deploy.

**Alternative:** Separate services for market-data ingestion, scoring, and API.

**Trade-off:** Vertical scaling only. The scoring engine runs synchronously on the API thread. At high request volume, this becomes a bottleneck.

**When we would reconsider:** At >10k concurrent users, the scoring engine would be extracted into an async worker process. At >100k users, market-data ingestion would become a separate service with a message queue.

---

## 06. `last_seen_at` per WatchlistItem (not per session or per watchlist)

**Decision:** Each stock item in a watchlist stores its own `last_seen_at` UTC timestamp. Acknowledging a watchlist updates all items simultaneously.

**Why:** Per-item timestamps allow future granularity — e.g., "mark only these 3 items as seen." It also supports correct elapsed-time display when items were added at different times.

**Alternative:** Store a single `last_checked_at` per watchlist.

**Trade-off:** More database writes on acknowledge (one update per item vs. one update per watchlist). At 50-item watchlists, negligible.

**When we would reconsider:** If bulk acknowledge performance becomes measurable, we would add a denormalized `watchlist.last_checked_at` and reconcile lazily.

---

## 07. MockMarketDataProvider as the default, with RealMarketDataProvider as a plugin

**Decision:** All market data routes through a `MarketDataProvider` abstraction. The mock is the default. The real provider is activated by environment variable.

**Why:** Real market APIs are rate-limited, require credentials, and cannot be used to test edge cases (stale feed, conflicting prices) deterministically. The mock supports scenario injection for evaluator demos and consistent test runs.

**Alternative:** Always use the real API, with a separate test harness.

**Trade-off:** Demo data is not live. Evaluators must read the scenario simulator labels to understand what they are looking at.

**When we would reconsider:** When deploying for real users, the real provider would be default, with the mock available only in test environments.

---

## 08. PBKDF2-SHA256 password hashing (not bcrypt)

**Decision:** Password hashing uses Python's standard `hashlib.pbkdf2_hmac` (SHA-256, 100,000 iterations) instead of bcrypt.

**Why:** The installed `bcrypt` library (v5.0.0) raised a `ValueError` on passwords longer than 72 bytes under Python 3.14, making the authentication system unusable for demo users. PBKDF2-SHA256 is a NIST-approved KDF with no such limitation, and is fully adequate for a demo application.

**Alternative:** Downgrade to bcrypt <4.0 or use argon2.

**Trade-off:** PBKDF2 is slightly weaker than bcrypt for offline brute-force resistance. Acceptable for a demo application; not acceptable for production user data.

**When we would reconsider:** For production deployment, we would migrate to argon2id.

---

## What We Deliberately Did Not Build

| Feature | Reason |
|---|---|
| Automated buy/sell execution | Out of scope; requires broker API integration and regulatory compliance |
| LLM-generated commentary | Non-deterministic; introduces hallucination risk |
| Price predictions or forecasting | Does not serve the catch-up use case; adds false confidence |
| Portfolio optimization | Different problem domain entirely |
| Crypto / options / derivatives | Scope expansion without serving the core problem |
| Kafka, Redis, Kubernetes | No real technical requirement at this scale |
| Social features / alerts | Core focus is the in-app catch-up experience |
| Charting library (TradingView) | SVG timeline charts are sufficient for the use case |

> "We prioritized the core problem over feature count."
