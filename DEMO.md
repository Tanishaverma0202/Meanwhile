# Evaluator Demo Script — DEMO.md

**Project:** Meanwhile — Intelligent Market Watchlist  
**Submission:** CODE BY GROWW 2026  
**Duration:** 90–120 seconds  

---

## The Story

> *"I have five stocks in my watchlist.*  
> *I leave the application.*  
> *While I'm away, the market changes.*  
> *When I come back, a normal watchlist would show me five movements and leave me to figure out which matter.*  
>  
> *Meanwhile remembers my last check.*  
> *It tells me that 3 changes deserve attention.*  
>  
> *TATAMOTORS moved +6.25%, while NIFTY moved only +0.50%.*  
> *Volume is also 3.1× normal.*  
> *So the system ranks it High Attention (92/100).*  
>  
> *I can open 'Why this matters' and see exactly how the score was calculated.*  
>  
> *Now I'll simulate a broad market rally.*  
> *The system doesn't blindly flag every stock because it compares each movement with the broader market.*  
>  
> *Finally, I'll simulate stale and conflicting data.*  
> *Instead of pretending the data is reliable, Meanwhile downgrades or suppresses the attention signal.*  
>  
> *That's the core idea of Meanwhile: not more market information, but less information to process."*

---

## Step-by-Step Demo Walkthrough

### STEP 1: Open Catch-Up Feed
- Navigate to http://localhost:3000
- Point to the timestamp: `Since you last checked · 7h 19m`
- Highlight the visual hero headline: **"3 changes deserve your attention"**
- Show sentence metric line: `5 stocks watched · 2 High Attention · 1 Worth Watching · 2 Normal`

### STEP 2: View High Attention Stocks
- Point to **TATAMOTORS** (+6.25%, High Attention 92/100)
- Point to **INFY** (+4.80%, High Attention 86/100)
- Point to **HDFCBANK** (+2.63%, Worth Watching 58/100)
- Show that normal stocks (**TCS**, **RELIANCE**) are quiet under `Other watched stocks (2)`.

### STEP 3: Open Explainability Breakdown
- Click **"Why this matters →"** on TATAMOTORS.
- Show score breakdown bars:
  - Price Movement: 30.0 / 30
  - Volume Anomaly: 18.0 / 20
  - Market Relative Move: 20.0 / 20
  - Volatility Shift: 15.0 / 15
  - Event Signal: 10.0 / 15
- Show bullet points explaining NIFTY outperformance and volume surge.

### STEP 4: Demonstrate Market Scenario: Broad Market Rally
- Click **"Broad Rally (NIFTY +3.2%)"** in the Market Scenarios bar.
- Point out how stock attention scores adjust downwards because the move was driven by the broader market, not stock-specific news.

### STEP 5: Demonstrate Resilience Scenario: Stale Data
- Click **"Stale Data Feed"** in the Market Scenarios bar.
- Point out how INFY & RELIANCE receive a data quality warning and their attention score is capped at score 60 (`Worth Watching`).

### STEP 6: Demonstrate Data Reliability: Conflicting Data
- Click **"Conflicting Data Feed"** in the Market Scenarios bar.
- Point out how attention for INFY is suppressed to 0 (`NORMAL`) until feed synchronization is restored.

### STEP 7: Show Engineering Decisions & Architecture
- Switch to the **"How it works"** tab.
- Highlight the 8 key architectural decisions (Why, Trade-off, When We Would Reconsider).
- Point to **"What We Left Out"** demonstrating intentional product scoping.
