import { useState } from 'react'
import { useCharacterStore } from '../../store'
import { Modal } from '../../../../ui/Modal'
import { ENCHANTER_SIGNS } from '../../../../lib/rules/constants'
import { log } from '../../../log/store'
import type { Character } from '../../../../types'
import type { FS } from './controls'

export function EnchanterFeatures({ character, fs, onUpdate }: { character: Character; fs: FS<'Enchanter'>; onUpdate: (p: Record<string, unknown>) => void }) {
  const [showActivate, setShowActivate] = useState(false)
  const canActivate = fs.state.lapisCount >= 5 && character.currentSd >= 3 && !fs.state.magicCircleActive

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="text-xs text-stone-500 mb-1">Lapis Lazuli</div>
          <div className="flex gap-1">
            <button onClick={() => onUpdate({ lapisCount: Math.max(0, fs.state.lapisCount - 1) })} className="w-6 h-6 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">-</button>
            <span className="text-stone-100 font-bold w-6 text-center text-sm">{fs.state.lapisCount}</span>
            <button onClick={() => onUpdate({ lapisCount: fs.state.lapisCount + 1 })} className="w-6 h-6 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">+</button>
          </div>
        </div>
        <div>
          <div className="text-xs text-stone-500 mb-1">Magic Circle</div>
          {fs.state.magicCircleActive ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-sm text-sm bg-purple-700 text-purple-100 flex items-center gap-1.5">
                <img src="/enchanted-book.png" className="w-4 h-4 object-contain" alt="" /> Active (1 day)
              </span>
              <button onClick={() => onUpdate({ magicCircleActive: false })} className="text-xs text-stone-500 hover:text-stone-300">Dismiss</button>
            </div>
          ) : (
            <button
              onClick={() => setShowActivate(true)}
              disabled={!canActivate}
              title={!canActivate ? (fs.state.lapisCount < 5 ? 'Need 5 Lapis' : character.currentSd < 3 ? 'Need 3 SD' : '') : 'Activate Magic Circle'}
              className="px-3 py-1 rounded-sm text-sm bg-stone-700 text-stone-400 hover:bg-purple-800 hover:text-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className={`px-2.5 py-1 rounded-sm text-xs border ${active ? 'bg-purple-700/40 border-purple-500/50 text-purple-200' : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-purple-500/30'}`}>
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
          <div className="bg-stone-800 rounded-sm p-2">
            <span className="text-stone-500">SD cost: </span>
            <span className={character.currentSd >= 3 ? 'text-emerald font-bold' : 'text-red-400 font-bold'}>3 SD</span>
            <span className="text-stone-500"> (have {character.currentSd})</span>
          </div>
          <div className="bg-stone-800 rounded-sm p-2">
            <span className="text-stone-500">Lapis cost: </span>
            <span className={fs.state.lapisCount >= 5 ? 'text-emerald font-bold' : 'text-red-400 font-bold'}>5 Lapis</span>
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
                  className={`px-2.5 py-1 rounded-sm border text-xs transition-all ${enchantmentName === e ? 'bg-purple-700/40 border-purple-500/50 text-purple-200' : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-purple-500/30'}`}>
                  {e}
                </button>
              ))}
            </div>
          )}
          <input
            value={customEnchantment}
            onChange={e => { setCustomEnchantment(e.target.value); setEnchantmentName('') }}
            placeholder={fs.state.tomeEntries.length > 0 ? 'Or type a custom enchantment…' : 'Enchantment name…'}
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-3 py-2 text-stone-100 text-sm outline-hidden focus:border-purple-500/50"
          />
        </div>

        {/* Affected characters */}
        <div>
          <label className="block text-sm text-stone-400 mb-1.5">Affected Characters (up to 5 total)</label>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {/* Enchanter always included */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-purple-900/30 border border-purple-700/30 text-xs text-purple-300">
              <span className="text-purple-400">✦</span> {character.name} (caster — always inside)
            </div>
            {characters.filter(c => c.id !== character.id).map(c => (
              <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-stone-800 hover:bg-stone-700 cursor-pointer text-xs">
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
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-3 py-2 text-stone-100 text-sm outline-hidden focus:border-gold/50"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!finalEnchantment.trim()}
            className="px-3 py-1.5 rounded-sm bg-purple-700 text-white font-semibold hover:bg-purple-600 text-sm disabled:opacity-50"
          >
            Activate Circle
          </button>
        </div>
      </div>
    </Modal>
  )
}
