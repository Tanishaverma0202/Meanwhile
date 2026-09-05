import React from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { ChangeEvent, SeverityLevel, DataQuality } from '../types';

interface AttentionRowProps {
  event: ChangeEvent;
  onOpenDetails: (event: ChangeEvent) => void;
}

const SeverityBadge: React.FC<{ severity: SeverityLevel; score: number }> = ({ severity, score }) => {
  const map = {
    HIGH_ATTENTION: 'bg-[#FDF2F2] text-[#D64545] border-[#F8D7D7]',
    MEANINGFUL:     'bg-[#FEF8EC] text-[#B7791F] border-[#FBEAC9]',
    WATCH:          'bg-[#EAF4FC] text-[#1677C8] border-[#D7E6F2]',
    NORMAL:         'bg-[#F7FAFC] text-[#637789] border-[#D7E6F2]',
  };
  const label = {
    HIGH_ATTENTION: 'High Attention',
    MEANINGFUL:     'Meaningful',
    WATCH:          'Worth Watching',
    NORMAL:         'Normal',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap ${map[severity]}`}>
      {label[severity]} <span className="ml-1 opacity-80">{score}/100</span>
    </span>
  );
};

const DataQualityDot: React.FC<{ quality: DataQuality }> = ({ quality }) => {
  if (quality === 'FRESH') return null; // Keep fresh quiet
  const map: Record<DataQuality, string> = {
    FRESH:       'text-[#168A5B]',
    DELAYED:     'text-[#B7791F]',
    STALE:       'text-[#B7791F]',
    CONFLICTING: 'text-[#D64545]',
  };
  const label: Record<DataQuality, string> = {
    FRESH:       'Fresh',
    DELAYED:     'Delayed',
    STALE:       'Stale',
    CONFLICTING: 'Conflicting',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F7FB] border border-[#D7E6F2] ${map[quality]}`}>
      {label[quality]}
    </span>
  );
};

export const AttentionRow: React.FC<AttentionRowProps> = ({ event, onOpenDetails }) => {
  const isPositive = event.price_change_percent >= 0;
  const isNormal = event.severity === 'NORMAL';

  return (
    <div
      onClick={() => onOpenDetails(event)}
      className={`bg-white border rounded-xl hover:border-[#1677C8]/50 transition-all cursor-pointer shadow-2xs w-full ${
        isNormal ? 'border-[#EAF4FC] opacity-75 hover:opacity-100' : 'border-[#D7E6F2]'
      }`}
    >
      {/* ── Desktop layout (md+): compact horizontal row ── */}
      <div className="hidden md:flex items-center justify-between gap-4 px-5 py-3.5">

        {/* Symbol block */}
        <div className="flex items-center space-x-3 min-w-[200px]">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`font-extrabold text-base sm:text-lg ${isNormal ? 'text-[#637789]' : 'text-[#16324A]'}`}>
                {event.symbol}
              </span>
              <DataQualityDot quality={event.data_quality} />
            </div>
            <div className="text-xs sm:text-sm text-[#637789] font-medium">
              ₹{event.current_price.toLocaleString('en-IN')}
              <span className="ml-1.5 text-xs opacity-75">from ₹{event.previous_price.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Metric columns */}
        <div className="grid grid-cols-3 gap-6 flex-1 max-w-2xl text-xs sm:text-sm">
          <div>
            <div className="text-xs font-semibold text-[#637789]">Since Last Check</div>
            <div className={`flex items-center font-bold text-sm sm:text-base ${isPositive ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
              {isPositive ? '+' : ''}{event.price_change_percent.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#637789]">vs NIFTY 50</div>
            <div className="font-bold text-sm sm:text-base text-[#16324A]">
              {event.market_relative_change >= 0 ? '+' : ''}{event.market_relative_change.toFixed(2)} pp
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#637789]">Volume</div>
            <div className="font-bold text-sm sm:text-base text-[#16324A]">
              {event.volume_multiplier > 1 ? `${event.volume_multiplier}× average` : 'Normal'}
            </div>
          </div>
        </div>

        {/* Badge + Subtle Details link */}
        <div className="flex items-center space-x-4 shrink-0">
          <SeverityBadge severity={event.severity} score={event.score} />
          <span className="flex items-center text-sm font-bold text-[#1677C8] hover:underline">
            Why this matters <ChevronRight className="w-4 h-4 ml-0.5" />
          </span>
        </div>
      </div>

      {/* ── Mobile layout (< md): stacked two-row card ── */}
      <div className="md:hidden px-4 py-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`font-extrabold text-base ${isNormal ? 'text-[#637789]' : 'text-[#16324A]'}`}>{event.symbol}</span>
            <DataQualityDot quality={event.data_quality} />
            <span className="text-sm font-medium text-[#637789]">₹{event.current_price.toLocaleString('en-IN')}</span>
          </div>
          <div className={`flex items-center font-bold text-base ${isPositive ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {isPositive ? '+' : ''}{event.price_change_percent.toFixed(2)}%
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1.5 border-t border-[#F2F7FB]">
          <div className="flex items-center gap-3 text-xs text-[#637789]">
            <span>vs NIFTY <strong className="text-[#16324A] font-bold">{event.market_relative_change >= 0 ? '+' : ''}{event.market_relative_change.toFixed(2)} pp</strong></span>
            <span>Vol <strong className="text-[#16324A] font-bold">{event.volume_multiplier > 1 ? `${event.volume_multiplier}×` : 'Avg'}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <SeverityBadge severity={event.severity} score={event.score} />
            <ChevronRight className="w-4 h-4 text-[#1677C8]" />
          </div>
        </div>
      </div>
    </div>
  );
};

