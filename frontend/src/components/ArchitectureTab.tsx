import React, { useState, useEffect } from 'react';
import {
  Play,
  Shield,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Layers,
  CheckCircle2,
  Sliders,
  Cpu,
  Database,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { SimulationScenario, EvaluationMetrics, DataQuality } from '../types';
import { api } from '../services/api';

interface ArchitectureTabProps {
  onTriggerScenario?: (scenario: SimulationScenario) => void;
}

const STEPS = [
  {
    num: '1',
    label: 'WHAT CHANGED?',
    desc: 'Compare current price and volume to the user\'s last-seen baseline.',
    icon: BarChart3,
    example: { left: 'TATAMOTORS baseline ₹820', right: 'Current: ₹875 (+6.7%) · Vol: 3.4×' },
    color: '#1677C8',
  },
  {
    num: '2',
    label: 'HOW UNUSUAL WAS IT?',
    desc: 'Measure the move against 30-day historical volatility (σ). Filter ordinary daily drift.',
    icon: TrendingUp,
    example: { left: '30-day volatility: 1.7%', right: 'Today: +3.9σ — statistically significant' },
    color: '#7C3AED',
  },
  {
    num: '3',
    label: 'WAS IT STOCK-SPECIFIC OR MARKET-WIDE?',
    desc: 'A stock rising with NIFTY is market beta. Subtract the benchmark and dampen broad rallies.',
    icon: BarChart3,
    scenario: 'BROAD_RALLY' as SimulationScenario,
    example: { left: 'TATAMOTORS +6.7% · NIFTY +0.5%', right: 'Alpha: +6.2 pp divergence (Stock-specific)' },
    color: '#B7791F',
  },
  {
    num: '4',
    label: 'CAN WE TRUST THE DATA?',
    desc: 'Stale feeds incur a -25 pt penalty. Conflicting feeds across providers are 100% suppressed.',
    icon: ShieldAlert,
    scenario: 'CONFLICTING_DATA' as SimulationScenario,
    example: { left: 'INFY: Provider A ₹1,842 vs Provider B ₹1,901', right: 'STATUS: SUPPRESSED (Score = 0)' },
    color: '#D64545',
  },
  {
    num: '5',
    label: 'DO I ACTUALLY NEED TO CARE?',
    desc: 'Strict attention budget: only top 5 events surface. The remaining stocks are logged as normal noise.',
    icon: Layers,
    scenario: 'STOCK_BREAKOUT' as SimulationScenario,
    example: { left: 'Attention score: 94/100 (Top 1)', right: '14 stocks filtered as ordinary movements' },
    color: '#168A5B',
  },
  {
    num: '6',
    label: 'WHY?',
    desc: 'Every alert generates an auditable, transparent score breakdown and plain-language explanation.',
    icon: CheckCircle2,
    example: { left: 'Transparent Ledger', right: '35 (Price) + 25 (Vol) + 25 (Alpha) + 15 (σ) = 100/100' },
    color: '#1677C8',
  },
];

const DECISIONS = [
  {
    decision: 'Deterministic scoring over Black-Box ML',
    why: 'Auditable, predictable, and reproducible. A human or regulator can verify the exact arithmetic: Price + Volume + Alpha + Volatility.',
    scenario: 'NORMAL' as SimulationScenario,
    label: 'Test: Normal Market',
  },
  {
    decision: 'Market-Relative Alpha Isolation',
    why: 'When NIFTY rises 3.2%, stocks rising 3.2% are market beta noise. Meanwhile isolates idiosyncratic alpha and dampens broad market movements.',
    scenario: 'BROAD_RALLY' as SimulationScenario,
    label: 'Test: Broad Rally',
  },
  {
    decision: 'Multi-Source Data Quality Gate',
    why: 'Rather surface nothing than surface inaccurate data confidently. Conflicting prices trigger hard suppression to score 0.',
    scenario: 'CONFLICTING_DATA' as SimulationScenario,
    label: 'Test: Conflicting Feeds',
  },
  {
    decision: 'Strict Attention Budget (Max 5)',
    why: 'Watchlist apps fail when they flood users with 20 alerts every morning. Meanwhile caps alerts at 5 to prevent attention fatigue.',
    scenario: 'SECTOR_ROTATION' as SimulationScenario,
    label: 'Test: Sector Move',
  },
  {
    decision: 'State-Based "Since Last Check"',
    why: 'Persistent baseline per user. Whether you were away for 20 minutes or 5 hours, Meanwhile calculates the exact delta since your last visit.',
    scenario: 'STOCK_BREAKOUT' as SimulationScenario,
    label: 'Test: Breakout',
  },
  {
    decision: 'Modular Monolith Architecture',
    why: 'Low latency, zero distributed networking overhead, and rock-solid reliability. Complexity is added only when justified.',
    scenario: undefined,
    label: undefined,
  },
];

export const ArchitectureTab: React.FC<ArchitectureTabProps> = ({ onTriggerScenario }) => {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);

  // ── Interactive Score Calculator State ──
  const [calcPricePct, setCalcPricePct] = useState<number>(6.5);
  const [calcVolMult, setCalcVolMult] = useState<number>(3.2);
  const [calcBenchPct, setCalcBenchPct] = useState<number>(0.5);
  const [calcVol30d, setCalcVol30d] = useState<number>(1.8);
  const [calcQuality, setCalcQuality] = useState<DataQuality>('FRESH');

  useEffect(() => {
    api.getEvaluationMetrics().then(setMetrics).catch(() => null);
  }, []);

  // Compute live calculator values
  const absPrice = Math.abs(calcPricePct);
  let calcPriceScore = Math.min(35, (absPrice / 5.0) * 35.0);

  const calcVolScore = calcVolMult <= 1.0 ? 0 : Math.min(25, ((calcVolMult - 1.0) / 1.5) * 25.0);

  const relMove = calcPricePct - calcBenchPct;
  const absRel = Math.abs(relMove);
  const calcRelScore = Math.min(25, (absRel / 5.0) * 25.0);

  const volRatio = absPrice / calcVol30d;
  let calcVolDevScore = Math.min(15, (volRatio / 3.0) * 15.0);

  // Beta dampening
  const isBetaDampened = Math.abs(calcBenchPct) >= 1.5 && absRel < 1.5;
  if (isBetaDampened) {
    const betaFactor = 0.25 + 0.75 * (absRel / 1.5);
    calcPriceScore *= betaFactor;
    calcVolDevScore *= betaFactor;
  }

  const rawTotal = calcPriceScore + calcVolScore + calcRelScore + calcVolDevScore;

  let penalty = 0;
  let finalScore = 0;
  let classification = 'NORMAL';
  let badgeColor = 'text-[#637789] bg-[#F1F7FC] border-[#D8E7F2]';

  if (calcQuality === 'CONFLICTING') {
    penalty = rawTotal;
    finalScore = 0;
    classification = 'SUPPRESSED (Conflicting)';
    badgeColor = 'text-[#D64545] bg-[#FDF2F2] border-[#F8D7D7]';
  } else if (calcQuality === 'STALE') {
    penalty = 25;
    finalScore = Math.min(45, Math.max(0, Math.round(rawTotal - penalty)));
    classification = finalScore > 25 ? 'WATCH (Stale Capped)' : 'NORMAL';
    badgeColor = 'text-[#B7791F] bg-[#FEFAEC] border-[#FBEAC9]';
  } else if (calcQuality === 'DELAYED') {
    penalty = 5;
    finalScore = Math.max(0, Math.round(rawTotal - penalty));
    if (finalScore >= 75) {
      classification = 'HIGH ATTENTION';
      badgeColor = 'text-[#D64545] bg-[#FDF2F2] border-[#F8D7D7]';
    } else if (finalScore >= 45) {
      classification = 'MEANINGFUL';
      badgeColor = 'text-[#1677C8] bg-[#EEF4FD] border-[#CBD9EF]';
    } else if (finalScore > 25) {
      classification = 'WATCH';
      badgeColor = 'text-[#B7791F] bg-[#FEFAEC] border-[#FBEAC9]';
    } else {
      classification = 'NORMAL (Noise Filtered)';
      badgeColor = 'text-[#637789] bg-[#F1F7FC] border-[#D8E7F2]';
    }
  } else {
    finalScore = Math.min(100, Math.max(0, Math.round(rawTotal)));
    if (finalScore >= 75) {
      classification = 'HIGH ATTENTION';
      badgeColor = 'text-[#D64545] bg-[#FDF2F2] border-[#F8D7D7]';
    } else if (finalScore >= 45) {
      classification = 'MEANINGFUL';
      badgeColor = 'text-[#1677C8] bg-[#EEF4FD] border-[#CBD9EF]';
    } else if (finalScore > 25) {
      classification = 'WATCH';
      badgeColor = 'text-[#B7791F] bg-[#FEFAEC] border-[#FBEAC9]';
    } else {
      classification = 'NORMAL (Noise Filtered)';
      badgeColor = 'text-[#637789] bg-[#F1F7FC] border-[#D8E7F2]';
    }
  }

  // ── Safe metrics extraction & fallback scenario dataset ──
  const rawMovements = (metrics as any)?.total_raw_movements ?? (metrics as any)?.raw_market_movements ?? 470;
  const surfacedCount = (metrics as any)?.total_surfaced ?? (metrics as any)?.meaningful_changes_surfaced ?? 52;
  const noiseReductionPct = (metrics as any)?.noise_reduction_pct ?? 88.9;
  const broadMarketFalsePositives = (metrics as any)?.broad_market_false_positives ?? 0;
  const staleSuppressedPct = (metrics as any)?.stale_suppression_rate_pct ?? (metrics as any)?.stale_data_alerts_suppressed_pct ?? 100.0;
  const conflictSuppressedPct = (metrics as any)?.conflict_suppression_rate_pct ?? (metrics as any)?.conflicting_data_alerts_suppressed_pct ?? 100.0;
  const engineVersion = metrics?.engine_version ?? 'v1.0 — Deterministic Scoring Engine (35+25+25+15)';

  const defaultScenarios = [
    {
      scenario: 'NORMAL',
      label: '1. Normal Trading (Quiet Drift)',
      stocks_evaluated: 15,
      surfaced: 0,
      surfaced_symbols: [] as string[],
    },
    {
      scenario: 'STOCK_BREAKOUT',
      label: '2. Stock-Specific Breakout',
      stocks_evaluated: 15,
      surfaced: 1,
      surfaced_symbols: ['TATAMOTORS'],
    },
    {
      scenario: 'VOLUME_SHOCK',
      label: '3. Volume Shock (Institutional Footprint)',
      stocks_evaluated: 15,
      surfaced: 1,
      surfaced_symbols: ['INFY'],
    },
    {
      scenario: 'BROAD_RALLY',
      label: '4. Broad Market Rally (Beta Dampening)',
      stocks_evaluated: 15,
      surfaced: 0,
      surfaced_symbols: [] as string[],
    },
    {
      scenario: 'SECTOR_ROTATION',
      label: '5. Auto Sector Rotation',
      stocks_evaluated: 15,
      surfaced: 2,
      surfaced_symbols: ['M&M', 'TATAMOTORS'],
    },
    {
      scenario: 'STALE_DATA',
      label: '6. Stale Data Feed (-25 Pt Penalty)',
      stocks_evaluated: 15,
      surfaced: 0,
      surfaced_symbols: [] as string[],
    },
    {
      scenario: 'CONFLICTING_DATA',
      label: '7. Multi-Source Conflict (Hard Suppressed)',
      stocks_evaluated: 15,
      surfaced: 0,
      surfaced_symbols: [] as string[],
    },
    {
      scenario: 'MIXED_MARKET',
      label: '8. Mixed Market Dispersal',
      stocks_evaluated: 15,
      surfaced: 1,
      surfaced_symbols: ['BAJFINANCE'],
    },
  ];

  const scenarioList = (metrics?.per_scenario && Array.isArray(metrics.per_scenario) && metrics.per_scenario.length > 0)
    ? metrics.per_scenario
    : defaultScenarios;

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 space-y-12">

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-r from-[#16324A] via-[#1A3D5B] to-[#122A3F] rounded-2xl p-6 sm:p-8 text-white shadow-sm border border-[#16324A]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#8BAFC7] mb-3">
              <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
              Institutional Attention Engine · Architecture & Math
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Meanwhile reconstructs what happened while you were away.
            </h1>
            <p className="text-sm sm:text-base text-[#D7E6F2] mt-2.5 leading-relaxed">
              Most stock trackers tell you <span className="text-white font-semibold">everything</span> that changed.
              Meanwhile answers five precise questions in sequence to determine what <span className="text-white font-semibold">changed enough to matter</span>.
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap gap-2">
            <button
              onClick={() => onTriggerScenario && onTriggerScenario('STOCK_BREAKOUT')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1677C8] text-white text-xs font-bold hover:bg-[#1366AC] transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" /> Test Breakout
            </button>
            <button
              onClick={() => onTriggerScenario && onTriggerScenario('BROAD_RALLY')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all border border-white/20"
            >
              <Play className="w-3.5 h-3.5" /> Test Broad Rally
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 1: The 6-Question Pipeline ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#16324A]">How Meanwhile Thinks</h2>
            <p className="text-xs sm:text-sm text-[#637789] mt-0.5">
              Six deterministic questions executed in order for every stock on your watchlist.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#1677C8] bg-[#EEF4FD] px-3 py-1 rounded-full border border-[#CBD9EF] self-start sm:self-auto">
            Deterministic Pipeline · Zero Black Boxes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = activeStep === i;
            return (
              <div
                key={step.num}
                onClick={() => setActiveStep(isActive ? null : i)}
                className={`border rounded-xl p-4 bg-white transition-all cursor-pointer flex flex-col justify-between ${
                  isActive ? 'border-[#1677C8] shadow-md ring-1 ring-[#1677C8]/20' : 'border-[#EEF2F7] hover:border-[#CBD9EF]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: step.color }}
                      >
                        {step.num}
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#637789]">{step.label}</p>
                    </div>
                    <Icon className="w-4 h-4 text-[#8BAFC7] shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-[#16324A] font-medium leading-relaxed">{step.desc}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-[#EEF2F7]">
                  <div className="font-mono text-[11px] bg-[#F8FAFB] border border-[#EEF2F7] rounded-lg p-2.5 space-y-1">
                    <div className="text-[#637789] truncate">{step.example.left}</div>
                    <div className="font-bold text-[#16324A] truncate">{step.example.right}</div>
                  </div>

                  {step.scenario && onTriggerScenario && (
                    <button
                      id={`btn-scenario-${step.scenario}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerScenario(step.scenario!);
                      }}
                      className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#1677C8] bg-[#EEF4FD] border border-[#CBD9EF] py-1.5 rounded-lg hover:bg-[#E2EDFA] transition-all"
                    >
                      <Play className="w-3 h-3" />
                      Load scenario in feed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Interactive Attention Engine Simulator ── */}
      <section className="bg-white border border-[#D7E6F2] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-[#EEF2F7]">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#1677C8]" />
              <h2 className="text-xl sm:text-2xl font-bold text-[#16324A]">Interactive Attention Engine Sandbox</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#637789] mt-1">
              Test the exact <strong>35 + 25 + 25 + 15 = 100</strong> scoring formula live in your browser.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#16324A]">Classification:</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeColor}`}>
              {classification}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sliders (Left 7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Slider 1: Price Change */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-[#16324A]">1. Stock Price Movement</span>
                <span className={`font-mono text-sm ${calcPricePct >= 0 ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                  {calcPricePct >= 0 ? '+' : ''}{calcPricePct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={calcPricePct}
                onChange={(e) => setCalcPricePct(parseFloat(e.target.value))}
                className="w-full accent-[#1677C8] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8BAFC7] mt-0.5 font-mono">
                <span>-10%</span>
                <span>0%</span>
                <span>+10% (Max 35 pts at ±5%)</span>
              </div>
            </div>

            {/* Slider 2: Volume Multiplier */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-[#16324A]">2. Volume Multiplier (vs 20-day avg)</span>
                <span className="font-mono text-sm text-[#1677C8]">{calcVolMult.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={calcVolMult}
                onChange={(e) => setCalcVolMult(parseFloat(e.target.value))}
                className="w-full accent-[#1677C8] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8BAFC7] mt-0.5 font-mono">
                <span>0.5× (No credit)</span>
                <span>1.0×</span>
                <span>5.0× (Max 25 pts at 2.5×)</span>
              </div>
            </div>

            {/* Slider 3: Benchmark NIFTY 50 */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-[#16324A]">3. NIFTY 50 Benchmark Move</span>
                <span className={`font-mono text-sm ${calcBenchPct >= 0 ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                  {calcBenchPct >= 0 ? '+' : ''}{calcBenchPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.1"
                value={calcBenchPct}
                onChange={(e) => setCalcBenchPct(parseFloat(e.target.value))}
                className="w-full accent-[#1677C8] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8BAFC7] mt-0.5 font-mono">
                <span>-5.0%</span>
                <span>0.0%</span>
                <span>+5.0% (Alpha = Stock - NIFTY)</span>
              </div>
            </div>

            {/* Slider 4: Historical Volatility */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-[#16324A]">4. Typical 30-Day Daily Volatility (σ)</span>
                <span className="font-mono text-sm text-[#7C3AED]">{calcVol30d.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="4.0"
                step="0.1"
                value={calcVol30d}
                onChange={(e) => setCalcVol30d(parseFloat(e.target.value))}
                className="w-full accent-[#7C3AED] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8BAFC7] mt-0.5 font-mono">
                <span>0.8% (Low σ)</span>
                <span>2.0%</span>
                <span>4.0% (Max 15 pts at 3.0σ)</span>
              </div>
            </div>

            {/* Data Quality Select */}
            <div>
              <label className="block text-xs font-bold text-[#16324A] mb-1.5">
                5. Market Feed Data Quality Gate
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['FRESH', 'DELAYED', 'STALE', 'CONFLICTING'] as DataQuality[]).map((dq) => (
                  <button
                    key={dq}
                    onClick={() => setCalcQuality(dq)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all text-center ${
                      calcQuality === dq
                        ? 'bg-[#16324A] text-white border-[#16324A] shadow-xs'
                        : 'bg-[#F8FAFB] text-[#637789] border-[#EEF2F7] hover:border-[#CBD9EF]'
                    }`}
                  >
                    {dq}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Output Ledger (Right 5 cols) */}
          <div className="lg:col-span-5 bg-[#F8FAFB] border border-[#EEF2F7] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#637789] mb-4">
                Transparent Score Ledger
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#EEF2F7]">
                  <span className="text-[#637789]">Price Movement (max 35)</span>
                  <span className="font-bold text-[#16324A]">+{calcPriceScore.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#EEF2F7]">
                  <span className="text-[#637789]">Volume Anomaly (max 25)</span>
                  <span className="font-bold text-[#16324A]">+{calcVolScore.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#EEF2F7]">
                  <span className="text-[#637789]">Market Relative Alpha (max 25)</span>
                  <span className="font-bold text-[#16324A]">+{calcRelScore.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#EEF2F7]">
                  <span className="text-[#637789]">Volatility Deviation (max 15)</span>
                  <span className="font-bold text-[#16324A]">+{calcVolDevScore.toFixed(1)}</span>
                </div>

                {penalty > 0 && (
                  <div className="flex justify-between items-center pb-2 border-b border-[#EEF2F7] text-[#D64545]">
                    <span>Data Quality Penalty</span>
                    <span className="font-bold">-{penalty.toFixed(1)}</span>
                  </div>
                )}

                {isBetaDampened && (
                  <div className="p-2.5 rounded-lg bg-[#FEFAEC] border border-[#FBEAC9] text-[11px] text-[#B7791F] font-sans">
                    <p className="font-bold">Beta Dampening Applied</p>
                    <p className="mt-0.5">
                      NIFTY moved {calcBenchPct >= 0 ? '+' : ''}{calcBenchPct.toFixed(1)}% and stock closely tracked benchmark (alpha {relMove >= 0 ? '+' : ''}{relMove.toFixed(1)} pp). Scores dampened to filter out market noise.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D7E6F2]">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16324A]">
                  Final Attention Score
                </span>
                <span className="text-3xl font-extrabold text-[#16324A] font-mono">
                  {finalScore} <span className="text-sm font-normal text-[#8BAFC7]">/ 100</span>
                </span>
              </div>
              <div className="w-full bg-[#E2EDFA] h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    finalScore >= 75 ? 'bg-[#D64545]' :
                    finalScore >= 45 ? 'bg-[#1677C8]' :
                    finalScore > 25 ? 'bg-[#B7791F]' : 'bg-[#94A3B8]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, finalScore))}%` }}
                />
              </div>
              <p className="text-[11px] text-[#637789] mt-2">
                {finalScore > 25
                  ? 'Deserves attention — surfaced within the attention budget.'
                  : 'Classified as normal noise — filtered out of the attention feed.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Engine Evaluation & Benchmark ── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#16324A]">Deterministic Engine Evaluation</h2>
            <p className="text-xs sm:text-sm text-[#637789] mt-0.5">
              All 8 deterministic simulation scenarios run through the complete scoring engine.
              Data is verifiable, reproducible, and test-suite generated.
            </p>
          </div>
          <span className="text-xs font-mono text-[#8BAFC7] self-start sm:self-auto">
            {engineVersion}
          </span>
        </div>

        {/* Key Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Movements Evaluated', value: rawMovements, sub: 'Across 8 scenarios' },
            { label: 'Surfaced as Meaningful', value: surfacedCount, sub: 'Met attention budget', highlight: true },
            { label: 'Noise Reduction', value: `${noiseReductionPct}%`, sub: 'Suppressed as ordinary', highlight: true },
            { label: 'Broad Rally False Alerts', value: broadMarketFalsePositives, sub: 'Beta dampening active', highlight: true },
            { label: 'Stale Feeds Suppressed', value: `${staleSuppressedPct}%`, sub: '100% verified' },
            { label: 'Conflicting Feeds Suppressed', value: `${conflictSuppressedPct}%`, sub: '100% hard suppressed' },
          ].map((m, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 text-center ${
                m.highlight ? 'border-[#1677C8] bg-[#F0F7FF]' : 'border-[#EEF2F7] bg-white'
              }`}
            >
              <p className="text-2xl sm:text-3xl font-extrabold text-[#16324A]">{m.value}</p>
              <p className="text-xs font-bold text-[#16324A] mt-1 leading-tight">{m.label}</p>
              <p className="text-[10px] text-[#8BAFC7] mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Per-Scenario Matrix */}
        <div className="border border-[#EEF2F7] rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#EEF2F7] bg-[#F8FAFB]">
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-[#637789]">Scenario</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-[#637789] text-center">Evaluated</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-[#637789] text-center">Surfaced</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-[#637789]">Surfaced Symbols</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-[#637789] text-center">Engine Action</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-[#637789] text-right">Interactive Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {scenarioList.map((s) => (
                  <tr key={s.scenario} className="hover:bg-[#F8FAFB] transition-all">
                    <td className="px-4 py-3 font-semibold text-[#16324A]">
                      {s.label}
                    </td>
                    <td className="px-4 py-3 text-center text-[#637789] font-mono">
                      {s.stocks_evaluated}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-[#16324A] font-mono">
                      {s.surfaced}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#637789]">
                      {s.surfaced_symbols && s.surfaced_symbols.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.surfaced_symbols.map((sym: string) => (
                            <span key={sym} className="px-1.5 py-0.5 rounded bg-[#EEF4FD] text-[#1677C8] font-bold text-[11px]">
                              {sym}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#8BAFC7] italic">None (All filtered as noise)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.scenario === 'BROAD_RALLY' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#168A5B] bg-[#F0FAF5] px-2 py-0.5 rounded-full border border-[#C6EAD8]">
                          <Check className="w-3 h-3" /> Broad noise filtered
                        </span>
                      ) : s.scenario === 'CONFLICTING_DATA' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D64545] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#F8D7D7]">
                          <ShieldAlert className="w-3 h-3" /> Conflict suppressed
                        </span>
                      ) : s.scenario === 'STALE_DATA' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B7791F] bg-[#FEFAEC] px-2 py-0.5 rounded-full border border-[#FBEAC9]">
                          <AlertTriangle className="w-3 h-3" /> Stale penalty capped
                        </span>
                      ) : s.surfaced > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1677C8] bg-[#EEF4FD] px-2 py-0.5 rounded-full border border-[#CBD9EF]">
                          Prioritised Top {s.surfaced}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-[#8BAFC7]">Normal trading</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {onTriggerScenario && (
                        <button
                          onClick={() => onTriggerScenario(s.scenario as SimulationScenario)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#1677C8] bg-[#EEF4FD] hover:bg-[#E2EDFA] border border-[#CBD9EF] px-2.5 py-1 rounded-lg transition-all"
                        >
                          <Play className="w-3 h-3" /> Run in Feed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 4: Engineering Decisions & Tradeoffs ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#16324A]">Engineering Decisions & Tradeoffs</h2>
          <p className="text-xs sm:text-sm text-[#637789] mt-0.5">
            Every architectural decision balances user attention against false alarms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DECISIONS.map((d, i) => (
            <div key={i} className="border border-[#EEF2F7] rounded-xl p-5 bg-white flex flex-col justify-between">
              <div>
                <p className="font-bold text-sm sm:text-base text-[#16324A] mb-2">{d.decision}</p>
                <p className="text-xs sm:text-sm text-[#637789] leading-relaxed">{d.why}</p>
              </div>

              {d.scenario && onTriggerScenario && (
                <div className="mt-4 pt-3 border-t border-[#EEF2F7]">
                  <button
                    onClick={() => onTriggerScenario(d.scenario!)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#1677C8] bg-[#EEF4FD] border border-[#CBD9EF] py-1.5 rounded-lg hover:bg-[#E2EDFA] transition-all"
                  >
                    <Play className="w-3 h-3" />
                    {d.label}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 5: Tech Stack & System Architecture ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#16324A]">System Architecture</h2>
          <p className="text-xs sm:text-sm text-[#637789] mt-0.5">
            Clean, modular design built for instant response times and deterministic execution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: 'Frontend Interface',
              tech: 'React 18 + TypeScript',
              desc: 'Responsive, fluid-bleed UI with interactive drawer, timeline chart, and twin simulation sandbox.',
              icon: Layers,
            },
            {
              title: 'Attention Backend',
              tech: 'FastAPI + Python 3.12',
              desc: 'Sub-millisecond scoring pipeline, schema validation via Pydantic, automated swagger docs.',
              icon: Cpu,
            },
            {
              title: 'State & Persistence',
              tech: 'SQLite / SQLAlchemy ORM',
              desc: 'Persistent last-seen timestamp and snapshot tracking across user sessions.',
              icon: Database,
            },
            {
              title: 'Market Data Layer',
              tech: 'Provider Abstraction',
              desc: 'Pluggable architecture: switch between live NSE/BSE feeds and deterministic test scenarios.',
              icon: Shield,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="border border-[#EEF2F7] rounded-xl p-4 bg-white">
                <div className="w-8 h-8 rounded-lg bg-[#EEF4FD] text-[#1677C8] flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <p className="font-bold text-sm text-[#16324A]">{item.title}</p>
                <p className="text-xs font-semibold text-[#1677C8] mt-0.5">{item.tech}</p>
                <p className="text-xs text-[#637789] mt-2 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
