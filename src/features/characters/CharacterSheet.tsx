import { useState } from 'react'
import { ArrowLeft, Camera, Trash2, Plus, Check, Compass } from 'lucide-react'
import { useCharacterStore } from './store'
import { useWorldStore } from '../map/store'
import { log } from '../log/store'

const ECHO_COMPASS = 'Echo Compass'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { HpBar } from '../../ui/HpBar'
import { SdDots } from '../../ui/SdDots'
import { computeDef } from '../../lib/armor'
import { savePortrait, fileToDataUrl } from '../../lib/imageCache'
import { TabStats } from './tabs/TabStats'
import { TabGear } from './tabs/TabGear'
import { TabInventory } from './tabs/TabInventory'
import { TabAbilities } from './tabs/TabAbilities'
import { TabEffects } from './tabs/TabEffects'
import { TabNotes } from './tabs/TabNotes'
import type { Character } from '../../types'

type SheetTab = 'stats' | 'gear' | 'inventory' | 'abilities' | 'effects' | 'notes'

const TABS: { id: SheetTab; label: string }[] = [
  { id: 'stats',     label: 'Stats' },
  { id: 'gear',      label: 'Gear' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'effects',   label: 'Effects' },
  { id: 'notes',     label: 'Notes' },
]

interface CharacterSheetProps {
  character: Character
  onBack: () => void
}

