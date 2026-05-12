import { useState } from 'react'
import { Pencil, Check, X, ChevronDown, ChevronRight, Trash2, Skull, Send } from 'lucide-react'
import { PlayerRequestModal } from './PlayerRequestModal'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { useCombatStore } from '../combat/store'
import { HpBar } from '../../ui/HpBar'
import { SdDots } from '../../ui/SdDots'
import { Badge } from '../../ui/Badge'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { computeDef } from '../../lib/armor'
import { CURRENCY_OPTIONS } from '../../lib/currency'
import { POTION_RECIPES } from '../../lib/potions'
import type { CharacterItem, Area } from '../../types'

interface Props {
  focusedCharacterId?: string
}

// ── Dice helpers ──────────────────────────────────────────────────────────────
function rollD6()  { return Math.floor(Math.random() * 6)  + 1 }
function rollD12() { return Math.floor(Math.random() * 12) + 1 }
function roll2d6() { return rollD6() + rollD6() }

// ── Detect rest-spot sub-location ─────────────────────────────────────────────
function isAtRestSpot(areas: Area[], locationId: string | null, subLocationId: string | null): boolean {
  if (!locationId || !subLocationId) return false
  const area = areas.find(a => a.id === locationId)
  if (!area) return false
  // Search recursively for the sub-node
  function findNode(nodes: typeof area.subNodes): boolean {
    for (const n of nodes) {
      if (n.id === subLocationId) return n.type === 'rest-spot'
      if (n.subNodes?.length && findNode(n.subNodes)) return true
    }
    return false
  }
  return findNode(area.subNodes)
}

