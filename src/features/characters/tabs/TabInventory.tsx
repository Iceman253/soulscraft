import { useMemo, useState } from 'react'
import { useCharacterStore } from '../store'
import { useWorldStore } from '../../map/store'
import { useStorageReach } from '../useStorageReach'
import { Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, Sword, Shield, Gift, Package } from 'lucide-react'
import { fileToDataUrl, saveItemImage, loadItemImage } from '../../../lib/imageCache'
import { CURRENCY_OPTIONS } from '../../../lib/currency'
import { BLOCK_CARRY_LIMIT, carryLimitOf, countBlocks } from '../../../lib/building'
import { allPlaceOptions } from '../../../lib/places'
import { ENDER, carriesEnderChest, partyOf, stashOf, storeLabel, type StoreKey } from '../../../lib/stashes'
import type { Character, CharacterItem } from '../../../types'

// Rulebook equipment packs (pp. 91) — quick-fill starting gear
const EQUIPMENT_PACKS: { name: string; items: { name: string; quantity: number }[]; currency?: Partial<Character['currency']>; rations?: number }[] = [
  {
    name: 'Wilderness',
    rations: 10,
    currency: { emeralds: 25 },
    items: [{ name: 'Bed', quantity: 1 }, { name: 'Lantern', quantity: 1 }, { name: 'Spyglass', quantity: 1 }, { name: 'Compass', quantity: 1 }],
  },
  {
    name: 'Miner\'s',
    rations: 10,
    currency: { emeralds: 25 },
    items: [{ name: 'Iron Pickaxe', quantity: 1 }, { name: 'Lantern', quantity: 1 }, { name: 'Coal', quantity: 20 }, { name: 'Compass', quantity: 1 }],
  },
  {
    name: 'Scholar\'s',
    rations: 10,
    currency: { emeralds: 50 },
    items: [{ name: 'Journal', quantity: 1 }, { name: 'Quill and Ink', quantity: 1 }, { name: 'Torch', quantity: 10 }, { name: 'Compass', quantity: 1 }, { name: 'Amethyst Shard', quantity: 1 }, { name: 'Sealing Wax', quantity: 1 }],
  },
  {
    name: 'Soldier\'s',
    rations: 10,
    currency: { emeralds: 50 },
    items: [{ name: 'Bed', quantity: 1 }, { name: 'Compass', quantity: 1 }, { name: 'Iron Dagger', quantity: 1 }],
  },
]

const GEAR_SLOT_LABELS: Record<NonNullable<CharacterItem['gearSlot']>, { label: string; icon: React.ReactNode }> = {
  mainHand: { label: 'Main Hand', icon: <Sword size={9} /> },
  offHand:  { label: 'Off Hand',  icon: <Sword size={9} /> },
  armor:    { label: 'Armor',     icon: <Shield size={9} /> },
  shield:   { label: 'Shield',    icon: <Shield size={9} /> },
}

interface TabInventoryProps { character: Character }

