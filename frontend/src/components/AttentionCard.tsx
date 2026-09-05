import React from 'react';
import { ArrowUpRight, ArrowDownRight, HelpCircle, ShieldAlert, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { ChangeEvent, SeverityLevel, DataQuality } from '../types';

interface AttentionCardProps {
  event: ChangeEvent;
  onOpenWhyModal: (event: ChangeEvent) => void;
}

export const AttentionCard: React.FC<AttentionCardProps> = ({ event, onOpenWhyModal }) => {
  const isPositive = event.price_change_percent >= 0;
  
  // Severity Styling
  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'HIGH_ATTENTION':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider animate-pulse">
            High Attention ({event.score}/100)
          </span>
        );
      case 'MEANINGFUL':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            Meaningful ({event.score}/100)
          </span>
        );
      case 'WATCH':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
            Worth Watching ({event.score}/100)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
            Normal ({event.score}/100)
          </span>
        );
    }
  };

  // Data Quality Badge
  const getDataQualityBadge = (quality: DataQuality) => {
    switch (quality) {
      case 'FRESH':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Fresh Data</span>
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>Delayed Data</span>
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-md border border-amber-500/40">
            <AlertTriangle className="w-3 h-3" />
            <span>Stale Data</span>
          </span>
        );
      case 'CONFLICTING':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-red-400 bg-red-500/20 px-2.5 py-0.5 rounded-md border border-red-500/40">
            <ShieldAlert className="w-3 h-3" />
            <span>Conflicting Feeds</span>
          </span>
        );
    }
  };

  const borderGlow = 
    event.severity === 'HIGH_ATTENTION'
      ? 'border-red-500/40 hover:border-red-500/70 shadow-lg shadow-red-500/5'
      : event.severity === 'MEANINGFUL'
      ? 'border-amber-500/30 hover:border-amber-500/60'
      : 'border-slate-800 hover:border-slate-700';

  return (
    <div className={`bg-slate-900/90 rounded-2xl p-6 border transition-all duration-200 ${borderGlow}`}>
      
      {/* Top Row: Symbol, Price, Severity & Data Quality */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-lg text-white">
            {event.symbol.substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-tight text-white">{event.symbol}</h2>
              {getDataQualityBadge(event.data_quality)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Prev: ₹{event.previous_price.toLocaleString('en-IN')} ➔ Curr: <span className="font-semibold text-slate-200">₹{event.current_price.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 justify-between sm:justify-end">
          {/* Price Change */}
          <div className="text-right">
            <div className={`flex items-center justify-end font-extrabold text-lg ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="w-5 h-5 mr-0.5 stroke-[3]" /> : <ArrowDownRight className="w-5 h-5 mr-0.5 stroke-[3]" />}
              <span>{isPositive ? '+' : ''}{event.price_change_percent.toFixed(2)}%</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Rel NIFTY: <span className="font-medium text-slate-300">{event.market_relative_change >= 0 ? '+' : ''}{event.market_relative_change.toFixed(2)}%</span>
            </div>
          </div>

          {/* Severity Badge */}
          <div>{getSeverityBadge(event.severity)}</div>
        </div>

      </div>

      {/* Middle Row: Explainable Bullet Reasons */}
      <div className="py-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Why this surfaced:</h4>
        <ul className="space-y-2">
          {event.reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-xs text-slate-200 leading-relaxed">
              <span className="text-emerald-400 font-bold mt-0.5">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Action Row */}
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <div className="text-[11px] text-slate-400">
          Detected: {new Date(event.detected_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>

        <button
          onClick={() => onOpenWhyModal(event)}
          className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 transition-all"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Why am I seeing this?</span>
        </button>
      </div>

    </div>
  );
};
