import React, { useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ChangeEvent, ConfidenceLevel, PriceTimelinePoint } from '../types';

interface StockDetailDrawerProps {
  event: ChangeEvent | null;
  onClose: () => void;
}

function MiniSparkline({ timeline, isUp }: { timeline: PriceTimelinePoint[]; isUp: boolean }) {
  if (!timeline || timeline.length < 2) return null;
  const prices = timeline.map(p => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const W = 400;
  const H = 60;
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - minP) / range) * (H - 4);
    return `${x},${y}`;
  }).join(' ');
  const color = isUp ? '#168A5B' : '#D64545';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function confidenceConfig(confidence?: ConfidenceLevel, dataQuality?: string) {
  const c = confidence || (dataQuality === 'FRESH' ? 'HIGH' : dataQuality === 'STALE' ? 'LOW' : dataQuality === 'CONFLICTING' ? 'SUPPRESSED' : 'REDUCED');
  const map: Record<string, { label: string; sublabel: string; cls: string; icon: React.ReactNode }> = {
    HIGH:       { label: 'High',       sublabel: 'Fresh market data',              cls: 'text-[#168A5B] bg-[#F0FAF5] border-[#C6EAD8]', icon: <ShieldCheck className="w-4 h-4" /> },
    REDUCED:    { label: 'Reduced',    sublabel: 'Data feed delayed',              cls: 'text-[#B7791F] bg-[#FEF9EC] border-[#FBEAC9]', icon: <ShieldAlert className="w-4 h-4" /> },
    LOW:        { label: 'Low',        sublabel: 'Last update: 45+ min ago',       cls: 'text-[#B7791F] bg-[#FEF9EC] border-[#FBEAC9]', icon: <ShieldAlert className="w-4 h-4" /> },
    SUPPRESSED: { label: 'Suppressed', sublabel: 'Conflicting data feeds',         cls: 'text-[#D64545] bg-[#FDF2F2] border-[#F8D7D7]', icon: <ShieldAlert className="w-4 h-4" /> },
  };
  return map[c] || map.HIGH;
}

