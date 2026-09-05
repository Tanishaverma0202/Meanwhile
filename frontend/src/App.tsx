import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { MarketSimulatorBar } from './components/MarketSimulatorBar';
import { MarketRegimeBar } from './components/MarketRegimeBar';
import { AttentionSummaryBanner } from './components/AttentionSummaryBanner';
import { AttentionFunnel } from './components/AttentionFunnel';
import { AttentionRow } from './components/AttentionRow';
import { StockDetailDrawer } from './components/StockDetailDrawer';
import { WatchlistManager } from './components/WatchlistManager';
import { ArchitectureTab } from './components/ArchitectureTab';
import { TwinComparisonTable } from './components/TwinComparisonTable';
import { SimulationFeedResponse, Watchlist, ChangeEvent } from './types';
import { api } from './services/api';
import { RefreshCw, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'feed' | 'watchlists' | 'architecture'>('feed');

  // ── Simulation state (primary feed source) ──────────────────────────────
  const [simData, setSimData] = useState<SimulationFeedResponse | null>(null);
  const [simLoading, setSimLoading] = useState(true);
  const [simError, setSimError] = useState<string | null>(null);

  // ── Watchlist state (secondary tab) ─────────────────────────────────────
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedEvent, setSelectedEvent] = useState<ChangeEvent | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [showOtherEvents, setShowOtherEvents] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Bootstrap ────────────────────────────────────────────────────────────
  const bootstrap = useCallback(async () => {
    setSimLoading(true);
    setSimError(null);
    try {
      await api.demoLogin();
      const [simRes, wlRes] = await Promise.all([
        api.getCurrentSimulation(),
        api.getWatchlists(),
      ]);
      setSimData(simRes);
      setWatchlists(wlRes);
    } catch (err) {
      setSimError('Market data is temporarily unavailable. Please check the backend server.');
    } finally {
      setSimLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // ── Simulation update callback (passed to simulator bar) ─────────────────
  const handleSimulationUpdate = useCallback((data: SimulationFeedResponse) => {
    setSimData(data);
    setFilterSeverity('ALL');
    setShowOtherEvents(false);
    showToast(`${data.simulation_id} · ${data.scenario_label}`);
  }, []);

  // ── Acknowledge (stateful — updates baseline to current prices) ────────────────────
  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      const fresh = await api.acknowledgeSimulation();
      setSimData(fresh);
      showToast('You\'re caught up! Baseline updated to current prices.');
    } catch {
      setSimError('Failed to mark items as seen. Please try again.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  // ── Filtered events ──────────────────────────────────────────────────────
  const getFilteredTopEvents = () => {
    if (!simData) return [];
    const events = simData.top_events?.length > 0 ? simData.top_events : simData.events;
    if (filterSeverity === 'ALL')            return events;
    if (filterSeverity === 'HIGH_ATTENTION') return events.filter(e => e.severity === 'HIGH_ATTENTION');
    if (filterSeverity === 'MEANINGFUL')     return events.filter(e => e.severity === 'HIGH_ATTENTION' || e.severity === 'MEANINGFUL');
    if (filterSeverity === 'WATCH')          return events.filter(e => e.severity !== 'NORMAL');
    return events;
  };

  const topEvents   = getFilteredTopEvents();
  const otherEvents = simData?.other_events || [];

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] text-[#17324D] flex flex-col font-sans overflow-x-hidden">

      {/* ── Sticky Header ── */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ── Market Regime Bar ── */}
      {simData?.market_regime && activeTab === 'feed' && (
        <MarketRegimeBar regime={simData.market_regime} />
      )}

      {/* ── Simulation Control Bar ── */}
      <MarketSimulatorBar
        simulationData={simData}
        onSimulationUpdate={handleSimulationUpdate}
        isLoading={simLoading}
      />

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 flex items-center space-x-2 bg-white border border-[#D8E7F2] shadow-md rounded-lg px-4 py-3 text-xs font-semibold text-[#17324D] max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-[#168A5B] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8">

        {/* Error banner */}
        {simError && (
          <div className="mb-5 flex items-start space-x-2 bg-[#FDF2F2] border border-[#F8D7D7] rounded-lg p-4 text-xs text-[#D64545]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{simError}</span>
          </div>
        )}

        {/* Loading state */}
        {simLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <RefreshCw className="w-7 h-7 text-[#1677C8] animate-spin" />
            <p className="text-sm font-semibold text-[#64788A] text-center">
              Running simulation pipeline — generating snapshots, scoring, ranking…
            </p>
          </div>
        ) : (
          <>
            {/* ══ ATTENTION FEED ══ */}
            {activeTab === 'feed' && (
              <div className="space-y-4 sm:space-y-5 w-full">

                {/* Attention Funnel */}
                {simData && simData.summary.total_watched > 0 && (
                  <AttentionFunnel data={simData} />
                )}

                {/* Summary Banner */}
                {simData && (
                  <AttentionSummaryBanner
                    summary={simData.summary}
                    benchmarkSymbol={simData.benchmark_symbol}
                    benchmarkChangePct={simData.benchmark_change_pct}
                    onAcknowledge={handleAcknowledge}
                    isAcknowledging={isAcknowledging}
                    simulationId={simData.simulation_id}
                    scenarioLabel={simData.scenario_label}
                  />
                )}

                {/* No material change zero-state */}
                {simData && !simData.summary.has_material_changes && (
                  <div className="bg-white border border-[#D8E7F2] rounded-xl p-8 sm:p-12 text-center shadow-sm w-full">
                    <CheckCircle2 className="w-8 h-8 text-[#168A5B] mx-auto mb-3" />
                    <h3 className="text-base font-extrabold text-[#17324D] mb-1">
                      You're mostly caught up
                    </h3>
                    <p className="text-xs text-[#64788A] max-w-md mx-auto leading-relaxed">
                      {simData.summary.total_watched} stocks checked under <strong>{simData.scenario_label}</strong>.
                      All moved within their normal daily range.
                      Meanwhile is designed to reduce noise — this is the system working correctly.
                    </p>
                    <p className="text-xs text-[#9DB3C5] mt-3">
                      Click <strong>New Simulation</strong> to see a different market state.
                    </p>
                  </div>
                )}

                {/* Filter toolbar */}
                {simData?.summary.has_material_changes && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 w-full">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xs sm:text-sm font-extrabold text-[#16324A] uppercase tracking-wider">
                        {topEvents.length} {topEvents.length === 1 ? 'change deserves' : 'changes deserve'} your attention
                      </span>
                      <span className="text-xs font-bold text-[#1677C8] bg-[#EAF4FC] px-2.5 py-1 rounded-md border border-[#D7E6F2]">
                        Attention budget: {topEvents.length} / 5
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm bg-white border border-[#D8E7F2] rounded-lg p-1 overflow-x-auto max-w-full">
                      {(['ALL', 'HIGH_ATTENTION', 'MEANINGFUL', 'WATCH'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setFilterSeverity(f)}
                          className={`px-3.5 py-1 rounded-md font-bold whitespace-nowrap transition-all ${
                            filterSeverity === f
                              ? 'bg-[#1677C8] text-white shadow-2xs'
                              : 'text-[#64788A] hover:text-[#17324D]'
                          }`}
                        >
                          {f === 'ALL' ? 'All' :
                           f === 'HIGH_ATTENTION' ? 'High Attention' :
                           f === 'MEANINGFUL' ? 'Meaningful+' : 'Watch+'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attention rows */}
                {topEvents.length > 0 ? (
                  <div className="space-y-2.5 sm:space-y-3 w-full">
                    {topEvents.map((event, idx) => (
                      <AttentionRow
                        key={`top-${event.symbol}-${idx}`}
                        event={event}
                        onOpenDetails={e => setSelectedEvent(e)}
                      />
                    ))}
                  </div>
                ) : simData?.summary.has_material_changes ? (
                  <div className="bg-white border border-[#D8E7F2] rounded-xl p-10 text-center text-sm text-[#64788A]">
                    No changes match this filter. Select "All" to view the full feed.
                  </div>
                ) : null}

                {/* Twin Comparison Table */}
                {simData?.twin_comparison && simData.twin_comparison.length > 0 && (
                  <TwinComparisonTable
                    rows={simData.twin_comparison}
                    scenarioLabel={simData.scenario_label}
                  />
                )}

                {/* Other watched stocks — with checklist */}
                {otherEvents.length > 0 && filterSeverity === 'ALL' && (
                  <div className="mt-2 w-full">
                    <button
                      onClick={() => setShowOtherEvents(v => !v)}
                      className="flex items-center justify-between w-full text-xs sm:text-sm font-semibold text-[#637789] hover:text-[#16324A] border border-[#D7E6F2] rounded-xl px-5 py-3 bg-white transition-all"
                    >
                      <span>
                        <strong>{otherEvents.length}</strong> {otherEvents.length === 1 ? 'stock' : 'stocks'} moved within normal range
                        <span className="font-normal"> — filtered as noise</span>
                      </span>
                      {showOtherEvents ? <ChevronUp className="w-4 h-4 text-[#1677C8]" /> : <ChevronDown className="w-4 h-4 text-[#1677C8]" />}
                    </button>
                    {showOtherEvents && (
                      <div className="mt-2 space-y-2">
                        {otherEvents.map((event, idx) => {
                          const isUp = event.price_change_percent >= 0;
                          const isConflict = event.data_quality === 'CONFLICTING';
                          const isStale = event.data_quality === 'STALE';
                          return (
                            <div
                              key={`other-${event.symbol}-${idx}`}
                              className="bg-white border border-[#EEF2F7] rounded-xl px-4 py-3.5 cursor-pointer hover:border-[#CBD9EF] transition-all"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-bold text-[#16324A] text-sm">{event.symbol}</span>
                                  <span className={`text-sm font-semibold ${isUp ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                                    {isUp ? '+' : ''}{event.price_change_percent.toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[#8BAFC7] font-mono">
                                    Score: {event.score}/100
                                  </span>
                                  {isConflict && (
                                    <span className="text-[10px] font-bold bg-[#FDF2F2] text-[#D64545] border border-[#F8D7D7] px-1.5 py-0.5 rounded">SUPPRESSED</span>
                                  )}
                                  {isStale && (
                                    <span className="text-[10px] font-bold bg-[#FEF9EC] text-[#B7791F] border border-[#FBEAC9] px-1.5 py-0.5 rounded">STALE</span>
                                  )}
                                </div>
                              </div>

                              {/* Why not surfaced — checklist */}
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                {[
                                  {
                                    check: Math.abs(event.price_change_percent) <= 2.0,
                                    label: `Within expected range (${Math.abs(event.price_change_percent).toFixed(1)}%)`,
                                  },
                                  {
                                    check: event.volume_multiplier <= 1.5,
                                    label: `Volume normal (${event.volume_multiplier.toFixed(1)}×)`,
                                  },
                                  {
                                    check: Math.abs(event.market_relative_change) <= 1.0,
                                    label: `Tracks market (${event.market_relative_change >= 0 ? '+' : ''}${event.market_relative_change.toFixed(1)} pp)`,
                                  },
                                  {
                                    check: !isStale && !isConflict,
                                    label: isConflict ? 'Conflicting data — suppressed'
                                         : isStale   ? 'Stale data — confidence reduced'
                                         : 'Fresh data',
                                  },
                                ].map(({ check, label }) => (
                                  <div key={label} className={`flex items-center gap-1.5 text-[11px] ${check ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                                    <span className="font-bold shrink-0">{check ? '✓' : '✗'}</span>
                                    <span>{label}</span>
                                  </div>
                                ))}
                              </div>

                              <p className="text-[10px] text-[#8BAFC7] mt-2.5">
                                Not surfaced — click to see full analysis
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ WATCHLISTS ══ */}
            {activeTab === 'watchlists' && (
              <WatchlistManager watchlists={watchlists} onUpdate={bootstrap} />
            )}

            {/* ══ ARCHITECTURE ══ */}
            {activeTab === 'architecture' && (
              <ArchitectureTab
                onTriggerScenario={async (scenario) => {
                  try {
                    const data = await api.setSimulationScenario(scenario);
                    setSimData(data);
                    setActiveTab('feed');
                    showToast(`${data.simulation_id} · ${data.scenario_label}`);
                  } catch (e) {
                    console.error('Scenario trigger error', e);
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Stock Detail Drawer */}
      <StockDetailDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-[#D8E7F2] py-5 mt-10 w-full">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-[#64788A]">
          <div>
            <span className="font-bold text-[#17324D]">Meanwhile</span> — Know what changed while you were away
          </div>
          <div className="text-center sm:text-right font-medium">
            Institutional Market Intelligence
          </div>
        </div>
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 mt-1.5">
          <p className="text-xs text-[#94A3B8] text-center sm:text-left">
            Meanwhile highlights market changes; it does not provide investment advice.
          </p>
        </div>
      </footer>

    </div>
  );
};
