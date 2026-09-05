import React from 'react';
import { X, ShieldCheck, Info, AlertTriangle } from 'lucide-react';
import { ChangeEvent } from '../types';

interface WhyModalProps {
  event: ChangeEvent | null;
  onClose: () => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const { score_breakdown: sb, score, data_quality } = event;

  const scoreBars = [
    { label: 'Price Movement', score: sb.price_score, max: 30, weight: '30%', desc: 'Evaluates magnitude of stock price return %.' },
    { label: 'Volume Anomaly', score: sb.volume_score, max: 20, weight: '20%', desc: 'Volume ratio relative to 20-day daily average.' },
    { label: 'Market Relative Move', score: sb.market_relative_score, max: 20, weight: '20%', desc: 'Stock return minus NIFTY 50 benchmark return.' },
    { label: 'Volatility Shift', score: sb.volatility_score, max: 15, weight: '15%', desc: 'Move magnitude relative to 30-day historical volatility.' },
    { label: 'Event Signal', score: sb.event_score, max: 15, weight: '15%', desc: 'Unusual price + volume breakout signals.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16324A]/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-[#D7E6F2] rounded-xl max-w-lg w-full p-6 shadow-xl relative overflow-hidden text-[#16324A]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D7E6F2]">
          <div>
            <h3 className="text-lg font-extrabold text-[#16324A]">Why this matters: {event.symbol}</h3>
            <p className="text-xs sm:text-sm text-[#637789]">Deterministic score breakdown (0–100 scale)</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#F2F7FB] hover:bg-[#EAF4FC] border border-[#D7E6F2] flex items-center justify-center text-[#637789] hover:text-[#16324A] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Score Header Box */}
        <div className="my-4 p-4.5 rounded-xl bg-[#F7FAFC] border border-[#D7E6F2] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#637789] uppercase tracking-wider">Overall Score</div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#1677C8] mt-0.5">
              {score} <span className="text-sm font-bold text-[#637789]">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs sm:text-sm font-bold text-[#168A5B] flex items-center justify-end space-x-1">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Deterministic</span>
            </div>
            <div className="text-xs text-[#637789] mt-0.5">No LLM / Black-box AI</div>
          </div>
        </div>

        {/* Formula Breakdown Bars */}
        <div className="space-y-3.5 my-4">
          {scoreBars.map((bar, idx) => {
            const pct = (bar.score / bar.max) * 100;
            return (
              <div key={idx}>
                <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                  <span className="font-semibold text-[#16324A]">
                    {bar.label} <span className="text-[#637789] font-normal">({bar.weight})</span>
                  </span>
                  <span className="font-bold text-[#1677C8]">
                    {bar.score.toFixed(1)} / {bar.max}
                  </span>
                </div>
                <div className="w-full h-2 bg-[#EAF4FC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1677C8] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs text-[#637789] mt-0.5">{bar.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Data Quality Penalty */}
        {sb.data_quality_penalty > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-[#FEF8EC] border border-[#FBEAC9] text-xs sm:text-sm text-[#B7791F] flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Data Quality Penalty: -{sb.data_quality_penalty} pts applied for {data_quality} status.</span>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-3.5 border-t border-[#D7E6F2] text-xs text-[#637789] flex items-center space-x-1.5">
          <Info className="w-4 h-4 shrink-0 text-[#1677C8]" />
          <span>Every score is fully auditable and calculated directly from exchange snapshot data.</span>
        </div>

      </div>
    </div>
  );
};