// ── Inline item rename ────────────────────────────────────────────────────────
function ItemNameEditor({ item, onSave }: { item: CharacterItem; onSave: (customName: string | undefined) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.customName ?? item.name)

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(item.customName ?? item.name); setEditing(true) }}
        className="flex items-center gap-1 group/name text-left min-w-0"
        title="Click to rename"
      >
        <span className="text-stone-200 truncate">{item.customName ?? item.name}</span>
        {item.customName && (
          <span className="text-stone-600 text-xs truncate italic">({item.name})</span>
        )}
        <Pencil size={10} className="shrink-0 text-stone-600 opacity-0 group-hover/name:opacity-100 transition-opacity" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(draft.trim() || undefined); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
        className="flex-1 bg-stone-700 border border-stone-500 rounded px-1.5 py-0.5 text-stone-100 text-xs outline-none focus:border-gold/60 min-w-0"
      />
      <button onClick={() => { onSave(draft.trim() || undefined); setEditing(false) }} className="p-0.5 text-gold hover:text-gold/80 shrink-0">
        <Check size={11} />
      </button>
      <button onClick={() => setEditing(false)} className="p-0.5 text-stone-500 hover:text-stone-300 shrink-0">
        <X size={11} />
      </button>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function PlayerCharacterPanel({ focusedCharacterId }: Props) {
  const { characters, adjustHp, adjustSd, addEffect, removeEffect, updateOnHandItem, removeOnHandItem,
    moveItemToStorage, moveItemToHand, updateCharacter, updateStorageItem, removeStorageItem } = useCharacterStore()
  const areas = useWorldStore(s => s.areas)
  const travelingMarkers = useWorldStore(s => s.travelingMarkers)
  const combatSession = useCombatStore(s => s.session)
  const adjustCombatantHp = useCombatStore(s => s.adjustCombatantHp)

  const [activeTab, setActiveTab] = useState<string>(
    focusedCharacterId && characters.some(c => c.id === focusedCharacterId)
      ? focusedCharacterId
      : (characters[0]?.id ?? '')
  )
  const [showStorage, setShowStorage] = useState(false)
  const [potionFeedback, setPotionFeedback] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [draftNotes, setDraftNotes] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)
  // Potion duration picker — shows for ongoing potions before applying
  const [pendingPotion, setPendingPotion] = useState<{ charId: string; item: CharacterItem; sceneDuration: number } | null>(null)

  const activeChar = characters.find(c => c.id === activeTab) ?? characters[0]
  const isOwnChar = !focusedCharacterId || focusedCharacterId === activeTab

  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500 text-sm">
        No characters in this campaign.
      </div>
    )
  }

  const location  = activeChar ? areas.find(a => a.id === activeChar.locationId) : null
  const travelMarker = activeChar ? travelingMarkers.find(m => m.characterId === activeChar.id) : null
  const atRestSpot = activeChar ? isAtRestSpot(areas, activeChar.locationId, activeChar.subLocationId) : false

  const BONUS_LABEL: Record<number, string> = { 1: '+1', 2: '+2', 3: '+3' }

  // ── Potion use ──────────────────────────────────────────────────────────────
  function usePotion(charId: string, item: CharacterItem) {
    // Match only against the GM-assigned base name — customName is display-only and must not grant potion powers
    const recipe = POTION_RECIPES.find(r => r.name.toLowerCase() === item.name.toLowerCase())
    if (!recipe) return

    if (item.quantity > 1) {
      updateOnHandItem(charId, item.id, { quantity: item.quantity - 1 })
    } else {
      removeOnHandItem(charId, item.id)
    }

    if (recipe.instant) {
      if (recipe.name === 'Potion of Healing') {
        const roll = roll2d6()
        adjustHp(charId, roll)
        setPotionFeedback(`🧪 ${recipe.name}: healed ${roll} HP (2d6)`)
      } else if (recipe.name === 'Potion of Harming') {
        const roll = rollD12()
        adjustHp(charId, -roll)
        setPotionFeedback(`💀 ${recipe.name}: took ${roll} damage (1d12)`)
      } else if (recipe.name === 'Potion of Restoration') {
        const char = characters.find(c => c.id === charId)
        char?.activeEffects.forEach(e => removeEffect(charId, e.id))
        setPotionFeedback(`✨ ${recipe.name}: all effects cleared`)
      } else {
        setPotionFeedback(`🧪 Used ${recipe.name}`)
      }
    } else {
      // Ongoing potion — ask for Redstone Dust duration (1–3 scenes) before applying
      setPendingPotion({ charId, item, sceneDuration: 1 })
      return  // Don't consume or apply yet — wait for duration confirmation
    }

    setTimeout(() => setPotionFeedback(null), 3500)
  }

  // Called when player confirms duration on an ongoing potion
  function applyPendingPotion(scenes: number) {
    if (!pendingPotion) return
    const { charId, item } = pendingPotion
    const recipe = POTION_RECIPES.find(r => r.name.toLowerCase() === item.name.toLowerCase())
    if (!recipe) { setPendingPotion(null); return }

    if (item.quantity > 1) {
      updateOnHandItem(charId, item.id, { quantity: item.quantity - 1 })
    } else {
      removeOnHandItem(charId, item.id)
    }

    addEffect(charId, {
      name: recipe.name.replace('Potion of ', ''),
      description: recipe.effect,
      durationType: 'scenes',
      remaining: scenes,
      damagePerRound: recipe.name === 'Potion of Poison' ? '1d6' : undefined,
    })
    if (recipe.name === 'Potion of Wither') {
      const char = characters.find(c => c.id === charId)
      if (char) adjustSd(charId, -char.currentSd)
    }
    setPotionFeedback(`🧪 ${recipe.name}: active for ${scenes} scene${scenes !== 1 ? 's' : ''}`)
    setPendingPotion(null)
    setTimeout(() => setPotionFeedback(null), 3500)
  }

  function isPotionItem(item: CharacterItem): boolean {
    // Only the GM-assigned base name determines if something is a potion — renaming never changes this
    return POTION_RECIPES.some(r => r.name.toLowerCase() === item.name.toLowerCase())
  }

  // ── Infinite's smite ──────────────────────────────────────────────────────
  function smiteCharacter(targetId: string, targetName: string) {
    adjustHp(targetId, -999999)
    setPotionFeedback(`💀 ${targetName} was instantly slain.`)
    setTimeout(() => setPotionFeedback(null), 3500)
  }
  function smiteCombatant(targetId: string, targetName: string) {
    adjustCombatantHp(targetId, -999999)
    setPotionFeedback(`💀 ${targetName} was instantly slain.`)
    setTimeout(() => setPotionFeedback(null), 3500)
  }
  const isInfinite = activeChar?.name.toLowerCase() === 'infinite'

  return (
    <div className="h-full flex flex-col bg-stone-900">
      {/* Character tabs */}
      <div className="shrink-0 flex gap-0.5 px-2 pt-2 overflow-x-auto border-b border-stone-700">
        {characters.map(c => {
          const isActive = activeTab === c.id
          const isDead  = !!c.isDead
          const isGhost = !!c.isGhost
          return (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? isDead
                    ? 'bg-stone-900 text-stone-500 border-t border-l border-r border-stone-700 -mb-px pb-2'
                    : isGhost
                      ? 'bg-stone-800 text-purple-400 border-t border-l border-r border-purple-800/50 -mb-px pb-2'
                      : 'bg-stone-800 text-gold border-t border-l border-r border-stone-600 -mb-px pb-2'
                  : isDead
                    ? 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/30 line-through'
                    : isGhost
                      ? 'text-purple-400 hover:text-purple-200 hover:bg-stone-800/50'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              {isDead  && <span className="text-xs">💀</span>}
              {isGhost && !isDead && <span className="text-xs">👻</span>}
              {!isDead && !isGhost && <TokenAvatar name={c.name} characterId={c.id} size={16} />}
              <span className={`${isDead ? 'line-through opacity-60' : ''} ${c.name.toLowerCase() === 'infinite' ? 'rainbow-name' : ''}`}>{c.name}</span>
            </button>
          )
        })}
        {/* Request button — only shown for own character */}
        {activeChar && isOwnChar && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-teal-300 hover:bg-stone-800/50 rounded-t whitespace-nowrap transition-colors shrink-0"
            title="Send a request to the GM"
          >
            <Send size={11} /> Request
          </button>
        )}
      </div>

      {/* Potion feedback toast */}
      {potionFeedback && (
        <div className="shrink-0 mx-3 mt-2 px-3 py-1.5 rounded-lg bg-emerald/10 border border-emerald/30 text-xs text-emerald">
          {potionFeedback}
        </div>
      )}

      {/* Potion duration picker (ongoing potions only) */}
      {pendingPotion && (
        <div className="shrink-0 mx-3 mt-2 px-3 py-2.5 rounded-lg bg-stone-800 border border-gold/30 text-xs space-y-2">
          <div className="text-stone-300 font-medium">How much Redstone Dust? (sets duration)</div>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => applyPendingPotion(n)}
                className="flex-1 py-1.5 rounded border border-stone-600 text-stone-300 hover:border-gold/50 hover:text-gold text-xs font-semibold transition-colors">
                {n} measure{n !== 1 ? 's' : ''} → {n} scene{n !== 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <button onClick={() => setPendingPotion(null)} className="text-stone-600 hover:text-stone-400 text-xs">Cancel</button>
        </div>
      )}

      {/* ── DEATH PANEL — shown instead of normal content when character is dead ── */}
      {activeChar?.isDead && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
          {/* Large death notice */}
          <div className="w-full bg-stone-950 border border-stone-800 rounded-xl p-5 text-center space-y-2 mb-4">
            <div className="text-4xl">💀</div>
            <div className="text-lg font-bold text-stone-300">{activeChar.name} has fallen.</div>
            <div className="text-xs text-stone-500 leading-relaxed">
              {activeChar.name} has run out of HP and Soul Dice.<br />
              They cannot act or be healed until resurrected.
            </div>
          </div>

          {/* Ghost mode notice */}
          {activeChar.isGhost && (
            <div className="w-full bg-purple-950/40 border border-purple-800/50 rounded-xl p-4 text-center space-y-1 mb-4">
              <div className="text-2xl">👻</div>
              <div className="text-sm font-semibold text-purple-300">{activeChar.name} is a Ghost</div>
              <div className="text-xs text-purple-500 leading-relaxed">
                They can observe and communicate with the party,<br />
                but cannot interact with the physical world.
              </div>
            </div>
          )}

          {/* Tower of Trials — player-facing */}
          <div className="w-full bg-stone-900 border border-stone-700 rounded-xl p-4 space-y-2.5 text-xs text-stone-500">
            <div className="text-stone-400 font-semibold text-sm">The Tower of Trials</div>
            <p className="leading-snug">
              There is a way back. The party must find the mystical <span className="text-stone-300">Tower of Trials</span> using an <span className="text-stone-300">Echo Compass</span>.
            </p>
            <div className="space-y-1.5">
              <div className="flex gap-2"><span className="text-stone-500 shrink-0">1.</span><span>Find the Tower using an <span className="text-stone-300">Echo Compass</span>.</span></div>
              <div className="flex gap-2"><span className="text-stone-500 shrink-0">2.</span><span>Appeal to the <span className="text-stone-300">Tower Keepers</span> — they decide whether to help.</span></div>
              <div className="flex gap-2"><span className="text-stone-500 shrink-0">3.</span><span>{activeChar.name} {activeChar.isGhost ? 'observes as a Ghost' : 'can observe as a Ghost'} — able to speak but not fight.</span></div>
              <div className="flex gap-2"><span className="text-stone-500 shrink-0">4.</span><span>The party completes the Tower's challenges. No one can permanently die inside.</span></div>
              <div className="flex gap-2"><span className="text-stone-500 shrink-0">5.</span><span>Success returns <span className="text-stone-300">{activeChar.name}</span> to life with full HP and SD.</span></div>
            </div>
          </div>

          {/* Last-known stats — muted */}
          <div className="w-full mt-4 opacity-40 pointer-events-none space-y-2">
            <div className="text-xs text-stone-600 uppercase tracking-wider text-center">Last Known Stats</div>
            <HpBar current={0} max={activeChar.maxHp} />
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-xs text-stone-600">SD</span>
              <SdDots current={0} max={activeChar.maxSd} size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* ── GHOST BANNER — shown above normal content when alive but in ghost mode ── */}
      {activeChar?.isGhost && !activeChar.isDead && (
        <div className="shrink-0 bg-purple-950/30 border-b border-purple-900/40 px-4 py-2.5 text-center">
          <div className="text-sm font-semibold text-purple-300 mb-0.5">👻 Ghost Mode</div>
          <div className="text-xs text-purple-500">{activeChar.name} can observe and communicate, but cannot interact with the physical world.</div>
        </div>
      )}

      {/* Character content */}
      {activeChar && !activeChar.isDead && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-3">
            <TokenAvatar name={activeChar.name} characterId={activeChar.id} size={48} />
            <div className="min-w-0">
              <div className={`font-bold text-base font-heading tracking-wide ${activeChar.name.toLowerCase() === 'infinite' ? 'rainbow-name' : 'text-stone-100'}`}>{activeChar.name}</div>
              <div className="text-sm text-stone-400">{activeChar.species} · {activeChar.class}</div>
              <div className="text-xs text-stone-500 font-mono">Level {activeChar.level}</div>
            </div>
          </div>

          {/* Location / travel status */}
          {(location || travelMarker) && (
            <div className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
              travelMarker
                ? 'bg-amber-900/20 border border-amber-700/40 text-amber-300'
                : 'bg-stone-800 border border-stone-700 text-stone-400'
            }`}>
              {travelMarker ? (
                <>
                  <span>🚶</span>
                  <span>
                    Traveling from <span className="text-stone-200">{location?.name ?? '?'}</span>
                    {travelMarker.label && <span className="text-amber-400/80"> — {travelMarker.label}</span>}
                  </span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span className="text-stone-300">{location?.name}</span>
                  <span className="text-stone-500">{location?.type}</span>
                  {atRestSpot && <span className="ml-1 px-1.5 py-0.5 rounded bg-teal-900/40 border border-teal-700/40 text-teal-400">🏕️ Rest Spot</span>}
                </>
              )}
            </div>
          )}

          {/* Vital stats */}
          <div className="space-y-2">
            <div>
              <div className="text-xs text-stone-400 mb-1">HP</div>
              <HpBar current={activeChar.currentHp} max={activeChar.maxHp} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-400">SD</span>
                <SdDots current={activeChar.currentSd} max={activeChar.maxSd} size="sm" />
                <span className="text-xs text-stone-500 font-mono">({activeChar.currentSd}/{activeChar.maxSd})</span>
              </div>
              <div className="flex items-center gap-1.5">
                {computeDef(activeChar.armorLoadout) > 0 && (
                  <Badge variant="blue">DEF {computeDef(activeChar.armorLoadout)}</Badge>
                )}
                <Badge variant="muted">{activeChar.damageDie}</Badge>
              </div>
            </div>
          </div>

          {/* Skills */}
          {activeChar.skills.length > 0 && (
            <div>
              <div className="text-xs font-medium text-stone-400 mb-2 font-heading tracking-wide">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {activeChar.skills.map(s => (
                  <div key={s.id} className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded px-2 py-0.5">
                    <span className="text-xs text-stone-200">{s.name}</span>
                    <span className="text-xs font-bold text-gold font-mono">{BONUS_LABEL[s.bonus] ?? `+${s.bonus}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active effects */}
          {activeChar.activeEffects.length > 0 && (
            <div>
              <div className="text-xs font-medium text-stone-400 mb-2 font-heading tracking-wide">Active Effects</div>
              <div className="space-y-1">
                {activeChar.activeEffects.map(e => (
                  <div key={e.id} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                    e.damagePerRound
                      ? 'bg-red-900/20 border-red-800/40 text-red-300'
                      : 'bg-emerald/10 border-emerald/30 text-emerald'
                  }`}>
                    <span className="font-medium shrink-0">{e.name}</span>
                    {e.description && <span className="text-stone-400 truncate">{e.description}</span>}
                    {e.damagePerRound && <span className="text-red-400 font-mono shrink-0">🩸{e.damagePerRound}/turn</span>}
                    {e.remaining != null && <span className="ml-auto shrink-0 text-stone-500 font-mono">{e.remaining}sc</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-stone-700" />

          {/* ── PRIVATE SECTION: inventory, currency, notes ──────────────────
               isOwnChar = true  → own character (always editable)
               focusedCharacterId = undefined → GM mode (sees all)
               Otherwise → different player's character → show lock    */}
          {(!isOwnChar && !!focusedCharacterId) ? (
            <div className="bg-stone-800/60 border border-stone-700 rounded-xl px-4 py-5 text-center space-y-1.5">
              <div className="text-xl">🔒</div>
              <div className="text-sm font-medium text-stone-400">{activeChar.name}'s inventory is private.</div>
              <div className="text-xs text-stone-500">Only {activeChar.name} can see their own items, currency, and notes.</div>
            </div>
          ) : <>

          {/* On-hand inventory */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-stone-400 font-heading tracking-wide">On Hand</div>
              {activeChar.onHand.items.some(i => i.isBlock) && (
                <div className="text-xs text-stone-500">
                  {activeChar.onHand.items.filter(i => i.isBlock).length}/10 blocks
                </div>
              )}
            </div>
            {activeChar.onHand.items.length === 0 ? (
              <div className="text-xs text-stone-500 italic">Nothing on hand.</div>
            ) : (
              <div className="space-y-1">
                {activeChar.onHand.items.map(item => {
                  const isPotion = isPotionItem(item)
                  return (
                    <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-stone-800 text-xs group">
                      <div className="flex-1 min-w-0">
                        {isOwnChar ? (
                          <ItemNameEditor
                            item={item}
                            onSave={customName => updateOnHandItem(activeChar.id, item.id, { customName })}
                          />
                        ) : (
                          <span className="text-stone-200 truncate">{item.customName ?? item.name}</span>
                        )}
                      </div>
                      <span className="text-stone-400 font-mono shrink-0">×{item.quantity}</span>

                      {/* Potion use button */}
                      {isOwnChar && isPotion && (
                        <button
                          onClick={() => usePotion(activeChar.id, item)}
                          className="px-1.5 py-0.5 rounded bg-emerald/20 border border-emerald/40 text-emerald text-xs hover:bg-emerald/30 transition-colors shrink-0"
                          title="Use potion"
                        >
                          Use
                        </button>
                      )}

                      {/* Move to storage (at rest spots) */}
                      {isOwnChar && atRestSpot && (
                        <button
                          onClick={() => moveItemToStorage(activeChar.id, item.id)}
                          className="px-1.5 py-0.5 rounded bg-stone-700 border border-stone-600 text-stone-400 hover:text-stone-200 hover:bg-stone-600 text-xs transition-colors shrink-0"
                          title="Store"
                        >
                          Store
                        </button>
                      )}

                      {/* Drop item (always available) */}
                      {isOwnChar && (
                        <button
                          onClick={() => removeOnHandItem(activeChar.id, item.id)}
                          className="p-0.5 text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Drop item"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Storage — only shown at rest spots or if collapsed toggle exists */}
          {isOwnChar && (
            <div>
              <button
                onClick={() => setShowStorage(v => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors w-full"
              >
                {showStorage ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Storage ({activeChar.storage.items.length})
                {atRestSpot && <span className="ml-1 text-teal-500">· accessible</span>}
              </button>
              {showStorage && (
                <div className="mt-2 space-y-1">
                  {activeChar.storage.items.length === 0 ? (
                    <div className="text-xs text-stone-500 italic pl-4">Storage is empty.</div>
                  ) : (
                    activeChar.storage.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-stone-800/60 text-xs group">
                        <div className="flex-1 min-w-0">
                          {isOwnChar ? (
                            <ItemNameEditor
                              item={item}
                              onSave={customName => updateStorageItem(activeChar.id, item.id, { customName })}
                            />
                          ) : (
                            <span className="text-stone-300 truncate">{item.customName ?? item.name}</span>
                          )}
                        </div>
                        <span className="text-stone-500 font-mono shrink-0">×{item.quantity}</span>
                        {atRestSpot && (
                          <button
                            onClick={() => moveItemToHand(activeChar.id, item.id)}
                            className="px-1.5 py-0.5 rounded bg-stone-700 border border-stone-600 text-stone-400 hover:text-stone-200 hover:bg-stone-600 text-xs transition-colors shrink-0"
                            title="Take"
                          >
                            Take
                          </button>
                        )}
                        <button
                          onClick={() => removeStorageItem(activeChar.id, item.id)}
                          className="p-0.5 text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Remove from storage"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Currency */}
          <div>
            <div className="text-xs font-medium text-stone-400 mb-2 font-heading tracking-wide">Currency</div>
            <div className="flex items-center gap-3 flex-wrap">
              {CURRENCY_OPTIONS.map(opt => {
                const amount = activeChar.currency[opt.key] ?? 0
                return (
                  <div key={opt.key} className="flex items-center gap-1">
                    <img src={opt.img} alt={opt.label} className="w-4 h-4" />
                    <span className={`text-xs font-semibold font-mono tabular-nums ${amount > 0 ? 'text-white' : 'text-stone-600'}`}>{amount}</span>
                    <span className={`text-xs ${amount > 0 ? 'text-stone-400' : 'text-stone-600'}`}>{opt.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rations */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">🍖 Rations</span>
            <span className={`text-xs font-semibold font-mono tabular-nums ${activeChar.rations > 0 ? 'text-white' : 'text-stone-600'}`}>{activeChar.rations}</span>
          </div>

          {/* Missed rests warning */}
          {activeChar.missedRests > 0 && (
            <div className="bg-orange-900/20 border border-orange-700/40 rounded-lg px-3 py-2 text-xs text-orange-300">
              ⚠️ {activeChar.missedRests} missed rest{activeChar.missedRests !== 1 ? 's' : ''} — -{activeChar.missedRests}d4 on rolls
            </div>
          )}

          <div className="border-t border-stone-700" />

          {/* Notes — editable only for own character */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-stone-400 font-heading tracking-wide">Notes</div>
              {isOwnChar && !editingNotes && (
                <button
                  onClick={() => { setDraftNotes(activeChar.notes ?? ''); setEditingNotes(true) }}
                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  <Pencil size={11} /> Edit
                </button>
              )}
            </div>
            {isOwnChar && editingNotes ? (
              <div className="space-y-1.5">
                <textarea
                  autoFocus
                  value={draftNotes}
                  onChange={e => setDraftNotes(e.target.value)}
                  rows={5}
                  className="w-full bg-stone-800 border border-stone-600 rounded px-2.5 py-2 text-stone-100 text-xs outline-none resize-none focus:border-gold/50 transition-colors"
                  placeholder="Write notes here…"
                />
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="px-2.5 py-1 rounded text-xs text-stone-400 hover:text-stone-200 border border-stone-600 hover:border-stone-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { updateCharacter(activeChar.id, { notes: draftNotes }); setEditingNotes(false) }}
                    className="px-2.5 py-1 rounded text-xs text-gold border border-gold/50 hover:bg-gold/10 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={isOwnChar ? () => { setDraftNotes(activeChar.notes ?? ''); setEditingNotes(true) } : undefined}
                className={`text-xs text-stone-400 whitespace-pre-wrap rounded px-2 py-1.5 min-h-[2.5rem] ${
                  isOwnChar ? 'cursor-text hover:bg-stone-800/60 transition-colors' : ''
                } ${!activeChar.notes ? 'text-stone-600 italic' : ''}`}
              >
                {activeChar.notes || (isOwnChar ? 'Click to add notes…' : 'No notes.')}
              </div>
            )}
          </div>

          </> /* end of private inventory section */}

          {/* ── Infinite's Divine Smite panel ─────────────────────────── */}
          {isInfinite && (
            <div className="border border-red-900/60 rounded-lg bg-red-950/20 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-950/30 border-b border-red-900/40">
                <Skull size={13} className="text-red-400 shrink-0" />
                <span className="text-xs font-bold text-red-300 tracking-wide font-heading">Divine Smite</span>
                <span className="text-xs text-red-400 ml-auto">instant kill</span>
              </div>

              {/* Characters */}
              {characters.filter(c => c.currentHp > 0).length > 0 && (
                <div className="px-3 py-2 space-y-1">
                  <div className="text-xs text-red-300 mb-1.5 font-medium uppercase tracking-wider font-heading">Characters</div>
                  {characters.filter(c => c.currentHp > 0).map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                      <TokenAvatar name={c.name} characterId={c.id} size={18} />
                      <span className="flex-1 text-xs text-stone-300 truncate">{c.name}</span>
                      <HpBar current={c.currentHp} max={c.maxHp} className="w-16" />
                      <button
                        onClick={() => smiteCharacter(c.id, c.name)}
                        className="p-1 rounded text-red-400 hover:text-red-200 hover:bg-red-900/40 transition-colors shrink-0"
                        title={`Kill ${c.name}`}
                      >
                        <Skull size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Combatants (if combat is running) */}
              {combatSession && !combatSession.ended && combatSession.combatants.filter(c => c.currentHp > 0 && c.kind === 'creature').length > 0 && (
                <div className="px-3 py-2 border-t border-red-900/30 space-y-1">
                  <div className="text-xs text-red-300 mb-1.5 font-medium uppercase tracking-wider font-heading">Combatants</div>
                  {combatSession.combatants.filter(c => c.currentHp > 0 && c.kind === 'creature').map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 shrink-0">👾</span>
                      <span className="flex-1 text-xs text-stone-300 truncate">{c.name}</span>
                      <HpBar current={c.currentHp} max={c.maxHp} className="w-16" />
                      <button
                        onClick={() => smiteCombatant(c.id, c.name)}
                        className="p-1 rounded text-red-400 hover:text-red-200 hover:bg-red-900/40 transition-colors shrink-0"
                        title={`Kill ${c.name}`}
                      >
                        <Skull size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {characters.filter(c => c.currentHp > 0).length === 0 &&
               !(combatSession && !combatSession.ended && combatSession.combatants.some(c => c.currentHp > 0 && c.kind === 'creature')) && (
                <div className="px-3 py-3 text-xs text-red-400/70 italic">No targets available.</div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Request modal */}
      {showRequestModal && activeChar && (
        <PlayerRequestModal character={activeChar} onClose={() => setShowRequestModal(false)} />
      )}
    </div>
  )
}
