import React from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, Clock } from 'lucide-react';
import { AttentionSummary } from '../types';

interface AttentionSummaryBannerProps {
  summary: AttentionSummary;
  benchmarkSymbol: string;
  benchmarkChangePct: number;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
  simulationId?: string;
  scenarioLabel?: string;
}

export const AttentionSummaryBanner: React.FC<AttentionSummaryBannerProps> = ({
  summary,
  onAcknowledge,
  isAcknowledging,
  simulationId,
  scenarioLabel,
}) => {
  const deservingCount = summary.high_attention_count + summary.meaningful_count + summary.watch_count;

  // First-time: no stocks watched
  if (summary.total_watched === 0) {
    return (
      <div className="bg-white border-b border-[#E8EFF6] px-6 py-10 w-full text-center">
        <ShieldCheck className="w-10 h-10 text-[#1677C8] mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-[#16324A] mb-2">Welcome to Meanwhile</h1>
        <p className="text-sm text-[#637789] max-w-md mx-auto leading-relaxed">
          Add stocks to a watchlist to start tracking material market changes.
          Your first check establishes your baseline.
        </p>
      </div>
    );
  }

  // Caught up state
  if (!summary.has_material_changes) {
    return (
      <div className="bg-white border-b border-[#E8EFF6] py-8 w-full">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#168A5B]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#168A5B]">You're caught up</span>
            </div>
            <h1 className="text-3xl font-bold text-[#16324A] tracking-tight">No unseen material changes</h1>
            <p className="text-sm text-[#637789] mt-2">
              Last checked <strong>just now</strong> · <strong>{summary.total_watched}</strong> stocks monitored
            </p>
            <p className="text-sm text-[#637789] mt-0.5">
              Run a new simulation to see what the engine would surface in different market conditions.
            </p>
          </div>
          <div className="shrink-0 text-center bg-[#F0FAF5] border border-[#C6EAD8] rounded-xl px-5 py-4">
            <p className="text-xs font-bold text-[#168A5B] uppercase tracking-wider mb-0.5">Baseline Updated</p>
            <p className="text-lg font-bold text-[#16324A]">✓ {summary.total_watched} stocks synced</p>
          </div>
        </div>
      </div>
    );
  }

  // Active feed state
  return (
    <div className="bg-white border-b border-[#E8EFF6] py-7 w-full">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">

        {/* Top row: since-last-check label + mark as seen */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-[#637789]">
            <Clock className="w-4 h-4 text-[#1677C8]" />
            <span className="text-sm font-medium">
              While you were away ·{' '}
              <span className="font-bold text-[#16324A]">{summary.elapsed_time_formatted}</span>
            </span>
            {simulationId && (
              <span className="ml-2 text-xs font-bold bg-[#EEF4FD] text-[#1677C8] border border-[#CBD9EF] px-2 py-0.5 rounded-full">
                {simulationId} · {scenarioLabel}
              </span>
            )}
          </div>

          <button
            id="btn-mark-seen"
            onClick={onAcknowledge}
            disabled={isAcknowledging}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F0FAF5] border border-[#C6EAD8] text-[#168A5B] font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
          >
            {isAcknowledging
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />
            }
            Mark as Seen
          </button>
        </div>

        {/* Hero heading */}
        <h1 className="text-3xl sm:text-4xl font-bold text-[#16324A] tracking-tight leading-tight mb-2">
          {deservingCount === 0
            ? 'Nothing material while you were away'
            : deservingCount === 1
              ? '1 change deserves your attention'
              : `${deservingCount} changes deserve your attention`
          }
        </h1>

        {/* Session summary — tree style */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm">
          <span className="text-[#637789]">
            <strong className="text-[#16324A]">{summary.total_watched}</strong> stocks monitored
          </span>
          <span className="text-[#DDE5EE]">|</span>
          {summary.high_attention_count > 0 && (
            <span className="font-semibold text-[#D64545]">
              {summary.high_attention_count} high attention
            </span>
          )}
          {summary.meaningful_count + summary.watch_count > 0 && (
            <span className="font-semibold text-[#B7791F]">
              {summary.meaningful_count + summary.watch_count} worth watching
            </span>
          )}
          {summary.normal_count > 0 && (
            <span className="text-[#637789]">
              {summary.normal_count} normal
            </span>
          )}
        </div>

        {/* Market Story */}
        {summary.market_story && (
          <div className="mt-4 pt-4 border-t border-[#EEF2F7]">
            <p className="text-xs font-bold uppercase tracking-widest text-[#637789] mb-1">Market Story</p>
            <p className="text-sm text-[#16324A] font-medium leading-relaxed">{summary.market_story}</p>
          </div>
        )}
      </div>
    </div>
  );
};
