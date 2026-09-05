import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, PlusSquare, AlertCircle, ArrowUpDown, Search } from 'lucide-react';
import { Watchlist, ChangeEvent } from '../types';
import { api } from '../services/api';

interface WatchlistManagerProps {
  watchlists: Watchlist[];
  onUpdate: () => void;
}

const QUICK_ADD_SYMBOLS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'TATAMOTORS', 'WIPRO', 'AXISBANK', 'SBIN', 'BAJFINANCE',
  'KOTAKBANK', 'LT', 'TITAN', 'SUNPHARMA', 'MARUTI',
  'BHARTIARTL', 'ASIANPAINT', 'ULTRACEMCO', 'TATASTEEL', 'NTPC',
  'HAL', 'NESTLEIND', 'DLF', 'ADANIENT', 'BEL',
  'JIOFIN', 'ZOMATO', 'POWERGRID', 'COALINDIA', 'TRENT'
];

type SortField = 'symbol' | 'price' | 'change' | 'score';
type SortOrder = 'asc' | 'desc';

export const WatchlistManager: React.FC<WatchlistManagerProps> = ({ watchlists, onUpdate }) => {
  const [newName, setNewName]       = useState('');
  const [newSymbol, setNewSymbol]   = useState('');
  const [activeWlId, setActiveWlId] = useState<number | null>(watchlists[0]?.id ?? null);
  const [isAdding, setIsAdding]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField]   = useState<SortField>('score');
  const [sortOrder, setSortOrder]   = useState<SortOrder>('desc');
  const [eventsMap, setEventsMap]   = useState<Record<string, ChangeEvent>>({});

  const activeWl = watchlists.find(w => w.id === activeWlId) ?? watchlists[0] ?? null;

  useEffect(() => {
    if (activeWl) {
      api.getSinceLastCheck(activeWl.id).then(res => {
        const map: Record<string, ChangeEvent> = {};
        res.events?.forEach(e => { map[e.symbol] = e; });
        setEventsMap(map);
      }).catch(() => {});
    }
  }, [activeWlId, watchlists]);

  const createWatchlist = async () => {
    if (!newName.trim()) return;
    setError(null);
    try {
      const wl = await api.createWatchlist(newName.trim());
      setNewName('');
      setActiveWlId(wl.id);
      onUpdate();
    } catch {
      setError('Failed to create watchlist.');
    }
  };

  const deleteWatchlist = async (id: number) => {
    setError(null);
    try {
      await api.deleteWatchlist(id);
      setActiveWlId(watchlists.find(w => w.id !== id)?.id ?? null);
      onUpdate();
    } catch {
      setError('Failed to delete watchlist.');
    }
  };

  const addSymbol = async (symbol: string) => {
    if (!activeWl) return;
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setIsAdding(true);
    setError(null);
    try {
      await api.addStockToWatchlist(activeWl.id, sym);
      setNewSymbol('');
      onUpdate();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not add symbol.');
    } finally {
      setIsAdding(false);
    }
  };

  const removeSymbol = async (wlId: number, symbol: string) => {
    setError(null);
    try {
      await api.removeStockFromWatchlist(wlId, symbol);
      onUpdate();
    } catch {
      setError('Could not remove symbol.');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const items = activeWl?.items || [];
  const filteredItems = items.filter(i => i.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

  const sortedItems = [...filteredItems].sort((a, b) => {
    const evA = eventsMap[a.symbol];
    const evB = eventsMap[b.symbol];
    let valA: any = 0;
    let valB: any = 0;

    if (sortField === 'symbol') { valA = a.symbol; valB = b.symbol; }
    else if (sortField === 'price') { valA = evA?.current_price ?? 0; valB = evB?.current_price ?? 0; }
    else if (sortField === 'change') { valA = evA?.price_change_percent ?? 0; valB = evB?.price_change_percent ?? 0; }
    else if (sortField === 'score') { valA = evA?.score ?? 0; valB = evB?.score ?? 0; }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="w-full space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#16324A]">Watchlists</h1>
        <p className="text-sm text-[#637789] mt-0.5">Manage stock symbols monitored by Meanwhile.</p>
      </div>

      {error && (
        <div className="flex items-start space-x-2 bg-[#FDF2F2] border border-[#F8D7D7] rounded-lg p-3.5 text-sm text-[#D64545]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-col md:flex-row gap-5 w-full">

        {/* LEFT: Watchlist list */}
        <div className="md:w-64 lg:w-72 shrink-0 space-y-3">
          <div className="bg-white border border-[#D7E6F2] rounded-xl p-4.5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#637789]">New Watchlist</div>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createWatchlist()}
                placeholder="e.g. Core Portfolio"
                className="flex-1 min-w-0 border border-[#D7E6F2] rounded-lg px-3.5 py-2 text-sm text-[#16324A] placeholder-[#637789]/60 focus:outline-none focus:ring-2 focus:ring-[#1677C8]/30 bg-[#F7FAFC]"
              />
              <button
                onClick={createWatchlist}
                disabled={!newName.trim()}
                className="flex items-center space-x-1 bg-[#1677C8] text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-40 transition-all hover:bg-[#125fa2] shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Create</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#D7E6F2] rounded-xl overflow-hidden shadow-2xs">
            {watchlists.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#637789]">No watchlists created yet.</div>
            ) : (
              watchlists.map(wl => (
                <button
                  key={wl.id}
                  onClick={() => setActiveWlId(wl.id)}
                  className={`w-full flex items-center justify-between px-4.5 py-3 text-sm font-semibold border-b border-[#F2F7FB] last:border-0 transition-all ${
                    wl.id === activeWlId
                      ? 'bg-[#EAF4FC] text-[#1677C8] font-bold'
                      : 'text-[#16324A] hover:bg-[#F7FAFC]'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="truncate">{wl.name}</span>
                    <span className="text-xs text-[#637789] shrink-0">({wl.items?.length ?? 0})</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteWatchlist(wl.id); }}
                    className="text-[#637789] hover:text-[#D64545] transition-colors shrink-0 ml-2"
                    aria-label="Delete watchlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Active watchlist content */}
        <div className="flex-1 min-w-0 space-y-4">
          {activeWl ? (
            <>
              {/* Add Stock & Search Toolbar */}
              <div className="bg-white border border-[#D7E6F2] rounded-xl p-4.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#637789]">
                    Add Stock to "{activeWl.name}"
                  </div>
                  {/* Search input */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-4 h-4 text-[#637789] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search stock..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-[#F7FAFC] border border-[#D7E6F2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1677C8]"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && addSymbol(newSymbol)}
                    placeholder="Symbol e.g. RELIANCE"
                    className="flex-1 min-w-0 border border-[#D7E6F2] rounded-lg px-3.5 py-2 text-xs sm:text-sm text-[#16324A] placeholder-[#637789]/60 focus:outline-none focus:ring-2 focus:ring-[#1677C8]/30 bg-[#F7FAFC] uppercase font-bold"
                  />
                  <button
                    onClick={() => addSymbol(newSymbol)}
                    disabled={isAdding || !newSymbol.trim()}
                    className="flex items-center space-x-1.5 bg-[#1677C8] text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-40 transition-all hover:bg-[#125fa2] shrink-0"
                  >
                    <PlusSquare className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Quick Add Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_ADD_SYMBOLS.filter(s =>
                    !activeWl.items?.some(i => i.symbol === s)
                  ).slice(0, 16).map(sym => (
                    <button
                      key={sym}
                      onClick={() => addSymbol(sym)}
                      disabled={isAdding}
                      className="px-3 py-1 text-xs font-semibold rounded-md border border-[#D7E6F2] bg-[#F7FAFC] text-[#16324A] hover:bg-[#EAF4FC] hover:text-[#1677C8] transition-all disabled:opacity-40"
                    >
                      + {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced Financial Data Table */}
              <div className="bg-white border border-[#D7E6F2] rounded-xl overflow-hidden shadow-2xs">
                {/* Table Header: Stock | Price | Today | Since Last Check | Attention | Action */}
                <div className="grid grid-cols-12 px-4.5 py-3 bg-[#F7FAFC] border-b border-[#D7E6F2] text-xs font-bold uppercase tracking-wider text-[#637789] items-center">
                  <div className="col-span-3 sm:col-span-2 flex items-center cursor-pointer select-none" onClick={() => handleSort('symbol')}>
                    <span>Stock</span>
                    <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-[#637789]" />
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right flex items-center justify-end cursor-pointer select-none" onClick={() => handleSort('price')}>
                    <span>Price</span>
                    <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-[#637789]" />
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right flex items-center justify-end cursor-pointer select-none" onClick={() => handleSort('change')}>
                    <span>Today</span>
                    <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-[#637789]" />
                  </div>
                  <div className="hidden sm:block sm:col-span-3 text-center">Since Last Check</div>
                  <div className="col-span-2 sm:col-span-2 text-center flex items-center justify-center cursor-pointer select-none" onClick={() => handleSort('score')}>
                    <span>Attention</span>
                    <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-[#637789]" />
                  </div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {/* Table Body */}
                {sortedItems.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#637789]">
                    {searchQuery ? 'No stocks match search query.' : 'No stocks added yet. Add a symbol above.'}
                  </div>
                ) : (
                  <div className="divide-y divide-[#F2F7FB]">
                    {sortedItems.map(item => {
                      const ev = eventsMap[item.symbol];
                      const isPos = (ev?.price_change_percent ?? 0) >= 0;
                      return (
                        <div
                          key={item.symbol}
                          className="grid grid-cols-12 px-4.5 py-3 items-center hover:bg-[#F7FAFC] transition-colors text-sm"
                        >
                          {/* Stock Symbol */}
                          <div className="col-span-3 sm:col-span-2">
                            <span className="font-extrabold text-[#16324A] text-base">{item.symbol}</span>
                            <span className="block text-xs text-[#637789]">{ev?.data_quality ?? 'FRESH'}</span>
                          </div>

                          {/* Price */}
                          <div className="col-span-3 sm:col-span-2 text-right font-bold text-[#16324A]">
                            {ev ? `₹${ev.current_price.toLocaleString('en-IN')}` : '—'}
                          </div>

                          {/* Today % */}
                          <div className={`col-span-3 sm:col-span-2 text-right font-extrabold ${isPos ? 'text-[#168A5B]' : 'text-[#D64545]'}`}>
                            {ev ? `${isPos ? '+' : ''}${ev.price_change_percent.toFixed(2)}%` : '—'}
                          </div>

                          {/* Since Last Check */}
                          <div className="hidden sm:block sm:col-span-3 text-center text-xs sm:text-sm text-[#637789]">
                            {ev ? (
                              <span>vs NIFTY <strong className="text-[#16324A] font-bold">{ev.market_relative_change >= 0 ? '+' : ''}{ev.market_relative_change.toFixed(2)} pp</strong></span>
                            ) : '—'}
                          </div>

                          {/* Attention */}
                          <div className="col-span-2 sm:col-span-2 text-center">
                            {ev ? (
                              <span className={`inline-block px-2.5 py-1 text-xs font-extrabold rounded ${
                                ev.severity === 'HIGH_ATTENTION' ? 'bg-[#FDF2F2] text-[#D64545]' :
                                ev.severity === 'MEANINGFUL' ? 'bg-[#FEF8EC] text-[#B7791F]' :
                                ev.severity === 'WATCH' ? 'bg-[#EAF4FC] text-[#1677C8]' :
                                'bg-[#F7FAFC] text-[#637789]'
                              }`}>
                                {ev.score}/100
                              </span>
                            ) : '—'}
                          </div>

                          {/* Delete Action */}
                          <div className="col-span-1 flex justify-end">
                            <button
                              onClick={() => removeSymbol(activeWl.id, item.symbol)}
                              className="text-[#637789] hover:text-[#D64545] transition-colors p-1"
                              title="Remove stock"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-[#D7E6F2] rounded-xl p-12 text-center text-sm text-[#637789]">
              Select or create a watchlist to get started.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