export function TabInventory({ character: c }: TabInventoryProps) {
  const {
    addOnHandItem, updateOnHandItem, removeOnHandItem,
    addStoredItem, updateStoredItem, removeStoredItem,
    moveItem, moveStore, setCurrency, setRations, setCarryLimit,
    giveItemToCharacter,
  } = useCharacterStore()
  const characters = useCharacterStore(s => s.characters)
  const areas = useWorldStore(s => s.areas)
  const reach = useStorageReach(c)
  const places = useMemo(() => allPlaceOptions(areas).flatMap(o =>
    o.placement.subNodeId === undefined ? [] : [{ id: o.placement.subNodeId ?? o.placement.areaId!, label: o.label.replace(/^Inside /, ''), depth: o.depth - 1 }]), [areas])
  // Storage where they are always shows, so there's somewhere to add things; then
  // any other storage they have, then the Ender Chest.
  const storeKeys = [reach.drop, ...Object.keys(c.stashes ?? {}).filter(k => k !== ENDER && k !== reach.drop)]
  const enderCarrier = partyOf(c, characters).find(carriesEnderChest)
  const [showPacks, setShowPacks] = useState(false)

  function applyPack(pack: typeof EQUIPMENT_PACKS[number]) {
    pack.items.forEach(item => addOnHandItem(c.id, { name: item.name, quantity: item.quantity }))
    if (pack.currency) setCurrency(c.id, { ...c.currency, ...Object.fromEntries(Object.entries(pack.currency).map(([k, v]) => [k, (c.currency[k as keyof typeof c.currency] ?? 0) + (v ?? 0)])) })
    if (pack.rations) setRations(c.id, c.rations + pack.rations)
    setShowPacks(false)
  }

  const blockCount = countBlocks(c.onHand.items)
  const blockLimit = carryLimitOf(c)
  const blocksFull = blockCount >= blockLimit

  return (
    <div className="p-4 space-y-5">
      {/* Currency */}
      <div className="bg-stone-800 border border-stone-700 rounded-lg p-3">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">Currency</div>
        <div className="flex flex-wrap gap-3">
          {CURRENCY_OPTIONS.map(({ key, label, img }) => (
            <div key={key} className="flex items-center gap-1.5">
              <img src={img} alt={label} className="w-5 h-5 object-contain" />
              <input
                type="number"
                value={c.currency[key]}
                min={0}
                onChange={e => setCurrency(c.id, { [key]: parseInt(e.target.value) || 0 })}
                className="w-16 bg-stone-900 border border-stone-600 rounded-sm px-2 py-1 text-stone-200 text-sm outline-hidden focus:border-gold/50 font-mono tabular-nums"
              />
              <span className="text-xs text-stone-500">{label}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-stone-500 mt-2">1 Diamond = 10 Emerald = 100 Gold = 1,000 Iron = 10,000 Copper</div>
      </div>

      {/* Rations */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-stone-400">🍖 Rations</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setRations(c.id, Math.max(0, c.rations - 1))} className="w-6 h-6 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">-</button>
          <span className="text-stone-100 font-bold w-6 text-center font-mono tabular-nums">{c.rations}</span>
          <button onClick={() => setRations(c.id, c.rations + 1)} className="w-6 h-6 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
        </div>
        {/* Equipment packs quick-start */}
        <div className="relative ml-auto">
          <button onClick={() => setShowPacks(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-stone-700 border border-stone-600 text-stone-300 hover:bg-stone-600 text-xs transition-colors">
            <Package size={11} /> Equipment Pack
          </button>
          {showPacks && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-stone-900 border border-stone-600 rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="px-3 py-2 border-b border-stone-700 text-xs text-stone-400 font-medium">Starting Equipment Packs</div>
              {EQUIPMENT_PACKS.map(pack => (
                <button key={pack.name} onClick={() => applyPack(pack)}
                  className="w-full text-left px-3 py-2 hover:bg-stone-800 transition-colors group">
                  <div className="text-xs font-semibold text-stone-200 group-hover:text-gold">{pack.name} Pack</div>
                  <div className="text-xs text-stone-500 mt-0.5">{pack.items.map(i => i.name).join(', ')}{pack.rations ? ` + ${pack.rations} rations` : ''}</div>
                </button>
              ))}
              <button onClick={() => setShowPacks(false)} className="w-full text-center px-3 py-1.5 text-xs text-stone-600 hover:text-stone-400 border-t border-stone-700">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* On-hand inventory */}
      <ItemList
        title="On Hand"
        items={c.onHand.items}
        charId={c.id}
        onAdd={() => addOnHandItem(c.id, { name: '', quantity: 1 })}
        onUpdate={(itemId, patch) => updateOnHandItem(c.id, itemId, patch)}
        onRemove={(itemId) => removeOnHandItem(c.id, itemId)}
        moves={[
          { icon: <ArrowDownToLine size={12} />, title: `Put in storage: ${storeLabel(reach.drop, areas)}`, onMove: id => moveItem(c.id, id, 'onHand', reach.drop) },
          { icon: <span className="text-[10px]">🟪</span>, title: 'Put in their Ender Chest', onMove: id => moveItem(c.id, id, 'onHand', ENDER) },
        ]}
        onGive={(itemId, toId) => giveItemToCharacter(c.id, itemId, 'onHand', toId)}
        blockCount={blockCount}
        blockLimit={blockLimit}
        blocksFull={blocksFull}
      />
      {c.carryLimit !== undefined && (
        <div className="-mt-3 flex items-center justify-between text-xs text-teal-300">
          <span>Temporary limit, until they drop below {BLOCK_CARRY_LIMIT} blocks.</span>
          <button onClick={() => setCarryLimit(c.id, null)} className="text-stone-400 hover:text-stone-200">End now</button>
        </div>
      )}

      {/* Storage, which stays where it was left (p.7) */}
      {storeKeys.map(key => (
        <StoreList key={key} c={c} storeKey={key}
          title={storeLabel(key, areas)}
          status={reach.local.includes(key) ? 'Here' : reach.orphaned.includes(key) ? 'No place' : 'Elsewhere'}
          places={key === reach.drop && reach.local.includes(key) ? undefined : places}
          onRelocate={to => moveStore(c.id, key, to)}
          onAdd={() => addStoredItem(c.id, key, { name: '', quantity: 1 })}
          onUpdate={(itemId, patch) => updateStoredItem(c.id, key, itemId, patch)}
          onRemove={(itemId) => removeStoredItem(c.id, key, itemId)}
          onMove={(itemId) => moveItem(c.id, itemId, key, 'onHand')}
          onGive={(itemId, toId) => giveItemToCharacter(c.id, itemId, key, toId)}
        />
      ))}
      <StoreList c={c} storeKey={ENDER} title="🟪 Ender Chest"
        status={enderCarrier ? `Open: ${enderCarrier.name} has one` : 'Locked: nobody with them has one'}
        onAdd={() => addStoredItem(c.id, ENDER, { name: '', quantity: 1 })}
        onUpdate={(itemId, patch) => updateStoredItem(c.id, ENDER, itemId, patch)}
        onRemove={(itemId) => removeStoredItem(c.id, ENDER, itemId)}
        onMove={(itemId) => moveItem(c.id, itemId, ENDER, 'onHand')}
        onGive={(itemId, toId) => giveItemToCharacter(c.id, itemId, ENDER, toId)}
      />
    </div>
  )
}

interface ItemMove { icon: React.ReactNode; title: string; onMove: (id: string) => void }

/** One store: its items, where it is, and (for the GM) moving all of it to a place. */
function StoreList({ c, storeKey, title, status, places, onRelocate, onAdd, onUpdate, onRemove, onMove, onGive }: {
  c: Character
  storeKey: StoreKey
  title: string
  status: string
  places?: { id: string; label: string; depth: number }[]
  onRelocate?: (to: StoreKey) => void
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<CharacterItem>) => void
  onRemove: (id: string) => void
  onMove: (id: string) => void
  onGive: (itemId: string, toId: string) => void
}) {
  const items = stashOf(c, storeKey).items
  return (
    <div className="space-y-1">
      <ItemList
        title={title}
        badge={status}
        items={items}
        charId={c.id}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onRemove={onRemove}
        moves={[{ icon: <ArrowUpFromLine size={12} />, title: 'Move to On Hand', onMove }]}
        onGive={onGive}
      />
      {places && onRelocate && items.length > 0 && (
        <select value="" onChange={e => { if (e.target.value) onRelocate(e.target.value) }}
          className="w-full bg-stone-900 border border-stone-700 rounded-sm px-2 py-1 text-stone-400 text-xs outline-hidden">
          <option value="">Really somewhere else? Move all of it to…</option>
          {places.filter(p => p.id !== storeKey).map(p => <option key={p.id} value={p.id}>{'\u00A0\u00A0'.repeat(p.depth)}{p.label}</option>)}
        </select>
      )}
    </div>
  )
}

function ItemList({ title, badge, items, charId, onAdd, onUpdate, onRemove, moves, onGive, blockCount, blockLimit, blocksFull }: {
  title: string
  badge?: string
  items: CharacterItem[]
  charId: string
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<CharacterItem>) => void
  onRemove: (id: string) => void
  moves: ItemMove[]
  onGive: (itemId: string, toId: string) => void
  blockCount?: number
  blockLimit?: number
  blocksFull?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-heading">{title}</div>
          {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-sm border border-stone-700 bg-stone-800 text-stone-400">{badge}</span>}
          {blockCount !== undefined && (
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded-sm border ${
              blocksFull
                ? 'bg-red-900/40 border-red-700 text-red-400 font-bold'
                : 'bg-stone-800 border-stone-700 text-stone-500'
            }`}>
              📦 {blockCount}/{blockLimit} blocks{blockCount > (blockLimit ?? BLOCK_CARRY_LIMIT) ? ' — OVER LIMIT' : blocksFull ? ' — FULL' : ''}
            </span>
          )}
        </div>
        <button onClick={onAdd} className="p-1 rounded-sm text-stone-500 hover:text-gold hover:bg-stone-700">
          <Plus size={13} />
        </button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <div className="text-xs text-stone-500 italic py-1">Empty</div>
        )}
        {items.map(item => (
          <ItemRow key={item.id} item={item} charId={charId} onUpdate={onUpdate} onRemove={onRemove} moves={moves} onGive={onGive} />
        ))}
      </div>
    </div>
  )
}

function ItemRow({ item, charId, onUpdate, onRemove, moves, onGive }: {
  item: CharacterItem
  charId: string
  onUpdate: (id: string, patch: Partial<CharacterItem>) => void
  onRemove: (id: string) => void
  moves: ItemMove[]
  onGive: (itemId: string, toId: string) => void
}) {
  const characters = useCharacterStore(s => s.characters)
  const otherChars = characters.filter(c => c.id !== charId)
  const img = loadItemImage(item.name)
  const gearInfo = item.gearSlot ? GEAR_SLOT_LABELS[item.gearSlot] : null

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file, 200)
    saveItemImage(item.name, url)
    onUpdate(item.id, {})
  }

  return (
    <div className={`flex items-center gap-2 bg-stone-800 border rounded-lg px-2 py-1.5 ${gearInfo ? 'border-stone-600' : 'border-stone-700'}`}>
      <label className="w-8 h-8 rounded-sm bg-stone-700 overflow-hidden cursor-pointer shrink-0 flex items-center justify-center">
        {img ? <img src={img} className="w-full h-full object-cover" /> : <span className="text-stone-500 text-lg">📦</span>}
        <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload} />
      </label>

      <input
        value={item.name}
        onChange={e => onUpdate(item.id, { name: e.target.value })}
        placeholder="Item name..."
        className="flex-1 min-w-0 bg-transparent text-stone-200 text-sm outline-hidden placeholder:text-stone-600"
      />

      {/* Gear slot badge */}
      {gearInfo && (
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-gold/10 border border-gold/30 text-gold text-xs shrink-0">
          {gearInfo.icon} {gearInfo.label}
        </span>
      )}

      {/* Block toggle */}
      <button
        onClick={() => onUpdate(item.id, { isBlock: !item.isBlock })}
        title={item.isBlock ? 'Mark as non-block' : 'Mark as block (counts to 10-block limit)'}
        className={`text-xs px-1 py-0.5 rounded-sm border shrink-0 transition-colors ${
          item.isBlock
            ? 'bg-amber-900/40 border-amber-700 text-amber-400'
            : 'bg-stone-900 border-stone-700 text-stone-600 hover:text-stone-400'
        }`}>
        📦
      </button>

      <input
        type="number"
        value={item.quantity}
        min={1}
        onChange={e => onUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
        className="w-12 bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-0.5 text-stone-200 text-xs text-center outline-hidden font-mono tabular-nums"
      />

      {moves.map(m => (
        <button key={m.title} onClick={() => m.onMove(item.id)} title={m.title} aria-label={m.title}
          disabled={!!gearInfo}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed">
          {m.icon}
        </button>
      ))}

      {!gearInfo && otherChars.length > 0 && (
        <div className="relative shrink-0">
          <select
            value=""
            onChange={e => { if (e.target.value) onGive(item.id, e.target.value) }}
            title="Give to character"
            className="absolute inset-0 opacity-0 w-full cursor-pointer"
          >
            <option value="">Give to...</option>
            {otherChars.map(c => (
              <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>
            ))}
          </select>
          <Gift size={12} className="text-stone-500 hover:text-stone-300 pointer-events-none" />
        </div>
      )}

      <button onClick={() => onRemove(item.id)} className="p-0.5 text-stone-500 hover:text-red-400">
        <Trash2 size={12} />
      </button>
    </div>
  )
}
