import { useState } from 'react'
import { useCharacterStore } from '../store'
import { Badge } from '../../../ui/Badge'
import { Modal } from '../../../ui/Modal'
import { PRIMAL_FORCES, TETHER_BONUSES, WARD_TYPES, HUNTER_PREY_TYPES, ENCHANTER_SIGNS, ESSENCE_TYPES } from '../../../lib/constants'
import { log } from '../../log/store'
import type { Character, ClassFeatureState, TetherSlot } from '../../../types'

interface ClassFeaturesProps { character: Character }

export function ClassFeatures({ character: c }: ClassFeaturesProps) {
  const { useRestCharge, updateClassState } = useCharacterStore()
  const fs = c.classFeatureState

  if (fs.class === 'Warrior') return <WarriorFeatures fs={fs} onUse={id => useRestCharge(c.id, id)} />
  if (fs.class === 'Hunter') return <HunterFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Vindicator') return <VindicatorFeatures fs={fs} onUse={id => useRestCharge(c.id, id)} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Enchanter') return <EnchanterFeatures character={c} fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Delver') return <DelverFeatures fs={fs} onUse={id => useRestCharge(c.id, id)} />
  if (fs.class === 'Wildspeaker') return <WildspeakerFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Evoker') return <EvokerFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Tecton') return <TectonFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Alchemist') return <AlchemistFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  return null
}

type FS<T extends ClassFeatureState['class']> = Extract<ClassFeatureState, { class: T }>

function WarriorFeatures({ fs, onUse }: { fs: FS<'Warrior'>; onUse: (id: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-stone-500">Battle Maneuvers (reset on rest)</div>
      {fs.state.maneuvers.map(m => (
        <button
          key={m.id}
          onClick={() => !m.used && onUse(m.id)}
          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
            m.used
              ? 'bg-stone-900 border-stone-700 text-stone-600 line-through'
              : 'bg-stone-800 border-stone-600 text-stone-200 hover:border-gold/50'
          }`}
        >
          <span className="font-medium">{m.name}</span>
          {m.description && <span className="text-xs text-stone-500 ml-2">{m.description}</span>}
          <Badge variant={m.used ? 'muted' : 'gold'} className="ml-2">{m.used ? 'Used' : 'Ready'}</Badge>
        </button>
      ))}
    </div>
  )
}

function HunterFeatures({ fs, onUpdate }: { fs: FS<'Hunter'>; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div>
      <div className="text-xs text-stone-500 mb-1">Current Prey</div>
      <select
        value={fs.state.preyType ?? ''}
        onChange={e => onUpdate({ preyType: e.target.value || null })}
        className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none"
      >
        <option value="">— No Prey Selected —</option>
        {HUNTER_PREY_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
      </select>
      {fs.state.preyType && (
        <div className="mt-1.5">
          <Badge variant="red">🎯 Hunting: {fs.state.preyType}</Badge>
          <span className="text-xs text-stone-500 ml-2">+1 to all rolls against this prey</span>
        </div>
      )}
    </div>
  )
}

function VindicatorFeatures({ fs, onUse, onUpdate }: { fs: FS<'Vindicator'>; onUse: (id: string) => void; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-stone-500 mb-1">Active Cause</div>
        <input value={fs.state.activeCause} onChange={e => onUpdate({ activeCause: e.target.value })} placeholder="What injustice drives you today?"
          className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none focus:border-gold/50" />
      </div>
      <div>
        <div className="text-xs text-stone-500 mb-1.5">Voices of Truth (reset on rest)</div>
        {fs.state.voices.map(v => (
          <button key={v.id} onClick={() => !v.used && onUse(v.id)}
            className={`w-full text-left px-3 py-2 rounded-lg border text-sm mb-1 transition-all ${v.used ? 'bg-stone-900 border-stone-700 text-stone-600 line-through' : 'bg-stone-800 border-stone-600 text-stone-200 hover:border-gold/50'}`}>
            {v.name} <Badge variant={v.used ? 'muted' : 'gold'} className="ml-1">{v.used ? 'Used' : 'Ready'}</Badge>
          </button>
        ))}
      </div>
    </div>
  )
}

function EnchanterFeatures({ character, fs, onUpdate }: { character: Character; fs: FS<'Enchanter'>; onUpdate: (p: Record<string, unknown>) => void }) {
  const [showActivate, setShowActivate] = useState(false)
  const canActivate = fs.state.lapisCount >= 5 && character.currentSd >= 3 && !fs.state.magicCircleActive

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="text-xs text-stone-500 mb-1">Lapis Lazuli</div>
          <div className="flex gap-1">
            <button onClick={() => onUpdate({ lapisCount: Math.max(0, fs.state.lapisCount - 1) })} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">-</button>
            <span className="text-stone-100 font-bold w-6 text-center text-sm">{fs.state.lapisCount}</span>
            <button onClick={() => onUpdate({ lapisCount: fs.state.lapisCount + 1 })} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
          </div>
        </div>
        <div>
          <div className="text-xs text-stone-500 mb-1">Magic Circle</div>
          {fs.state.magicCircleActive ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded text-sm bg-purple-700 text-purple-100 flex items-center gap-1.5">
                <img src="/enchanted-book.png" className="w-4 h-4 object-contain" alt="" /> Active (1 day)
              </span>
              <button onClick={() => onUpdate({ magicCircleActive: false })} className="text-xs text-stone-500 hover:text-stone-300">Dismiss</button>
            </div>
          ) : (
            <button
              onClick={() => setShowActivate(true)}
              disabled={!canActivate}
              title={!canActivate ? (fs.state.lapisCount < 5 ? 'Need 5 Lapis' : character.currentSd < 3 ? 'Need 3 SD' : '') : 'Activate Magic Circle'}
              className="px-3 py-1 rounded text-sm bg-stone-700 text-stone-400 hover:bg-purple-800 hover:text-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Activate (5 Lapis, 3 SD)
            </button>
          )}
        </div>
      </div>
      <div>
        <div className="text-xs text-stone-500 mb-1.5">Tome Entries</div>
        <div className="flex flex-wrap gap-1.5">
          {ENCHANTER_SIGNS.map(sign => {
            const active = fs.state.tomeEntries.includes(sign)
            return (
              <button key={sign} onClick={() => onUpdate({ tomeEntries: active ? fs.state.tomeEntries.filter((s: string) => s !== sign) : [...fs.state.tomeEntries, sign] })}
                className={`px-2.5 py-1 rounded text-xs border ${active ? 'bg-purple-700/40 border-purple-500/50 text-purple-200' : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-purple-500/30'}`}>
                {sign}
              </button>
            )
          })}
        </div>
      </div>

      {showActivate && (
        <MagicCircleModal
          character={character}
          fs={fs}
          onUpdate={onUpdate}
          onClose={() => setShowActivate(false)}
        />
      )}
    </div>
  )
}

