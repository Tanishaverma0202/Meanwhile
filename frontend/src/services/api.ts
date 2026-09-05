import axios from 'axios';
import { SinceLastCheckResponse, Watchlist, ChangeEvent, SimulationFeedResponse, EvaluationMetrics } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('meanwhile_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  demoLogin: async () => {
    const res = await client.post('/auth/demo-login');
    if (res.data.access_token) {
      localStorage.setItem('meanwhile_token', res.data.access_token);
    }
    return res.data;
  },

  // ── Twin Simulation ──────────────────────────────────────────────────────
  /** Advance to the next scenario and return a full simulation feed. */
  newSimulation: async (): Promise<SimulationFeedResponse> => {
    const res = await client.post('/simulation/new');
    return res.data;
  },

  /** Return the current simulation feed without advancing state. */
  getCurrentSimulation: async (): Promise<SimulationFeedResponse> => {
    const res = await client.get('/simulation/current');
    return res.data;
  },

  /** Jump directly to a named scenario. */
  setSimulationScenario: async (scenario: string): Promise<SimulationFeedResponse> => {
    const res = await client.post('/simulation/set-scenario', { scenario });
    return res.data;
  },

  /** Mark as seen — updates the stateful baseline to current prices. */
  acknowledgeSimulation: async (): Promise<SimulationFeedResponse> => {
    const res = await client.post('/simulation/acknowledge');
    return res.data;
  },

  /** Fetch the evaluation metrics (100-run noise reduction stats). */
  getEvaluationMetrics: async (): Promise<EvaluationMetrics> => {
    const res = await client.get('/simulation/evaluation');
    return res.data;
  },

  // ── Attention Engine (legacy — kept for Watchlist tab) ───────────────────
  getSinceLastCheck: async (watchlistId?: number): Promise<SinceLastCheckResponse> => {
    const params = watchlistId ? { watchlist_id: watchlistId } : {};
    const res = await client.get('/attention/since-last-check', { params });
    return res.data;
  },

  acknowledgeSeen: async (watchlistId?: number) => {
    const params = watchlistId ? { watchlist_id: watchlistId } : {};
    const res = await client.post('/attention/acknowledge-seen', null, { params });
    return res.data;
  },

  getWhyBreakdown: async (symbol: string): Promise<ChangeEvent> => {
    const res = await client.get(`/attention/why/${symbol}`);
    return res.data;
  },

  // ── Watchlists ────────────────────────────────────────────────────────────
  getWatchlists: async (): Promise<Watchlist[]> => {
    const res = await client.get('/watchlists');
    return res.data;
  },

  createWatchlist: async (name: string): Promise<Watchlist> => {
    const res = await client.post('/watchlists', { name });
    return res.data;
  },

  deleteWatchlist: async (id: number) => {
    await client.delete(`/watchlists/${id}`);
  },

  addStockToWatchlist: async (watchlistId: number, symbol: string) => {
    const res = await client.post(`/watchlists/${watchlistId}/items`, { symbol });
    return res.data;
  },

  removeStockFromWatchlist: async (watchlistId: number, symbol: string) => {
    await client.delete(`/watchlists/${watchlistId}/items/${symbol}`);
  },
};
