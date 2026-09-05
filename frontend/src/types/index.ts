export type DataQuality = 'FRESH' | 'DELAYED' | 'STALE' | 'CONFLICTING';

export type SeverityLevel = 'NORMAL' | 'WATCH' | 'MEANINGFUL' | 'HIGH_ATTENTION';

export type ConfidenceLevel = 'HIGH' | 'REDUCED' | 'LOW' | 'SUPPRESSED';

export type SimulationScenario =
  | 'NORMAL'
  | 'STOCK_BREAKOUT'
  | 'VOLUME_SHOCK'
  | 'BROAD_RALLY'
  | 'SECTOR_ROTATION'
  | 'STALE_DATA'
  | 'CONFLICTING_DATA'
  | 'MIXED_MARKET';

export interface ScoreBreakdown {
  price_score: number;
  volume_score: number;
  market_relative_score: number;
  volatility_score: number;
  event_score: number;
  data_quality_penalty: number;
  total_score: number;
}

export interface PriceTimelinePoint {
  time: string;
  price: number;
}

export interface MarketRegime {
  benchmark_symbol: string;
  benchmark_change_pct: number;
  advancing_pct: number;
  advancing_count: number;
  declining_count: number;
  volatility_regime: string;
  regime_label: string;
}

export interface ChangeEvent {
  id?: number;
  symbol: string;
  watchlist_id?: number;
  detected_at: string;
  previous_price: number;
  current_price: number;
  price_change_percent: number;
  volume_change_percent: number;
  volume_multiplier: number;
  market_relative_change: number;
  market_outperformance_label: string;
  score: number;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  reasons: string[];
  score_breakdown: ScoreBreakdown;
  data_quality: DataQuality;
  timeline: PriceTimelinePoint[];
  is_within_attention_budget: boolean;
}

export interface AttentionSummary {
  total_watched: number;
  high_attention_count: number;
  meaningful_count: number;
  watch_count: number;
  normal_count: number;
  last_checked_at?: string;
  elapsed_time_formatted: string;
  has_material_changes: boolean;
  attention_budget: number;
  market_story?: string;
}

export interface SinceLastCheckResponse {
  summary: AttentionSummary;
  market_regime: MarketRegime;
  top_events: ChangeEvent[];
  other_events: ChangeEvent[];
  events: ChangeEvent[];
  benchmark_symbol: string;
  benchmark_change_pct: number;
}

export interface TwinComparisonRow {
  symbol: string;
  company_name: string;
  sector: string;
  baseline_price: number;
  current_price: number;
  price_change_percent: number;
  severity: SeverityLevel;
  volume_multiplier: number;
  data_quality: DataQuality;
  confidence: ConfidenceLevel;
  score: number;
}

export interface SimulationFeedResponse extends SinceLastCheckResponse {
  simulation_id: string;
  scenario_type: SimulationScenario;
  scenario_label: string;
  scenario_description: string;
  scenario_number: number;
  twin_comparison: TwinComparisonRow[];
}

export interface MarketSnapshot {
  id?: number;
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  avg_volume_20d: number;
  volatility_30d: number;
  benchmark_symbol?: string;
  benchmark_price_change_pct?: number;
  timestamp: string;
  source: string;
  data_quality: DataQuality;
  timeline: PriceTimelinePoint[];
}

export interface WatchlistItem {
  id: number;
  watchlist_id: number;
  symbol: string;
  added_at: string;
  last_seen_at: string;
  latest_snapshot?: MarketSnapshot;
}

export interface Watchlist {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  items: WatchlistItem[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface EvaluationMetrics {
  engine_version: string;
  scenarios_tested: number;
  total_stocks_evaluated: number;
  total_raw_movements: number;
  total_surfaced: number;
  noise_reduction_pct: number;
  true_positives: number;
  false_positives: number;
  broad_market_false_positives: number;
  precision_pct: number;
  stale_suppressed_correctly: number;
  stale_suppressed_total: number;
  stale_suppression_rate_pct: number;
  conflict_suppressed_correctly: number;
  conflict_suppressed_total: number;
  conflict_suppression_rate_pct: number;
  methodology: string;
  per_scenario: Array<{
    scenario: string;
    label: string;
    stocks_evaluated: number;
    surfaced: number;
    expected_high: string[];
    surfaced_symbols: string[];
    true_positives: number;
    false_positives: number;
  }>;
}