function MagicCircleModal({ character, fs, onUpdate, onClose }: {
  character: Character
  fs: FS<'Enchanter'>
  onUpdate: (p: Record<string, unknown>) => void
  onClose: () => void
}) {
  const { characters, adjustSd } = useCharacterStore()
  const [enchantmentName, setEnchantmentName] = useState(fs.state.tomeEntries[0] ?? '')
  const [customEnchantment, setCustomEnchantment] = useState('')

  // Pre-select characters at the same sub-location as the enchanter
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(
    characters
      .filter(c => c.id !== character.id && c.subLocationId && c.subLocationId === character.subLocationId)
      .map(c => c.id)
  ))
  const [enemyText, setEnemyText] = useState('')

  const toggleChar = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const finalEnchantment = enchantmentName || customEnchantment

  const handleConfirm = () => {
    if (!finalEnchantment.trim()) return
    adjustSd(character.id, -3)
    onUpdate({ lapisCount: fs.state.lapisCount - 5, magicCircleActive: true })
    const targets = [
      character.name,
      ...characters.filter(c => selectedIds.has(c.id)).map(c => c.name),
      ...(enemyText.trim() ? [enemyText.trim()] : []),
    ].join(', ')
    log('effect-applied', `✨ ${character.name} etched a Magic Circle (${finalEnchantment}) affecting: ${targets}. Lasts 1 day.`)
    onClose()
  }

  return (
    <Modal title="Activate Magic Circle" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-stone-900 rounded-lg p-3 text-xs text-stone-400 leading-relaxed">
          Spend 3 SD and 5 Lapis Lazuli to etch an enchantment or curse in a circle on the ground. Up to 5 Medium creatures inside are affected. Lasts 1 day.
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-stone-800 rounded p-2">
            <span className="text-stone-500">SD cost: </span>
            <span className={character.currentSd >= 3 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>3 SD</span>
            <span className="text-stone-500"> (have {character.currentSd})</span>
          </div>
          <div className="bg-stone-800 rounded p-2">
            <span className="text-stone-500">Lapis cost: </span>
            <span className={fs.state.lapisCount >= 5 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>5 Lapis</span>
            <span className="text-stone-500"> (have {fs.state.lapisCount})</span>
          </div>
        </div>

        {/* Enchantment selector */}
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Enchantment / Curse</label>
          {fs.state.tomeEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {fs.state.tomeEntries.map(e => (
                <button key={e} type="button" onClick={() => { setEnchantmentName(e); setCustomEnchantment('') }}
                  className={`px-2.5 py-1 rounded border text-xs transition-all ${enchantmentName === e ? 'bg-purple-700/40 border-purple-500/50 text-purple-200' : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-purple-500/30'}`}>
                  {e}
                </button>
              ))}
            </div>
          )}
          <input
            value={customEnchantment}
            onChange={e => { setCustomEnchantment(e.target.value); setEnchantmentName('') }}
            placeholder={fs.state.tomeEntries.length > 0 ? 'Or type a custom enchantment…' : 'Enchantment name…'}
            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Affected characters */}
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Affected Characters (up to 5 total)</label>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {/* Enchanter always included */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-purple-900/30 border border-purple-700/30 text-xs text-purple-300">
              <span className="text-purple-400">✦</span> {character.name} (caster — always inside)
            </div>
            {characters.filter(c => c.id !== character.id).map(c => (
              <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-stone-800 hover:bg-stone-700 cursor-pointer text-xs">
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleChar(c.id)} className="accent-gold" />
                <span className="text-stone-200">{c.name}</span>
                {c.subLocationId === character.subLocationId && c.subLocationId && (
                  <span className="text-stone-500 ml-auto">same location</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Enemy targets */}
        <div>
          <label className="block text-sm text-stone-400 mb-1">Enemy / Creature Targets</label>
          <input
            value={enemyText}
            onChange={e => setEnemyText(e.target.value)}
            placeholder="e.g. Zombie Horde, Cave Spider…"
            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!finalEnchantment.trim()}
            className="px-3 py-1.5 rounded bg-purple-700 text-white font-semibold hover:bg-purple-600 text-sm disabled:opacity-50"
          >
            Activate Circle
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DelverFeatures({ fs, onUse }: { fs: FS<'Delver'>; onUse: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-stone-500">Evasion Charges (reset on rest)</div>
      {fs.state.evasions.map(e => (
        <button key={e.id} onClick={() => !e.used && onUse(e.id)}
          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${e.used ? 'bg-stone-900 border-stone-700 text-stone-600 line-through' : 'bg-stone-800 border-stone-600 text-stone-200 hover:border-gold/50'}`}>
          {e.name} <Badge variant={e.used ? 'muted' : 'green'} className="ml-2">{e.used ? 'Used' : 'Ready'}</Badge>
        </button>
      ))}
      <div className="text-xs text-stone-500">Relic Activations: {fs.state.relicActivations}/2</div>
    </div>
  )
}

function WildspeakerFeatures({ fs, onUpdate }: { fs: FS<'Wildspeaker'>; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-stone-500 mb-1.5">Primal Tethers (2 max)</div>
        {fs.state.tethers.map((tether, i) => (
          <div key={i} className="flex gap-2 mb-1.5">
            <select value={tether.force ?? ''} onChange={e => {
              const t: [TetherSlot, TetherSlot] = [fs.state.tethers[0], fs.state.tethers[1]]
              t[i] = { ...t[i], force: (e.target.value || null) as TetherSlot['force'] }
              onUpdate({ tethers: t })
            }} className="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none">
              <option value="">— None —</option>
              {PRIMAL_FORCES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={tether.bonus ?? ''} onChange={e => {
              const t: [TetherSlot, TetherSlot] = [fs.state.tethers[0], fs.state.tethers[1]]
              t[i] = { ...t[i], bonus: (e.target.value || null) as TetherSlot['bonus'] }
              onUpdate({ tethers: t })
            }} className="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-200 text-xs outline-none">
              <option value="">— Bonus —</option>
              {TETHER_BONUSES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <ToggleBtn label="Beastshaper" active={fs.state.beastshaperUsed} onToggle={() => onUpdate({ beastshaperUsed: !fs.state.beastshaperUsed })} />
        <ToggleBtn label="Shaman" active={fs.state.shamanUsed} onToggle={() => onUpdate({ shamanUsed: !fs.state.shamanUsed })} />
      </div>
    </div>
  )
}

function EvokerFeatures({ fs, onUpdate }: { fs: FS<'Evoker'>; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-stone-500 mb-1">Ward Type</div>
        <select value={fs.state.wardType ?? ''} onChange={e => onUpdate({ wardType: e.target.value || null })} className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200 text-sm outline-none">
          <option value="">— No Ward —</option>
          {WARD_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ToggleBtn label="Soulmender" active={fs.state.soulmenderUsed} onToggle={() => onUpdate({ soulmenderUsed: !fs.state.soulmenderUsed })} />
        <ToggleBtn label="Reaper" active={fs.state.reaperUsed} onToggle={() => onUpdate({ reaperUsed: !fs.state.reaperUsed })} />
        <ToggleBtn label="Soul Anchor" active={fs.state.soulAnchorUsed} onToggle={() => onUpdate({ soulAnchorUsed: !fs.state.soulAnchorUsed })} />
      </div>
      <div className="text-xs text-stone-500">Vex: {fs.state.vex.length} · Fangs: {fs.state.fangs.length}</div>
    </div>
  )
}

function TectonFeatures({ fs, onUpdate }: { fs: FS<'Tecton'>; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <div>
          <div className="text-xs text-stone-500 mb-1">Instant Crafts</div>
          <CountControl value={fs.state.instantCraftsRemaining} max={3}
            onDecrement={() => onUpdate({ instantCraftsRemaining: Math.max(0, fs.state.instantCraftsRemaining - 1) })}
            onIncrement={() => onUpdate({ instantCraftsRemaining: Math.min(3, fs.state.instantCraftsRemaining + 1) })} />
        </div>
        <div>
          <div className="text-xs text-stone-500 mb-1">Mechanist Charges</div>
          <CountControl value={fs.state.mechanistCharges} max={2}
            onDecrement={() => onUpdate({ mechanistCharges: Math.max(0, fs.state.mechanistCharges - 1) })}
            onIncrement={() => onUpdate({ mechanistCharges: Math.min(2, fs.state.mechanistCharges + 1) })} />
        </div>
      </div>
    </div>
  )
}

function AlchemistFeatures({ fs, onUpdate }: { fs: FS<'Alchemist'>; onUpdate: (p: Record<string, unknown>) => void }) {
  const essences = fs.state.essences
  return (
    <div>
      <div className="text-xs text-stone-500 mb-2">Essence Stocks</div>
      <div className="grid grid-cols-2 gap-2">
        {ESSENCE_TYPES.map(et => (
          <div key={et} className="flex items-center gap-2">
            <span className="text-xs text-stone-300 capitalize w-24">{et}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => onUpdate({ essences: { ...essences, [et]: Math.max(0, essences[et] - 1) } })} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">-</button>
              <span className="text-stone-100 w-4 text-center text-xs">{essences[et]}</span>
              <button onClick={() => onUpdate({ essences: { ...essences, [et]: essences[et] + 1 } })} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ToggleBtn({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`px-2.5 py-1 rounded text-xs border transition-all ${active ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-stone-800 border-stone-600 text-stone-400 hover:text-stone-200'}`}>
      {label}: {active ? 'Used' : 'Ready'}
    </button>
  )
}

function CountControl({ value, max, onDecrement, onIncrement }: { value: number; max: number; onDecrement: () => void; onIncrement: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={onDecrement} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">-</button>
      <span className="text-stone-100 font-bold text-sm w-8 text-center">{value}/{max}</span>
      <button onClick={onIncrement} className="w-6 h-6 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
    </div>
  )
}
