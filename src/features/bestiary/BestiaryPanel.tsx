import { useState } from 'react'
import { Plus, Trash2, Search, X } from 'lucide-react'
import { useBestiaryStore } from './store'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'
import { CREATURE_TYPES, HP_TIERS, HP_TIER_RANGES } from '../../lib/constants'
import { fileToDataUrl, saveCreatureImage, loadCreatureImage } from '../../lib/imageCache'
import type { BestiaryEntry } from '../../types'

const HP_BADGE: Record<BestiaryEntry['hpTier'], 'muted' | 'gold' | 'orange' | 'red'> = {
  weak: 'muted', average: 'gold', strong: 'orange', mighty: 'red',
}

const ALL_TAGS = [...CREATURE_TYPES, 'intelligent', 'undead', 'boss', 'swarm', 'aquatic', 'flying'] as string[]

function TagPicker({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [custom, setCustom] = useState('')

  const toggle = (t: string) => {
    onChange(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])
  }

  const addCustom = () => {
    const v = custom.trim().toLowerCase()
    if (!v || tags.includes(v)) { setCustom(''); return }
    onChange([...tags, v])
    setCustom('')
  }

  // unique list: preset tags first, then any custom ones already added
  const display = Array.from(new Set([...ALL_TAGS, ...tags]))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {display.map(t => (
          <button key={t} type="button"
            onClick={() => toggle(t)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-colors capitalize ${
              tags.includes(t)
                ? 'bg-gold/20 border-gold text-gold'
                : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-400'
            }`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder="Custom tag..."
          className="flex-1 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none focus:border-gold/50" />
        <button type="button" onClick={addCustom}
          className="px-2 py-1 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">Add</button>
      </div>
    </div>
  )
}

export function BestiaryPanel() {
  const { entries, addEntry, updateEntry, deleteEntry } = useBestiaryStore()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTypes, setNewTypes] = useState<string[]>(['natural'])
  const [newHp, setNewHp] = useState<BestiaryEntry['hpTier']>('weak')
  const [newMaxHp, setNewMaxHp] = useState('')
  const [newDef, setNewDef] = useState('')

  const selected = entries.find(e => e.id === selectedId)
  const filtered = entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))

  // force re-render when image changes
  const [imgVersion, setImgVersion] = useState(0)

  const handleAdd = () => {
    if (!newName.trim()) return
    const customHp = newMaxHp ? parseInt(newMaxHp) : undefined
    const customDef = newDef ? parseInt(newDef) : undefined
    const id = addEntry({
      name: newName.trim(),
      hpTier: newHp,
      maxHp: customHp,
      def: customDef,
      size: 'medium',
      creatureType: newTypes.length ? newTypes : ['natural'],
      speed: 'normal',
      abilities: '',
      isCustom: true,
    })
    setSelectedId(id)
    setNewName(''); setNewTypes(['natural']); setNewHp('weak'); setNewMaxHp(''); setNewDef(''); setShowAdd(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected) return
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file, 300)
    saveCreatureImage(selected.id, url)
    setImgVersion(v => v + 1)
  }

  const creatureImg = selected ? loadCreatureImage(selected.id) : null

  return (
    <div className="h-full flex">
      {/* List */}
      <div className="w-72 shrink-0 border-r border-stone-700 flex flex-col">
        <div className="p-3 border-b border-stone-700 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-100 text-sm font-heading tracking-wide">Bestiary</h2>
            <button onClick={() => setShowAdd(true)} className="p-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600"><Plus size={13} /></button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-stone-900 border border-stone-600 rounded pl-7 pr-2 py-1.5 text-stone-200 text-xs outline-none focus:border-stone-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {filtered.map(e => {
            const img = loadCreatureImage(e.id)
            return (
              <button key={e.id} onClick={() => setSelectedId(e.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedId === e.id ? 'bg-stone-700 text-stone-100' : 'text-stone-300 hover:bg-stone-800'}`}>
                <div className="flex items-center gap-2">
                  {img && <img src={img} className="w-6 h-6 rounded object-cover shrink-0" />}
                  <span className="text-sm font-medium flex-1 truncate">{e.name}</span>
                  <Badge variant={HP_BADGE[e.hpTier]}>{e.maxHp != null ? `${e.maxHp} HP` : e.hpTier}</Badge>
                  {e.isCustom && <Badge variant="blue">custom</Badge>}
                </div>
                <div className="text-xs text-stone-500 capitalize mt-0.5 truncate">
                  {e.creatureType.join(', ')}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selected ? (
          <div className="text-stone-500 text-sm text-center mt-12">Select a creature to view details</div>
        ) : (
          <div className="max-w-xl space-y-4">
            {/* Header row: image + name */}
            <div className="flex items-start gap-4">
              {/* Image upload */}
              <label className="relative shrink-0 w-20 h-20 rounded-xl bg-stone-800 border border-stone-600 overflow-hidden cursor-pointer flex items-center justify-center group">
                {creatureImg
                  ? <img key={imgVersion} src={creatureImg} className="w-full h-full object-cover" />
                  : <span className="text-3xl">👾</span>}
                <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-stone-200 transition-opacity">Upload</div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <input value={selected.name} onChange={e => updateEntry(selected.id, { name: e.target.value })}
                    className="text-xl font-bold text-stone-100 bg-transparent outline-none hover:bg-stone-800 rounded px-1 -mx-1 flex-1 min-w-0 font-heading tracking-wide" />
                  {selected.isCustom && (
                    <button onClick={() => { deleteEntry(selected.id); setSelectedId(null) }} className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-700 shrink-0"><Trash2 size={14} /></button>
                  )}
                </div>
                {/* Type badges */}
                <div className="flex gap-1 mt-1 flex-wrap">
                  {selected.creatureType.map(t => (
                    <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-stone-700 border border-stone-600 text-stone-300 capitalize">
                      {t}
                      <button type="button" onClick={() => updateEntry(selected.id, { creatureType: selected.creatureType.filter(x => x !== t) })} className="ml-0.5 text-stone-500 hover:text-red-400"><X size={9} /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 block mb-1">HP Tier</label>
                <select value={selected.hpTier} onChange={e => updateEntry(selected.id, { hpTier: e.target.value as BestiaryEntry['hpTier'] })} className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
                  {HP_TIERS.map(t => <option key={t} value={t}>{t} ({HP_TIER_RANGES[t]})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Custom Max HP <span className="text-stone-500">(overrides tier)</span></label>
                <input
                  type="number" min={1}
                  value={selected.maxHp ?? ''}
                  onChange={e => updateEntry(selected.id, { maxHp: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder={`Default: ${selected.hpTier}`}
                  className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none focus:border-gold/50"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Defense (DEF)</label>
                <input
                  type="number" min={0}
                  value={selected.def ?? ''}
                  onChange={e => updateEntry(selected.id, { def: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="0"
                  className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none focus:border-gold/50"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Size</label>
                <select value={selected.size} onChange={e => updateEntry(selected.id, { size: e.target.value as BestiaryEntry['size'] })} className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
                  <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="massive">Massive</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Speed</label>
                <select value={selected.speed} onChange={e => updateEntry(selected.id, { speed: e.target.value as BestiaryEntry['speed'] })} className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
                  <option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-stone-500 block mb-1.5">Tags</label>
              <TagPicker tags={selected.creatureType} onChange={tags => updateEntry(selected.id, { creatureType: tags })} />
            </div>

            <div>
              <label className="text-xs text-stone-500 block mb-1">Abilities & Notes</label>
              <textarea value={selected.abilities ?? ''} onChange={e => updateEntry(selected.id, { abilities: e.target.value })} rows={6}
                className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none resize-none focus:border-stone-500" />
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Add Creature" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-stone-400 block mb-1">Name *</label>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-stone-400 block mb-1">HP Tier</label>
                <select value={newHp} onChange={e => setNewHp(e.target.value as BestiaryEntry['hpTier'])} className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-2 text-stone-200 text-sm outline-none">
                  {HP_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-stone-400 block mb-1">Custom HP</label>
                <input type="number" min={1} value={newMaxHp} onChange={e => setNewMaxHp(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-2 text-stone-200 text-sm outline-none" />
              </div>
              <div>
                <label className="text-sm text-stone-400 block mb-1">Defense (DEF)</label>
                <input type="number" min={0} value={newDef} onChange={e => setNewDef(e.target.value)}
                  placeholder="0"
                  className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-2 text-stone-200 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm text-stone-400 block mb-1.5">Tags</label>
              <TagPicker tags={newTypes} onChange={setNewTypes} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={!newName.trim()} className="px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold text-sm disabled:opacity-50">Add</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
