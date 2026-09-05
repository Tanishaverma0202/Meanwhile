# PHASE 0 — Internal Architecture & Codebase Audit

**Project:** Meanwhile — Intelligent Market Watchlist  
**Submission:** CODE BY GROWW 2026  

---

## A. Already Strong
1. **Clear Differentiator:** Focus on "Since you last checked" and deterministic attention scoring rather than displaying standard raw watchlist tickers.
2. **Deterministic Attention Scoring Engine:** 5-factor mathematical formula with clear weightings (Price Move 30%, Volume Anomaly 20%, Market-Relative Move 20%, Volatility 15%, Event Signal 15%).
3. **Data Quality Awareness:** Built-in explicit states (`FRESH`, `DELAYED`, `STALE`, `CONFLICTING`) with score penalties and attention suppression.
4. **Clean Fintech UI Aesthetics:** Color palette strictly adhering to light fintech standard (`#F7FAFC` background, `#FFFFFF` cards, `#1677C8` primary blue, `#168A5B` positive, `#D64545` negative).
5. **Backend Design:** Clean FastAPI modular monolith architecture with `MarketDataProvider` abstraction interface.

---

## B. Weak
1. **Watchlist Data Table Features:** Initial watchlist view lacked multi-column sort, symbol search, and rich inline change comparison indicators. *(Now resolved)*
2. **Scenario Simulator UI Labeling:** Initial layout displayed "Judge Sandbox" terminology which looked like a hackathon-only utility rather than a production feature. *(Now renamed to "Market scenarios")*

---

## C. Broken
1. **Password Hashing Library Conflict:** `bcrypt` v5.0.0 failed on Python 3.14 for inputs over 72 bytes. Resolved by standardizing on NIST-approved PBKDF2-HMAC-SHA256.

---

## D. Redundant
1. **Duplicate Mobile vs Desktop Layout Blocks:** Redundant card wrappers reduced scannability. Refactored into a single compact responsive table row layout.

---

## E. Missing
1. **Explicit `SCORING.md` Document:** Detailed mathematical derivation, boundary conditions, and step-by-step scoring logic explanation file.
2. **Explicit `DEMO.md` Document:** Step-by-step 90–120 second evaluator walkthrough script.
3. **Sentence-Format Metrics Summary:** Compact human-readable sentence summary string (`5 watched · 2 High Attention · 1 Worth Watching · 2 Normal`).

---

## F. Risky
1. **Hardcoded Frontend Scenarios:** Frontend risk of relying on fake static state rather than processing scenarios end-to-end through the backend logic.

---

## G. Most Valuable Improvements
1. **Hero Headline:** Make `"3 changes deserve your attention"` the primary visual anchor on the feed screen.
2. **Watchlist Financial Table:** Rich tabular view with sorting, filtering, and inline NIFTY benchmark outperformance deltas.
3. **Transparent Explainability:** Plain-language math breakdown showing exact score contributions.

---

## H. Features That Should NOT Be Added
1. **Buy/Sell Order Execution:** Scope creep; requires brokerage integration and regulatory clearance.
2. **LLM Financial Summaries:** Non-deterministic, introduces hallucination risk and API latency.
3. **Price Predictions / Forecasting:** False certainty; conflicts with realistic fintech UX principles.
4. **Kafka / Microservices / Redis:** Premature complexity for a single-team codebase.
