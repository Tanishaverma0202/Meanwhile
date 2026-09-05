import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, Clock } from 'lucide-react';
import { TwinComparisonRow, SeverityLevel, DataQuality } from '../types';

interface TwinComparisonTableProps {
  rows: TwinComparisonRow[];
  scenarioLabel: string;
}

const severityConfig: Record<SeverityLevel, { label: string; bg: string; text: string; dot: string }> = {
  HIGH_ATTENTION: { label: 'High Attention', bg: 'bg-[#FFF0F0]', text: 'text-[#D64545]', dot: 'bg-[#D64545]' },
  MEANINGFUL:     { label: 'Meaningful',     bg: 'bg-[#FFF8E6]', text: 'text-[#C47A15]', dot: 'bg-[#C47A15]' },
  WATCH:          { label: 'Watch',          bg: 'bg-[#EAF4FC]', text: 'text-[#1677C8]', dot: 'bg-[#1677C8]' },
  NORMAL:         { label: 'Normal',         bg: 'bg-[#F7FAFC]', text: 'text-[#637789]', dot: 'bg-[#C8D9E6]' },
};

const DataQualityBadge: React.FC<{ quality: DataQuality }> = ({ quality }) => {
  if (quality === 'FRESH') return null;
  if (quality === 'STALE') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C47A15] bg-[#FFF8E6] border border-[#F0D898] px-1.5 py-0.5 rounded">
      <Clock className="w-2.5 h-2.5" /> STALE
    </span>
  );
  if (quality === 'CONFLICTING') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D64545] bg-[#FFF0F0] border border-[#F8C8C8] px-1.5 py-0.5 rounded">
      <AlertTriangle className="w-2.5 h-2.5" /> CONFLICT
    </span>
  );
  return null;
};

export const TwinComparisonTable: React.FC<TwinComparisonTableProps> = ({
  rows,
  scenarioLabel,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border border-[#D8E7F2] rounded-xl shadow-sm overflow-hidden w-full">
      {/* Header toggle */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7FAFC] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#9DB3C5]">Twin Comparison</span>
            <span className="text-sm font-bold text-[#16324A] mt-0.5">
              Same watchlist — 15 stocks — under <span className="text-[#1677C8]">{scenarioLabel}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#637789] font-medium">
            {isExpanded ? 'Hide' : 'Show all stocks'}
          </span>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-[#1677C8]" />
            : <ChevronDown className="w-4 h-4 text-[#1677C8]" />}
        </div>
      </button>

      {/* Comparison table */}
      {isExpanded && (
        <div className="border-t border-[#EAF4FC]">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-5 py-2.5 bg-[#F7FAFC] border-b border-[#EAF4FC]">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9DB3C5]">Stock</span>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9DB3C5] text-right w-20">Baseline</span>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9DB3C5] text-right w-20">Current</span>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9DB3C5] text-right w-16">Change</span>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9DB3C5] text-right w-28">Attention</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#F0F6FC]">
            {rows.map((row) => {
              const cfg = severityConfig[row.severity];
              const isUp = row.price_change_percent >= 0;
              const Icon = row.price_change_percent > 0.05
                ? ArrowUpRight
                : row.price_change_percent < -0.05
                ? ArrowDownRight
                : Minus;
              const changeColor = row.price_change_percent > 0.05
                ? 'text-[#168A5B]'
                : row.price_change_percent < -0.05
                ? 'text-[#D64545]'
                : 'text-[#637789]';

              return (
                <div
                  key={row.symbol}
                  className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-5 py-3 hover:bg-[#F7FAFC] transition-colors ${
                    row.severity === 'HIGH_ATTENTION' ? 'bg-[#FEFAFA]' :
                    row.severity === 'MEANINGFUL'     ? 'bg-[#FFFDF5]' : ''
                  }`}
                >
                  {/* Stock info */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-[#16324A]">{row.symbol}</span>
                      <span className="text-[10px] font-semibold text-[#9DB3C5] bg-[#F0F6FC] px-1.5 py-0.5 rounded">
                        {row.sector}
                      </span>
                      <DataQualityBadge quality={row.data_quality} />
                    </div>
                    <span className="text-xs text-[#637789] truncate mt-0.5">{row.company_name}</span>
                  </div>

                  {/* Baseline price */}
                  <span className="text-xs font-mono text-[#637789] text-right w-20">
                    ₹{row.baseline_price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>

                  {/* Current price */}
                  <span className="text-xs font-mono font-bold text-[#16324A] text-right w-20">
                    ₹{row.current_price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>

                  {/* Change % */}
                  <div className={`flex items-center justify-end gap-0.5 w-16 ${changeColor}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-bold">
                      {row.price_change_percent >= 0 ? '+' : ''}{row.price_change_percent.toFixed(2)}%
                    </span>
                  </div>

                  {/* Severity badge */}
                  <div className="flex items-center justify-end w-28">
                    {row.data_quality === 'CONFLICTING' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#D64545] bg-[#FFF0F0] border border-[#F8C8C8] px-2 py-1 rounded-md">
                        Suppressed
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                        {cfg.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer legend */}
          <div className="px-5 py-3 bg-[#F7FAFC] border-t border-[#EAF4FC] flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9DB3C5]">Baseline: last check · Current: this scenario</span>
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              {Object.entries(severityConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-[10px] font-semibold text-[#637789]">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
