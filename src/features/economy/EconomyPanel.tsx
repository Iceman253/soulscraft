import { useState } from 'react'
import { Plus, Store, Flag, Zap, Trash2, MapPin } from 'lucide-react'
import { useEconomyStore } from './store'
import { useWorldStore } from '../map/store'
import { MarketProfileEditor } from './MarketProfileEditor'
import { PriceBoard } from './PriceBoard'
import { FactionsPanel } from './FactionsPanel'
import { EventsPanel } from './EventsPanel'
import { CraftingCalculator } from './CraftingCalculator'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import type { MarketProfile } from '../../types'

type View = 'markets' | 'factions' | 'events'
type MarketTab = 'board' | 'profile' | 'craft'

const FRESH_MARKET: Omit<MarketProfile, 'id'> = {
  areaId: null, name: 'New Market',
  prosperity: 3, size: 2, remoteness: 2, security: 3,
  specialties: [], shortages: [], tariffPct: 0, sellRate: 0.5,
  factionId: null, localStanding: 0, notes: '', listings: [],
}

export function EconomyPanel() {
  const { economy, addMarket, deleteMarket } = useEconomyStore()
  const areas = useWorldStore(s => s.areas)
  const [view, setView] = useState<View>('markets')
  const [selectedId, setSelectedId] = useState<string | null>(economy.markets[0]?.id ?? null)
  const [marketTab, setMarketTab] = useState<MarketTab>('board')
  const [confirmDelete, setConfirmDelete] = useState<MarketProfile | null>(null)

  const selected = economy.markets.find(m => m.id === selectedId) ?? null

  const handleAdd = () => {
    const id = addMarket(FRESH_MARKET)
    setSelectedId(id)
    setView('markets')
    setMarketTab('profile')   // a fresh market starts with its profile
  }

  const areaName = (areaId: string | null) =>
    areaId ? areas.find(a => a.id === areaId)?.name ?? null : null

  return (
    <div className="h-full flex bg-stone-900">

      {/* Left rail — market list + section nav */}
      <div className="w-64 shrink-0 border-r border-stone-700 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-700 shrink-0">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">Markets</span>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-stone-700 text-stone-300 hover:bg-amber-800 hover:text-amber-100 transition-colors"
          >
            <Plus size={12} /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {economy.markets.length === 0 && (
            <div className="text-xs text-stone-500 italic px-2 py-4 text-center leading-relaxed">
              No markets yet. Create one here, or from any settlement on the map.
            </div>
          )}
          {economy.markets.map(m => {
            const area = areaName(m.areaId)
            return (
              <div
                key={m.id}
                onClick={() => { setSelectedId(m.id); setView('markets') }}
                className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                  view === 'markets' && selectedId === m.id
                    ? 'bg-amber-900/30 border border-amber-700/50'
                    : 'border border-transparent hover:bg-stone-800'
                }`}
              >
                <Store size={14} className="text-stone-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-stone-200 truncate">{m.name}</div>
                  {area && (
                    <div className="flex items-center gap-1 text-[10px] text-stone-500 truncate">
                      <MapPin size={9} /> {area}
                    </div>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(m) }}
                  className="p-1 rounded text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Section nav */}
        <div className="border-t border-stone-700 p-2 space-y-1 shrink-0">
          <button
            onClick={() => setView('factions')}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
              view === 'factions' ? 'bg-amber-900/30 border border-amber-700/50 text-amber-200' : 'text-stone-300 hover:bg-stone-800 border border-transparent'
            }`}
          >
            <Flag size={14} /> Factions & Standing
            {economy.factions.length > 0 && <span className="ml-auto text-xs text-stone-500">{economy.factions.length}</span>}
          </button>
          <button
            onClick={() => setView('events')}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
              view === 'events' ? 'bg-amber-900/30 border border-amber-700/50 text-amber-200' : 'text-stone-300 hover:bg-stone-800 border border-transparent'
            }`}
          >
            <Zap size={14} /> Economic Events
            {economy.events.length > 0 && (
              <span className="ml-auto px-1.5 rounded-full bg-amber-900/60 text-amber-300 text-xs">{economy.events.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {view === 'factions' && <FactionsPanel />}
        {view === 'events' && <EventsPanel />}
        {view === 'markets' && !selected && (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-500 gap-3">
            <Store size={40} className="text-stone-700" />
            <div className="text-sm">Select a market — or create one and tell it about the place.</div>
            <div className="text-xs text-stone-600 max-w-sm text-center leading-relaxed">
              Describe a settlement's prosperity, size, remoteness, and what it produces or lacks.
              The engine suggests stock and prices; every final number stays yours.
            </div>
          </div>
        )}
        {view === 'markets' && selected && (
          <>
            {/* Market header + tabs */}
            <div className="shrink-0 border-b border-stone-700 px-4 pt-3 flex items-end justify-between gap-3">
              <div className="min-w-0 pb-2">
                <h2 className="font-heading font-bold text-stone-100 text-base truncate">{selected.name}</h2>
                {areaName(selected.areaId) && (
                  <div className="flex items-center gap-1 text-xs text-stone-500"><MapPin size={10} /> {areaName(selected.areaId)}</div>
                )}
              </div>
              <div className="flex gap-0 shrink-0">
                {([['board', 'Price Board'], ['profile', 'Profile'], ['craft', 'Crafting']] as [MarketTab, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setMarketTab(id)}
                    className={`px-3.5 py-2 text-xs font-heading tracking-wide border-b-2 transition-colors ${
                      marketTab === id ? 'border-gold text-stone-100' : 'border-transparent text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {marketTab === 'board'   && <PriceBoard market={selected} />}
              {marketTab === 'profile' && <MarketProfileEditor market={selected} />}
              {marketTab === 'craft'   && <CraftingCalculator market={selected} />}
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Market"
          message={`Delete "${confirmDelete.name}"? Its stock, prices, and overrides will be lost.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteMarket(confirmDelete.id)
            if (selectedId === confirmDelete.id) setSelectedId(null)
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
