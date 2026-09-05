import React, { useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp, Zap, TrendingUp, Clock, AlertTriangle, Shuffle, BarChart2, GitBranch, Sliders } from 'lucide-react';
import { SimulationScenario, SimulationFeedResponse } from '../types';
import { api } from '../services/api';

interface MarketSimulatorBarProps {
  simulationData: SimulationFeedResponse | null;
  onSimulationUpdate: (data: SimulationFeedResponse) => void;
  isLoading: boolean;
}

const SCENARIOS: Array<{
  id: SimulationScenario;
  label: string;
  icon: any;
}> = [
  { id: 'NORMAL',           label: 'Normal Market',     icon: Sliders       },
  { id: 'STOCK_BREAKOUT',   label: 'Stock Breakout',    icon: TrendingUp    },
  { id: 'VOLUME_SHOCK',     label: 'Volume Shock',      icon: Zap           },
  { id: 'BROAD_RALLY',      label: 'Broad Rally',       icon: BarChart2     },
  { id: 'SECTOR_ROTATION',  label: 'Sector Rotation',   icon: GitBranch     },
  { id: 'STALE_DATA',       label: 'Stale Data Feed',   icon: Clock         },
  { id: 'CONFLICTING_DATA', label: 'Conflicting Feeds', icon: AlertTriangle },
  { id: 'MIXED_MARKET',     label: 'Mixed Market',      icon: Shuffle       },
];

export const MarketSimulatorBar: React.FC<MarketSimulatorBarProps> = ({
  simulationData,
  onSimulationUpdate,
  isLoading,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isLoading_, setIsLoading_] = useState(false);

  const busy = isLoading_ || isLoading;

  const handleNewSimulation = async () => {
    setIsLoading_(true);
    try {
      const data = await api.newSimulation();
      onSimulationUpdate(data);
      setExpanded(false);
    } catch (e) {
      console.error('Failed to advance simulation', e);
    } finally {
      setIsLoading_(false);
    }
  };

  const handleSelectScenario = async (scenario: SimulationScenario) => {
    setIsLoading_(true);
    try {
      const data = await api.setSimulationScenario(scenario);
      onSimulationUpdate(data);
      setExpanded(false);
    } catch (e) {
      console.error('Failed to set scenario', e);
    } finally {
      setIsLoading_(false);
    }
  };

  const activeScenario = simulationData?.scenario_type ?? 'NORMAL';

  return (
    <div className="bg-[#F8FAFB] border-b border-[#E8EFF6] w-full">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">

        {/* ── Compact bar ── */}
        <div className="flex items-center justify-between gap-3 py-2">

          {/* Left: minimal status line */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[10px] font-semibold text-[#8BAFC7] uppercase tracking-widest shrink-0">
              Demo
            </span>
            <span className="text-[#DDE5EE] shrink-0">·</span>
            <span className="text-xs font-medium text-[#637789] truncate">
              {simulationData?.scenario_label ?? 'Normal Market'}
            </span>
          </div>

          {/* Right: minimal controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-new-simulation"
              onClick={handleNewSimulation}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all border border-[#D7E6F2] bg-white text-[#16324A] hover:bg-[#EAF4FC] hover:border-[#9DB3C5] disabled:opacity-40"
            >
              <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${busy ? 'animate-spin' : ''}`} />
              New Simulation
            </button>

            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-[#8BAFC7] border border-transparent hover:border-[#D7E6F2] hover:text-[#637789] transition-all"
            >
              Choose scenario
              {expanded
                ? <ChevronUp className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />
              }
            </button>
          </div>
        </div>

        {/* ── Scenario picker (collapsed by default) ── */}
        {expanded && (
          <div className="pb-3 border-t border-[#EEF2F7] pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8BAFC7] mb-2">
              Market condition
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map(sc => {
                const Icon = sc.icon;
                const isActive = activeScenario === sc.id;
                return (
                  <button
                    key={sc.id}
                    disabled={busy}
                    onClick={() => handleSelectScenario(sc.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 ${
                      isActive
                        ? 'bg-[#16324A] text-white border-[#16324A]'
                        : 'bg-white text-[#637789] border-[#D7E6F2] hover:border-[#9DB3C5] hover:text-[#16324A]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