export const StockDetailDrawer: React.FC<StockDetailDrawerProps> = ({ event, onClose }) => {
  useEffect(() => {
    if (!event) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [event, onClose]);

  if (!event) return null;

  const isPositive = event.price_change_percent >= 0;
  const bd = event.score_breakdown;
  const score = Math.round(event.score);
  const conf = confidenceConfig(event.confidence, event.data_quality);
  const isSuppressed = event.data_quality === 'CONFLICTING';

  const scoreRows = bd ? [
    { label: 'Price Movement',    value: Math.round(bd.price_score),             max: 35, note: 'max 35' },
    { label: 'Volume Anomaly',    value: Math.round(bd.volume_score),            max: 25, note: 'max 25' },
    { label: 'vs Market (NIFTY)', value: Math.round(bd.market_relative_score),  max: 25, note: 'max 25' },
    { label: 'Volatility (30d σ)',value: Math.round(bd.volatility_score),        max: 15, note: 'max 15' },
  ] : [];

  return (
    <>
      <div className="fixed inset-0 bg-[#16324A]/25 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] lg:w-[500px] bg-white z-50 flex flex-col shadow-2xl border-l border-[#E0EAF2] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEF2F7] shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-[#16324A] text-xl">{event.symbol}</span>
              {isSuppressed && (
                <span className="text-xs font-bold bg-[#FDF2F2] text-[#D64545] border border-[#F8D7D7] px-2 py-0.5 rounded-full">
                  ALERT SUPPRESSED
                </span>
              )}
            </div>
            <p className="text-xs text-[#637789] mt-0.5">What happened while you were away</p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg text-[#637789] hover:text-[#16324A] hover:bg-[#F4F7FA] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Price timeline: baseline → now */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#637789] mb-2">
              Price · Last Check → Now
            </p>
            <div className="flex items-end gap-3">
              <div>
                <p className="text-xs text-[#637789]">Baseline</p>
                <p className="text-2xl font-bold text-[#16324A]">₹{event.previous_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="flex-1 flex flex-col items-center pb-1.5">
                <MiniSparkline timeline={event.timeline} isUp={isPositive} />
                <div className="w-full flex items-center gap-1 mt-0.5">
                  <div className="h-px flex-1 bg-[#DDE5EE]" />
                  <span className={`text-xs font-bold ${isPositive ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                    {isPositive ? '↑' : '↓'} {Math.abs(event.price_change_percent).toFixed(2)}%
                  </span>
                  <div className="h-px flex-1 bg-[#DDE5EE]" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#637789]">Now</p>
                <p className={`text-2xl font-bold ${isPositive ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                  ₹{event.current_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Market context */}
          <div className="border border-[#EEF2F7] rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#637789]">Compared to market</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-[#637789]">This stock</p>
                <p className={`text-xl font-bold ${isPositive ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                  {isPositive ? '+' : ''}{event.price_change_percent.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[#637789]">NIFTY 50</p>
                <p className="text-xl font-bold text-[#16324A]">
                  +{(event.price_change_percent - event.market_relative_change).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[#637789]">Relative</p>
                <p className={`text-xl font-bold ${event.market_relative_change >= 0 ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                  {event.market_relative_change >= 0 ? '+' : ''}{event.market_relative_change.toFixed(2)} pp
                </p>
              </div>
            </div>
            {event.volume_multiplier > 1.3 && (
              <div className="mt-2 text-sm text-[#16324A] bg-[#F4F7FA] rounded-lg px-3 py-2">
                Volume <span className="font-bold text-[#1677C8]">{event.volume_multiplier.toFixed(1)}×</span> typical
              </div>
            )}
          </div>

          {/* Attention Score — arithmetic display */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[#637789]">Attention Score</p>
              <span className="text-3xl font-bold text-[#1677C8]">
                {score}<span className="text-base font-medium text-[#637789]">/100</span>
              </span>
            </div>
            <div className="h-2 bg-[#EEF2F7] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${score}%`,
                  background: score >= 81 ? '#D64545' : score >= 61 ? '#B7791F' : score >= 31 ? '#1677C8' : '#8BAFC7'
                }} />
            </div>
            {scoreRows.length > 0 && (
              <div className="space-y-1.5 font-mono text-sm bg-[#F8FAFB] border border-[#EEF2F7] rounded-xl p-4">
                {scoreRows.map(r => (
                  <div key={r.label} className="flex justify-between text-[#16324A]">
                    <span className="text-[#637789] font-sans text-xs">{r.label.toUpperCase()}</span>
                    <span className="font-bold">+{r.value}<span className="text-[#8BAFC7] font-normal text-xs"> / {r.max}</span></span>
                  </div>
                ))}
                <div className="border-t border-[#DDE5EE] pt-1.5 mt-1.5 flex justify-between font-bold text-[#16324A]">
                  <span className="font-sans text-xs">TOTAL</span>
                  <span>{score}<span className="text-[#8BAFC7] font-normal text-xs"> / 100</span></span>
                </div>
              </div>
            )}
          </div>

          {/* Confidence + Attention */}
          <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${conf.cls}`}>
            {conf.icon}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">Confidence · {conf.label}</p>
              <p className="text-xs mt-0.5 opacity-80">{conf.sublabel}</p>
            </div>
          </div>

          {/* Suppressed case — Why wasn't this surfaced? */}
          {isSuppressed && (
            <div className="border border-[#F8D7D7] bg-[#FDF2F2] rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#D64545] mb-2">Alert Suppressed</p>
              <p className="text-sm text-[#16324A] leading-relaxed">
                Two data providers are returning conflicting prices for this stock.
                Meanwhile would rather show <strong>nothing</strong> than confidently surface unreliable information.
              </p>
              <div className="mt-3 font-mono text-xs space-y-1 bg-white rounded-lg p-3 border border-[#F8D7D7]">
                <div className="flex justify-between"><span className="text-[#637789]">Provider A</span><span>₹{event.previous_price.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-[#637789]">Provider B</span><span>₹{event.current_price.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between font-bold text-[#D64545] border-t border-[#F8D7D7] pt-1 mt-1"><span>Status</span><span>CONFLICT</span></div>
              </div>
            </div>
          )}

          {/* Why this matters */}
          {event.reasons && event.reasons.length > 0 && !isSuppressed && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#637789] mb-2">Why this matters</p>
              <div className="space-y-2">
                {event.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-[#16324A] bg-[#F8FAFB] border border-[#EEF2F7] rounded-lg px-3.5 py-2.5 leading-relaxed">
                    <span className="text-[#1677C8] font-bold shrink-0 mt-px">→</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};
