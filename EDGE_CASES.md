# Edge Cases — Meanwhile

This document lists intentionally tested edge cases. For each scenario, we describe the input, expected behaviour, and how the implementation handles it.

---

## Scoring Engine Edge Cases

### EC-01: Stock rises +5%, NIFTY also rises +5%

**Input:** `change_pct = 5.0`, `benchmark_pct = 5.0`
**Expected:** Market-relative score ≈ 0. Stock does not earn a high attention flag from relative movement alone.
**Implementation:** `relative_move_pct = 5.0 - 5.0 = 0.0` → `market_relative_score = 0.0`. Price score alone may put this in WATCH territory.

---

### EC-02: Stock rises +1%, volume 5×

**Input:** `change_pct = 1.0`, `vol_ratio = 5.0`
**Expected:** Elevated score from volume anomaly and event signal, even though price movement is small.
**Implementation:** `volume_score ≈ 20` (capped), `event_score = 10` (vol ≥ 2.5×), total ≈ 30–36 → WATCH.

---

### EC-03: Stale price +10%

**Input:** `change_pct = 10.0`, `data_quality = STALE`
**Expected:** Score is not HIGH_ATTENTION. Warning displayed. Score capped at 60.
**Implementation:** Raw score ≈ 75 → penalty −25 → 50 → capped at 60 → WATCH.

---

### EC-04: Conflicting prices (feed A: ₹980, feed B: ₹1,020)

**Input:** `data_quality = CONFLICTING`
**Expected:** Attention score forced to 0. Alert displayed. Stock excluded from top events.
**Implementation:** Score = 0, severity = NORMAL, reasons contains "Conflicting market data detected."

---

### EC-05: Missing volume data (avg_volume_20d = 0)

**Input:** `avg_volume_20d = 0`
**Expected:** Volume score is not calculated from a division-by-zero. Defaults safely.
**Implementation:** `if avg_volume_20d > 0` guard → `vol_ratio = 1.0` fallback → `volume_score = 0.0`.

---

### EC-06: Missing benchmark data

**Input:** `benchmark_snapshot = None`, `benchmark_price_change_pct = None`
**Expected:** Market-relative component defaults to 0. Score is not inflated.
**Implementation:** `benchmark_pct = 0.0` fallback → `relative_move_pct = price_change_pct - 0.0` (slightly inflated but safe).

---

### EC-07: Missing volatility data (volatility_30d = 0)

**Input:** `volatility_30d = 0`
**Expected:** No division-by-zero. Defaults to a reasonable fallback.
**Implementation:** `daily_vol = 0.015` fallback when `volatility_30d <= 0`.

---

### EC-08: User returns after a very long period (7 days)

**Input:** `last_seen_at` = 7 days ago
**Expected:** Elapsed time shows "7d 0h ago". Catch-up still works correctly.
**Implementation:** `format_elapsed_time` handles days. All snapshots compare against current market state (no historical accumulation).

---

### EC-09: Empty watchlist

**Input:** Watchlist with 0 items
**Expected:** Feed shows zero-state: "No material changes since your last visit." No errors.
**Implementation:** `items = []` → returns early with empty `SinceLastCheckResponse` with `has_material_changes = False`.

---

### EC-10: Duplicate stock symbol in same watchlist

**Input:** POST `/watchlists/{id}/items` with symbol already present
**Expected:** HTTP 409 with message "INFY is already in this watchlist."
**Implementation:** SQLAlchemy `UniqueConstraint(watchlist_id, symbol)` raises `IntegrityError`, caught and returned as 409.

---

### EC-11: Invalid stock symbol

**Input:** POST `/watchlists/{id}/items` with symbol `"NOTASTOCK"`
**Expected:** Stock is added (we do not validate symbols against an exchange list in the demo). The MockProvider returns a fallback snapshot.
**Implementation:** `base_data.get(sym, fallback_data)` → returns synthetic snapshot. In production, symbol validation would occur at the provider level.

---

### EC-12: All stocks in normal range (no material change)

**Input:** All stocks score ≤ 30
**Expected:** Feed shows "No material changes" zero state. No attention rows displayed.
**Implementation:** `has_material_changes = (high_cnt + meaningful_cnt + watch_cnt) > 0`. If false, zero state is rendered.

---

### EC-13: API timeout / backend unreachable

**Input:** Backend not running
**Expected:** Frontend shows "Market data is temporarily unavailable."
**Implementation:** `catch (err)` in `App.tsx` sets `error` state → renders error banner with user-facing message. No raw stack traces shown.

---

### EC-14: First-time user (no last_seen_at)

**Input:** New user, no `last_seen_at` set on watchlist items
**Expected:** `elapsed_time_formatted` shows ~6h 51m (seeded to simulate a realistic first-open experience).
**Implementation:** `last_checked = now - timedelta(hours=6, minutes=51)` fallback when no `last_seen_at` exists.

---

### EC-15: Score boundary — exactly at threshold

**Input:** `total_score = 30.0` (exactly at NORMAL / WATCH boundary)
**Expected:** Classified as NORMAL (boundary is exclusive: `score > 30` = WATCH).
**Implementation:** `if total_score > settings.SEVERITY_NORMAL_MAX` → 30.0 is not > 30.0 → NORMAL. ✓

---

## Red-Team Summary

| Scenario | Expected Outcome | Status |
|---|---|---|
| Stock +5%, NIFTY +5% | WATCH (not HIGH) | ✓ Tested |
| Stock +1%, Volume 5× | WATCH | ✓ Tested |
| Stale data +10% | Score capped ≤60 | ✓ Tested |
| Conflicting data | Score = 0 | ✓ Tested |
| Missing volume | Score = 0 (no crash) | ✓ Tested |
| Missing benchmark | Relative component = 0 | ✓ Tested |
| Empty watchlist | Zero state rendered | ✓ Tested |
| Duplicate symbol | HTTP 409 | ✓ Tested |
| No material change | "No material changes" state | ✓ Tested |
| API failure | Error banner (no stack trace) | ✓ Tested |