export function CharacterSheet({ character: c, onBack }: CharacterSheetProps) {
  const [tab, setTab] = useState<SheetTab>('stats')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDeath, setConfirmDeath] = useState(false)
  const { adjustHp, adjustSd, updateCharacter, deleteCharacter, markDead, setGhost, resurrect, setInTower } = useCharacterStore()
  const characters = useCharacterStore(s => s.characters)
  const addOnHandItem = useCharacterStore(s => s.addOnHandItem)
  const { towerTrials, beginTowerTrials, setTowerKeepersAgreed, addTowerFloor, toggleTowerFloor, removeTowerFloor, endTowerTrials } = useWorldStore()
  const def = computeDef(c.armorLoadout)
  const [newFloor, setNewFloor] = useState('')

  // Tower of Trials resurrection gating (party-level shared state)
  const partyHasEchoCompass = characters.some(ch => ch.onHand.items.some(i => i.name.toLowerCase() === ECHO_COMPASS.toLowerCase()))
  const floorsAllDone = towerTrials.floors.length > 0 && towerTrials.floors.every(f => f.done)
  const resurrectionReady = towerTrials.active && towerTrials.keepersAgreed && floorsAllDone

  const grantEchoCompass = () => {
    const target = characters.find(ch => !ch.isDead) ?? characters[0]
    if (!target) return
    addOnHandItem(target.id, { name: ECHO_COMPASS, quantity: 1, description: 'Points the way to the Tower of Trials.' })
    log('character-move', `🧭 ${target.name} received an Echo Compass.`)
  }

  const handleDelete = () => {
    deleteCharacter(c.id)
    onBack()
  }

  const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file, 400)
    savePortrait(c.id, url)
    updateCharacter(c.id, {})
  }

  // Avoid Death — spend SD to regain HP when at 0
  const handleAvoidDeath = (sdToSpend: number) => {
    if (sdToSpend < 1 || sdToSpend > c.currentSd) return
    adjustSd(c.id, -sdToSpend)
    adjustHp(c.id, sdToSpend)
    log('character-move', `💀 ${c.name} avoided death — spent ${sdToSpend} SD to regain ${sdToSpend} HP.`)
  }

  return (
    <div className="h-full flex flex-col bg-stone-900">
      {/* Death's Door banner — only while alive but at 0 HP (not after confirmed dead) */}
      {c.currentHp === 0 && !c.isDead && (
        <div className="shrink-0 bg-red-950 border-b border-red-800 px-4 py-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-bold text-red-300">💀 {c.name} is at 0 HP!</div>
              <div className="text-xs text-red-500 mt-0.5">Spend SD to survive — each SD sacrificed restores 1 HP.</div>
            </div>
            {c.currentSd > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-red-400">{c.currentSd} SD available:</span>
                {Array.from({ length: Math.min(c.currentSd, 6) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => handleAvoidDeath(n)}
                    className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-red-100 text-xs font-bold border border-red-600 transition-colors">
                    -{n} SD → +{n} HP
                  </button>
                ))}
                {c.currentSd >= 2 && (
                  <button
                    onClick={() => handleAvoidDeath(c.currentSd)}
                    title={`Sacrifice all ${c.currentSd} SD to restore ${c.currentSd} HP`}
                    className="px-2.5 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-bold border-2 border-red-400 transition-colors shadow-lg shadow-red-900/50"
                  >
                    💀 Sacrifice All ({c.currentSd})
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs text-red-300 font-medium">No SD remaining — character is defeated.</span>
            )}
          </div>
        </div>
      )}

      {/* ── DECEASED banner ─────────────────────────────────────────── */}
      {c.isDead && (
        <div className="shrink-0 bg-stone-950 border-b border-stone-700 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-stone-300 flex items-center gap-2">
                <span>💀</span> {c.name} has fallen.
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                The party may seek the Tower of Trials to bring them back.
              </div>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              <button
                onClick={() => setGhost(c.id, !c.isGhost)}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  c.isGhost
                    ? 'bg-purple-900/40 border-purple-600/60 text-purple-300'
                    : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-purple-600/60 hover:text-purple-300'
                }`}
              >
                {c.isGhost ? '👻 Ghost Mode' : '👻 Enter Ghost Mode'}
              </button>
              <button
                onClick={() => { if (resurrectionReady) resurrect(c.id) }}
                disabled={!resurrectionReady}
                title={resurrectionReady ? 'The Tower is complete — restore this character to life' : 'Complete the Tower of Trials first (Keepers agree + all trials cleared)'}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  resurrectionReady
                    ? 'bg-emerald/10 border-emerald/40 text-emerald hover:bg-emerald/20'
                    : 'border-stone-700 text-stone-600 cursor-not-allowed'
                }`}
              >
                ✨ Resurrect
              </button>
            </div>
          </div>

          {/* Tower of Trials tracker */}
          <div className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-stone-400 font-medium font-heading tracking-wide">Tower of Trials</div>
              {towerTrials.active && (
                <button onClick={endTowerTrials} className="text-stone-600 hover:text-red-400 transition-colors">End / reset</button>
              )}
            </div>

            {/* Echo Compass status */}
            <div className="flex items-center gap-2">
              <Compass size={13} className={partyHasEchoCompass ? 'text-teal-400' : 'text-stone-600'} />
              {partyHasEchoCompass ? (
                <span className="text-teal-400">Echo Compass in the party's possession.</span>
              ) : (
                <>
                  <span className="text-stone-500">No Echo Compass yet.</span>
                  <button onClick={grantEchoCompass} className="text-teal-400 hover:text-teal-300 underline">Give one</button>
                </>
              )}
            </div>

            {!towerTrials.active ? (
              <button
                onClick={beginTowerTrials}
                disabled={!partyHasEchoCompass}
                title={partyHasEchoCompass ? 'Reveal the Tower of Trials on the map' : 'The party needs an Echo Compass first'}
                className={`w-full py-1.5 rounded border text-xs font-medium transition-colors ${
                  partyHasEchoCompass
                    ? 'border-amber-600/50 text-amber-300 hover:bg-amber-900/20'
                    : 'border-stone-700 text-stone-600 cursor-not-allowed'
                }`}
              >
                🗼 Begin Tower of Trials (reveal on map)
              </button>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-stone-400 hover:text-stone-200">
                  <input
                    type="checkbox"
                    checked={towerTrials.keepersAgreed}
                    onChange={e => setTowerKeepersAgreed(e.target.checked)}
                    className="accent-amber-500"
                  />
                  The Tower Keepers have agreed to help.
                </label>

                <div className="space-y-1">
                  <div className="text-stone-500">
                    Trials ({towerTrials.floors.filter(f => f.done).length}/{towerTrials.floors.length} cleared):
                  </div>
                  {towerTrials.floors.map(f => (
                    <div key={f.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTowerFloor(f.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          f.done ? 'bg-emerald/30 border-emerald/60 text-emerald' : 'border-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {f.done && <Check size={11} />}
                      </button>
                      <span className={`flex-1 ${f.done ? 'text-stone-500 line-through' : 'text-stone-300'}`}>{f.label}</span>
                      <button onClick={() => removeTowerFloor(f.id)} className="text-stone-600 hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <input
                      value={newFloor}
                      onChange={e => setNewFloor(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newFloor.trim()) { addTowerFloor(newFloor.trim()); setNewFloor('') } }}
                      placeholder="Add a trial…"
                      className="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-200 outline-none focus:border-amber-500/50"
                    />
                    <button
                      onClick={() => { if (newFloor.trim()) { addTowerFloor(newFloor.trim()); setNewFloor('') } }}
                      className="p-1 text-stone-400 hover:text-amber-300"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className={`text-center ${resurrectionReady ? 'text-emerald' : 'text-stone-500'}`}>
                  {resurrectionReady
                    ? '✅ The Tower is complete — Resurrect is unlocked.'
                    : "Clear every trial and gain the Keepers' agreement to unlock Resurrect."}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ghost-only banner (alive but ghosted for roleplay) */}
      {c.isGhost && !c.isDead && (
        <div className="shrink-0 bg-purple-950/30 border-b border-purple-900/40 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-purple-400">👻 {c.name} is in Ghost Mode — observing but cannot interact physically.</span>
          <button onClick={() => setGhost(c.id, false)} className="text-xs text-purple-400 hover:text-purple-200 transition-colors">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 bg-stone-800 border-b border-stone-700 px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100">
            <ArrowLeft size={14} /> Characters
          </button>
          <div className="flex items-center gap-3">
            {/* Tower of Trials mode — protects living characters from death inside. */}
            {!c.isDead && (
              <button
                onClick={() => setInTower(c.id, !c.inTower)}
                title={c.inTower ? 'In the Tower of Trials — cannot die (ejected at 0 HP)' : 'Enter the Tower of Trials (no death inside)'}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  c.inTower
                    ? 'bg-amber-900/40 border-amber-600/60 text-amber-300'
                    : 'text-stone-600 hover:text-amber-300 border-transparent hover:border-amber-600/40'
                }`}
              >
                🗼 {c.inTower ? 'In Tower' : 'Tower'}
              </button>
            )}

            {/* Mark Dead button — only shown while alive. Resurrect lives in the Deceased banner below. */}
            {!c.isDead && (confirmDeath ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">Mark {c.name} as dead?</span>
                <button onClick={() => { markDead(c.id); setConfirmDeath(false) }} className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-600">Yes</button>
                <button onClick={() => setConfirmDeath(false)} className="px-2 py-0.5 rounded bg-stone-700 text-stone-400 text-xs">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeath(true)} className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-400 transition-colors" title="Mark this character as dead">
                💀 Mark Dead
              </button>
            ))}

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete {c.name}?</span>
                <button onClick={handleDelete} className="px-2 py-0.5 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-semibold">Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-red-400 transition-colors">
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4">
          {/* Portrait */}
          <label className="relative cursor-pointer group shrink-0">
            <TokenAvatar name={c.name} characterId={c.id} size={60} />
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={16} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />
          </label>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className={`text-lg font-bold font-heading tracking-wide ${c.name.toLowerCase() === 'infinite' ? 'rainbow-name' : 'text-stone-100'}`}>{c.name}</h2>
              <span className="text-sm text-stone-400">{c.species} {c.class}</span>
              {c.discipline && <span className="text-xs text-stone-500">· {c.discipline}</span>}
              <span className="text-xs text-stone-500 font-mono">Lv.{c.level}</span>
            </div>

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {/* HP */}
              <div className="flex items-center gap-2 min-w-32">
                <span className="text-xs text-stone-500 shrink-0">HP</span>
                <HpBar current={c.currentHp} max={c.maxHp} className="flex-1 min-w-24" />
                <div className="flex gap-0.5">
                  <button onClick={() => adjustHp(c.id, -1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-redstone/70 text-xs">-</button>
                  <button onClick={() => adjustHp(c.id, 1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-emerald/50 text-xs">+</button>
                </div>
              </div>

              {/* SD */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">SD</span>
                <SdDots current={c.currentSd} max={c.maxSd} onToggle={i => {
                  const newVal = i < c.currentSd ? i : i + 1
                  adjustSd(c.id, newVal - c.currentSd)
                }} />
                <div className="flex gap-0.5">
                  <button onClick={() => adjustSd(c.id, -1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-redstone/70 text-xs">-</button>
                  <button onClick={() => adjustSd(c.id, 1)} className="w-5 h-5 rounded bg-stone-700 text-stone-300 hover:bg-emerald/50 text-xs">+</button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500">DEF</span>
                <span className="text-sm font-bold text-blue-300 font-mono tabular-nums">{def}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500">DMG</span>
                <span className="text-sm font-bold text-orange-300 font-mono">{c.damageDie}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500">XP</span>
                <span className="text-sm font-bold text-gold font-mono tabular-nums">{c.xp}/5</span>
              </div>
            </div>

            {c.missedRests > 0 && (
              <div className="text-xs text-orange-400 mt-1">⚠️ Missed {c.missedRests} rest{c.missedRests !== 1 ? 's' : ''} — -{c.missedRests}d4 to all rolls</div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-stone-700 bg-stone-800 px-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 ${
              tab === t.id
                ? 'border-gold text-gold font-medium'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'stats'     && <TabStats character={c} />}
        {tab === 'gear'      && <TabGear character={c} />}
        {tab === 'inventory' && <TabInventory character={c} />}
        {tab === 'abilities' && <TabAbilities character={c} />}
        {tab === 'effects'   && <TabEffects character={c} />}
        {tab === 'notes'     && <TabNotes character={c} />}
      </div>
    </div>
  )
}
