import React from 'react';
import { TrendingUp, BarChart2, Shield } from 'lucide-react';
import { MarketRegime } from '../types';

interface MarketRegimeBarProps {
  regime: MarketRegime;
}

export const MarketRegimeBar: React.FC<MarketRegimeBarProps> = ({ regime }) => {
  const isUp = regime.benchmark_change_pct >= 0;

  return (
    <div className="bg-[#F1F7FC] border-b border-[#D8E7F2] w-full">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-[#64788A] text-xs sm:text-sm">

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-extrabold text-[#17324D] uppercase text-xs tracking-wider">
              MARKET TODAY
            </span>

            {/* Benchmark */}
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1 rounded-md border border-[#D8E7F2] shadow-2xs">
              <span className="font-bold text-[#17324D]">{regime.benchmark_symbol}</span>
              <span className={`font-extrabold ${isUp ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                {isUp ? '+' : ''}{regime.benchmark_change_pct.toFixed(2)}%
              </span>
            </div>

            {/* Market Breadth — hidden on xs */}
            <div className="hidden sm:flex items-center space-x-2 bg-white px-3 py-1 rounded-md border border-[#D8E7F2] shadow-2xs">
              <BarChart2 className="w-4 h-4 text-[#1677C8]" />
              <span>
                <strong className="text-[#17324D] font-bold">{regime.advancing_pct}% advancing</strong>
                &nbsp;({regime.advancing_count} up / {regime.declining_count} down)
              </span>
            </div>

            {/* Volatility — hidden on xs */}
            <div className="hidden md:flex items-center space-x-2 bg-white px-3 py-1 rounded-md border border-[#D8E8F2] shadow-2xs">
              <Shield className="w-4 h-4 text-[#168A5B]" />
              <span>Volatility: <strong className="text-[#17324D] font-bold">{regime.volatility_regime}</strong></span>
            </div>
          </div>

          {/* Regime label */}
          <div className="font-bold text-[#1677C8] bg-[#E8F3FB] px-3.5 py-1 rounded-md border border-[#D8E7F2] text-xs whitespace-nowrap">
            ● {regime.regime_label}
          </div>

        </div>
      </div>
    </div>
  );
};
