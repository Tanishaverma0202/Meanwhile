# Attention Scoring Engine — SCORING.md

**Meanwhile** calculates a deterministic **Attention Score (0–100)** for every watched stock when a user returns to the platform.

The core principle is:
> **DON'T SHOW USERS EVERYTHING THAT CHANGED.**  
> **SHOW THEM WHAT CHANGED ENOUGH TO MATTER.**

---

## 1. Mathematical Scoring Formula

The total raw attention score is a 5-factor weighted sum:

$$\text{Raw Score} = S_{\text{price}} + S_{\text{volume}} + S_{\text{relative}} + S_{\text{volatility}} + S_{\text{event}}$$

$$\text{Raw Score} \in [0, 100]$$

---

### Component 1: Price Movement Score ($S_{\text{price}}$) — Weight: 30%

Evaluates the absolute magnitude of stock return:

$$S_{\text{price}} = \min\left(30.0, \frac{|\Delta\%|}{5.0} \times 30.0\right)$$

- $|\Delta\%| = 0.0\% \implies S_{\text{price}} = 0.0$
- $|\Delta\%| = 2.5\% \implies S_{\text{price}} = 15.0$
- $|\Delta\%| \ge 5.0\% \implies S_{\text{price}} = 30.0$

---

### Component 2: Volume Anomaly Score ($S_{\text{volume}}$) — Weight: 20%

Measures trading volume surge relative to the stock's 20-day daily average:

$$V_{\text{ratio}} = \frac{\text{Volume}_{\text{today}}}{\text{Volume}_{20\text{d avg}}}$$

$$S_{\text{volume}} = \begin{cases} 
0.0 & \text{if } V_{\text{ratio}} \le 1.0 \\
\min\left(20.0, \frac{V_{\text{ratio}} - 1.0}{1.5} \times 20.0\right) & \text{if } V_{\text{ratio}} > 1.0 
\end{cases}$$

- $V_{\text{ratio}} = 1.0\times \implies S_{\text{volume}} = 0.0$
- $V_{\text{ratio}} = 1.75\times \implies S_{\text{volume}} = 10.0$
- $V_{\text{ratio}} \ge 2.5\times \implies S_{\text{volume}} = 20.0$

---

### Component 3: Market-Relative Movement Score ($S_{\text{relative}}$) — Weight: 20%

Compares the stock's return to the broader market benchmark (NIFTY 50):

$$\Delta\%_{\text{relative}} = \Delta\%_{\text{stock}} - \Delta\%_{\text{NIFTY}}$$

$$S_{\text{relative}} = \min\left(20.0, \frac{|\Delta\%_{\text{relative}}|}{4.0} \times 20.0\right)$$

- Stock $+4.0\%$, NIFTY $+3.8\% \implies \Delta\%_{\text{relative}} = +0.2\% \implies S_{\text{relative}} = 1.0$
- Stock $+6.25\%$, NIFTY $+0.50\% \implies \Delta\%_{\text{relative}} = +5.75\% \implies S_{\text{relative}} = 20.0$

---

### Component 4: Volatility Shift Score ($S_{\text{volatility}}$) — Weight: 15%

Measures today's movement relative to the stock's typical 30-day historical daily volatility ($\sigma_{30\text{d}}$):

$$\text{Vol Ratio} = \frac{|\Delta\%|}{\sigma_{30\text{d}} \times 100}$$

$$S_{\text{volatility}} = \min\left(15.0, \frac{\text{Vol Ratio}}{3.0} \times 15.0\right)$$

---

### Component 5: Event / Catalyst Signal Score ($S_{\text{event}}$) — Weight: 15%

Step-function for combined price breakout and volume volume surge:

$$S_{\text{event}} = \begin{cases} 
15.0 & \text{if } |\Delta\%| \ge 4.0\% \text{ and } V_{\text{ratio}} \ge 2.0 \\
10.0 & \text{if } |\Delta\%| \ge 3.0\% \text{ or } V_{\text{ratio}} \ge 2.5 \\
5.0 & \text{if } |\Delta\%| \ge 1.5\% \text{ and } V_{\text{ratio}} \ge 1.5 \\
0.0 & \text{otherwise}
\end{cases}$$

---

## 2. Data Quality Adjustments & Penalties

Before finalizing the score, the system checks data feed reliability:

1. **`FRESH` (<5 mins old):** No penalty applied.
2. **`DELAYED` (5–30 mins old):** $-5.0$ points penalty applied.
3. **`STALE` (>30 mins old):** $-25.0$ points penalty applied, and final score is **capped at 60.0** (`WORTH WATCHING`).
4. **`CONFLICTING` (sources disagree):** Score is **forced to 0.0** and suppressed from high attention.

---

## 3. Severity Classification Thresholds

$$\text{Severity} = \begin{cases} 
\text{NORMAL} & \text{if Score } \le 30.0 \\
\text{WORTH WATCHING} & \text{if } 30.0 < \text{Score} \le 60.0 \\
\text{MEANINGFUL} & \text{if } 60.0 < \text{Score} \le 80.0 \\
\text{HIGH ATTENTION} & \text{if Score } > 80.0
\end{cases}$$

---

## 4. Boundary Tests Verified

- Score 30.0 → `NORMAL`
- Score 30.1 → `WORTH WATCHING`
- Score 60.0 → `WORTH WATCHING`
- Score 60.1 → `MEANINGFUL`
- Score 80.0 → `MEANINGFUL`
- Score 80.1 → `HIGH ATTENTION`
- Score 100.0 → `HIGH ATTENTION`
